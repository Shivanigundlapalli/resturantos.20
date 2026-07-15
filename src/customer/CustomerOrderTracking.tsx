import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, ChefHat, Utensils, ReceiptText, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Order } from "../types";
import { supabase } from "../lib/supabaseClient";

interface CustomerOrderTrackingProps {
  orderId: string;
  customerName: string;
}

export default function CustomerOrderTracking({ orderId, customerName }: CustomerOrderTrackingProps) {
  const [order, setOrder] = useState<Order | null>(null);
  
  useEffect(() => {
    // Initial fetch
    fetchOrder();

    if (supabase) {
      const channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId.replace('#', '').replace('ORD-', '')}` },
          (payload) => {
            fetchOrder();
          }
        )
        .subscribe();
      return () => {
        supabase?.removeChannel(channel);
      };
    } else {
      // Poll for updates every 3 seconds as fallback
      const interval = setInterval(fetchOrder, 3000);
      return () => clearInterval(interval);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId.replace('#', '').replace('ORD-', '')}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.error("Failed to fetch order status:", err);
    }
  };

  if (!order) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-zinc-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-zinc-200 rounded mb-2"></div>
          <div className="h-3 w-24 bg-zinc-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Determine current step based on status
  // For simplicity, we map:
  // Pending -> Received (Step 1)
  // Pending (if time passed, but let's assume Owner changes it to Preparing manually? The prompt says Owner can change Pending -> Preparing -> Ready -> Served)
  // Wait, does the backend support "Preparing", "Ready", "Served"? The prompt says Owner can change it to these.
  // The existing backend `allowed` statuses might only be ["Pending", "Completed", "Cancelled"].
  // But wait, the user's prompt specifically says "Owner should be able to change: Pending -> Preparing -> Ready -> Served".
  // If the backend currently doesn't support these statuses, I need to modify `server.ts` to allow them.
  // For tracking UI, we'll map them:

  const statuses = ["Pending", "Preparing", "Ready", "Completed"]; // "Completed" = "Served" in our UI
  let currentStepIndex = statuses.indexOf(order.status);
  
  // Fallback if status is something else
  if (currentStepIndex === -1) {
    if (order.status === "Cancelled") currentStepIndex = -1;
    else currentStepIndex = 0;
  }

  const steps = [
    { label: "Order Received", icon: ReceiptText, time: "Just now" },
    { label: "Preparing", icon: ChefHat, time: "Approx. 15 mins" },
    { label: "Ready", icon: Sparkles, time: "Almost there" },
    { label: "Served", icon: Utensils, time: "Enjoy your meal!" }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-zinc-50 relative overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, black 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <header className="bg-white px-6 py-5 shadow-sm z-10 flex flex-col items-center border-b border-zinc-100">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-3 shadow-inner">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">Order Confirmed!</h1>
        <p className="text-sm text-zinc-500 font-medium mt-1">Thank you, {customerName}</p>
        <div className="mt-3 bg-zinc-100 text-zinc-800 font-bold px-3 py-1 rounded-lg text-xs tracking-widest border border-zinc-200">
          ID: {order.id}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 z-10">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100 mb-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase text-zinc-400 tracking-wider">Live Status</h2>
            <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Auto-updating
            </div>
          </div>

          <div className="relative pl-4 space-y-8">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-zinc-100"></div>
            
            {/* Progress Line */}
            {currentStepIndex >= 0 && (
              <motion.div 
                className="absolute left-[27px] top-4 w-0.5 bg-emerald-500 origin-top"
                initial={{ height: 0 }}
                animate={{ height: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              ></motion.div>
            )}

            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isPending = index > currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={index} className={`relative flex items-center gap-5 transition-opacity duration-300 ${isPending ? 'opacity-40' : 'opacity-100'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-sm transition-colors duration-500 ${
                    isActive 
                      ? 'bg-emerald-500 text-white ring-4 ring-emerald-50' 
                      : isCompleted 
                        ? 'bg-emerald-100 text-emerald-600' 
                        : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black ${isActive ? 'text-emerald-600' : 'text-zinc-900'}`}>{step.label}</h4>
                    <p className="text-[11px] font-bold text-zinc-400 mt-0.5 flex items-center gap-1">
                      {isActive && <Clock className="w-3 h-3 text-emerald-500" />}
                      {isActive ? "Currently in progress" : step.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-zinc-100">
          <h2 className="text-sm font-black uppercase text-zinc-400 tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="font-bold text-zinc-700">{item.quantity}x {item.name}</span>
                <span className="font-black text-zinc-900">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-zinc-100 flex justify-between items-center">
            <span className="font-bold text-zinc-500">Total Paid</span>
            <span className="text-lg font-black text-emerald-600">₹{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
