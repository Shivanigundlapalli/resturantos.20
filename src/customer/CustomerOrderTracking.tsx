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
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#041A13]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-[#1B3629] rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-[#1B3629] rounded mb-2"></div>
          <div className="h-3 w-24 bg-[#1B3629] rounded"></div>
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

  const statuses = ["Pending", "Accepted", "Preparing", "Ready", "Served", "Completed"];
  let currentStepIndex = statuses.indexOf(order.status);
  
  if (order.status === "Completed") currentStepIndex = 4;
  
  if (currentStepIndex === -1) {
    if (order.status === "Cancelled") currentStepIndex = -1;
    else currentStepIndex = 0;
  }

  const steps = [
    { label: "Order Placed", icon: ReceiptText, time: "Pending" },
    { label: "Accepted", icon: CheckCircle2, time: "Confirmed" },
    { label: "Preparing", icon: ChefHat, time: "Cooking" },
    { label: "Ready", icon: Sparkles, time: "Ready" },
    { label: "Served", icon: Utensils, time: "Enjoy!" }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] relative overflow-hidden font-sans">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #FFFFFF 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <header className="bg-[#0A241C] px-6 py-5 shadow-none z-10 flex flex-col items-center border-b border-[#1B3629]">
        <div className="w-16 h-16 bg-[#041A13] border border-[#D4A53A]/30 text-[#D4A53A] rounded-2xl flex items-center justify-center mb-3 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-[#FFFFFF] tracking-tight">Order Confirmed!</h1>
        <p className="text-sm text-[#A7B4AE] font-medium mt-1">Thank you, {customerName}</p>
        <div className="mt-3 bg-[#041A13] text-[#FFFFFF] font-bold px-3 py-1.5 rounded-xl text-xs tracking-widest border border-[#1B3629]">
          ID: {order.id}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 z-10 pb-20">
        <div className="bg-[#0A241C] rounded-3xl p-6 shadow-lg border border-[#1B3629] mb-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase text-[#A7B4AE] tracking-wider">Live Status</h2>
            <div className="flex items-center gap-1.5 text-[#D4A53A] bg-[#041A13] border border-[#D4A53A]/30 px-2 py-1 rounded-md text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F8F5B] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4A53A]"></span>
              </span>
              Auto-updating
            </div>
          </div>

          <div className="relative pl-4 space-y-8">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-[#041A13]"></div>
            
            {/* Progress Line */}
            {currentStepIndex >= 0 && (
              <motion.div 
                className="absolute left-[27px] top-4 w-0.5 bg-[#D4A53A] origin-top"
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 shadow-none transition-colors duration-500 ${
                    isActive 
                      ? 'bg-[#D4A53A] text-[#041A13] ring-4 ring-[#D4A53A]/20' 
                      : isCompleted 
                        ? 'bg-[#041A13] border border-[#D4A53A]/30 text-[#D4A53A]' 
                        : 'bg-[#041A13] border border-[#1B3629] text-[#A7B4AE]'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black ${isActive ? 'text-[#D4A53A]' : 'text-[#FFFFFF]'}`}>{step.label}</h4>
                    <p className="text-[11px] font-bold text-[#A7B4AE] mt-0.5 flex items-center gap-1">
                      {isActive && <Clock className="w-3 h-3 text-[#D4A53A]" />}
                      {isActive ? "Currently in progress" : step.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-[#0A241C] rounded-3xl p-6 shadow-lg border border-[#1B3629]">
          <h2 className="text-sm font-black uppercase text-[#A7B4AE] tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="font-bold text-[#FFFFFF]">{item.quantity}x {item.name}</span>
                <span className="font-black text-[#FFFFFF]">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-[#1B3629] flex justify-between items-center">
            <span className="font-bold text-[#A7B4AE]">Total Paid</span>
            <span className="text-lg font-black text-[#D4A53A]">₹{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
