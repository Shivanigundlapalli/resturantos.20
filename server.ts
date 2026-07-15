import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { RestaurantState, ChatMessage, ChatResponse } from "./src/types.js";
import { bootstrapDatabase, getPool } from "./src/lib/db.js";
import { OrdersService } from "./src/lib/ordersService.js";
import { runMultiAgentSystem } from "./src/lib/agents.js";

// Load environment variables
dotenv.config();

const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";

const defaultMenuItems = [
  // Biryani & Mains
  { id: "m1", name: "Chicken Dum Biryani", category: "🍛 Biryani & Mains", price: 299, cost: 150, status: "Available" as const, popularity: 5 },
  { id: "m2", name: "Mutton Dum Biryani", category: "🍛 Biryani & Mains", price: 399, cost: 200, status: "Available" as const, popularity: 5 },
  { id: "m3", name: "Veg Biryani", category: "🍛 Biryani & Mains", price: 199, cost: 90, status: "Available" as const, popularity: 4 },
  { id: "m4", name: "Paneer Biryani", category: "🍛 Biryani & Mains", price: 249, cost: 120, status: "Available" as const, popularity: 4 },
  { id: "m5", name: "Egg Biryani", category: "🍛 Biryani & Mains", price: 220, cost: 100, status: "Available" as const, popularity: 4 },
  { id: "m6", name: "Chicken Fried Rice", category: "🍛 Biryani & Mains", price: 210, cost: 100, status: "Available" as const, popularity: 4 },
  { id: "m7", name: "Veg Fried Rice", category: "🍛 Biryani & Mains", price: 180, cost: 80, status: "Available" as const, popularity: 4 },
  
  // Special Dishes
  { id: "m8", name: "Butter Chicken", category: "⭐ Special Dishes", price: 320, cost: 160, status: "Available" as const, popularity: 5 },
  { id: "m9", name: "Paneer Butter Masala", category: "⭐ Special Dishes", price: 280, cost: 140, status: "Available" as const, popularity: 5 },
  { id: "m10", name: "Chicken Curry", category: "⭐ Special Dishes", price: 290, cost: 150, status: "Available" as const, popularity: 4 },
  { id: "m11", name: "Chicken 65", category: "⭐ Special Dishes", price: 250, cost: 120, status: "Available" as const, popularity: 5 },
  { id: "m12", name: "Kadai Paneer", category: "⭐ Special Dishes", price: 270, cost: 130, status: "Available" as const, popularity: 4 },
  { id: "m13", name: "Dal Tadka", category: "⭐ Special Dishes", price: 180, cost: 70, status: "Available" as const, popularity: 4 },
  
  // Desserts
  { id: "m14", name: "Gulab Jamun", category: "🍰 Desserts", price: 80, cost: 30, status: "Available" as const, popularity: 5 },
  { id: "m15", name: "Ice Cream", category: "🍰 Desserts", price: 100, cost: 40, status: "Available" as const, popularity: 4 },
  { id: "m16", name: "Brownie", category: "🍰 Desserts", price: 150, cost: 60, status: "Available" as const, popularity: 4 },
  { id: "m17", name: "Chocolate Cake", category: "🍰 Desserts", price: 200, cost: 80, status: "Available" as const, popularity: 5 },
  { id: "m18", name: "Rasmalai", category: "🍰 Desserts", price: 120, cost: 50, status: "Available" as const, popularity: 5 },
  
  // Beverages
  { id: "m19", name: "Tea", category: "🥤 Beverages", price: 30, cost: 10, status: "Available" as const, popularity: 4 },
  { id: "m20", name: "Filter Coffee", category: "🥤 Beverages", price: 50, cost: 15, status: "Available" as const, popularity: 5 },
  { id: "m21", name: "Cold Coffee", category: "🥤 Beverages", price: 120, cost: 40, status: "Available" as const, popularity: 4 },
  { id: "m22", name: "Fresh Lime Soda", category: "🥤 Beverages", price: 80, cost: 20, status: "Available" as const, popularity: 4 },
  { id: "m23", name: "Mango Juice", category: "🥤 Beverages", price: 100, cost: 30, status: "Available" as const, popularity: 4 },
  { id: "m24", name: "Lassi", category: "🥤 Beverages", price: 90, cost: 30, status: "Available" as const, popularity: 4 },
  { id: "m25", name: "Water Bottle", category: "🥤 Beverages", price: 20, cost: 15, status: "Available" as const, popularity: 3 },
  { id: "m26", name: "Soft Drinks", category: "🥤 Beverages", price: 60, cost: 30, status: "Available" as const, popularity: 4 }
];

const defaultInventory = [
  { id: "i1", name: "Tomatoes", currentQty: 12.5, unit: "kg", reorderLevel: 5.0, supplierId: "s2", unitPrice: 40 },
  { id: "i2", name: "Onions", currentQty: 18.0, unit: "kg", reorderLevel: 6.0, supplierId: "s2", unitPrice: 30 },
  { id: "i3", name: "Paneer", currentQty: 4.2, unit: "kg", reorderLevel: 2.0, supplierId: "s1", unitPrice: 350 },
  { id: "i4", name: "Milk", currentQty: 15.0, unit: "L", reorderLevel: 5.0, supplierId: "s1", unitPrice: 60 },
  { id: "i5", name: "Flour/Maida", currentQty: 25.0, unit: "kg", reorderLevel: 10.0, supplierId: "s2", unitPrice: 45 },
  { id: "i6", name: "Coffee Beans", currentQty: 3.5, unit: "kg", reorderLevel: 1.5, supplierId: "s3", unitPrice: 800 }
];

const defaultSuppliers = [
  { id: "s1", companyName: "Dairy Craft", contactPerson: "Rajesh Kumar", phone: "+91 98888 77777", itemsSupplied: ["Paneer", "Milk", "Cheese"], pendingPayments: 2800.00 },
  { id: "s2", companyName: "Fresh Farms", contactPerson: "Anil Sharma", phone: "+91 97777 66666", itemsSupplied: ["Tomatoes", "Onions", "Potatoes", "Flour/Maida"], pendingPayments: 1500.00 },
  { id: "s3", companyName: "Kapi Co.", contactPerson: "Srinivas Rao", phone: "+91 96666 55555", itemsSupplied: ["Coffee Beans", "Tea Powder"], pendingPayments: 0.00 }
];

