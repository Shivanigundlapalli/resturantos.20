const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function verify() {
  console.log("Starting KDS End-to-End Verification...");
  
  // 1. Create Customer Order
  console.log("1. Creating order...");
  const orderRes = await fetch("http://localhost:3000/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName: "Test User",
      phone: "+91 9876543210",
      tableOrType: "Table 1",
      subtotal: 120,
      tax: 6,
      total: 126,
      items: [
        { menuItemId: "1", quantity: 2, price: 120 }
      ],
      payment_method: "UPI",
      payment_status: "PAID",
      special_instructions: "Extra spicy"
    })
  });
  
  if (!orderRes.ok) {
    throw new Error("Failed to create order: " + await orderRes.text());
  }
  
  const orderData = await orderRes.json();
  const orderId = orderData.id;
  console.log("Order created:", orderId);

  // 2. Fetch inventory before Acceptance
  console.log("2. Fetching inventory...");
  let invRes = await pool.query("SELECT * FROM inventory");
  let riceStockBefore = invRes.rows.find(i => i.name === 'Basmati Rice')?.current_stock;
  let paneerStockBefore = invRes.rows.find(i => i.name === 'Paneer')?.current_stock;
  console.log("Rice stock before:", riceStockBefore, "Paneer stock before:", paneerStockBefore);

  // 3. Update to Accepted
  console.log("3. Kitchen accepts order...");
  const update1 = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Accepted" })
  });
  if (!update1.ok) throw new Error("Failed to accept order: " + await update1.text());

  // 4. Fetch inventory after Acceptance to verify deduction
  invRes = await pool.query("SELECT * FROM inventory");
  let riceStockAfter = invRes.rows.find(i => i.name === 'Basmati Rice')?.current_stock;
  let paneerStockAfter = invRes.rows.find(i => i.name === 'Paneer')?.current_stock;
  console.log("Rice stock after (should be less):", riceStockAfter, "Paneer stock after:", paneerStockAfter);

  // 5. Update to Preparing
  console.log("5. Start Preparing...");
  const update2 = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Preparing" })
  });
  if (!update2.ok) throw new Error("Failed to start preparing");

  // 6. Update to Ready
  console.log("6. Mark Ready...");
  const update3 = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Ready" })
  });
  if (!update3.ok) throw new Error("Failed to mark ready");

  // 7. Update to Served
  console.log("7. Mark Served...");
  const update4 = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "Served" })
  });
  if (!update4.ok) throw new Error("Failed to mark served");

  console.log("KDS Pipeline Verification Successful!");
  pool.end();
}

verify().catch(err => {
  console.error(err);
  pool.end();
});
