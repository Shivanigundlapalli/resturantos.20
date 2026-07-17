import twilio from 'twilio';
import { getPool } from './db';
import * as dotenv from 'dotenv';
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const twilioWhatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
const isDemoMode = process.env.TWILIO_DEMO_MODE === 'true';
const demoPhone = process.env.TWILIO_DEMO_PHONE;
const demoWhatsapp = process.env.TWILIO_DEMO_WHATSAPP1;

console.log('--- Twilio Configuration Check ---');
console.log('TWILIO_DEMO_MODE:', process.env.TWILIO_DEMO_MODE);
console.log('TWILIO_ACCOUNT_SID:', accountSid ? 'Loaded' : 'Missing');
console.log('TWILIO_PHONE_NUMBER:', twilioPhoneNumber);
console.log('TWILIO_WHATSAPP_NUMBER:', twilioWhatsappNumber);
console.log('TWILIO_DEMO_WHATSAPP1:', demoWhatsapp);
console.log('----------------------------------');

let client: twilio.Twilio | null = null;
if (accountSid && authToken) {
  try {
    client = twilio(accountSid, authToken);
    console.log('Twilio client created successfully.');
  } catch (error) {
    console.error('Failed to create Twilio client:', error);
  }
} else {
  console.error('Failed to create Twilio client: Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
}

export interface NotificationState {
  whatsappSent: boolean;
  voiceSent: boolean;
  lastWhatsAppStatus: string;
  lastVoiceStatus: string;
  commsStatus: string;
  lastNotificationTime: string | null;
}

// In-memory tracker for notification states to prevent duplicates
export const notificationStates = new Map<string, NotificationState>();

export function getNotificationState(inventoryId: string): NotificationState {
  if (!notificationStates.has(inventoryId)) {
    notificationStates.set(inventoryId, {
      whatsappSent: false,
      voiceSent: false,
      lastWhatsAppStatus: 'Never Sent',
      lastVoiceStatus: 'Never Sent',
      commsStatus: 'Never Sent',
      lastNotificationTime: null
    });
  }
  return notificationStates.get(inventoryId)!;
}

async function getSupplierContact(supplierId: string | null): Promise<{ phone: string, whatsapp: string, name: string }> {
  const fallback = { phone: demoPhone || '', whatsapp: demoWhatsapp || '', name: 'Unknown Supplier' };
  if (!supplierId) return fallback;

  const pool = getPool();
  if (!pool) return fallback;

  try {
    const res = await pool.query('SELECT company_name, phone FROM suppliers WHERE id = $1', [supplierId]);
    if (res.rows.length > 0) {
      const phone = res.rows[0].phone || demoPhone || '';
      return {
        phone: phone,
        whatsapp: phone, // Assuming WhatsApp uses the same phone number for production
        name: res.rows[0].company_name
      };
    }
  } catch (err) {
    console.error('Error fetching supplier contact:', err);
  }
  return fallback;
}

async function logToAudit(details: any) {
  const pool = getPool();
  if (!pool) {
    console.log('[Audit Log - Twilio]', details);
    return;
  }
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, details, created_at) VALUES ($1, $2, NOW())',
      ['TWILIO_NOTIFICATION', JSON.stringify(details)]
    );
  } catch (err) {
    console.error('Failed to write to audit_logs:', err);
  }
}

async function executeWithRetry(action: () => Promise<any>, retries: number): Promise<any> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await action();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function updateInventoryNotificationDb(inventoryId: string, updates: any) {
  const pool = getPool();
  if (!pool) return;
  const setClauses = [];
  const values = [];
  let i = 1;
  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`${key} = $${i}`);
    values.push(value);
    i++;
  }
  values.push(inventoryId.replace('i_', '')); // Handle if id is prefixed with i_
  
  try {
    // Also try matching the exact ID string if it's a UUID or just plain int
    await pool.query(`UPDATE inventory SET ${setClauses.join(', ')} WHERE id::text = $${i} OR ingredient_id::text = $${i}`, values);
  } catch(err) {
    console.error('Failed to update inventory notification state in DB:', err);
  }
}