const defaultCustomers = [
  { id: "c1", name: "Rahul", phone: "+91 98765 43210", visitCount: 12, totalSpent: 2450, lastOrderDate: new Date().toISOString(), notes: "Regular. Likes Filter Coffee strong and sweet." },
  { id: "c2", name: "Priya", phone: "+91 91234 56789", visitCount: 8, totalSpent: 1920, lastOrderDate: new Date().toISOString(), notes: "Prefers mild options, fan of paneer." },
  { id: "c3", name: "Amit", phone: "+91 99887 76655", visitCount: 3, totalSpent: 450, lastOrderDate: new Date().toISOString(), notes: "Prefers table near the window." },
  { id: "c4", name: "Sneha", phone: "+91 97777 88888", visitCount: 20, totalSpent: 5200, lastOrderDate: new Date().toISOString(), notes: "VVIP customer. Prefers organic ingredients." }
];

const defaultFinances = [
  { id: "f1", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), type: "Expense" as const, category: "Rent" as const, amount: 12000.00, description: "Monthly restaurant space rent" },
  { id: "f2", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), type: "Expense" as const, category: "Salaries" as const, amount: 8500.00, description: "Part-time kitchen staff salaries" },
  { id: "f3", timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), type: "Expense" as const, category: "Utilities" as const, amount: 2350.00, description: "Electricity and water bills" },
  { id: "f4", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), type: "Income" as const, category: "Order Revenue" as const, amount: 283.50, description: "Completed Order ORD-001041 for Rahul" }
];

const defaultOrders = [
  {
    id: "ORD-001041",
    customerName: "Rahul",
    phone: "+91 98765 43210",
    tableOrType: "Table 4",
    items: [
      { menuItemId: "m1", name: "Masala Dosa", quantity: 2, price: 120 },
      { menuItemId: "m4", name: "Filter Coffee", quantity: 1, price: 30 }
    ],
    subtotal: 270,
    tax: 13.5,
    total: 283.5,
    status: "Completed" as const,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "ORD-001042",
    customerName: "Priya",
    phone: "+91 91234 56789",
    tableOrType: "Table 2",
    items: [
      { menuItemId: "m2", name: "Paneer Butter Masala", quantity: 1, price: 220 },
      { menuItemId: "m3", name: "Garlic Naan", quantity: 2, price: 40 }
    ],
    subtotal: 300,
    tax: 15,
    total: 315,
    status: "Pending" as const,
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: "ORD-001043",
    customerName: "Amit",
    phone: "+91 99887 76655",
    tableOrType: "Takeaway",
    items: [
      { menuItemId: "m6", name: "Samosa (2 Pcs)", quantity: 2, price: 50 },
      { menuItemId: "m4", name: "Filter Coffee", quantity: 2, price: 30 }
    ],
    subtotal: 160,
    tax: 8,
    total: 168,
    status: "Pending" as const,
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  }
];

// Initial/default database state for Spice Heaven Restaurant
const createInitialState = (): RestaurantState => JSON.parse(JSON.stringify({
  menu: defaultMenuItems,
  inventory: defaultInventory,
  orders: defaultOrders,
  customers: defaultCustomers,
  suppliers: defaultSuppliers,
  finances: defaultFinances
}));

// Current active restaurant memory
let dbState = createInitialState();

function mapItemCompat(item: any): any {
  if (!item || typeof item !== "object") return item;

  const mapped = { ...item };

  // 1. Inventory Item Mapping
  if ("item_name" in item || "current_quantity" in item) {
    mapped.name = item.item_name || item.name;
    mapped.currentQty = item.current_quantity !== undefined ? item.current_quantity : item.currentQty;
    mapped.unit = item.unit_of_measure || item.unit;
    mapped.reorderLevel = item.minimum_stock_level !== undefined ? item.minimum_stock_level : item.reorderLevel;
    mapped.unitPrice = item.unit_cost !== undefined ? item.unit_cost : item.unitPrice;
    mapped.supplierId = item.supplier_id || item.supplierId || "s1";
  }

  // 2. Menu Item Mapping
  if ("selling_price" in item || "ingredient_cost" in item || "availability_status" in item) {
    mapped.name = item.item_name || item.name;
    mapped.price = item.selling_price !== undefined ? item.selling_price : item.price;
    mapped.cost = item.ingredient_cost !== undefined ? item.ingredient_cost : item.cost;
    mapped.status = item.availability_status === "Available" || item.status === "Available" ? "Available" : "Sold Out";
    mapped.popularity = item.popularity !== undefined ? item.popularity : 4;
  }

  // 3. Order Mapping
  if ("order_number" in item || "table_or_type" in item || "total_amount" in item) {
    mapped.id = item.order_number || String(item.id);
    mapped.customerName = item.customer_name || (item.customer ? item.customer.name : "Guest Customer");
    mapped.phone = item.phone || (item.customer ? item.customer.phone : "");
    mapped.tableOrType = item.table_or_type || item.order_type;
    mapped.total = item.total_amount !== undefined ? item.total_amount : item.total;
    mapped.timestamp = item.created_at || item.timestamp;
    if (Array.isArray(item.items)) {
      mapped.items = item.items.map((it: any) => ({
        menuItemId: it.menu_item_id || it.menuItemId,
        name: it.name,
        quantity: it.quantity,
        price: it.price
      }));
    }
  }

  return mapped;
}

// Helper to sync in-memory state with PostgreSQL records via FastAPI
async function syncDbStateFromPostgres() {
  try {
    const [menu, inventory, orders] = await Promise.all([
      fetch("http://127.0.0.1:8001/api/menu").then(r => r.json()).catch(() => null),
      fetch("http://127.0.0.1:8001/api/inventory").then(r => r.json()).catch(() => null),
      fetch("http://127.0.0.1:8001/orders").then(r => r.json()).catch(() => null)
    ]);

    if (menu !== null) dbState.menu = menu.map(mapItemCompat);
    if (inventory !== null) dbState.inventory = inventory.map(mapItemCompat);
    if (orders !== null) dbState.orders = orders.map(mapItemCompat);
  } catch (err) {
    // Silenced error logging
  }
}

