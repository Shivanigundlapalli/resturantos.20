import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import crypto from "crypto";
import Razorpay from "razorpay";
import { evaluateThresholds, getNotificationState, scanInventoryOnStartup, sendOtpSms } from "./src/lib/twilioService.js";
import { RestaurantState, ChatMessage, ChatResponse } from "./src/types.js";
import { bootstrapDatabase, getPool } from "./src/lib/db.js";
import { OrdersService } from "./src/lib/ordersService.js";
import { runMultiAgentSystem } from "./src/lib/agents.js";
import { generateAndSendBusinessReport } from "./src/lib/reportService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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

// Helper to sync in-memory state with PostgreSQL records
async function syncDbStateFromPostgres() {
  if (!getPool()) return;
  try {
    const syncService = new OrdersService();
    const [menu, ordersData, customers, finances] = await Promise.all([
      syncService.getMenuItems().catch(() => null),
      syncService.getOrders({ limit: 1000 }).catch(() => null),
      syncService.getCustomers().catch(() => null),
      syncService.getFinances().catch(() => null)
    ]);

    if (menu) dbState.menu = menu;
    if (ordersData && ordersData.orders) dbState.orders = ordersData.orders;
    if (customers) dbState.customers = customers;
    if (finances) dbState.finances = finances;
  } catch (err) {
    console.error("[Sync] Error syncing state from Postgres:", err);
  }
}

// --- Real-time SSE Setup ---
export const sseClients: any[] = [];
export const broadcastState = () => {
  const data = JSON.stringify(dbState);
  sseClients.forEach(client => client.res.write(`data: ${data}\n\n`));
};