export async function sendLowStockWhatsapp(item: any, supplierContact: any, onStatusUpdate?: () => void) {
  const state = getNotificationState(item.id);
  const rawRecipient = isDemoMode ? demoWhatsapp : supplierContact.whatsapp;
  
  if (!client || !rawRecipient) {
    console.error('Twilio client not initialized or recipient missing');
    return;
  }

  const recipient = rawRecipient.startsWith('whatsapp:') ? rawRecipient : `whatsapp:${rawRecipient}`;
  const sender = twilioWhatsappNumber?.startsWith('whatsapp:') ? twilioWhatsappNumber : `whatsapp:${twilioWhatsappNumber}`;

  item.lastWhatsAppStatus = 'Sending...';
  item.commsStatus = 'Sending WhatsApp...';
  if (onStatusUpdate) onStatusUpdate();

  console.log(`Sending WhatsApp to ${rawRecipient} before calling Twilio.`);
  
  const messageBody = `🚨 RestaurantOS Inventory Alert\n\nIngredient:\n${item.name}\n\nCurrent Stock:\n${item.currentQty}\n\nMinimum Stock:\n${item.reorderLevel}\n\nSupplier:\n${supplierContact.name}\n\nPlease restock this ingredient as soon as possible.\n\nGenerated automatically by RestaurantOS AI.`;

  try {
    const result = await executeWithRetry(() => client!.messages.create({
      body: messageBody,
      from: sender,
      to: recipient
    }), 3);

    state.lastWhatsAppStatus = 'Sent';
    state.commsStatus = 'WhatsApp Sent';
    state.lastNotificationTime = new Date().toISOString();
    
    item.lastWhatsAppStatus = 'Sent';
    item.commsStatus = 'WhatsApp Sent';
    item.lastNotificationTime = state.lastNotificationTime;

    await updateInventoryNotificationDb(item.id, {
      whatsapp_status: 'Sent',
      whatsapp_sent_at: state.lastNotificationTime,
      whatsapp_sid: result.sid,
      last_notification_type: 'WhatsApp'
    });

    if (onStatusUpdate) onStatusUpdate();

    await logToAudit({
      type: 'WhatsApp',
      ingredient: item.name,
      supplier: supplierContact.name,
      recipient: recipient,
      twilioSid: result.sid,
      status: 'Sent',
      timestamp: state.lastNotificationTime
    });

  } catch (err: any) {
    console.log('Twilio Error:');
    console.error(err);
    
    state.lastWhatsAppStatus = 'Failed';
    state.commsStatus = 'WhatsApp Failed';
    state.lastNotificationTime = new Date().toISOString();
    
    item.lastWhatsAppStatus = 'Failed';
    item.commsStatus = 'WhatsApp Failed';
    item.lastNotificationTime = state.lastNotificationTime;
    item.whatsappError = err.message;

    await updateInventoryNotificationDb(item.id, {
      whatsapp_status: 'Failed',
      whatsapp_error: err.message,
      last_notification_type: 'WhatsApp'
    });

    if (onStatusUpdate) onStatusUpdate();

    await logToAudit({
      type: 'WhatsApp',
      ingredient: item.name,
      supplier: supplierContact.name,
      recipient: recipient,
      twilioSid: null,
      status: 'Failed',
      timestamp: state.lastNotificationTime,
      error: err.message
    });
  }
}

