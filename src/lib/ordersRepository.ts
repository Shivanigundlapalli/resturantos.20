import { query, getPool } from "./db.js";
import { Order, OrderItem, Customer, MenuItem, InventoryItem, Supplier, FinanceEntry } from "../types.js";

export class OrdersRepository {
  async getCategories(): Promise<any[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT id, name, description, image_url, display_order, is_active, background_color, icon 
      FROM categories 
      ORDER BY display_order ASC, name ASC
    `);
    
    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      image_url: row.image_url,
      display_order: row.display_order,
      is_active: row.is_active,
      background_color: row.background_color,
      icon: row.icon
    }));
  }

  /**
   * Fetches menu items directly from PostgreSQL
   */
  async getMenuItems(): Promise<MenuItem[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT m.id, m.name, m.category_id, CAST(m.price AS DOUBLE PRECISION) as price, 
             m.availability_status, m.description, m.image_url, c.name as category_name,
             m.short_description, m.sub_category, CAST(m.discounted_price AS DOUBLE PRECISION) as discounted_price, 
             CAST(m.gst_percentage AS DOUBLE PRECISION) as gst_percentage, m.calories, 
             m.spice_level, m.dietary_preference, m.tags, m.timing_slot, m.stock_type, 
             m.current_stock, m.addons, m.removable_ingredients, m.images
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.id
      ORDER BY c.display_order ASC, m.name ASC
    `);
    
    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      category_id: row.category_id,
      category: row.category_name || "Main Course",
      price: row.price,
      cost: row.price * 0.4,
      status: row.availability_status as any || "Available",
      popularity: 5,
      description: row.description,
      image: row.image_url,
      short_description: row.short_description,
      sub_category: row.sub_category,
      discounted_price: row.discounted_price,
      gst_percentage: row.gst_percentage,
      calories: row.calories,
      spice_level: row.spice_level,
      dietary_preference: row.dietary_preference,
      isVeg: row.dietary_preference === "Veg" || row.dietary_preference === "Vegan" || row.dietary_preference === "Jain",
      tags: row.tags || [],
      timing_slot: row.timing_slot,
      stock_type: row.stock_type,
      current_stock: row.current_stock,
      addons: row.addons || [],
      removable_ingredients: row.removable_ingredients || [],
      images: row.images || []
    }));
  }

  /**
   * Fetches customer list directly from PostgreSQL
   */
  async getCustomers(): Promise<Customer[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT id, full_name, phone, total_orders as "visitCount", 
             CAST(total_spent AS DOUBLE PRECISION) as "totalSpent", 
             updated_at as "lastOrderDate"
      FROM customers 
      ORDER BY total_orders DESC, full_name
    `);

    return res.rows.map(row => ({
      id: String(row.id),
      name: row.full_name,
      phone: row.phone || "+91 99999 99999",
      visitCount: row.visitCount || 0,
      totalSpent: row.totalSpent || 0,
      lastOrderDate: row.lastOrderDate ? new Date(row.lastOrderDate).toISOString() : new Date().toISOString(),
      notes: ""
    }));
  }

  /**
   * Fetches paginated, sorted, and filtered orders list
   */
  async getOrders(filters: {
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; totalCount: number }> {
    const p = getPool();
    if (!p) return { orders: [], totalCount: 0 };

    const { search, status, sortBy = "created_at", sortOrder = "desc", limit = 10, offset = 0 } = filters;
    
    let whereClauses: string[] = [];
    let params: any[] = [];
    let paramCounter = 1;

    if (status && status !== "All") {
      whereClauses.push(`o.status = $${paramCounter++}`);
      params.push(status);
    }

    if (search) {
      const searchWildcard = `%${search.toLowerCase()}%`;
      whereClauses.push(`(
        LOWER(o.customer_name) LIKE $${paramCounter} OR 
        LOWER(o.phone) LIKE $${paramCounter} OR
        LOWER(o.table_or_type) LIKE $${paramCounter} OR
        CAST(o.id AS TEXT) LIKE $${paramCounter}
      )`);
      params.push(searchWildcard);
      paramCounter++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    
    // Map UI sorting parameters to database columns
    let dbSortColumn = "o.created_at";
    if (sortBy === "id") dbSortColumn = "o.id";
    else if (sortBy === "customerName") dbSortColumn = "o.customer_name";
    else if (sortBy === "tableOrType") dbSortColumn = "o.table_or_type";
    else if (sortBy === "total") dbSortColumn = "o.total";
    else if (sortBy === "timestamp") dbSortColumn = "o.created_at";

    const orderSql = `ORDER BY ${dbSortColumn} ${sortOrder === "asc" ? "ASC" : "DESC"}`;

    // Query to get orders paginated with COUNT(*) OVER() to avoid dual database roundtrips
    const querySql = `
      SELECT o.id, c.full_name as "customerName", c.phone, t.table_number as "tableOrType",
             CAST(o.subtotal AS DOUBLE PRECISION) as subtotal, 
             CAST(o.gst AS DOUBLE PRECISION) as tax, 
             CAST(o.total AS DOUBLE PRECISION) as total, 
             o.status, o.created_at as timestamp,
             COUNT(*) OVER() as "fullCount"
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      ${whereSql}
      ${orderSql}
      LIMIT $${paramCounter++} OFFSET $${paramCounter++}
    `;

    const finalParams = [...params, limit, offset];
    const res = await query(querySql, finalParams);

    if (res.rows.length === 0) {
      return { orders: [], totalCount: 0 };
    }

    const totalCount = parseInt(res.rows[0].fullCount, 10);
    const orderIds = res.rows.map(r => r.id);

    // Fetch order items for these order IDs in a single batch query
    const itemsRes = await query(`
      SELECT oi.order_id as "orderId", oi.menu_item_id as "menuItemId", m.name, oi.quantity, 
             CAST(oi.price AS DOUBLE PRECISION) as price
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ANY($1)
    `, [orderIds]);

    // Map order items back to their parent orders
    const orders: Order[] = res.rows.map(row => {
      const items: OrderItem[] = itemsRes.rows
        .filter(i => i.orderId === row.id)
        .map(i => ({
          menuItemId: i.menuItemId,
          name: i.name || "Unknown Item",
          quantity: i.quantity,
          price: i.price
        }));

      return {
        id: String(row.id),
        customerName: row.customerName || "Walk-in",
        phone: row.phone || "+91 99999 99999",
        tableOrType: row.tableOrType ? `Table ${row.tableOrType}` : "Takeaway",
        items,
        subtotal: row.subtotal,
        tax: row.tax,
        total: row.total,
        status: row.status as any,
        timestamp: new Date(row.timestamp).toISOString()
      };
    });

    return { orders, totalCount };
  }

  /**
   * Fetches single complete order by ID
   */
  async getOrderById(id: number | string): Promise<Order | null> {
    const res = await query(`
      SELECT o.id, c.full_name as "customerName", c.phone, t.table_number as "tableOrType",
             CAST(o.subtotal AS DOUBLE PRECISION) as subtotal, 
             CAST(o.gst AS DOUBLE PRECISION) as tax, 
             CAST(o.total AS DOUBLE PRECISION) as total, 
             o.status, o.created_at as timestamp
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN restaurant_tables t ON o.table_id = t.id
      WHERE o.id = $1
    `, [id]);

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const itemsRes = await query(`
      SELECT oi.menu_item_id as "menuItemId", m.name, oi.quantity, 
             CAST(oi.price AS DOUBLE PRECISION) as price
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = $1
    `, [id]);

    const items: OrderItem[] = itemsRes.rows.map(i => ({
      menuItemId: i.menuItemId,
      name: i.name || "Unknown Item",
      quantity: i.quantity,
      price: i.price
    }));

    return {
      id: String(row.id),
      customerName: row.customerName || "Walk-in",
      phone: row.phone || "+91 99999 99999",
      tableOrType: row.tableOrType ? `Table ${row.tableOrType}` : "Takeaway",
      items,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      status: row.status as any,
      timestamp: new Date(row.timestamp).toISOString()
    };
  }

  /**
   * Saves a new order into PostgreSQL
   */
  async createOrder(orderData: {
    customerName: string;
    phone?: string;
    tableOrType: string;
    subtotal: number;
    tax: number;
    total: number;
    status: "Pending" | "Preparing" | "Ready" | "Served" | "Completed" | "Cancelled";
    items: OrderItem[];
    payment_method?: string;
    payment_status?: string;
    special_instructions?: string;
    estimated_prep_time?: number;
  }): Promise<Order> {
    const p = getPool();
    if (!p) throw new Error("Database offline");

    // Start transaction to secure multi-table inserts
    await query("BEGIN");

    try {
      // Get the single restaurant ID for multi-tenant context
      const restRes = await query("SELECT id FROM restaurants LIMIT 1");
      const restaurantId = restRes.rows.length > 0 ? restRes.rows[0].id : null;

      // Map table number
      let tableId = null;
      if (orderData.tableOrType.startsWith("Table ")) {
        const tNum = parseInt(orderData.tableOrType.split(" ")[1], 10);
        const tRes = await query("SELECT id FROM restaurant_tables WHERE table_number = $1 LIMIT 1", [tNum]);
        if (tRes.rows.length > 0) tableId = tRes.rows[0].id;
      }

      // Check or Upsert Customer CRM records
      let customerId: string | null = null;
      let customerRes = await query(`
        SELECT id, total_orders, total_spent FROM customers 
        WHERE LOWER(full_name) = LOWER($1) OR (phone IS NOT NULL AND phone = $2)
        LIMIT 1
      `, [orderData.customerName, orderData.phone || ""]);

      if (customerRes.rows.length > 0) {
        const cust = customerRes.rows[0];
        customerId = cust.id;
        const nextTotalOrders = (cust.total_orders || 0) + 1;
        const nextTotalSpent = parseFloat(cust.total_spent || 0) + orderData.total;

        await query(`
          UPDATE customers 
          SET total_orders = $1, total_spent = $2, updated_at = NOW()
          WHERE id = $3
        `, [nextTotalOrders, nextTotalSpent, customerId]);
      } else {
        const insertCust = await query(`
          INSERT INTO customers (restaurant_id, full_name, phone, total_orders, total_spent, created_at, updated_at)
          VALUES ($1, $2, $3, 1, $4, NOW(), NOW())
          RETURNING id
        `, [restaurantId, orderData.customerName, orderData.phone || "+91 99999 99999", orderData.total]);
        customerId = insertCust.rows[0].id;
      }

      // Generate Random BigInt for Order Number (mock)
      const orderNumber = Math.floor(Math.random() * 100000);

      // Insert Order Header record
      const orderRes = await query(`
        INSERT INTO orders (restaurant_id, customer_id, table_id, order_number, subtotal, gst, total, status, created_at, payment_method, payment_status, special_instructions, estimated_prep_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11, $12)
        RETURNING id, created_at
      `, [
        restaurantId,
        customerId, 
        tableId,
        orderNumber,
        orderData.subtotal, 
        orderData.tax, 
        orderData.total, 
        orderData.status,
        orderData.payment_method || "Not Specified",
        orderData.payment_status || "NOT PAID",
        orderData.special_instructions || null,
        orderData.estimated_prep_time || 15
      ]);

      const newOrderId = orderRes.rows[0].id;
      const createdAt = orderRes.rows[0].created_at;

      // Insert Order Items records in batch
      for (const item of orderData.items) {
        await query(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, price, total)
          VALUES ($1, $2, $3, $4, $5)
        `, [newOrderId, item.menuItemId, item.quantity, item.price, item.quantity * item.price]);
      }

      await query("COMMIT");

      return {
        id: String(newOrderId),
        customerName: orderData.customerName,
        phone: orderData.phone || "+91 99999 99999",
        tableOrType: orderData.tableOrType,
        items: orderData.items,
        subtotal: orderData.subtotal,
        tax: orderData.tax,
        total: orderData.total,
        status: orderData.status,
        timestamp: new Date(createdAt).toISOString()
      };
    } catch (err) {
      await query("ROLLBACK");
      console.error("Database transaction rolled back:", err);
      throw err;
    }
  }

  /**
   * Updates order status in PostgreSQL
   */
  async updateOrderStatus(id: number, status: "Pending" | "Preparing" | "Ready" | "Served" | "Completed" | "Cancelled"): Promise<Order | null> {
    const res = await query(`
      UPDATE orders 
      SET status = $1 
      WHERE id = $2 
      RETURNING id
    `, [status, id]);

    if (res.rows.length === 0) return null;
    return this.getOrderById(id);
  }

  /**
   * Deletes order from PostgreSQL
   */
  async deleteOrder(id: number): Promise<boolean> {
    // Cascading delete is enabled, so deleting order automatically removes order items.
    const res = await query(`
      DELETE FROM orders 
      WHERE id = $1 
      RETURNING id
    `, [id]);

    return res.rows.length > 0;
  }

  /**
   * Fetches computed order KPIs directly from PostgreSQL
   */
  async getOrdersStats(): Promise<{
    todayTransactions: number;
    pendingQueue: number;
    completedRevenue: number;
    averageTicket: number;
  }> {
    const p = getPool();
    if (!p) {
      return { todayTransactions: 0, pendingQueue: 0, completedRevenue: 0, averageTicket: 0 };
    }

    const querySql = `
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) as "todayTransactions",
        (SELECT COUNT(*) FROM orders WHERE status = 'Pending') as "pendingQueue",
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'Completed') as "completedRevenue",
        (SELECT COALESCE(AVG(total), 0) FROM orders) as "averageTicket"
    `;

    const res = await query(querySql);
    const row = res.rows[0] || {};
    return {
      todayTransactions: parseInt(row.todayTransactions || "0", 10),
      pendingQueue: parseInt(row.pendingQueue || "0", 10),
      completedRevenue: parseFloat(row.completedRevenue || "0"),
      averageTicket: Math.round(parseFloat(row.averageTicket || "0") * 100) / 100
    };
  }

  /**
   * Fetches current stock inventory from PostgreSQL
   */
  async getInventory(): Promise<InventoryItem[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT id, name, CAST(current_qty AS DOUBLE PRECISION) as "currentQty", 
             unit, CAST(reorder_level AS DOUBLE PRECISION) as "reorderLevel", 
             supplier_id as "supplierId", CAST(unit_price AS DOUBLE PRECISION) as "unitPrice"
      FROM inventory
      ORDER BY name
    `);

    return res.rows.map(row => ({
      id: row.id,
      name: row.name,
      currentQty: row.currentQty,
      unit: row.unit,
      reorderLevel: row.reorderLevel,
      supplierId: row.supplierId || "",
      unitPrice: row.unitPrice
    }));
  }

  /**
   * Fetches current active suppliers from PostgreSQL
   */
  async getSuppliers(): Promise<Supplier[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT id, company_name as "companyName", contact_person as "contactPerson", 
             phone, items_supplied as "itemsSupplied", 
             CAST(pending_payments AS DOUBLE PRECISION) as "pendingPayments"
      FROM suppliers
      ORDER BY company_name
    `);

    return res.rows.map(row => ({
      id: row.id,
      companyName: row.companyName,
      contactPerson: row.contactPerson,
      phone: row.phone,
      itemsSupplied: Array.isArray(row.itemsSupplied) ? row.itemsSupplied : (typeof row.itemsSupplied === "string" ? JSON.parse(row.itemsSupplied) : []),
      pendingPayments: row.pendingPayments
    }));
  }

  /**
   * Fetches entire finances accounting ledger from PostgreSQL
   */
  async getFinances(): Promise<FinanceEntry[]> {
    const p = getPool();
    if (!p) return [];

    const res = await query(`
      SELECT id, created_at as timestamp, type, category, 
             CAST(amount AS DOUBLE PRECISION) as amount, description
      FROM finances
      ORDER BY created_at DESC
    `);

    return res.rows.map(row => ({
      id: "f" + row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      type: row.type as any,
      category: row.category as any,
      amount: row.amount,
      description: row.description
    }));
  }

  /**
   * Updates an inventory item current level in PostgreSQL
   */
  async updateInventoryItemQty(id: string, currentQty: number): Promise<boolean> {
    const res = await query(`
      UPDATE inventory 
      SET current_qty = $1 
      WHERE id = $2 
      RETURNING id
    `, [currentQty, id]);
    return res.rows.length > 0;
  }

  /**
   * Updates a supplier outstanding balance in PostgreSQL
   */
  async updateSupplierPendingPayment(id: string, pendingPayments: number): Promise<boolean> {
    const res = await query(`
      UPDATE suppliers 
      SET pending_payments = $1 
      WHERE id = $2 
      RETURNING id
    `, [pendingPayments, id]);
    return res.rows.length > 0;
  }

  /**
   * Logs a new financial transaction into PostgreSQL ledger
   */
  async createFinanceEntry(entry: {
    type: "Income" | "Expense";
    category: string;
    amount: number;
    description: string;
  }): Promise<FinanceEntry> {
    const res = await query(`
      INSERT INTO finances (type, category, amount, description, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING id, created_at
    `, [entry.type, entry.category, entry.amount, entry.description]);

    const row = res.rows[0];
    return {
      id: "f" + row.id,
      timestamp: new Date(row.created_at).toISOString(),
      type: entry.type,
      category: entry.category as any,
      amount: entry.amount,
      description: entry.description
    };
  }
  async createCategory(cat: any): Promise<any> {
    const res = await query(`
      INSERT INTO categories (restaurant_id, name, description, image_url, display_order, is_active, background_color, icon)
      VALUES ((SELECT id FROM restaurants LIMIT 1), $1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [cat.name, cat.description, cat.image_url, cat.display_order || 0, cat.is_active ?? true, cat.background_color || 'bg-white', cat.icon || 'Utensils']);
    return res.rows[0];
  }

  async updateCategory(id: string, cat: any): Promise<any> {
    const res = await query(`
      UPDATE categories 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          image_url = COALESCE($3, image_url),
          display_order = COALESCE($4, display_order),
          is_active = COALESCE($5, is_active),
          background_color = COALESCE($6, background_color),
          icon = COALESCE($7, icon),
          updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [cat.name, cat.description, cat.image_url, cat.display_order, cat.is_active, cat.background_color, cat.icon, id]);
    return res.rows[0];
  }

  async deleteCategory(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM categories WHERE id = $1 RETURNING id`, [id]);
    return res.rows.length > 0;
  }

  async createMenuItem(item: any): Promise<any> {
    const res = await query(`
      INSERT INTO menu_items (
        restaurant_id, category_id, name, description, short_description, price, discounted_price, gst_percentage, 
        image_url, images, preparation_time, calories, spice_level, dietary_preference, tags, timing_slot, 
        stock_type, current_stock, addons, removable_ingredients, availability_status
      )
      VALUES (
        (SELECT id FROM restaurants LIMIT 1), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      RETURNING id
    `, [
      item.category_id, item.name, item.description, item.short_description, item.price, item.discounted_price, item.gst_percentage || 5,
      item.image, item.images || [], item.preparation_time || 15, item.calories, item.spice_level, item.dietary_preference, item.tags || [], item.timing_slot,
      item.stock_type, item.current_stock, item.addons ? JSON.stringify(item.addons) : '[]', item.removable_ingredients ? JSON.stringify(item.removable_ingredients) : '[]', item.status || 'Available'
    ]);
    return res.rows[0];
  }

  async updateMenuItem(id: string, item: any): Promise<any> {
    const res = await query(`
      UPDATE menu_items SET
        category_id = COALESCE($1, category_id),
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        short_description = COALESCE($4, short_description),
        price = COALESCE($5, price),
        discounted_price = COALESCE($6, discounted_price),
        gst_percentage = COALESCE($7, gst_percentage),
        image_url = COALESCE($8, image_url),
        images = COALESCE($9, images),
        preparation_time = COALESCE($10, preparation_time),
        calories = COALESCE($11, calories),
        spice_level = COALESCE($12, spice_level),
        dietary_preference = COALESCE($13, dietary_preference),
        tags = COALESCE($14, tags),
        timing_slot = COALESCE($15, timing_slot),
        stock_type = COALESCE($16, stock_type),
        current_stock = COALESCE($17, current_stock),
        addons = COALESCE($18::jsonb, addons),
        removable_ingredients = COALESCE($19::jsonb, removable_ingredients),
        availability_status = COALESCE($20, availability_status),
        updated_at = NOW()
      WHERE id = $21
      RETURNING id
    `, [
      item.category_id, item.name, item.description, item.short_description, item.price, item.discounted_price, item.gst_percentage,
      item.image, item.images, item.preparation_time, item.calories, item.spice_level, item.dietary_preference, item.tags, item.timing_slot,
      item.stock_type, item.current_stock, item.addons ? JSON.stringify(item.addons) : null, item.removable_ingredients ? JSON.stringify(item.removable_ingredients) : null, item.status, id
    ]);
    return res.rows[0];
  }

  async deleteMenuItem(id: string): Promise<boolean> {
    const res = await query(`DELETE FROM menu_items WHERE id = $1 RETURNING id`, [id]);
    return res.rows.length > 0;
  }
}