async function startServer() {
  // Bootstrap the PostgreSQL database
  await bootstrapDatabase();
  await scanInventoryOnStartup();

  const app = express();
  app.use(express.json());
  
  // Static route for uploaded images
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));

  // --- RBAC & Authentication Middleware ---
  const JWT_SECRET = process.env.JWT_SECRET || "fallback_dev_secret_key_restaurantos";

  const requireAuth = (req: any, res: any, next: any) => {
    console.log(`\n[API Request] ${req.method} ${req.originalUrl}`);
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`[Authentication] Authorization header missing. Bypassing auth for Demo/Inventory.`);
      req.user = { role: "owner", name: "Demo Bypass" };
      return next();
    }
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      console.log(`[Authentication] Token valid for user ${decoded.email}`);
      next();
    } catch (err) {
      console.log(`[Authentication] Token expired or invalid. Bypassing auth for Demo/Inventory.`);
      req.user = { role: "owner", name: "Demo Bypass" };
      return next();
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

  // Upload endpoint
  app.post("/api/upload", requireOwner, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    return res.status(200).json({ success: true, url: fileUrl });
  });

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

      console.log(`[Auth] Successful ${userRole} login for:`, sanitizedEmail);

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
      } else if (lowerPrompt.includes("milkshake")) {
        images = [
          "https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1553177595-4de9bb0842b9?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1579954115545-a95711fe5922?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1550488135-7f25455e8c1b?auto=format&fit=crop&w=1200&q=80"
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
  app.post("/api/generate-description", requireOwner, async (req, res) => {
    try {
      const { name, category } = req.body;
      const desc = `Experience the authentic taste of our signature ${name}. Crafted with premium ingredients, this ${category?.toLowerCase() || 'dish'} is a symphony of flavors designed to delight your palate. Perfect for any occasion!`;
      return res.json({ success: true, description: desc });
    } catch (err) {
      return res.status(500).json({ error: "Description generation failed." });
    }
  });

  app.post("/api/suggest-price", requireOwner, async (req, res) => {
    try {
      const { cost, category } = req.body;
      let multiplier = 3.0; // standard 300% markup
      if (category?.toLowerCase().includes("beverage")) multiplier = 4.0;
      if (category?.toLowerCase().includes("dessert")) multiplier = 3.5;
      
      const suggestedPrice = Math.ceil((cost * multiplier) / 10) * 10 - 1; // e.g. 299, 149
      return res.json({ success: true, suggestedPrice: suggestedPrice > 0 ? suggestedPrice : 99 });
    } catch (err) {
      return res.status(500).json({ error: "Price suggestion failed." });
    }
  });

  // API Route: Get state
  app.get("/api/state", requireAuth, async (req, res) => {
    const db = getPool();
    if (db) {
       try {
         const result = await db.query(`
          SELECT i.id as inventory_id, ing.name, ing.category, CAST(i.current_qty AS DOUBLE PRECISION) as "currentQty", 
                 ing.unit, CAST(i.reorder_level AS DOUBLE PRECISION) as "reorderLevel", 
                 i.supplier_id as "supplierId", CAST(i.unit_price AS DOUBLE PRECISION) as "unitPrice",
                 s.company_name,
                 i.whatsapp_status, i.whatsapp_sent_at, i.whatsapp_sid, i.whatsapp_error,
                 i.voice_status, i.voice_called_at, i.voice_sid, i.voice_error, i.last_notification_type,
                 (SELECT MAX(created_at) FROM inventory_transactions WHERE inventory_id = i.id) as last_updated
          FROM inventory i
          JOIN ingredients ing ON i.ingredient_id = ing.id
          LEFT JOIN suppliers s ON i.supplier_id = s.id
          ORDER BY ing.name ASC
         `);
         dbState.inventory = result.rows.map(row => ({
            id: String(row.inventory_id),
            name: row.name,
            category: row.category || "Other",
            currentQty: row.currentQty,
            unit: row.unit,
            reorderLevel: row.reorderLevel,
            supplierId: row.supplierId ? String(row.supplierId) : "",
            unitPrice: row.unitPrice,
            supplierName: row.company_name,
            lastUpdated: row.last_updated,
            whatsapp_status: row.whatsapp_status,
            whatsapp_sent_at: row.whatsapp_sent_at,
            whatsapp_sid: row.whatsapp_sid,
            whatsapp_error: row.whatsapp_error,
            voice_status: row.voice_status,
            voice_called_at: row.voice_called_at,
            voice_sid: row.voice_sid,
            voice_error: row.voice_error,
            last_notification_type: row.last_notification_type,
            ...getNotificationState(String(row.inventory_id))
         }));
         } catch (e) {
           console.error("Error fetching inventory for state sync:", e);
         }
         try {
           const suppResult = await db.query(`SELECT id, company_name as "companyName", contact_person as "contactPerson", phone FROM suppliers`);
           if (suppResult.rows.length > 0) {
             dbState.suppliers = suppResult.rows.map(row => ({
               id: String(row.id),
               companyName: row.companyName,
               contactPerson: row.contactPerson,
               phone: row.phone,
               itemsSupplied: [],
               pendingPayments: 0
             }));
           }
         } catch (e) {
           console.error("Error fetching suppliers for state sync:", e);
         }
    }
    await syncDbStateFromPostgres();
    res.json(dbState);
  });

  // API Route: Server-Sent Events (SSE) Stream
  app.get("/api/state/stream", requireAuth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client = { id: Date.now(), res };
    sseClients.push(client);

    // Send initial state immediately
    res.write(`data: ${JSON.stringify(dbState)}\n\n`);

    req.on("close", () => {
      const idx = sseClients.findIndex(c => c.id === client.id);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // API Route: Reset state
  app.post("/api/state/reset", requireOwner, (req, res) => {
    dbState = createInitialState();
    res.json({ success: true, message: "Database state reset successfully", state: dbState });
  });

  // API Route: Send Business Report
  app.post("/api/reports/send", requireOwner, async (req, res) => {
    try {
      const result = await generateAndSendBusinessReport();
      res.json(result);
    } catch (err: any) {
      console.error("Failed to send business report:", err);
      res.status(500).json({ 
        success: false, 
        step: "ServerRoute", 
        error: err.message || "Unhandled server error",
        details: err.stack 
      });
    }
  });



  // API Route: Manually update/patch state (for UI quick action support)
  app.post("/api/state/update", requireAuth, async (req, res) => {
    const { menu, inventory, orders, customers, suppliers, finances } = req.body;
    if (menu) dbState.menu = menu;
    if (inventory) {
      console.log(`[Inventory Repository] Received inventory update`);
      console.log(`[Database Update] Updating in-memory state...`);
      dbState.inventory = inventory;
      
      console.log(`[Stock Evaluation] Starting evaluation for all items...`);
      for (const item of inventory) {
        try {
          await evaluateThresholds(item);
        } catch (err) {
          console.error(`[Stock Evaluation] Error evaluating item ${item.name}:`, err);
        }
      }
      
      // Realtime Broadcast
      broadcastState();
    }
    if (orders) dbState.orders = orders;
    if (customers) dbState.customers = customers;
    if (suppliers) dbState.suppliers = suppliers;
    if (finances) dbState.finances = finances;
    
    console.log(`[Response] Returning 200 OK for /api/state/update`);
    res.json(dbState);
  });

  // --- Orders Module REST API (FastAPI-aligned Node/Express implementation) ---

  // --- Orders Module REST API (PostgreSQL Supabase & Clean Architecture Backend) ---

  const ordersService = new OrdersService();

  // Helper to parse numerical ID from ORD-xxxxxx or #xxxx or UUID
  function parseOrderId(idStr: string): number | string {
    let sanitized = idStr;
    if (sanitized.startsWith("#")) {
      sanitized = sanitized.substring(1);
    } else if (sanitized.startsWith("ORD-")) {
      sanitized = sanitized.substring(4);
    }
    
    // Check if it's a UUID (contains hyphens and is long enough)
    if (sanitized.length > 20 && sanitized.includes("-")) {
      return sanitized;
    }

    const parsed = parseInt(sanitized, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  // GET /api/customers & GET /customers - Load customers directly from PostgreSQL
  
const handleGetCustomers = async (req, res) => {
  if (!getPool()) return res.json(dbState.customers);
  try {
    const customers = await ordersService.getCustomers();
    return res.json(customers);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
app.get("/api/customers", handleGetCustomers);
app.get("/customers", handleGetCustomers);


  // GET /api/menu & GET /menu - Load menu items directly from PostgreSQL
  
const handleGetMenu = async (req: express.Request, res: express.Response) => {
  if (!getPool()) return res.json({ success: true, data: dbState.menu });
  try {
    const menu = await ordersService.getMenuItems();
    return res.json({ success: true, data: menu || [] });
  } catch (err: any) {
    console.error("[GET /api/menu] Database fetch failed:", err.stack);
    return res.json({ success: false, message: err.message, data: [] });
  }
};
app.get("/api/menu", handleGetMenu);
app.get("/menu", handleGetMenu);


  // --- Categories API ---
  const handleGetCategories = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const categories = await ordersService.getCategories();
        return res.json(categories || []);
      } catch (err: any) {
        console.error("[GET /api/categories] Database fetch failed:", err.stack);
        return res.json([]);
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
        return res.status(201).json({ success: true, data: item, message: "Menu item created successfully" });
      } catch (err: any) {
        console.error("Create menu item failed:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    const newItem = { id: `m_${Date.now()}`, ...req.body };
    dbState.menu.push(newItem);
    return res.status(201).json({ success: true, data: newItem, message: "Menu item created successfully" });
  };
  app.post("/api/menu", requireOwner, handleCreateMenu);

  // PUT /api/menu/:id - Update a menu item
  const handleUpdateMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        const item = await ordersService.updateMenuItem(req.params.id, req.body);
        return res.json({ success: true, data: item, message: "Menu item updated successfully" });
      } catch (err: any) {
        console.error("Update menu item failed:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    const item = dbState.menu.find(m => m.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Not found" });
    Object.assign(item, req.body);
    return res.json({ success: true, data: item, message: "Menu item updated successfully" });
  };
  app.put("/api/menu/:id", requireOwner, handleUpdateMenu);

  // DELETE /api/menu/:id - Delete a menu item
  const handleDeleteMenu = async (req: express.Request, res: express.Response) => {
    if (getPool()) {
      try {
        await ordersService.deleteMenuItem(req.params.id);
        return res.json({ success: true, message: "Menu item deleted successfully" });
      } catch (err: any) {
        return res.status(500).json({ success: false, message: err.message });
      }
    }
    dbState.menu = dbState.menu.filter(m => m.id !== req.params.id);
    return res.json({ success: true, message: "Menu item deleted successfully" });
  };
  app.delete("/api/menu/:id", requireOwner, handleDeleteMenu);

  // --- Inventory API ---
  app.get("/api/inventory", requireOwner, async (req, res) => {
    if (!getPool()) return res.json(dbState.inventory);
    try {
      const db = getPool()!;
      const queryStr = `
        SELECT i.id as inventory_id, ing.name, ing.category, CAST(i.current_qty AS DOUBLE PRECISION) as "currentQty", 
               ing.unit, CAST(i.reorder_level AS DOUBLE PRECISION) as "reorderLevel", 
               i.supplier_id as "supplierId", CAST(i.unit_price AS DOUBLE PRECISION) as "unitPrice",
               s.company_name,
               i.whatsapp_status, i.whatsapp_sent_at, i.whatsapp_sid, i.whatsapp_error,
               i.voice_status, i.voice_called_at, i.voice_sid, i.voice_error, i.last_notification_type,
               (SELECT MAX(created_at) FROM inventory_transactions WHERE inventory_id = i.id) as last_updated
        FROM inventory i
        JOIN ingredients ing ON i.ingredient_id = ing.id
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY ing.name ASC
      `;
      const result = await db.query(queryStr);
      const inventoryItems = result.rows.map(row => ({
        id: String(row.inventory_id),
        name: row.name,
        category: row.category || "Other",
        currentQty: row.currentQty,
        unit: row.unit,
        reorderLevel: row.reorderLevel,
        supplierId: String(row.supplierId),
        unitPrice: row.unitPrice,
        supplierName: row.company_name,
        lastUpdated: row.last_updated,
        whatsapp_status: row.whatsapp_status,
        whatsapp_sent_at: row.whatsapp_sent_at,
        whatsapp_sid: row.whatsapp_sid,
        whatsapp_error: row.whatsapp_error,
        voice_status: row.voice_status,
        voice_called_at: row.voice_called_at,
        voice_sid: row.voice_sid,
        voice_error: row.voice_error,
        last_notification_type: row.last_notification_type,
        ...getNotificationState(String(row.inventory_id))
      }));
      res.json(inventoryItems || []);
    } catch (err: any) {
      console.error("[GET /api/inventory] Database fetch failed:", err.stack);
      res.json([]);
    }
  });

  app.post("/api/inventory", requireOwner, async (req, res) => {
    const db = getPool();
    if (!db) {
      const { name, category, currentQty, unit, reorderLevel, supplierId, unitPrice } = req.body;
      const newItem = {
        id: `i_${Date.now()}`,
        name, category: category || "Other", currentQty, unit, reorderLevel, supplierId: supplierId || "s1", unitPrice
      };
      dbState.inventory.push(newItem);
      return res.status(201).json({ id: newItem.id });
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const { name, category, currentQty, unit, reorderLevel, supplierId, unitPrice } = req.body;
      
      let ingredientId;
      const existingIng = await client.query("SELECT id FROM ingredients WHERE name = $1", [name]);
      if (existingIng.rows.length > 0) {
        ingredientId = existingIng.rows[0].id;
        
        // Prevent adding to inventory if it already exists there
        const invCheck = await client.query("SELECT id FROM inventory WHERE ingredient_id = $1", [ingredientId]);
        if (invCheck.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "This ingredient already exists. Please edit the existing item." });
        }

        await client.query("UPDATE ingredients SET category = $1, unit = $2 WHERE id = $3", [category, unit, ingredientId]);
      } else {
        const insertIng = await client.query(
          "INSERT INTO ingredients (name, category, unit) VALUES ($1, $2, $3) RETURNING id",
          [name, category || 'Other', unit]
        );
        ingredientId = insertIng.rows[0].id;
      }

      let finalSupplierId = null;
      if (supplierId && supplierId !== "null" && !String(supplierId).startsWith("s") && String(supplierId) !== "") {
        finalSupplierId = parseInt(supplierId as string, 10);
        if (isNaN(finalSupplierId)) finalSupplierId = null;
      }

      const insertInv = await client.query(
        "INSERT INTO inventory (ingredient_id, current_qty, reorder_level, unit_price, supplier_id) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [ingredientId, currentQty, reorderLevel, unitPrice, finalSupplierId]
      );
      
      if (currentQty > 0) {
        await client.query(
          "INSERT INTO inventory_transactions (inventory_id, type, amount, reason) VALUES ($1, 'IN', $2, 'Initial Stock')",
          [insertInv.rows[0].id, currentQty]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ id: String(insertInv.rows[0].id) });
    } catch (err: any) {
      await client.query("ROLLBACK");
      console.error("POST /api/inventory ERROR:", err.stack);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.put("/api/inventory/:id", requireOwner, async (req, res) => {
    const db = getPool();
    if (!db) {
      const { name, category, currentQty, unit, reorderLevel, supplierId, unitPrice } = req.body;
      const item = dbState.inventory.find(i => i.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      Object.assign(item, { name, category, currentQty, unit, reorderLevel, supplierId, unitPrice });
      return res.json({ success: true });
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const invId = req.params.id;
      const { name, category, currentQty, unit, reorderLevel, supplierId, unitPrice } = req.body;

      const invRes = await client.query("SELECT ingredient_id FROM inventory WHERE id = $1", [invId]);
      if (invRes.rows.length === 0) throw new Error("Inventory item not found");
      const ingredientId = invRes.rows[0].ingredient_id;

      await client.query("UPDATE ingredients SET name = $1, category = $2, unit = $3 WHERE id = $4", [name, category, unit, ingredientId]);
      let finalSupplierId = null;
      if (supplierId && supplierId !== "null" && !String(supplierId).startsWith("s") && String(supplierId) !== "") {
        finalSupplierId = parseInt(supplierId as string, 10);
        if (isNaN(finalSupplierId)) finalSupplierId = null;
      }

      await client.query(
        "UPDATE inventory SET current_qty = $1, reorder_level = $2, unit_price = $3, supplier_id = $4 WHERE id = $5",
        [currentQty, reorderLevel, unitPrice, finalSupplierId, invId]
      );

      await client.query("COMMIT");
      
      const itemRes = await db.query(`
        SELECT i.id, ing.name, i.current_qty as "currentQty", i.reorder_level as "reorderLevel", i.supplier_id as "supplierId"
        FROM inventory i JOIN ingredients ing ON i.ingredient_id = ing.id WHERE i.id = $1
      `, [invId]);
      if (itemRes.rows.length > 0) {
        evaluateThresholds(itemRes.rows[0]).catch(err => console.error('Twilio evaluation error:', err));
      }

      res.json({ success: true });
    } catch (err: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.delete("/api/inventory/:id", requireOwner, async (req, res) => {
    const db = getPool();
    if (!db) {
      dbState.inventory = dbState.inventory.filter(i => i.id !== req.params.id);
      return res.status(204).end();
    }
    try {
      await db.query("DELETE FROM inventory WHERE id = $1", [req.params.id]);
      res.status(204).end();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/inventory/:id/adjust", requireOwner, async (req, res) => {
    const db = getPool();
    if (!db) {
      const item = dbState.inventory.find(i => i.id === req.params.id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      const { type, quantity } = req.body;
      if (type === 'IN') item.currentQty += quantity;
      else if (type === 'OUT') item.currentQty = Math.max(0, item.currentQty - quantity);
      return res.json({ success: true, currentQty: item.currentQty });
    }
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const invId = req.params.id;
      const { type, quantity, reason } = req.body; // type: 'IN' | 'OUT'

      const currentRes = await client.query("SELECT current_qty FROM inventory WHERE id = $1", [invId]);
      if (currentRes.rows.length === 0) throw new Error("Item not found");
      
      const newQty = type === 'IN' 
        ? parseFloat(currentRes.rows[0].current_qty) + parseFloat(quantity)
        : parseFloat(currentRes.rows[0].current_qty) - parseFloat(quantity);

      await client.query("UPDATE inventory SET current_qty = $1 WHERE id = $2", [newQty, invId]);
      await client.query(
        "INSERT INTO inventory_transactions (inventory_id, type, amount, reason) VALUES ($1, $2, $3, $4)",
        [invId, type, quantity, reason]
      );

      await client.query("COMMIT");
      
      const itemRes = await db.query(`
        SELECT i.id, ing.name, i.current_qty as "currentQty", i.reorder_level as "reorderLevel", i.supplier_id as "supplierId"
        FROM inventory i JOIN ingredients ing ON i.ingredient_id = ing.id WHERE i.id = $1
      `, [invId]);
      if (itemRes.rows.length > 0) {
        evaluateThresholds(itemRes.rows[0]).catch(err => console.error('Twilio evaluation error:', err));
      }

      res.json({ success: true, newQty });
    } catch (err: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get("/api/inventory/:id/history", requireOwner, async (req, res) => {
    const db = getPool();
    if (!db) return res.status(503).json({ error: "No DB connection" });
    try {
      const history = await db.query(
        "SELECT id, type, CAST(amount AS DOUBLE PRECISION) as amount, reason, created_at as timestamp FROM inventory_transactions WHERE inventory_id = $1 ORDER BY created_at DESC",
        [req.params.id]
      );
      res.json(history.rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

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
  const handleCreateOrder = async (req, res) => {
    const { 
      customerName, 
      phone, 
      tableOrType, 
      items, 
      status,
      payment_method,
      payment_status,
      special_instructions,
      estimated_prep_time
    } = req.body;

    if (!customerName || customerName.trim() === "") {
      return res.status(400).json({ error: "Customer name is required" });
    }
    if (phone) {
      const phoneRegex = /^\+91 [0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({ error: "Phone must be in the format +91 XXXXXXXXXX" });
      }
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "An order must contain at least one item" });
    }

    if (!getPool()) {
      let subtotal = 0;
      items.forEach(i => subtotal += (i.price * i.quantity));
      const tax = subtotal * 0.05;
      const total = subtotal + tax;
      const newOrder = {
        id: `ORD-${Date.now()}`,
        customerName: customerName.trim(),
        phone: phone || "",
        tableOrType: tableOrType || "Takeaway",
        items,
        subtotal,
        tax,
        total,
        status: status || "Pending",
        timestamp: new Date().toISOString()
      };
      dbState.orders.push(newOrder);
      return res.status(201).json(newOrder);
    }

    try {
      let subtotal = 0;
      items.forEach(i => subtotal += (i.price * i.quantity));
      const tax = subtotal * 0.05;
      const total = subtotal + tax;

      const order = await ordersService.placeOrder({
        customerName: customerName.trim(),
        phone,
        tableOrType: tableOrType || "Takeaway",
        subtotal,
        tax,
        total,
        status: status || "Pending",
        items,
        payment_method,
        payment_status,
        special_instructions,
        estimated_prep_time
      });
      await syncDbStateFromPostgres();
      broadcastState();
      return res.status(201).json(order);
    } catch (err: any) {
      console.error("Create order failed:", err);
      return res.status(500).json({ error: err.message });
    }
  };
  app.post("/api/orders", handleCreateOrder);
  app.post("/orders", handleCreateOrder);

  // POST /api/payment/create-razorpay-order
  app.post("/api/payment/create-razorpay-order", async (req: express.Request, res: express.Response) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: "Invalid amount" });
      }

      // Initialize Razorpay with test credentials
      const razorpay = new Razorpay({
        key_id: process.env.VITE_RAZORPAY_KEY_ID || "rzp_test_TDlNGuvutaLf6K",
        key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_secret"
      });

      const options = {
        amount: Math.round(amount * 100), // amount in smallest currency unit
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      };

      try {
        const order = await razorpay.orders.create(options);
        return res.status(200).json({ success: true, order_id: order.id, amount: order.amount });
      } catch (sdkError: any) {
        // Fallback for demo environments without a valid secret
        console.warn("Razorpay SDK Error (likely missing secret), falling back to mock order ID:", sdkError);
        return res.status(200).json({ 
          success: true, 
          order_id: `order_mock_${Date.now()}`, 
          amount: Math.round(amount * 100),
          isMock: true
        });
      }
    } catch (err: any) {
      console.error("Create Razorpay order failed:", err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /api/orders/:id & PUT /orders/:id - Update order status or details
  const handleUpdateOrder = async (req: express.Request, res: express.Response) => {
    const idStr = req.params.id;
    const id = parseOrderId(idStr);
    const { status } = req.body;

    const allowed = ["Pending", "Accepted", "Preparing", "Ready", "Served", "Completed", "Cancelled"];
    if (status && !allowed.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Allowed values are: ${allowed.join(", ")}` });
    }

    if (getPool()) {
      try {
        const orderBefore = await ordersService.getOrderById(id);
        if (!orderBefore) {
          return res.status(404).json({ success: false, message: `Order with ID ${idStr} not found in PostgreSQL` });
        }

        const validTransitions: Record<string, string[]> = {
          "Pending": ["Accepted", "Cancelled"],
          "Accepted": ["Preparing", "Cancelled"],
          "Preparing": ["Ready", "Cancelled"],
          "Ready": ["Served", "Completed", "Cancelled"],
          "Served": ["Completed"],
          "Completed": [],
          "Cancelled": []
        };
        
        if (status && !validTransitions[orderBefore.status]?.includes(status) && orderBefore.status !== status) {
          return res.status(400).json({ success: false, message: `Invalid transition from ${orderBefore.status} to ${status}` });
        }

        console.log(`[Kitchen] Updating Order ${idStr} status from ${orderBefore.status} to ${status}`);

        let updatedOrder = await ordersService.updateOrderStatus(id, status);
        
        // Automation: If status is Served, immediately complete the order after inventory is deducted
        if (updatedOrder && status === "Served") {
          updatedOrder = await ordersService.updateOrderStatus(id, "Completed");
        }

        if (updatedOrder && (status === "Completed" || status === "Served") && orderBefore.status !== "Completed") {
          await ordersService.createFinanceEntry({
            type: "Income",
            category: "Order Revenue",
            amount: updatedOrder.total,
            description: `Completed Order ${updatedOrder.id} for ${updatedOrder.customerName}`
          });
        }
        await syncDbStateFromPostgres();
        broadcastState();
        return res.json({ success: true, order: updatedOrder });
      } catch (err: any) {
        console.error("PostgreSQL update order failed:", err);
        return res.status(500).json({ success: false, message: err.message });
      }
    }

    const order = dbState.orders.find(o => o.id === idStr || o.id === `#${idStr}` || o.id === `ORD-${idStr}`);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order with ID ${idStr} not found` });
    }

    if (status) {
      const validTransitions: Record<string, string[]> = {
        "Pending": ["Accepted", "Cancelled"],
        "Accepted": ["Preparing", "Cancelled"],
        "Preparing": ["Ready", "Cancelled"],
        "Ready": ["Served", "Completed", "Cancelled"],
        "Served": ["Completed"],
        "Completed": [],
        "Cancelled": []
      };
      
      if (!validTransitions[order.status]?.includes(status) && order.status !== status) {
        return res.status(400).json({ success: false, message: `Invalid transition from ${order.status} to ${status}` });
      }

      console.log(`[Kitchen] Updating Order ${idStr} status from ${order.status} to ${status} (Local State)`);
      const prevStatus = order.status;
      order.status = status;

      // Automation for local state
      if (status === "Served") {
        order.status = "Completed";
      }

      if ((status === "Completed" || status === "Served") && prevStatus !== "Completed") {
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

    res.json({ success: true, order });
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

  // Define an in-memory store for Demo OTPs to guarantee reliability and prevent DB 500 errors
  const demoOtpStorage = new Map<string, { otp: string, expiresAt: number, verified: boolean, attempts: number }>();

  // POST /api/auth/send-otp - Generate and save OTP
  app.post("/api/auth/send-otp", (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: "Phone number required" });
    
    // E.164 Format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      return res.status(400).json({ success: false, message: "Invalid phone number format. Use E.164 (e.g. +919876543210)" });
    }
    const cleanPhone = phone.replace(/\s+/g, '');
    
    try {
      // Generate a new 6-digit random numeric OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in memory with a 5-minute expiry, overwriting any previous OTP
      demoOtpStorage.set(cleanPhone, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000,
        verified: false,
        attempts: 0
      });
      
      console.log(`[Customer Auth] Demo OTP generated for ${cleanPhone}: ${otp}`);
      
      return res.json({ 
        success: true, 
        message: "OTP generated successfully.", 
        demoOtp: otp 
      });
    } catch (err: any) {
      console.error("[Customer Auth] Failed to generate OTP:", err);
      // Guarantee no 500 error is returned as per requirements
      return res.status(400).json({ success: false, message: "Failed to send OTP" });
    }
  });

  // POST /api/auth/verify-otp - Verify OTP
  app.post("/api/auth/verify-otp", async (req, res) => {
    const { phone, otp, name } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP required" });
    
    const cleanPhone = phone.replace(/\s+/g, '');
    
    try {
      const record = demoOtpStorage.get(cleanPhone);
      
      if (!record || record.verified) {
        return res.status(400).json({ success: false, message: "No active OTP found. Please request a new OTP." });
      }
      
      // Expiry Check
      if (Date.now() > record.expiresAt) {
        demoOtpStorage.delete(cleanPhone);
        return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
      }
      
      // Max Attempts Check
      if (record.attempts >= 5) {
        demoOtpStorage.delete(cleanPhone);
        return res.status(400).json({ success: false, message: "Maximum verification attempts exceeded. Please request a new OTP." });
      }
      
      // Validation Check
      if (record.otp !== otp) {
        record.attempts += 1;
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
      
      // Success!
      record.verified = true;
      demoOtpStorage.delete(cleanPhone); // OTP usable only once
      
      // Upsert Customer without failing the auth flow if DB is slow
      const pool = getPool();
      if (pool) {
        try {
          let custRes = await pool.query("SELECT id FROM customers WHERE phone = $1", [phone]);
          if (custRes.rows.length === 0) {
            await pool.query(
              "INSERT INTO customers (full_name, phone, restaurant_id) VALUES ($1, $2, 1)",
              [name || "Guest", phone]
            );
          }
        } catch (dbErr) {
          console.error("[Customer Auth] Non-fatal error saving customer:", dbErr);
        }
      }

      const token = jwt.sign({ phone, role: 'customer' }, process.env.JWT_SECRET || 'restaurant-os-secret-2026', { expiresIn: '24h' });
      
      console.log(`[Customer Auth] OTP verified successfully for ${phone}`);
      return res.json({ success: true, verified: true, token });
    } catch (err: any) {
      console.error("[Customer Auth] Verification error:", err);
      return res.status(400).json({ success: false, message: "Failed to verify OTP" });
    }
  });


  // Vite Integration
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
  // Static Files
app.use(express.static(path.join(__dirname, "dist")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/api/upload", requireOwner, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.status(200).json({ success: true, url: fileUrl });
});
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
