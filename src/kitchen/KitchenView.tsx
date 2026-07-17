import React, { useState, useEffect } from "react";
import { ChefHat, CheckCircle2, Clock, Utensils, RefreshCw, XCircle, FileText, User, Banknote } from "lucide-react";
import { motion } from "motion/react";
import { Order } from "../types";
import { supabase } from "../lib/supabaseClient";

export default function KitchenView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchOrders = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
      return;
    }
    try {
      const res = await fetch("/api/orders", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      } else if (res.status === 401 || res.status === 403) {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Failed to fetch kitchen orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token || (user.role !== "kitchen" && user.role !== "owner")) {
      window.location.href = "/";
      return;
    }
    fetchOrders();
    
    if (supabase) {
      const channel = supabase
        .channel('kitchen-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'orders' },
          (payload) => {
            fetchOrders();
          }
        )
        .subscribe();
      return () => {
        supabase?.removeChannel(channel);
      };
    } else {
      const interval = setInterval(fetchOrders, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  const handleUpdateStatus = async (orderId: string, currentStatus: string) => {
    if (isUpdating) return;
    setIsUpdating(orderId);

    let nextStatus = "Served";
    
    if (currentStatus === "Pending") nextStatus = "Preparing";
    else if (currentStatus === "Preparing") nextStatus = "Ready";
    else if (currentStatus === "Ready") nextStatus = "Served";
    
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/orders/${orderId.replace("ORD-", "")}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });

      if (response.ok) {
        await fetchOrders();
      }
    } catch (err) {
      console.error("Error updating order status:", err);
    } finally {
      setIsUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending": return "bg-rose-100 text-rose-500 border-rose-500/20";
      case "Accepted": return "bg-amber-100 text-amber-700 border-emerald-500";
      case "Preparing": return "bg-blue-100 text-blue-700 border-blue-200";
      case "Ready": return "bg-purple-100 text-purple-700 border-purple-200";
      case "Served": 
      case "Completed": return "bg-transparent border border-amber-500/30 text-amber-500 border-amber-500/20";
      default: return "bg-zinc-950 text-zinc-300 border-zinc-800";
    }
  };

  const getNextStatusLabel = (status: string) => {
    switch (status) {
      case "Pending": return "Start Preparing";
      case "Preparing": return "Mark Ready";
      case "Ready": return "Mark Served";
      default: return "";
    }
  };

  const activeOrders = orders.filter(o => o.status !== "Served" && o.status !== "Completed" && o.status !== "Cancelled");
  activeOrders.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-900 text-zinc-100 font-sans overflow-hidden">
      <header className="bg-zinc-950 px-6 py-4 flex justify-between items-center border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-transparent border border-amber-500/30 text-amber-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-zinc-100">Kitchen Display System (KDS)</h1>
            <p className="text-xs text-zinc-400 font-medium">Real-time order progression</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live Sync
          </div>
          <button onClick={() => window.location.href = "/"} className="text-zinc-400 hover:text-zinc-100 transition-colors">
            Exit
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400">
            <RefreshCw className="w-8 h-8 animate-spin mb-4" />
            <p>Loading Kitchen Queue...</p>
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-300">
            <Utensils className="w-16 h-16 mb-4 opacity-20" />
            <h2 className="text-xl font-bold">No Active Orders</h2>
            <p className="text-sm mt-2">The kitchen queue is currently empty.</p>
          </div>
        ) : (
          <div className="flex gap-6 h-full items-start">
            {activeOrders.map(order => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-80 shrink-0 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-xl flex flex-col max-h-full overflow-hidden"
              >
                {/* Card Header */}
                <div className={`px-4 py-3 border-b flex justify-between items-center ${getStatusColor(order.status)} border-opacity-20`}>
                  <div className="font-black text-sm">#{order.id.replace("ORD-", "")}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-zinc-900/20 rounded-md">
                    {order.status}
                  </div>
                </div>

                <div className="px-4 py-3 bg-zinc-900 border-b border-zinc-800 flex flex-col gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span className="font-bold">INV-{order.id.replace("ORD-", "").padStart(4, '0')}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-400 uppercase tracking-wider text-[10px] font-bold">Wait Time</div>
                      <div className="font-bold text-amber-500">
                        {Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000)}m
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col text-zinc-300">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-bold">{order.customerName}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{order.phone}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <div className="text-zinc-100 font-bold">{order.tableOrType}</div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px]">
                        <Banknote className="w-3 h-3 text-amber-500" />
                        <span className={order.payment_status === "PAID" ? "text-amber-500 font-bold" : "text-rose-400 font-bold"}>
                          {order.payment_status} ({order.payment_method})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-4 flex-1 overflow-y-auto bg-zinc-900/50">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-3">Order Items</div>
                  <div className="space-y-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="bg-lux-border text-zinc-100 font-bold text-xs w-6 h-6 rounded flex items-center justify-center shrink-0">
                          {item.quantity}
                        </div>
                        <div className="flex flex-col">
                          <div className="font-bold text-sm text-zinc-100 pt-0.5 leading-tight">
                            {item.name}
                          </div>
                        </div>
                      </div>
                    ))}
                    {order.special_instructions && (
                      <div className="mt-4 p-3 bg-transparent border border-amber-500/30 border border-amber-500/20 rounded-lg">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">Customizations</div>
                        <p className="text-xs text-amber-200/80 leading-relaxed">
                          {order.special_instructions}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-4 bg-zinc-900 border-t border-zinc-800">
                  <button 
                    onClick={() => handleUpdateStatus(order.id, order.status)}
                    disabled={isUpdating === order.id}
                    className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      isUpdating === order.id ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
                    } ${
                      order.status === "Pending" ? 'bg-amber-500 text-zinc-900 hover:bg-amber-400' : 
                      order.status === "Accepted" ? 'bg-blue-500 text-zinc-100 hover:bg-blue-400' :
                      order.status === "Preparing" ? 'bg-purple-500 text-zinc-100 hover:bg-purple-400' :
                      'bg-emerald-500 text-zinc-100 hover:bg-emerald-500'
                    }`}
                  >
                    {isUpdating === order.id ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {order.status === "Pending" ? <CheckCircle2 className="w-5 h-5" /> : 
                         order.status === "Accepted" ? <ChefHat className="w-5 h-5" /> : 
                         order.status === "Preparing" ? <CheckCircle2 className="w-5 h-5" /> :
                         <Utensils className="w-5 h-5" />}
                        {getNextStatusLabel(order.status)}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
