import { Pool } from 'pg';
import { config } from 'dotenv';
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add new columns to categories
    console.log("Migrating categories...");
    await client.query(`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS background_color VARCHAR(255) DEFAULT 'bg-white',
      ADD COLUMN IF NOT EXISTS icon VARCHAR(255) DEFAULT 'Utensils';
    `);

    // Add new columns to menu_items
    console.log("Migrating menu_items...");
    await client.query(`
      ALTER TABLE menu_items
      ADD COLUMN IF NOT EXISTS short_description TEXT,
      ADD COLUMN IF NOT EXISTS sub_category VARCHAR(255),
      ADD COLUMN IF NOT EXISTS discounted_price NUMERIC,
      ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC DEFAULT 5,
      ADD COLUMN IF NOT EXISTS calories INTEGER,
      ADD COLUMN IF NOT EXISTS spice_level VARCHAR(50),
      ADD COLUMN IF NOT EXISTS dietary_preference VARCHAR(50),
      ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'Available',
      ADD COLUMN IF NOT EXISTS tags TEXT[],
      ADD COLUMN IF NOT EXISTS timing_slot VARCHAR(50) DEFAULT 'Available All Day',
      ADD COLUMN IF NOT EXISTS stock_type VARCHAR(50) DEFAULT 'Unlimited',
      ADD COLUMN IF NOT EXISTS current_stock INTEGER,
      ADD COLUMN IF NOT EXISTS addons JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS removable_ingredients JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS images TEXT[];
    `);

    // Update existing menu_items to map is_available to availability_status
    console.log("Backfilling availability_status...");
    await client.query(`
      UPDATE menu_items
      SET availability_status = CASE 
        WHEN is_available = true THEN 'Available'
        ELSE 'Out Of Stock'
      END
      WHERE availability_status IS NULL OR availability_status = 'Available';
    `);

    // Ensure array columns are at least empty arrays instead of null
    await client.query(`
      UPDATE menu_items SET tags = '{}' WHERE tags IS NULL;
      UPDATE menu_items SET images = '{}' WHERE images IS NULL;
    `);

    await client.query('COMMIT');
    console.log("Migration successful!");
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
