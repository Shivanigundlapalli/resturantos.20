import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let isInitialized = false;

export function getPool(): pg.Pool | null {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("DATABASE_URL environment variable is missing. Database features will be unavailable.");
    return null;
  }

  pool = new Pool({
    connectionString,
    ssl: connectionString.includes("supabase") || connectionString.includes("localhost") ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000
  });

  pool.on("error", (err) => {
    console.error("PostgreSQL Pool error:", err);
  });

  return pool;
}

export async function query(text: string, params?: any[]) {
  const p = getPool();
  if (!p) throw new Error("Database offline");
  return p.query(text, params);
}

export async function bootstrapDatabase() {
  if (isInitialized) return;
  const p = getPool();
  if (!p) return;

  try {
    const connectionString = process.env.DATABASE_URL;

    // Check if tables already exist to avoid wiping out data on every restart
    const tableCheckRes = await p.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'restaurants'
      );
    `);
    
    if (tableCheckRes.rows[0].exists) {
      console.log("ERP tables already exist. Skipping database bootstrap to preserve data.");
      isInitialized = true;
      return;
    }

    // For local development and to fulfill Prompt 1 cleanly, we drop and recreate only if missing.
    console.log("Dropping existing tables for clean ERP schema bootstrap...");
    await p.query(`
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS inventory_transactions CASCADE;
      DROP TABLE IF EXISTS inventory CASCADE;
      DROP TABLE IF EXISTS recipes CASCADE;
      DROP TABLE IF EXISTS ingredients CASCADE;
      DROP TABLE IF EXISTS menu_items CASCADE;
      DROP TABLE IF EXISTS menu_categories CASCADE;
      DROP TABLE IF EXISTS customers CASCADE;
      DROP TABLE IF EXISTS restaurant_tables CASCADE;
      DROP TABLE IF EXISTS restaurants CASCADE;
      DROP TABLE IF EXISTS payments CASCADE;
      DROP TABLE IF EXISTS sales CASCADE;
      DROP TABLE IF EXISTS finance_ledger CASCADE;
      DROP TABLE IF EXISTS report_history CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS kitchen_queue CASCADE;
      DROP TABLE IF EXISTS audit_logs CASCADE;
      DROP TABLE IF EXISTS order_events CASCADE;
      DROP TABLE IF EXISTS kitchen_events CASCADE;

      DROP TABLE IF EXISTS suppliers CASCADE;
      DROP TABLE IF EXISTS finances CASCADE;
      DROP TABLE IF EXISTS otp_verifications CASCADE;
    `);

    console.log("Creating new ERP tables...");

    await p.query(`
      CREATE TABLE restaurants (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE restaurant_tables (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        table_number INT NOT NULL,
        capacity INT DEFAULT 4,
        status VARCHAR(50) DEFAULT 'Available'
      );

      CREATE TABLE customers (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE,
        total_orders INT DEFAULT 0,
        total_spent DECIMAL(12, 2) DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE menu_categories (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image_url TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        background_color VARCHAR(50) DEFAULT 'bg-warm-bg',
        icon VARCHAR(50) DEFAULT 'Utensils'
      );

      CREATE TABLE menu_items (
        id SERIAL PRIMARY KEY,
        category_id INT REFERENCES menu_categories(id) ON DELETE CASCADE,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        short_description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        discounted_price DECIMAL(10, 2),
        cost DECIMAL(10, 2) DEFAULT 0,
        gst_percentage DECIMAL(5, 2) DEFAULT 5,
        status VARCHAR(50) DEFAULT 'Available',
        availability_status VARCHAR(50) DEFAULT 'Available',
        popularity INT DEFAULT 3,
        image_url TEXT,
        images JSONB,
        preparation_time INT DEFAULT 15,
        calories INT,
        spice_level VARCHAR(50),
        is_veg BOOLEAN DEFAULT TRUE,
        is_special BOOLEAN DEFAULT FALSE,
        is_recommended BOOLEAN DEFAULT FALSE,
        dietary_preference VARCHAR(100),
        tags JSONB,
        timing_slot VARCHAR(100),
        stock_type VARCHAR(50),
        current_stock INT DEFAULT 0,
        addons JSONB,
        removable_ingredients JSONB
      );

      CREATE TABLE ingredients (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        category VARCHAR(100),
        unit VARCHAR(50) NOT NULL
      );

      CREATE TABLE recipes (
        id SERIAL PRIMARY KEY,
        menu_item_id INT REFERENCES menu_items(id) ON DELETE CASCADE,
        ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE,
        quantity_required DECIMAL(10, 4) NOT NULL
      );

      CREATE TABLE suppliers (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        pending_payments DECIMAL(12, 2) DEFAULT 0.0
      );

      CREATE TABLE inventory (
        id SERIAL PRIMARY KEY,
        ingredient_id INT REFERENCES ingredients(id) ON DELETE CASCADE UNIQUE,
        current_qty DECIMAL(12, 4) NOT NULL DEFAULT 0,
        reorder_level DECIMAL(12, 4) NOT NULL DEFAULT 0,
        unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
        supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
        whatsapp_status VARCHAR(50) DEFAULT 'Never Sent',
        whatsapp_sent_at TIMESTAMP,
        whatsapp_sid VARCHAR(255),
        whatsapp_error TEXT,
        voice_status VARCHAR(50) DEFAULT 'Never Called',
        voice_called_at TIMESTAMP,
        voice_sid VARCHAR(255),
        voice_error TEXT,
        last_notification_type VARCHAR(50)
      );

      CREATE TABLE inventory_transactions (
        id SERIAL PRIMARY KEY,
        inventory_id INT REFERENCES inventory(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL, -- 'IN' or 'OUT'
        amount DECIMAL(12, 4) NOT NULL,
        reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE orders (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        customer_id INT REFERENCES customers(id) ON DELETE SET NULL,
        table_id INT REFERENCES restaurant_tables(id) ON DELETE SET NULL,
        order_number BIGINT NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        gst DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        payment_method VARCHAR(50) DEFAULT 'Not Specified',
        payment_status VARCHAR(50) DEFAULT 'NOT PAID',
        special_instructions TEXT,
        estimated_prep_time INT DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE order_items (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
        quantity INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL
      );

      CREATE TABLE payments (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        payment_mode VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50) NOT NULL,
        transaction_id VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE sales (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) UNIQUE NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE finance_ledger (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- 'Income' or 'Expense'
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        read_status BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        restaurant_id INT REFERENCES restaurants(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        pin_code VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE otp_verifications (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(50) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE kitchen_queue (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) DEFAULT 'Pending',
        prep_time INT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP
      );

      CREATE TABLE report_history (
        id SERIAL PRIMARY KEY,
        report_type VARCHAR(50) DEFAULT 'Daily Business Report',
        owner_id VARCHAR(50) DEFAULT 'owner_1',
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        twilio_sid VARCHAR(255),
        delivery_status VARCHAR(50)
      );

      
      CREATE TABLE IF NOT EXISTS kitchen_events (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_events (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS otp_verifications (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(50) NOT NULL,
        otp VARCHAR(10) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Seeding essential ERP baseline data...");

    // 1. Restaurant
    const restRes = await p.query(`
      INSERT INTO restaurants (name, phone, address) 
      VALUES ('Spice Heaven', '+91 9876543210', '123 Food Street') 
      RETURNING id
    `);
    const restId = restRes.rows[0].id;

    // 2. Tables (1-10)
    for (let i = 1; i <= 10; i++) {
      await p.query(`INSERT INTO restaurant_tables (restaurant_id, table_number) VALUES ($1, $2)`, [restId, i]);
    }

    // 3. Category & Menu Item & Recipe
    const catRes = await p.query(`
      INSERT INTO menu_categories (restaurant_id, name) VALUES ($1, 'Main Course') RETURNING id
    `, [restId]);
    const catId = catRes.rows[0].id;

    const menuRes = await p.query(`
      INSERT INTO menu_items (category_id, name, price, cost, status, popularity) 
      VALUES ($1, 'Masala Dosa', 120, 40, 'Available', 5) RETURNING id
    `, [catId]);
    const menuId = menuRes.rows[0].id;

    const ingRes1 = await p.query(`INSERT INTO ingredients (name, category, unit) VALUES ('Dosa Batter', 'Other', 'kg') RETURNING id`);
    const ingRes2 = await p.query(`INSERT INTO ingredients (name, category, unit) VALUES ('Potato Masala', 'Vegetables', 'kg') RETURNING id`);
    
    await p.query(`INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES ($1, $2, 0.2)`, [menuId, ingRes1.rows[0].id]);
    await p.query(`INSERT INTO recipes (menu_item_id, ingredient_id, quantity_required) VALUES ($1, $2, 0.1)`, [menuId, ingRes2.rows[0].id]);

    const suppRes = await p.query(`INSERT INTO suppliers (company_name, contact_person, phone) VALUES ('Fresh Foods', 'Rahul', '1234567890') RETURNING id`);
    
    await p.query(`INSERT INTO inventory (ingredient_id, current_qty, reorder_level, unit_price, supplier_id) VALUES ($1, 10, 2, 50, $2)`, [ingRes1.rows[0].id, suppRes.rows[0].id]);
    await p.query(`INSERT INTO inventory (ingredient_id, current_qty, reorder_level, unit_price, supplier_id) VALUES ($1, 5, 1, 60, $2)`, [ingRes2.rows[0].id, suppRes.rows[0].id]);

    console.log("Database table bootstrapping and seeding complete!");
    isInitialized = true;
  } catch (err) {
    console.error("Error bootstrapping database tables:", err);
  }
}

export async function seedMenuIfEmpty() {
  const p = getPool();
  if (!p) return;
  try {
    const restRes = await p.query(`SELECT id FROM restaurants LIMIT 1`);
    const restId = restRes.rows.length > 0 ? restRes.rows[0].id : 1;

    const catNames = ['Main Course', 'Curry', 'Breads'];
    for (let i = 0; i < catNames.length; i++) {
      const exists = await p.query(`SELECT id FROM menu_categories WHERE name = $1`, [catNames[i]]);
      if (exists.rows.length === 0) {
        await p.query(`INSERT INTO menu_categories (restaurant_id, name, display_order) VALUES ($1, $2, $3)`, [restId, catNames[i], i + 1]);
      }
    }

    const mainCourseRes = await p.query(`SELECT id FROM menu_categories WHERE name = 'Main Course' LIMIT 1`);
    const curryRes = await p.query(`SELECT id FROM menu_categories WHERE name = 'Curry' LIMIT 1`);
    const breadsRes = await p.query(`SELECT id FROM menu_categories WHERE name = 'Breads' LIMIT 1`);
    
    const mcId = mainCourseRes.rows[0]?.id || 1;
    const cId = curryRes.rows[0]?.id || 1;
    const bId = breadsRes.rows[0]?.id || 1;

    const itemsToSeed = [
      { catId: mcId, name: 'Chicken Biryani', price: 400, is_veg: false, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?q=100&w=1200&auto=format&fit=crop', desc: 'Aromatic basmati rice cooked with tender chicken and authentic spices.' },
      { catId: mcId, name: 'Mutton Biryani', price: 600, is_veg: false, image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=100&w=1200&auto=format&fit=crop', desc: 'Rich and flavorful slow-cooked mutton biryani with aromatic spices.' },
      { catId: mcId, name: 'Veg Pulao', price: 250, is_veg: true, image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?q=100&w=1200&auto=format&fit=crop', desc: 'Fragrant basmati rice cooked with fresh seasonal vegetables.' },
      { catId: cId, name: 'Paneer Butter Masala', price: 320, is_veg: true, image: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=100&w=1200&auto=format&fit=crop', desc: 'Soft paneer cubes simmered in a rich, creamy tomato gravy.' },
      { catId: bId, name: 'Butter Naan', price: 60, is_veg: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=100&w=1200&auto=format&fit=crop', desc: 'Soft and fluffy Indian flatbread brushed with butter.' }
    ];

    for (const item of itemsToSeed) {
      const exists = await p.query(`SELECT id FROM menu_items WHERE name = $1`, [item.name]);
      if (exists.rows.length === 0) {
        await p.query(`
          INSERT INTO menu_items (restaurant_id, category_id, name, price, is_veg, popularity, status, image_url, description) 
          VALUES ($1, $2, $3, $4, $5, 5, 'Available', $6, $7)
        `, [restId, item.catId, item.name, item.price, item.is_veg, item.image, item.desc]);
        console.log(`Seeded missing item: ${item.name} with HD image.`);
      }
    }
  } catch (err) {
    console.error("Error seeding menu:", err);
  }
}
