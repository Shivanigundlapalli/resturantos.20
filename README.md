<div align="center">

<br/>

# 🍽️ RestaurantOS AI

### *The AI-Powered Operating System for Modern Restaurants*

[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-Vercel-black?style=for-the-badge)](https://restrauntos-version-to-final.vercel.app)
[![Backend](https://img.shields.io/badge/🔧%20Backend%20API-Render-46E3B7?style=for-the-badge)](https://restrauntos-version-to-final.onrender.com)
[![Built with](https://img.shields.io/badge/Built%20with-Gemini%20AI-4285F4?style=for-the-badge&logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

<br/>

> **RestaurantOS AI** is a full-stack, AI-powered restaurant management system that lets restaurant owners manage orders, inventory, finance, suppliers, and analytics — all through natural language conversation with a Gemini AI Agent.

<br/>

</div>

---

## ✨ Features

| Module | Description |
|---|---|
| 🤖 **AI Agent** | Chat with a Gemini-powered assistant to manage anything — create orders, audit stock, check finances — all in plain English |
| 📦 **Inventory Hub** | Track ingredient stock levels, safety reorder limits, toggle menu recipe prices, and manage kitchen prep queues |
| 🧾 **Sales & Billing** | Create new orders, generate customer invoices, filter/search order history, and print thermal receipts |
| 💰 **Finance Ledger** | Full credit/debit cash-flow ledger — track income from sales and expenses from supplier settlements |
| 📊 **Analytics Dashboard** | Live business KPIs, revenue analysis, profit margins, menu performance, and ingredient cost breakdowns |
| ⚙️ **Settings & Integrations** | Configure restaurant profile, manage AI integration, run diagnostics, and reset the demo database |
| 🔐 **Authentication** | Secure JWT-based login system with role-based access and session persistence |
| 🎙️ **Voice Input** | Browser speech recognition for hands-free AI command entry (optimized for various accents) |
| 📞 **Twilio Alerts** | Automated WhatsApp messages and emergency voice calls to suppliers for low-stock alerts |
| 💳 **Razorpay Integration** | Integrated online payment processing for seamless customer checkout |
| 📱 **Fully Responsive** | Adapts to all screen sizes — mobile, tablet, and desktop with a slide-in hamburger drawer |

---

## 🖥️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** + **TypeScript** | UI framework |
| **Vite 6** | Build tool & dev server |
| **Tailwind CSS v4** | Utility-first styling |
| **Framer Motion** | Animations & transitions |
| **Lucide React** | Icon library |
| **React Hook Form** + **Zod** | Form validation |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** + **Express** | Fast and scalable REST API |
| **TypeScript** | Type-safe backend logic |
| **Google Gemini AI** | Primary AI Agent reasoning & orchestration |
| **OpenAI** | Fallback AI processing |
| **Supabase (PostgreSQL)** | Cloud relational database |
| **Twilio** | SMS, WhatsApp, and Voice notifications |
| **Razorpay** | Payment Gateway |

### Deployment
| Service | Role |
|---|---|
| **Vercel** | Frontend hosting + static build |
| **Render** | Node.js backend hosting |
| **Supabase** | Managed PostgreSQL database |

---

## 🏗️ Project Architecture

```
restaurantOs/
├── src/                         # React frontend
│   ├── components/              # UI Components (Sidebar, Analytics, Inventory, etc.)
│   ├── customer/                # Customer-facing views (Menu, Cart, Checkout)
│   ├── owner/                   # Owner/Admin views (Menu Management)
│   ├── services/                # API client utilities
│   ├── lib/                     # Shared helpers
│   ├── types.ts                 # TypeScript type definitions
│   └── App.tsx                  # Root application with state management
│
├── server.ts                    # Main Express backend entry point
├── src/lib/                     # Backend services (Twilio, Razorpay, Reports)
├── package.json                 # Node.js dependencies and scripts
├── vercel.json                  # Vercel deployment config
└── vite.config.ts               # Vite dev proxy config
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- A **Gemini API Key** → [Get one here](https://aistudio.google.com/app/apikey)
- A **Supabase** project with PostgreSQL → [supabase.com](https://supabase.com)
- **Twilio** and **Razorpay** accounts for SMS/Payments (Optional for local dev)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Shivanigundlapalli/resturantos.20.git
cd resturantos.20
```

---

### 2. Set Up Environment Variables

Copy the example file and fill in your secrets:

```bash
cp .env.example .env
```

Ensure your `.env` contains your API keys for Supabase, Gemini, OpenAI, Twilio, and Razorpay.

---

### 3. Install Dependencies

```bash
npm install
```

---

### 4. Run Locally

Open **two terminals**:

**Terminal 1 — Start the Express Backend:**
```bash
npm run dev:backend
```
> Backend runs on `http://127.0.0.1:8000`

**Terminal 2 — Start the Vite Frontend:**
```bash
npm run dev
```
> Frontend runs on `http://localhost:5173` (proxies `/api/*` to the backend)

---

### 5. Login

Open [http://localhost:5173](http://localhost:5173) and use the demo credentials:

| Field | Value |
|---|---|
| **Email** | `admin@restaurantos.ai` |
| **Password** | `restaurant123` |

---

## 🤖 AI Agent Capabilities

The Gemini AI Agent can handle natural language commands like:

```
"Show today's sales summary"
"Create an order for Rahul — 2 Masala Dosa, 1 Filter Coffee"
"What items are low on stock?"
"Show today's profit"
"Settle outstanding balance with Dairy Craft"
"Generate a daily operational report"
"Show the top 5 customers today"
"List all pending orders"
```

The agent has access to **live database tools** — it reads and writes to Supabase PostgreSQL in real time.

---

## 🌐 Deployment

### Frontend → Vercel

The `vercel.json` is pre-configured:
- `/api/*` requests are proxied to the Render backend
- All other routes fall back to `index.html` for client-side routing

### Backend → Render

Deploy the project as a **Web Service** on Render:
- **Build Command:** `npm install`
- **Start Command:** `npx tsx server.ts`
- Set all environment variables in the Render dashboard.

---

## 📸 Screenshots

### 🔐 Login Page
Clean, split-panel auth screen with demo credential auto-fill.

### 🤖 AI Agent (Home)
Chat interface with voice input, quick-action suggestion cards, and live restaurant status panel.

### 📦 Inventory Management
Stock level tracker with low-stock alerts, menu price editor, and kitchen prep queue.

### 🧾 Sales & Billing
Order management table with invoice modal, status filters, and receipt printing simulation.

### 💰 Finance Ledger
Full income/expense ledger with cumulative balance, entry filtering, and manual transaction logging.

### 📊 Analytics
Revenue KPI cards, profit margin analysis, top-selling items, and operational health summary.

---

## 👥 Team — Prompt Orchestrators

Built with 💚 by **Team Prompt Orchestrators** for the AI Hackathon:

| Name | Role |
|---|---|
| 👩‍💻 **Thanuja** | AI Agent Integration · System Architecture |
| 👩‍💻 **Shivani Gundlapalli** | Frontend & Backend Development · Razorpay Integration · UI/UX Design · API Development |
| 👩‍💻 **Akshitha Kota** | Website Testing · Quality Assurance |
| 👩‍💻 **Srija Reddy Mamidi** | Frontend Architecture · Testing |

---

## 🙏 Acknowledgements

- [Google Gemini AI](https://ai.google.dev) — AI Agent reasoning engine
- [Supabase](https://supabase.com) — PostgreSQL database platform
- [Twilio](https://twilio.com) — Communications platform
- [Razorpay](https://razorpay.com) — Payment Gateway
- [Vercel](https://vercel.com) — Frontend deployment
- [Render](https://render.com) — Backend deployment
- [Framer Motion](https://www.framer.com/motion/) — UI animations
- [Tailwind CSS](https://tailwindcss.com) — Styling framework
- [Lucide Icons](https://lucide.dev) — Icon set

---

<div align="center">

**Built with ❤️ for the AI Hackathon**

*Team Prompt Orchestrators — Thanuja · Shivani · Akshitha · Srija*

[🚀 Live Demo](https://restrauntos-version-to-final.vercel.app) • [🐛 Report Bug](https://github.com/Shivanigundlapalli/resturantos.20/issues) • [💡 Request Feature](https://github.com/Shivanigundlapalli/resturantos.20/issues)

</div>
