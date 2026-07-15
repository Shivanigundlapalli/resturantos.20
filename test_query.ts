import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT id, name, category_id, CAST(price AS DOUBLE PRECISION) as price, 
             is_available, description, image_url 
      FROM menu_items 
      ORDER BY name
    `);
    console.log("Success! Rows:", res.rows.length);
  } catch (err) {
    console.error("Query Failed:", err);
  } finally {
    await pool.end();
  }
}

run();
