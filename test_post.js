import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:5432/restrauntos'
});

async function test() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const name = "Tomato2";
    const category = "Vegetables";
    const unit = "Kg";
    const currentQty = 10;
    const reorderLevel = 10;
    const unitPrice = 30;
    const supplierId = null;

    let ingredientId;
    const existingIng = await client.query("SELECT id FROM ingredients WHERE name = $1", [name]);
    if (existingIng.rows.length > 0) {
      ingredientId = existingIng.rows[0].id;
      
      const invCheck = await client.query("SELECT id FROM inventory WHERE ingredient_id = $1", [ingredientId]);
      if (invCheck.rows.length > 0) {
        throw new Error("Already exists");
      }
      await client.query("UPDATE ingredients SET category = $1, unit = $2 WHERE id = $3", [category, unit, ingredientId]);
    } else {
      const insertIng = await client.query(
        "INSERT INTO ingredients (name, category, unit) VALUES ($1, $2, $3) RETURNING id",
        [name, category || 'Other', unit]
      );
      ingredientId = insertIng.rows[0].id;
    }

    const insertInv = await client.query(
      "INSERT INTO inventory (ingredient_id, current_qty, reorder_level, unit_price, supplier_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [ingredientId, currentQty, reorderLevel, unitPrice, supplierId || null]
    );
    
    if (currentQty > 0) {
      await client.query(
        "INSERT INTO inventory_transactions (inventory_id, type, amount, reason) VALUES ($1, 'IN', $2, 'Initial Stock')",
        [insertInv.rows[0].id, currentQty]
      );
    }
    await client.query("COMMIT");
    console.log("Success", insertInv.rows[0].id);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error:", e.message);
  } finally {
    client.release();
    pool.end();
  }
}
test();