export async function sendVoiceCall(item: any, supplierContact: any, onStatusUpdate?: () => void) {
  const state = getNotificationState(item.id);
  let rawRecipient = isDemoMode ? demoPhone : supplierContact.phone;
  if (isDemoMode && !rawRecipient) rawRecipient = demoWhatsapp; // Fallback to whatsapp demo number if phone is not set
  
  if (!client || !rawRecipient) {
    console.error('Twilio client not initialized or recipient missing');
    return;
  }
  
  // Ensure we remove any 'whatsapp:' prefix if it accidentally got in
  const recipient = rawRecipient.replace('whatsapp:', '');

  item.lastVoiceStatus = 'Calling...';
  item.commsStatus = 'Initiating Voice Call...';
  if (onStatusUpdate) onStatusUpdate();

  console.log(`\n[Twilio Voice Call] Initiating call...`);
  console.log(`[Twilio Voice Call] Recipient: ${recipient}`);

  const twiml = `<Response><Say>Hello. This is RestaurantOS AI. The ingredient ${item.name} is completely out of stock. Immediate replenishment is required. Please contact the restaurant immediately. Thank you.</Say></Response>`;

  try {
    const result = await executeWithRetry(() => client!.calls.create({
      twiml: twiml,
      to: recipient,
      from: twilioPhoneNumber!
    }), 2);

    console.log(`[Twilio Voice Call] SID: ${result.sid}`);
    
    state.lastVoiceStatus = 'Completed';
    state.commsStatus = 'Voice Call Completed';
    state.lastNotificationTime = new Date().toISOString();

    item.lastVoiceStatus = 'Completed';
    item.commsStatus = 'Voice Call Completed';
    item.lastNotificationTime = state.lastNotificationTime;

    await updateInventoryNotificationDb(item.id, {
      voice_status: 'Completed',
      voice_called_at: state.lastNotificationTime,
      voice_sid: result.sid,
      last_notification_type: 'Voice Call'
    });

    if (onStatusUpdate) onStatusUpdate();

    await logToAudit({
      type: 'Voice Call',
      ingredient: item.name,
      supplier: supplierContact.name,
      recipient: recipient,
      twilioSid: result.sid,
      status: 'Completed',
      timestamp: state.lastNotificationTime
    });

  } catch (err: any) {
    console.error(`[Twilio Voice Call] Error:`, err);

    state.lastVoiceStatus = 'Failed';
    state.commsStatus = 'Voice Call Failed';
    state.lastNotificationTime = new Date().toISOString();

    item.lastVoiceStatus = 'Failed';
    item.commsStatus = 'Voice Call Failed';
    item.lastNotificationTime = state.lastNotificationTime;
    item.voiceError = err.message;

    await updateInventoryNotificationDb(item.id, {
      voice_status: 'Failed',
      voice_error: err.message,
      last_notification_type: 'Voice Call'
    });

    if (onStatusUpdate) onStatusUpdate();

    await logToAudit({
      type: 'Voice Call',
      ingredient: item.name,
      supplier: supplierContact.name,
      recipient: recipient,
      twilioSid: null,
      status: 'Failed',
      timestamp: state.lastNotificationTime,
      error: err.message
    });
  }
}

export async function evaluateThresholds(item: any, onStatusUpdate?: () => void) {
  const state = getNotificationState(item.id);
  
  if (item.currentQty > item.reorderLevel) {
    // Reset state when stock recovers
    if (state.whatsappSent || state.voiceSent || item.lastWhatsAppStatus || item.lastVoiceStatus) {
       state.whatsappSent = false;
       state.voiceSent = false;
       item.lastWhatsAppStatus = 'Never Sent';
       item.lastVoiceStatus = 'Never Called';
       item.commsStatus = 'Never Sent';
       await updateInventoryNotificationDb(item.id, {
         whatsapp_status: 'Never Sent',
         voice_status: 'Never Called'
       });
       if (onStatusUpdate) onStatusUpdate();
    }
    return;
  }

  const supplierContact = await getSupplierContact(item.supplierId);

  if (item.currentQty <= item.reorderLevel && item.currentQty > 0) {
    if (!state.whatsappSent) {
      state.whatsappSent = true; 
      // Do not await, let it run in background so UI updates "Sending..." instantly
      sendLowStockWhatsapp(item, supplierContact, onStatusUpdate);
    }
  } else if (item.currentQty === 0) {
    if (!state.voiceSent) {
      state.voiceSent = true;
      // Do not await, let it run in background
      sendVoiceCall(item, supplierContact, onStatusUpdate);
    }
  }
}

export async function scanInventoryOnStartup() {
  console.log('Running threshold scan during backend startup...');
  const pool = getPool();
  if (!pool) {
    console.log('Database not ready for scan.');
    return;
  }
  try {
    const queryStr = `
      SELECT i.id as inventory_id, ing.name, ing.category, CAST(i.current_qty AS DOUBLE PRECISION) as "currentQty", 
             ing.unit, CAST(i.reorder_level AS DOUBLE PRECISION) as "reorderLevel", 
             i.supplier_id as "supplierId", CAST(i.unit_price AS DOUBLE PRECISION) as "unitPrice"
      FROM inventory i
      JOIN ingredients ing ON i.ingredient_id = ing.id
    `;
    const result = await pool.query(queryStr);
    for (const row of result.rows) {
      const item = {
        id: String(row.inventory_id),
        name: row.name,
        currentQty: row.currentQty,
        reorderLevel: row.reorderLevel,
        supplierId: String(row.supplierId)
      };
      await evaluateThresholds(item);
    }
    console.log('Startup threshold scan completed.');
  } catch (err) {
    console.error('Error scanning inventory on startup:', err);
  }
}
