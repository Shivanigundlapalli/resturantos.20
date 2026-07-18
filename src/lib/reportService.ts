// @ts-nocheck
import { getPool } from "./db.js";
import twilio from 'twilio';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const withTimeout = <T>(promise: Promise<T>, ms: number, stepName: string): Promise<T> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${stepName} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export async function generateAndSendBusinessReport() {
  console.log("[1] Dashboard Request Received");

  try {
    const db = getPool();
    if (!db) {
      console.log("[1.1] Database Pool Missing");
      return { success: false, step: "Database Init", error: "Database offline. Cannot generate report.", details: "DATABASE_URL might be missing" };
    }

    console.log("[2] Validating Environment Variables");
    const envVars = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID?.trim(),
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN?.trim(),
      TWILIO_WHATSAPP_NUMBER: process.env.TWILIO_WHATSAPP_NUMBER?.trim(),
      TWILIO_DEMO_WHATSAPP2: process.env.TWILIO_DEMO_WHATSAPP2?.trim(),
      GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim(),
      OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim()
    };

    for (const [key, value] of Object.entries(envVars)) {
      console.log(`${key}: ${value ? 'Loaded' : 'Missing'}`);
    }

    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER, TWILIO_DEMO_WHATSAPP2, GEMINI_API_KEY, OPENAI_API_KEY } = envVars;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return { success: false, step: "Env Config", error: "Twilio credentials missing", details: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN" };
    }
    if (!TWILIO_DEMO_WHATSAPP2) {
      return { success: false, step: "Env Config", error: "Target Twilio WhatsApp number missing", details: "TWILIO_DEMO_WHATSAPP2" };
    }

    let fromNumber = TWILIO_WHATSAPP_NUMBER;
    if (fromNumber && !fromNumber.startsWith('+')) fromNumber = '+' + fromNumber;
    let toFormatted = TWILIO_DEMO_WHATSAPP2.replace(/\s+/g, '');
    if (!toFormatted.startsWith('+')) toFormatted = '+' + toFormatted;

    console.log("[3] Fetching Analytics");

    const safeQuery = async (query: string, name: string) => {
      try {
        return await withTimeout(db.query(query), 5000, `DB Query: ${name}`);
      } catch (err: any) {
        console.error(`[DB Error] ${name} failed:`, err.message);
        return { rows: [] }; 
      }
    };

    const ordersQuery = await safeQuery(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'Preparing' THEN 1 END) as preparing,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled,
        SUM(total) as today_revenue,
        SUM(CASE WHEN payment_method = 'CASH' THEN total ELSE 0 END) as cash_payments,
        SUM(CASE WHEN payment_method != 'CASH' THEN total ELSE 0 END) as online_payments
      FROM orders 
      WHERE DATE(created_at) = CURRENT_DATE
    `, 'Orders');
    const orders = ordersQuery.rows[0] || {};

    const expensesQuery = await safeQuery(`
      SELECT SUM(amount) as today_expenses FROM finance_ledger 
      WHERE type = 'Expense' AND DATE(created_at) = CURRENT_DATE
    `, 'Finance');
    const expenses = expensesQuery.rows[0]?.today_expenses || 0;

    const custQuery = await safeQuery(`
      SELECT COUNT(*) as total_customers FROM customers WHERE DATE(updated_at) = CURRENT_DATE
    `, 'Customers');
    const totalCustomers = custQuery.rows[0]?.total_customers || 0;

    const invQuery = await safeQuery(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN current_qty > reorder_level THEN 1 END) as healthy,
        COUNT(CASE WHEN current_qty <= reorder_level AND current_qty > 0 THEN 1 END) as low_stock,
        COUNT(CASE WHEN current_qty = 0 THEN 1 END) as out_of_stock
      FROM inventory
    `, 'Inventory');
    const inv = invQuery.rows[0] || {};

    const topDishQuery = await safeQuery(`
      SELECT m.name, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE DATE(o.created_at) = CURRENT_DATE
      GROUP BY m.name
      ORDER BY count DESC LIMIT 1
    `, 'Top Dish');
    const topDish = topDishQuery.rows[0] ? `${topDishQuery.rows[0].name}\n${topDishQuery.rows[0].count} Orders` : "No Data Available";

    const suppQuery = await safeQuery(`
      SELECT COUNT(*) as linked, SUM(pending_payments) as pending_amount FROM suppliers
    `, 'Suppliers');
    const suppliers = suppQuery.rows[0] || {};

    const todayRevenue = orders.today_revenue || 0;
    const costQuery = await safeQuery(`
      SELECT SUM(oi.quantity * m.cost) as total_cost 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE DATE(o.created_at) = CURRENT_DATE
    `, 'COGS');
    const cogs = costQuery.rows[0]?.total_cost || 0;
    const profit = todayRevenue - cogs;
    const netCash = todayRevenue - expenses;

    console.log("[4] Analytics Loaded");

    const metricsData = `
      Revenue: ${todayRevenue}
      Profit: ${profit}
      Expenses: ${expenses}
      Total Orders: ${orders.total_orders || 0}
      Completed: ${orders.completed || 0}
      Pending: ${orders.pending || 0}
      Low Stock Items: ${inv.low_stock || 0}
      Out of Stock: ${inv.out_of_stock || 0}
      Pending Supplier Payments: ${suppliers.pending_amount || 0}
    `;

    console.log("[5] Generating AI Summary");
    let aiSummary = "";
    let aiProvider = "Fallback";

    if (GEMINI_API_KEY && GEMINI_API_KEY !== "MY_GEMINI_API_KEY") {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        const res = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Based on these restaurant metrics for today, provide exactly 5 concise bullet points summarizing the business health. Keep it very short, professional, and data-driven.\nMetrics:\n${metricsData}`
          }), 
          8000, 
          'Gemini API'
        );
        aiSummary = res.text || "";
        aiProvider = "Gemini";
        console.log("[5.1] Gemini AI Completed");
      } catch (e: any) {
        console.error(`[AI Error] Gemini failed: ${e.message}`);
      }
    }

    if (!aiSummary && OPENAI_API_KEY) {
      try {
        const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
        const res = await withTimeout(
          openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: `Based on these restaurant metrics for today, provide exactly 5 concise bullet points summarizing the business health. Keep it very short, professional, and data-driven.\nMetrics:\n${metricsData}` }]
          }), 
          8000, 
          'OpenAI API'
        );
        aiSummary = res.choices[0]?.message?.content || "";
        aiProvider = "OpenAI";
        console.log("[5.2] OpenAI AI Completed");
      } catch (e: any) {
        console.error(`[AI Error] OpenAI failed: ${e.message}`);
      }
    }

    if (!aiSummary) {
      aiSummary = "AI Summary Unavailable";
      console.log("[5.3] Using Fallback Summary");
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const lowStockNamesQuery = await safeQuery(`
      SELECT i.name FROM inventory inv JOIN ingredients i ON inv.ingredient_id = i.id
      WHERE inv.current_qty <= inv.reorder_level LIMIT 5
    `, 'Low Stock Items');
    const lowStockNames = lowStockNamesQuery.rows.length > 0 
      ? lowStockNamesQuery.rows.map(r => `• ${r.name}`).join('\n') 
      : '• No Data Available';

    const reportText = `*RestaurantOS AI*\n*Daily Business Report*\n\nRestaurant:\nSpice Heaven\n\nDate:\n${dateStr}\n\nTime:\n${timeStr}\n\n----------------------------------\n\n*Sales*\n\nToday's Revenue:\n₹${todayRevenue}\n\nProfit:\n₹${profit}\n\nExpenses:\n₹${expenses}\n\nNet Cash Flow:\n₹${netCash}\n\n----------------------------------\n\n*Orders*\n\nTotal:\n${orders.total_orders || 0}\n\nCompleted:\n${orders.completed || 0}\n\nPreparing:\n${orders.preparing || 0}\n\nPending:\n${orders.pending || 0}\n\nCancelled:\n${orders.cancelled || 0}\n\n----------------------------------\n\n*Payments*\n\nCash:\n₹${orders.cash_payments || 0}\n\nOnline:\n₹${orders.online_payments || 0}\n\nPending:\n₹0\n\n----------------------------------\n\n*Customers*\n\nToday's Visitors:\n${totalCustomers}\n\n----------------------------------\n\n*Inventory*\n\nHealthy:\n${inv.healthy || 0}\n\nLow Stock:\n${inv.low_stock || 0}\n\nOut Of Stock:\n${inv.out_of_stock || 0}\n\n*Low Stock Items*\n\n${lowStockNames}\n\n----------------------------------\n\n*Suppliers*\n\nPending Payments:\n₹${suppliers.pending_amount || 0}\n\nLinked Suppliers:\n${suppliers.linked || 0}\n\n----------------------------------\n\n*Top Selling Dish*\n\n${topDish}\n\n----------------------------------\n\n*AI Business Summary*\n\n${aiSummary}\n\n_Generated by RestaurantOS AI_`;

    console.log("[6] Sending WhatsApp via Twilio");
    console.log(`- Recipient Number: ${toFormatted}`);
    console.log(`- Sender Number: ${fromNumber}`);
    console.log(`- Message Length: ${reportText.length}`);

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    let message;
    
    try {
      message = await withTimeout(
        client.messages.create({
          body: reportText,
          from: `whatsapp:${fromNumber}`,
          to: `whatsapp:${toFormatted}`
        }),
        15000,
        'Twilio API'
      );
      
      console.log("[7] Twilio Response (Success)");
      console.log(`- Message SID: ${message.sid}`);
      console.log(`- Status: ${message.status}`);
      console.log(`- Price: ${message.price || 'N/A'}`);
      console.log(`- Direction: ${message.direction}`);
      console.log(`- Recipient: ${message.to}`);
      
    } catch (err: any) {
      console.error("[7] Twilio Response (Failure)");
      console.error(`- Error Code: ${err.code || 'N/A'}`);
      console.error(`- Error Message: ${err.message}`);
      console.error(`- Status Code: ${err.status || 'N/A'}`);
      console.error(`- More Info URL: ${err.moreInfo || 'N/A'}`);
      
      return { 
        success: false, 
        step: "Twilio", 
        error: err.message, 
        details: `Code: ${err.code}` 
      };
    }

    try {
      await safeQuery(`
        INSERT INTO report_history (twilio_sid, delivery_status) 
        VALUES ('${message.sid}', '${message.status}')
      `, 'History Log');
    } catch (err) {
      console.error("Failed to log report history:", err);
    }

    console.log("[8] Returning Success");
    return { 
      success: true, 
      sid: message.sid, 
      provider: aiProvider, 
      delivery: "sent" 
    };

  } catch (error: any) {
    console.error("[Fatal Error] Report failed:", error);
    return {
      success: false,
      step: "Fatal",
      error: error.message,
      details: error.stack
    };
  }
}
