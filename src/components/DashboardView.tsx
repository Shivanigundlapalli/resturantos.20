import React, { useState } from "react";
import { RestaurantState, Order } from "../types";
import { 
  TrendingUp, 
  ShoppingBag, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  MessageCircle,
  PhoneCall,
  XCircle,
  BellRing,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";

interface DashboardViewProps {
  restaurantState: RestaurantState;
  setActiveTab: (tab: string) => void;
}

export default function DashboardView({ restaurantState, setActiveTab }: DashboardViewProps) {
  const { orders, inventory, menu } = restaurantState;

  // Calculate live stats
  const todayOrders = orders.filter(o => new Date(o.timestamp).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter(o => !["Completed", "Cancelled"].includes(o.status));
  const kitchenQueue = orders.filter(o => o.status === "Preparing" || o.status === "Accepted").length;
  
  const onlineRevenue = todayOrders.filter(o => o.payment_method !== "CASH").reduce((sum, o) => sum + o.total, 0);
  const cashRevenue = todayOrders.filter(o => o.payment_method === "CASH").reduce((sum, o) => sum + o.total, 0);

  const lowStockItems = inventory.filter(i => i.currentQty <= i.reorderLevel);

  // Twilio Notification Metrics
  const today = new Date().toDateString();
  const lowStockNotificationsToday = inventory.filter(i => 
    (i.whatsapp_sent_at && new Date(i.whatsapp_sent_at).toDateString() === today) || 
    (i.voice_called_at && new Date(i.voice_called_at).toDateString() === today)
  ).length;
  const whatsappAlertsSent = inventory.filter(i => i.whatsapp_status === 'Sent').length;
  const voiceCallsMade = inventory.filter(i => i.voice_status === 'Completed').length;
  const failedNotifications = inventory.filter(i => i.whatsapp_status === 'Failed' || i.voice_status === 'Failed').length;
  
  const allNotificationTimes = inventory
    .map(i => Math.max(i.whatsapp_sent_at ? new Date(i.whatsapp_sent_at).getTime() : 0, i.voice_called_at ? new Date(i.voice_called_at).getTime() : 0))
    .filter(time => time > 0);
  const lastNotificationTime = allNotificationTimes.length > 0 ? new Date(Math.max(...allNotificationTimes)) : null;

  const [isSending, setIsSending] = useState(false);

  const handleSendReport = async () => {
    setIsSending(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/reports/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        console.error("Report Error:", data);
        alert(`Failed to Send Business Report\nStep: ${data.step || 'Unknown'}\nError: ${data.error || 'Unknown API Error'}`);
        return;
      }
      
      alert(`Business Report Sent Successfully\nProvider: ${data.provider || 'System'}`);
    } catch (err: any) {
      console.error("Network/Client Error:", err);
      alert(`Failed to Send Business Report\nError: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black text-zinc-100 tracking-tight">Live Dashboard</h1>
            <p className="text-sm text-zinc-400 font-medium">Real-time overview of your restaurant operations.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Live Sync Active</span>
            </div>
            <button 
              onClick={handleSendReport}
              disabled={isSending}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
            >
              {isSending ? <Activity className="w-4 h-4 animate-spin" /> : "📲"}
              {isSending ? "Sending..." : "Send Business Report"}
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-none">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Revenue</div>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-zinc-100">₹{todayRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold">
              <span className="text-zinc-400">💳 Online: ₹{onlineRevenue.toLocaleString()}</span>
              <span className="text-zinc-400">💵 Cash: ₹{cashRevenue.toLocaleString()}</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-none">
            <div className="flex justify-between items-start mb-2">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Orders</div>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-zinc-100">{todayOrders.length}</div>
            <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold">
              <span className="text-amber-500">{todayOrders.filter(o => o.status === 'Completed').length} Completed</span>
              <span className="text-rose-500">{todayOrders.filter(o => o.status === 'Cancelled').length} Cancelled</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-zinc-950 p-5 rounded-2xl shadow-none text-zinc-100 relative overflow-hidden cursor-pointer hover:bg-zinc-900 transition-colors" onClick={() => setActiveTab('orders-board')}>
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Clock className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="text-xs font-bold text-amber-500/80 uppercase tracking-wider">Active Queue</div>
            </div>
            <div className="text-2xl font-black relative z-10">{activeOrders.length}</div>
            <div className="flex items-center gap-3 mt-2 text-[10px] font-semibold relative z-10">
              <span className="text-zinc-100/80">{kitchenQueue} Preparing</span>
              <span className="text-amber-500">View Board →</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`p-5 rounded-2xl border shadow-none cursor-pointer transition-colors ${lowStockItems.length > 0 ? 'bg-red-500/10 border-rose-500/20 hover:bg-red-500/20' : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-950'}`} onClick={() => setActiveTab('inventory')}>
            <div className="flex justify-between items-start mb-2">
              <div className={`text-xs font-bold uppercase tracking-wider ${lowStockItems.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>Inventory Alerts</div>
              <AlertTriangle className={`w-4 h-4 ${lowStockItems.length > 0 ? 'text-rose-500 animate-pulse' : 'text-zinc-400'}`} />
            </div>
            <div className={`text-2xl font-black ${lowStockItems.length > 0 ? 'text-rose-500' : 'text-zinc-100'}`}>{lowStockItems.length}</div>
            <div className={`mt-2 text-[10px] font-semibold ${lowStockItems.length > 0 ? 'text-rose-500' : 'text-zinc-400'}`}>
              {lowStockItems.length > 0 ? 'Items below safety stock' : 'All stock levels healthy'}
            </div>
          </motion.div>
        </div>

        {/* Twilio Notification Live Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 shadow-none flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <BellRing className="w-4 h-4 text-emerald-400" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Alerts Today</div>
            </div>
            <div className="text-xl font-black text-zinc-100">{lowStockNotificationsToday}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 shadow-none flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <MessageCircle className="w-4 h-4 text-emerald-500" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WhatsApp Sent</div>
            </div>
            <div className="text-xl font-black text-zinc-100">{whatsappAlertsSent}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 shadow-none flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <PhoneCall className="w-4 h-4 text-emerald-500" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Voice Calls</div>
            </div>
            <div className="text-xl font-black text-zinc-100">{voiceCallsMade}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 shadow-none flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className={`w-4 h-4 ${failedNotifications > 0 ? 'text-red-500' : 'text-zinc-500'}`} />
              <div className={`text-[10px] font-bold uppercase tracking-wider ${failedNotifications > 0 ? 'text-red-500' : 'text-zinc-400'}`}>Failures</div>
            </div>
            <div className={`text-xl font-black ${failedNotifications > 0 ? 'text-red-500' : 'text-zinc-100'}`}>{failedNotifications}</div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 shadow-none flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Last Notified</div>
            </div>
            <div className="text-xs font-bold text-zinc-300 mt-auto">
              {lastNotificationTime ? lastNotificationTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "None"}
            </div>
          </motion.div>
        </div>

        {/* Live Orders Feed */}
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-none overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
            <h3 className="font-bold text-sm text-zinc-100">Live Orders Feed</h3>
            <button onClick={() => setActiveTab('orders-board')} className="text-xs font-bold text-amber-500 hover:text-amber-500 flex items-center">
              Open Board <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
          <div className="divide-y divide-zinc-800 max-h-[400px] overflow-y-auto">
            {activeOrders.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-sm font-medium">No active orders right now.</div>
            ) : (
              activeOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="p-4 flex items-center justify-between hover:bg-zinc-950 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-zinc-950 flex items-center justify-center font-bold text-zinc-300 text-xs shrink-0">
                      {order.tableOrType.replace('Table ', 'T')}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{order.customerName} <span className="text-zinc-400 font-normal text-xs ml-1">#{order.id.split('-').pop()}</span></div>
                      <div className="text-xs text-zinc-400 mt-0.5">{order.items.length} items • ₹{order.total.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'Pending' ? 'bg-rose-100 text-rose-500' :
                      order.status === 'Preparing' ? 'bg-amber-100 text-amber-700' :
                      order.status === 'Ready' ? 'bg-transparent border border-amber-500/30 text-amber-500' :
                      'bg-zinc-950 text-zinc-300'
                    }`}>
                      {order.status}
                    </span>
                    <div className="text-[10px] text-zinc-400 mt-1 font-semibold flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000)}m ago
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