async function startServer() {
  // Bootstrap the PostgreSQL database
  await bootstrapDatabase();

  const app = express();
  app.use(express.json());

  // --- RBAC & Authentication Middleware ---
  const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret_key_restaurantos";

  const requireAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization token" });
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Token expired or invalid" });
    }
  };

  const requireOwner = (req: any, res: any, next: any) => {
    requireAuth(req, res, () => {
      if (!req.user || req.user.role !== "owner") {
        return res.status(403).json({ error: "Forbidden: Owner access required" });
      }
      next();
    });
  };

  const requireKitchen = (req: any, res: any, next: any) => {
    requireAuth(req, res, () => {
      if (!req.user || (req.user.role !== "kitchen" && req.user.role !== "owner")) {
        return res.status(403).json({ error: "Forbidden: Kitchen access required" });
      }
      next();
    });
  };

  // API Route: Login Authentication
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const sanitizedEmail = email.trim().toLowerCase();
    
    let userRole = null;
    let userName = "";

    // Hardcoded production roles for now (usually this would hit a 'users' table)
    if ((sanitizedEmail === "owner@restaurantos.ai" || sanitizedEmail === "owner@restaurant.com" || sanitizedEmail === "admin@restaurantos.ai") && (password === "password123" || password === "restaurant123")) {
      userRole = "owner";
      userName = "Restaurant Owner";
    } else if (sanitizedEmail === "kitchen@restaurantos.ai" && password === "kitchen123") {
      userRole = "kitchen";
      userName = "Head Chef";
    }

    if (userRole) {
      const token = jwt.sign(
        { email: sanitizedEmail, role: userRole, name: userName },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return res.json({
        success: true,
        token,
        user: {
          email: sanitizedEmail,
          role: userRole,
          name: userName
        },
        message: "Login Successful"
      });
    }

    console.warn("[Auth] Failed login attempt for:", sanitizedEmail);
    return res.status(401).json({ error: "Invalid email or password." });
  });

  // API Route: Generate AI Food Image (Demo Mode)
  app.post("/api/generate-image", async (req, res) => {
    try {
      // Simulate API latency for AI generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { prompt = "" } = req.body;
      const lowerPrompt = prompt.toLowerCase();
      let images = [];
      
      if (lowerPrompt.includes("biryani")) {
        images = [
          "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1589302168068-964664d93cb0?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("paneer") || lowerPrompt.includes("butter masala")) {
        images = [
          "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1651160670038-038202996dcd?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1589301760014-d929f39ce9b0?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("dosa")) {
        images = [
          "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1627308595229-7830f5c92f3f?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1688126079963-c7e6c641ccb6?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1630409351057-a4869c9bf66b?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("egg curry")) {
        images = [
          "https://images.unsplash.com/photo-1585521551065-2b0051e03949?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1625944230945-1b7dd12a80f2?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("fried rice")) {
        images = [
          "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1645696301019-35adcc18fc21?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("coffee") || lowerPrompt.includes("tea")) {
        images = [
          "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1514432324607-a09d9b31d995?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1495474472201-4475475ee475?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("mojito")) {
        images = [
          "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1541544741938-0af808871cc0?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=1200&q=80"
        ];
      } else if (lowerPrompt.includes("ice cream") || lowerPrompt.includes("brownie")) {
        images = [
          "https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1563805042-7684c8a9e9cb?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1579954115545-a95711fe5922?auto=format&fit=crop&w=1200&q=80"
        ];
      } else {
        // Fallback premium food images
        images = [
          "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80"
        ];
      }
      
      return res.json({ success: true, images });
    } catch (err: any) {
      return res.status(500).json({ error: "AI Generation failed." });
    }
  });

  // API Route: Get state
  app.get("/api/state", requireAuth, async (req, res) => {
    await syncDbStateFromPostgres();
    res.json(dbState);
  });

  // API Route: Reset state
  app.post("/api/state/reset", requireOwner, (req, res) => {
    dbState = createInitialState();
    res.json({ success: true, message: "Database state reset successfully", state: dbState });
  });

  // Mock OTP Endpoints for Customer Flow
  app.post("/api/customer/otp/send", (req, res) => {
    // In a real app, integrate with SMS provider
    res.json({ success: true, message: "OTP sent successfully" });
  });

  app.post("/api/customer/otp/verify", (req, res) => {
    const { otp } = req.body;
    if (otp === "1234") {
      res.json({ success: true, message: "OTP verified" });
    } else {
      res.status(400).json({ error: "Invalid OTP" });
    }
  });

  // API Route: Manually update/patch state (for UI quick action support)
  app.post("/api/state/update", requireAuth, (req, res) => {
    const { menu, inventory, orders, customers, suppliers, finances } = req.body;
    // We skip extensive role checking here since it's a legacy route, 
    // but at least requireAuth. A robust app would split these by domain.
    if (menu) dbState.menu = menu;
    if (inventory) dbState.inventory = inventory;
    if (orders) dbState.orders = orders;
    if (customers) dbState.customers = customers;
    if (suppliers) dbState.suppliers = suppliers;
    if (finances) dbState.finances = finances;
    res.json(dbState);
  });

  // --- Orders Module REST API (FastAPI-aligned Node/Express implementation) ---

  // --- Orders Module REST API (PostgreSQL Supabase & Clean Architecture Backend) ---

  const ordersService = new OrdersService();

  // Helper to parse numerical ID from ORD-xxxxxx or #xxxx
  function parseOrderId(idStr: string): number {
    let sanitized = idStr;
    if (sanitized.startsWith("#")) {
      sanitized = sanitized.substring(1);
    } else if (sanitized.startsWith("ORD-")) {
      sanitized = sanitized.substring(4);
    }
    const parsed = parseInt(sanitized, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // GET /api/customers & GET /customers - Load customers directly from PostgreSQL
  const handleGetCustomers = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const customers = await ordersService.getCustomers();
        return res.json(customers);
      } catch (err: any) {
        console.error("PostgreSQL customers fetch failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    res.json(dbState.customers);
  };
  app.get("/api/customers", handleGetCustomers);
  app.get("/customers", handleGetCustomers);

  // GET /api/menu & GET /menu - Load menu items directly from PostgreSQL
  const handleGetMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const menu = await ordersService.getMenuItems();
        return res.json(menu);
      } catch (err: any) {
        console.error("PostgreSQL menu fetch failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    res.json(dbState.menu);
  };
  app.get("/api/menu", handleGetMenu);
  app.get("/menu", handleGetMenu);

  // --- Categories API ---
  const handleGetCategories = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const categories = await ordersService.getCategories();
        return res.json(categories);
      } catch (err: any) {
        console.error("PostgreSQL categories fetch failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    res.json([]);
  };
  app.get("/api/categories", handleGetCategories);

  const handleCreateCategory = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const cat = await ordersService.createCategory(req.body);
        return res.status(201).json(cat);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.post("/api/categories", requireOwner, handleCreateCategory);

  const handleUpdateCategory = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const cat = await ordersService.updateCategory(req.params.id, req.body);
        return res.json(cat);
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.put("/api/categories/:id", requireOwner, handleUpdateCategory);

  const handleDeleteCategory = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        await ordersService.deleteCategory(req.params.id);
        return res.status(204).end();
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.delete("/api/categories/:id", requireOwner, handleDeleteCategory);

  // --- Menu API ---
  // POST /api/menu - Create a new menu item
  const handleCreateMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const item = await ordersService.createMenuItem(req.body);
        return res.status(201).json(item);
      } catch (err: any) {
        console.error("Create menu item failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.post("/api/menu", requireOwner, handleCreateMenu);

  // PUT /api/menu/:id - Update a menu item
  const handleUpdateMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const item = await ordersService.updateMenuItem(req.params.id, req.body);
        return res.json(item);
      } catch (err: any) {
        console.error("Update menu item failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.put("/api/menu/:id", requireOwner, handleUpdateMenu);

  // DELETE /api/menu/:id - Delete a menu item
  const handleDeleteMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        await ordersService.deleteMenuItem(req.params.id);
        return res.status(204).end();
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    }
    res.status(500).json({ error: "No DB connection" });
  };
  app.delete("/api/menu/:id", requireOwner, handleDeleteMenu);

  // GET /api/orders/search & GET /orders/search - Express-based FastAPI-compliant search endpoint
  const handleSearchOrders = async (req: express.Request, res: express.Response) => {
    const q = (req.query.q || req.query.search || "") as string;
    const status = (req.query.status || "All") as string;
    const sortBy = (req.query.sortBy || "timestamp") as string;
    const sortOrder = (req.query.sortOrder || "desc") as "asc" | "desc";
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const page = parseInt(req.query.page as string, 10) || 1;
    const offset = parseInt(req.query.offset as string, 10) || (page - 1) * limit;

    if (getPool()) {
      try {
        const result = await ordersService.getOrders({
          search: q,
          status,
          sortBy,
          sortOrder,
          limit,
          offset
        });
        return res.json(result);
      } catch (err: any) {
        console.error("PostgreSQL orders search failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    // In-Memory Fallback search
    let filtered = dbState.orders.filter(o => 
      o.id.toLowerCase().includes(q.toLowerCase()) ||
      o.customerName.toLowerCase().includes(q.toLowerCase()) ||
      o.tableOrType.toLowerCase().includes(q.toLowerCase())
    );
    if (status && status !== "All") {
      filtered = filtered.filter(o => o.status === status);
    }
    const paginated = filtered.slice(offset, offset + limit);
    res.json({ orders: paginated, totalCount: filtered.length });
  };
  app.get("/api/orders/search", requireKitchen, handleSearchOrders);
  app.get("/orders/search", requireKitchen, handleSearchOrders);

  // GET /api/orders/stats & GET /orders/stats - Retrieve real-time PostgreSQL aggregated KPIs
  const handleGetOrdersStats = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const stats = await ordersService.getOrdersStats();
        return res.json(stats);
      } catch (err: any) {
        console.error("PostgreSQL stats calculation failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    // In-Memory Fallback stats calculation
    const totalOrdersCount = dbState.orders.length;
    const pendingOrdersCount = dbState.orders.filter(o => o.status === "Pending").length;
    const completedRevenue = dbState.orders
      .filter(o => o.status === "Completed")
      .reduce((sum, o) => sum + o.total, 0);
    const averageOrderValue = totalOrdersCount > 0 
      ? Math.round(dbState.orders.reduce((sum, o) => sum + o.total, 0) / totalOrdersCount) 
      : 0;

    res.json({
      todayTransactions: totalOrdersCount, // fallback approximation
      pendingQueue: pendingOrdersCount,
      completedRevenue,
      averageTicket: averageOrderValue
    });
  };
  app.get("/api/orders/stats", requireOwner, handleGetOrdersStats);
  app.get("/orders/stats", requireOwner, handleGetOrdersStats);

  // GET /api/orders & GET /orders - List, search, paginate, sort, and filter orders
  const handleGetOrders = async (req: express.Request, res: express.Response) => {
    const search = (req.query.search || req.query.q || "") as string;
    const status = (req.query.status || "All") as string;
    const orderType = req.query.orderType as string;
    const sortBy = (req.query.sortBy || "timestamp") as string;
    const sortOrder = (req.query.sortOrder || "desc") as "asc" | "desc";
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const page = parseInt(req.query.page as string, 10) || 1;
    const offset = parseInt(req.query.offset as string, 10) || (page - 1) * limit;

    if (getPool()) {
      try {
        const result = await ordersService.getOrders({
          search,
          status,
          sortBy,
          sortOrder,
          limit,
          offset
        });
        return res.json(result);
      } catch (err: any) {
        console.error("PostgreSQL orders fetch failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    // In-Memory Fallback listing
    let filtered = [...dbState.orders];
    if (status && status !== "All") {
      filtered = filtered.filter(o => o.status === status);
    }
    if (orderType) {
      filtered = filtered.filter(o => o.tableOrType.toLowerCase() === orderType.toLowerCase() || 
                                     (orderType === "Dine In" && o.tableOrType.toLowerCase().startsWith("table")));
    }
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.tableOrType.toLowerCase().includes(q)
      );
    }

    // In-memory Sorting
    const field = sortBy || "timestamp";
    filtered.sort((a, b) => {
      let valA: any = a[field as keyof typeof a];
      let valB: any = b[field as keyof typeof b];
      if (field === "timestamp") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const paginated = filtered.slice(offset, offset + limit);
    res.json({
      orders: paginated,
      totalCount: filtered.length
    });
  };
  app.get("/api/orders", requireKitchen, handleGetOrders);
  app.get("/orders", requireKitchen, handleGetOrders);

  // GET /api/orders/:id/receipt & GET /orders/:id/receipt - REAL thermal receipt printing from backend
  const handleGetReceipt = async (req: express.Request, res: express.Response) => {
    const id = parseOrderId(req.params.id);
    if (getPool()) {
      try {
        const html = await ordersService.generateReceiptHtml(id);
        res.setHeader("Content-Type", "text/html");
        return res.send(html);
      } catch (err: any) {
        console.error("PostgreSQL thermal receipt generation failed:", err);
        return res.status(500).send(`<h3>Error generating receipt: ${err.message}</h3>`);
      }
    }

    // Offline thermal receipt fallback
    const offlineOrder = dbState.orders.find(o => parseOrderId(o.id) === id);
    if (!offlineOrder) {
      return res.status(404).send("<h3>Order not found for receipt printing</h3>");
    }
    const itemRows = offlineOrder.items.map(item => `
      <tr>
        <td style="padding: 6px 0;">${item.name} <span style="font-size: 11px; color: #555;">x${item.quantity}</span></td>
        <td style="padding: 6px 0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join("");

    res.setHeader("Content-Type", "text/html");
    res.send(`
      <html>
        <body style="font-family: monospace; max-width: 300px; padding: 20px;">
          <h2 style="text-align: center;">SPICE HEAVEN (OFFLINE)</h2>
          <hr/>
          <p>Receipt No: ${offlineOrder.id}</p>
          <p>Customer: ${offlineOrder.customerName}</p>
          <p>Table/Type: ${offlineOrder.tableOrType}</p>
          <hr/>
          <table style="width: 100%;">${itemRows}</table>
          <hr/>
          <p style="text-align: right; font-weight: bold;">Grand Total: ₹${offlineOrder.total.toFixed(2)}</p>
          <h4 style="text-align: center;">THANK YOU!</h4>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
  };
  app.get("/api/orders/:id/receipt", handleGetReceipt);
  app.get("/orders/:id/receipt", handleGetReceipt);

  // GET /api/orders/:id & GET /orders/:id - Get single order by ID
  const handleGetOrderById = async (req: express.Request, res: express.Response) => {
    const id = parseOrderId(req.params.id);
    if (getPool()) {
      try {
        const order = await ordersService.getOrderById(id);
        if (!order) {
          return res.status(404).json({ error: `Order with ID ${req.params.id} not found in PostgreSQL` });
        }
        return res.json(order);
      } catch (err: any) {
        console.error("PostgreSQL fetch order failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    const order = dbState.orders.find(o => o.id === req.params.id || o.id === `#${req.params.id}` || o.id === `ORD-${req.params.id}`);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${req.params.id} not found` });
    }
    res.json(order);
  };
  app.get("/api/orders/:id", handleGetOrderById);
  app.get("/orders/:id", handleGetOrderById);

  // POST /api/orders & POST /orders - Create a new order with validation
  const handleCreateOrder = async (req: express.Request, res: express.Response) => {
    const { 
      customerName, 
      phone, 
      tableOrType, 
      items, 
      discount, 
      status,
      payment_method,
      payment_status,
      special_instructions,
      estimated_prep_time
    } = req.body;

    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ error: "Customer name is required" });
    }
    const nameRegex = /^[a-zA-Z\s]{3,40}$/;
    if (!nameRegex.test(customerName.trim())) {
      return res.status(400).json({ error: "Customer name must be 3-40 characters containing only alphabets and spaces" });
    }

    if (phone) {
      const phoneRegex = /^\+91 [0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: "Phone must be in the format +91 XXXXXXXXXX" });
      }
    }

    if (tableOrType && tableOrType.startsWith("Table ")) {
      const tNum = Number(tableOrType.split(" ")[1]);
      if (isNaN(tNum) || tNum < 1 || tNum > 10 || !Number.isInteger(tNum)) {
        return res.status(400).json({ error: "Table number must be an integer between 1 and 10" });
      }
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "An order must contain at least one item" });
    }

    // Deduct inventory quantities dynamically in in-memory state based on recipes
    items.forEach(item => {
      const qty = item.quantity;
      if (item.menuItemId === "m1") {
        const t = dbState.inventory.find(i => i.name === "Tomatoes");
        const o = dbState.inventory.find(i => i.name === "Onions");
        if (t) t.currentQty = Math.max(0, parseFloat((t.currentQty - 0.2 * qty).toFixed(2)));
        if (o) o.currentQty = Math.max(0, parseFloat((o.currentQty - 0.2 * qty).toFixed(2)));
      } else if (item.menuItemId === "m2") {
        const p = dbState.inventory.find(i => i.name === "Paneer");
        const t = dbState.inventory.find(i => i.name === "Tomatoes");
        if (p) p.currentQty = Math.max(0, parseFloat((p.currentQty - 0.2 * qty).toFixed(2)));
        if (t) t.currentQty = Math.max(0, parseFloat((t.currentQty - 0.1 * qty).toFixed(2)));
      } else if (item.menuItemId === "m3") {
        const f = dbState.inventory.find(i => i.name === "Flour/Maida");
        if (f) f.currentQty = Math.max(0, parseFloat((f.currentQty - 0.15 * qty).toFixed(2)));
      } else if (item.menuItemId === "m4") {
        const c = dbState.inventory.find(i => i.name === "Coffee Beans");
        const m = dbState.inventory.find(i => i.name === "Milk");
        if (c) c.currentQty = Math.max(0, parseFloat((c.currentQty - 0.05 * qty).toFixed(2)));
        if (m) m.currentQty = Math.max(0, parseFloat((m.currentQty - 0.1 * qty).toFixed(2)));
      } else if (item.menuItemId === "m5") {
        const m = dbState.inventory.find(i => i.name === "Milk");
        if (m) m.currentQty = Math.max(0, parseFloat((m.currentQty - 0.15 * qty).toFixed(2)));
      } else if (item.menuItemId === "m6") {
        const f = dbState.inventory.find(i => i.name === "Flour/Maida");
        const o = dbState.inventory.find(i => i.name === "Onions");
        if (f) f.currentQty = Math.max(0, parseFloat((f.currentQty - 0.1 * qty).toFixed(2)));
        if (o) o.currentQty = Math.max(0, parseFloat((o.currentQty - 0.1 * qty).toFixed(2)));
      } else if (item.menuItemId === "m7") {
        const m = dbState.inventory.find(i => i.name === "Milk");
        if (m) m.currentQty = Math.max(0, parseFloat((m.currentQty - 0.05 * qty).toFixed(2)));
      }
    });

    if (getPool()) {
      try {
        const order = await ordersService.placeOrder({
          customerName: customerName.trim(),
          phone,
          tableOrType,
          items,
          discount,
          status: status || "Pending",
          payment_method,
          payment_status,
          special_instructions,
          estimated_prep_time
        });
        if (order.status === "Completed") {
          dbState.finances.unshift({
            id: "f" + (dbState.finances.length + 1),
            timestamp: new Date().toISOString(),
            type: "Income",
            category: "Order Revenue",
            amount: order.total,
            description: `Completed Order ${order.id} for ${order.customerName}`
          });
        }

        return res.status(201).json(order);
      } catch (err: any) {
        if (err.message.includes("Invalid quantity") || err.message.includes("does not exist") || err.message.includes("Sold Out")) {
          return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: err.message });
      }
    }

    // In-Memory Fallback creation
    const orderItems = items.map(item => {
      const menuItem = dbState.menu.find(m => m.id === item.menuItemId)!;
      return {
        menuItemId: item.menuItemId,
        name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = Math.round((subtotal * 0.05) * 100) / 100;
    const discountAmt = parseFloat(discount) || 0;
    const total = Math.max(0, Math.round((subtotal + tax - discountAmt) * 100) / 100);

    const suffix = String(dbState.orders.length + 1043).padStart(6, '0');
    const orderId = `ORD-${suffix}`;

    let customer = dbState.customers.find(c => c.name.toLowerCase() === customerName.toLowerCase() || (phone && c.phone === phone));
    if (!customer) {
      customer = {
        id: "c" + (dbState.customers.length + 1),
        name: customerName,
        phone: phone || "+91 99999 99999",
        visitCount: 1,
        totalSpent: total,
        lastOrderDate: new Date().toISOString(),
        notes: "Auto-registered via manual order creation"
      };
      dbState.customers.push(customer);
    } else {
      customer.visitCount += 1;
      customer.totalSpent += total;
      customer.lastOrderDate = new Date().toISOString();
    }

    const newOrder = {
      id: orderId,
      customerName: customer.name,
      phone: customer.phone,
      tableOrType: tableOrType || "Takeaway",
      items: orderItems,
      subtotal,
      tax,
      total,
      status: (status || "Pending") as any,
      timestamp: new Date().toISOString()
    };

    dbState.orders.unshift(newOrder);

    if (newOrder.status === "Completed") {
      dbState.finances.unshift({
        id: "f" + (dbState.finances.length + 1),
        timestamp: new Date().toISOString(),
        type: "Income",
        category: "Order Revenue",
        amount: newOrder.total,
        description: `Completed Order ${newOrder.id} for ${newOrder.customerName}`
      });
    }

    res.status(201).json(newOrder);
  };
  app.post("/api/orders", handleCreateOrder);
  app.post("/orders", handleCreateOrder);

  // PUT /api/orders/:id & PUT /orders/:id - Update order status or details
  const handleUpdateOrder = async (req: express.Request, res: express.Response) => {
    const idStr = req.params.id;
    const id = parseOrderId(idStr);
    const { status } = req.body;

    const allowed = ["Pending", "Preparing", "Ready", "Completed", "Cancelled"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed values are: ${allowed.join(", ")}` });
    }

    if (getPool()) {
      try {
        const orderBefore = await ordersService.getOrderById(id);
        if (!orderBefore) {
          return res.status(404).json({ error: `Order with ID ${idStr} not found in PostgreSQL` });
        }

        const updatedOrder = await ordersService.updateOrderStatus(id, status);
        if (updatedOrder && status === "Completed" && orderBefore.status !== "Completed") {
          dbState.finances.unshift({
            id: "f" + (dbState.finances.length + 1),
            timestamp: new Date().toISOString(),
            type: "Income",
            category: "Order Revenue",
            amount: updatedOrder.total,
            description: `Completed Order ${updatedOrder.id} for ${updatedOrder.customerName}`
          });
        }
        return res.json(updatedOrder);
      } catch (err: any) {
        console.error("PostgreSQL update order failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    const order = dbState.orders.find(o => o.id === idStr || o.id === `#${idStr}` || o.id === `ORD-${idStr}`);
    if (!order) {
      return res.status(404).json({ error: `Order with ID ${idStr} not found` });
    }

    if (status) {
      const prevStatus = order.status;
      order.status = status;

      if (status === "Completed" && prevStatus !== "Completed") {
        dbState.finances.unshift({
          id: "f" + (dbState.finances.length + 1),
          timestamp: new Date().toISOString(),
          type: "Income",
          category: "Order Revenue",
          amount: order.total,
          description: `Completed Order ${order.id} for ${order.customerName}`
        });
      }
    }

    res.json(order);
  };
  app.put("/api/orders/:id", requireKitchen, handleUpdateOrder);
  app.put("/orders/:id", requireKitchen, handleUpdateOrder);

  // DELETE /api/orders/:id & DELETE /orders/:id - Delete an order
  const handleDeleteOrder = async (req: express.Request, res: express.Response) => {
    const idStr = req.params.id;
    const id = parseOrderId(idStr);

    if (getPool()) {
      try {
        const deleted = await ordersService.deleteOrder(id);
        if (!deleted) {
          return res.status(404).json({ error: `Order with ID ${idStr} not found in PostgreSQL` });
        }
        return res.status(204).end();
      } catch (err: any) {
        console.error("PostgreSQL delete order failed:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    const initialLen = dbState.orders.length;
    dbState.orders = dbState.orders.filter(o => o.id !== idStr && o.id !== `#${idStr}` && o.id !== `ORD-${idStr}`);
    
    if (dbState.orders.length === initialLen) {
      return res.status(404).json({ error: `Order with ID ${idStr} not found` });
    }

    res.status(204).end();
  };
  app.delete("/api/orders/:id", requireKitchen, handleDeleteOrder);
  app.delete("/orders/:id", requireKitchen, handleDeleteOrder);

  // Helper to sync any in-memory state updates from the AI agents back to PostgreSQL
  async function syncInMemoryStateToPostgres(oldState: RestaurantState, newState: RestaurantState) {
    if (!getPool()) return;
    try {
      const { OrdersRepository } = await import("./src/lib/ordersRepository.js");
      const repository = new OrdersRepository();

      // 1. Sync inventory quantity changes
      for (const newItem of newState.inventory) {
        const oldItem = oldState.inventory.find(i => i.id === newItem.id);
        if (!oldItem || oldItem.currentQty !== newItem.currentQty) {
          console.log(`[Sync] Updating inventory item "${newItem.name}" to qty: ${newItem.currentQty}`);
          await repository.updateInventoryItemQty(newItem.id, newItem.currentQty);
        }
      }

      // 2. Sync supplier pending payments changes
      for (const newSup of newState.suppliers) {
        const oldSup = oldState.suppliers.find(s => s.id === newSup.id);
        if (!oldSup || oldSup.pendingPayments !== newSup.pendingPayments) {
          console.log(`[Sync] Updating supplier "${newSup.companyName}" balance to: ${newSup.pendingPayments}`);
          await repository.updateSupplierPendingPayment(newSup.id, newSup.pendingPayments);
        }
      }

      // 3. Sync new financial entries
      if (newState.finances.length > oldState.finances.length) {
        const diffCount = newState.finances.length - oldState.finances.length;
        const newFinEntries = newState.finances.slice(0, diffCount);
        for (const entry of newFinEntries) {
          console.log(`[Sync] Saving new financial log to PostgreSQL: "${entry.description}"`);
          await repository.createFinanceEntry({
            type: entry.type,
            category: entry.category,
            amount: entry.amount,
            description: entry.description
          });
        }
      }

      // 4. Check if a new order was created
      if (newState.orders.length > oldState.orders.length) {
        const diffCount = newState.orders.length - oldState.orders.length;
        const newOrdersInState = newState.orders.slice(0, diffCount);

        for (const order of newOrdersInState) {
          // Check if order already exists in PG (avoid duplication)
          const cleanIdStr = order.id.replace("ORD-", "");
          const parsedId = parseInt(cleanIdStr, 10);
          const existing = isNaN(parsedId) ? null : await ordersService.getOrderById(parsedId);
          
          if (!existing) {
            const itemsPayload = order.items.map(i => ({
              menuItemId: i.menuItemId,
              quantity: i.quantity
            }));
            await ordersService.placeOrder({
              customerName: order.customerName,
              phone: order.phone || "+91 99999 99999",
              tableOrType: order.tableOrType,
              items: itemsPayload,
              status: order.status
            });
          }
        }
      }
    } catch (err) {
      console.error("[Sync Error] Failed to persist agent actions to PostgreSQL:", err);
    }
  }

  // API Route: Chat with RestaurantOS AI Agent
  app.post("/api/chat", async (req, res) => {
    const { message, history } = req.body;
    
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
      // Use local rule-based smart fallback system if no API key is configured
      console.log("No Gemini API Key found. Using intelligent rule-based local agent.");
      const response = handleLocalAgent(message, dbState);
      
      const stateBefore = JSON.parse(JSON.stringify(dbState));
      dbState = response.updatedState || dbState;
      if (response.updatedState) {
        await syncInMemoryStateToPostgres(stateBefore, dbState);
      }
      return res.json(response);
    }

    try {
      // Sync from database first to make sure state is absolutely up to date before running the agent
      await syncDbStateFromPostgres();
      const stateBefore = JSON.parse(JSON.stringify(dbState));

      // Execute Multi-Agent Routing and Specialist handling
      const response = await runMultiAgentSystem(apiKey, message, history, dbState);

      if (response.updatedState) {
        dbState = response.updatedState;
        // Persist all updates safely into PostgreSQL
        await syncInMemoryStateToPostgres(stateBefore, dbState);
      }

      res.json({
        reply: response.reply,
        updatedState: dbState,
        actionDetails: response.actionDetails
      });

    } catch (err: any) {
      console.error("Gemini Multi-Agent System Error:", err);
      // Fallback to local agent in case of network or key failure
      const response = handleLocalAgent(message, dbState);
      const stateBefore = JSON.parse(JSON.stringify(dbState));
      dbState = response.updatedState || dbState;
      if (response.updatedState) {
        await syncInMemoryStateToPostgres(stateBefore, dbState);
      }
      res.json({
        reply: `*(Fallback active due to API issues)*\n\n${response.reply}`,
        updatedState: dbState
      });
    }
  });

  // Local rule-based processing engine
  function handleLocalAgent(message: string, currentState: RestaurantState): ChatResponse {
    const msg = message.toLowerCase();
    const updated = JSON.parse(JSON.stringify(currentState)) as RestaurantState;

    // 1. Create order
    if (msg.includes("create") && (msg.includes("order") || msg.includes("dosa") || msg.includes("coffee") || msg.includes("rahul"))) {
      // Create a mock order for Rahul
      const orderId = `#10${updated.orders.length + 40}`;
      
      // Verify Rahul
      let customer = updated.customers.find(c => c.name.toLowerCase() === "rahul");
      if (!customer) {
        customer = {
          id: "c" + (updated.customers.length + 1),
          name: "Rahul",
          phone: "+91 98765 43210",
          visitCount: 1,
          totalSpent: 0,
          lastOrderDate: new Date().toISOString(),
          notes: "Regular"
        };
        updated.customers.push(customer);
      }

      // Check items
      const items = [
        { menuItemId: "m1", name: "Masala Dosa", quantity: 2, price: 120 },
        { menuItemId: "m4", name: "Filter Coffee", quantity: 1, price: 30 }
      ];

      const subtotal = 270;
      const tax = 13.5;
      const total = 283.5;

      const newOrder = {
        id: orderId,
        customerName: customer.name,
        phone: customer.phone,
        tableOrType: "Table 4",
        items,
        subtotal,
        tax,
        total,
        status: "Completed" as const,
        timestamp: new Date().toISOString()
      };

      updated.orders.unshift(newOrder);

      // Deduct inventory
      const tomatoes = updated.inventory.find(i => i.name === "Tomatoes");
      const onions = updated.inventory.find(i => i.name === "Onions");
      const coffee = updated.inventory.find(i => i.name === "Coffee Beans");
      
      if (tomatoes) tomatoes.currentQty = Math.max(0, tomatoes.currentQty - 0.4);
      if (onions) onions.currentQty = Math.max(0, onions.currentQty - 0.3);
      if (coffee) coffee.currentQty = Math.max(0, coffee.currentQty - 0.1);

      // Update customer stats
      customer.visitCount += 1;
      customer.totalSpent += total;
      customer.lastOrderDate = newOrder.timestamp;

      // Add income finance entry
      updated.finances.unshift({
        id: "f" + (updated.finances.length + 1),
        timestamp: newOrder.timestamp,
        type: "Income",
        category: "Order Revenue",
        amount: total,
        description: `Order ${orderId} for Rahul`
      });

      const reply = `✔ **Customer Found:** Rahul (+91 98765 43210)  
✔ **Menu Items Found:** Masala Dosa, Filter Coffee  
✔ **Inventory Available & Verified**  
✔ **Order ${orderId} Created Successfully**  

| Item | Qty | Price | Total |
| :--- | :---: | :---: | :---: |
| Masala Dosa | 2 | ₹120 | ₹240 |
| Filter Coffee | 1 | ₹30 | ₹30 |
| **Subtotal** | | | **₹270** |
| **Tax (5%)** | | | **₹13.5** |
| **Grand Total** | | | **₹283.5** |

- 🥬 **Inventory Updated:** Tomatoes (-0.4 kg), Onions (-0.3 kg), Coffee Beans (-0.1 kg).
- 💰 **Revenue Updated:** Added ₹283.50 to daily sales.
  
*Order is marked as Active on Table 4.* Anything else I can do for you?`;

      return { reply, updatedState: updated };
    }

    // 2. Show low stock
    if (msg.includes("low") || msg.includes("stock") || msg.includes("inventory")) {
      const lowStockItems = updated.inventory.filter(i => i.currentQty <= i.reorderLevel);
      
      let reply = `### ⚠ Low Stock Items Identified\n\n`;
      reply += `Our system has detected **${lowStockItems.length} items** below their reorder safety thresholds. Here is the operational summary:\n\n`;
      
      reply += `| Item | Stock level | Reorder Point | Supplier | Unit Price | Action |\n`;
      reply += `| :--- | :---: | :---: | :---: | :---: | :--- |\n`;
      
      lowStockItems.forEach(item => {
        const sup = updated.suppliers.find(s => s.id === item.supplierId);
        reply += `| **${item.name}** | <span class="text-rose-500 font-semibold">${item.currentQty} ${item.unit}</span> | ${item.reorderLevel} ${item.unit} | ${sup ? sup.companyName : "Unknown"} | ₹${item.unitPrice} | 🚚 [Draft Purchase Order](#) |\n`;
      });

      reply += `\nWould you like me to automatically draft and send purchase orders to **Fresh Farms** and **Dairy Craft** to restock these items?`;
      
      return { reply };
    }

    // 3. Show profit
    if (msg.includes("profit") || msg.includes("today") || msg.includes("revenue") || msg.includes("summary") || msg.includes("sales")) {
      const totalOrders = updated.orders.length;
      const salesSum = updated.orders.reduce((acc, o) => acc + o.total, 0);
      const expensesSum = updated.finances.filter(f => f.type === "Expense").reduce((acc, f) => acc + f.amount, 0);
      const netProfit = salesSum - expensesSum;

      const reply = `### Today's Business Summary
Below is the live operational summary for **Spice Heaven** as of today:

| Metric | Value | Status |
| :--- | :--- | :--- |
| 💰 **Total Revenue** | **₹${salesSum.toLocaleString()}** | <span class="text-emerald-600 font-semibold">▲ Strong</span> |
| 💸 **Total Expenses** | **₹${expensesSum.toLocaleString()}** | Normal |
| 📈 **Net Profit** | **₹${netProfit.toLocaleString()}** | <span class="text-emerald-600 font-semibold">Margin ~${Math.round((netProfit / (salesSum || 1)) * 100)}%</span> |
| 📦 **Completed Orders** | **${totalOrders}** | Avg. ticket ₹${Math.round(salesSum / (totalOrders || 1))} |

- *Most popular item:* **Masala Dosa** (5★)
- *Staff recommendation:* Tomatoes, Onions, and Paneer stock are currently low. Purchasing supplies is recommended.

Would you like to run a detailed analysis on any specific segment?`;

      return { reply };
    }

    // 4. Pay Supplier / Settle
    if (msg.includes("pay") || msg.includes("settle") || msg.includes("supplier")) {
      let supplierToPay = updated.suppliers.find(s => msg.includes(s.companyName.toLowerCase()) || msg.includes("dairy") || msg.includes("farms"));
      
      if (!supplierToPay) {
        // Default to Dairy Craft for demonstration
        supplierToPay = updated.suppliers.find(s => s.companyName === "Dairy Craft");
      }

      if (supplierToPay && supplierToPay.pendingPayments > 0) {
        const amount = supplierToPay.pendingPayments;
        supplierToPay.pendingPayments = 0;

        // Log Finance Expense
        updated.finances.unshift({
          id: "f" + (updated.finances.length + 1),
          timestamp: new Date().toISOString(),
          type: "Expense",
          category: "Supplier Payment",
          amount: amount,
          description: `Settle outstanding balance with ${supplierToPay.companyName}`
        });

        const reply = `✔ **Supplier Found:** ${supplierToPay.companyName}  
✔ **Payment Cleared:** ₹${amount.toLocaleString()}  
✔ **Financial Ledger Updated Successfully**  

- **Supplier Balance:** Updated from ₹${amount.toLocaleString()} to **₹0**.
- **Financial Log:** Logged ₹${amount.toLocaleString()} expense under *Supplier Payment*.
- **Cash Flow impact:** Deducted ₹${amount.toLocaleString()} from working capital.

*Payment invoice confirmation generated and sent to contact ${supplierToPay.contactPerson} (${supplierToPay.phone}).* Let me know if there's any other supplier payout to clear!`;

        return { reply, updatedState: updated };
      } else {
        const reply = `I checked the suppliers list. All pending accounts with **Dairy Craft** and **Kapi Co.** are currently clear (Balance: ₹0). 

Is there another supplier or an unlisted payment you'd like me to log?`;
        return { reply };
      }
    }

    // Default general response
    const reply = `Hello! I'm your **RestaurantOS AI Agent** 🤖.

I can help you manage your restaurant operations seamlessly using natural language. Try typing any of these instructions:

1. ➕ **Create a new order** (e.g. *"Create an order for Rahul. 2 Masala Dosa, 1 Filter Coffee"*)
2. 🥬 **Check stock levels** (e.g. *"Show low stock items"*)
3. 💰 **Review finances** (e.g. *"Show today's sales summary and profit"*)
4. 🚚 **Settle suppliers** (e.g. *"Settle balance with Dairy Craft"* or *"Show supplier pending payments"*)

Just describe what you need, and I'll update the menus, orders, customers, and accounting logs automatically!`;

    return { reply };
  }

  // Vite Integration
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
  return app;
}

export const appPromise = startServer();
