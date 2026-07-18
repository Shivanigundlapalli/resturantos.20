import React, { useState, useEffect } from "react";
import { CheckCircle2, Clock, ChefHat, Utensils, ReceiptText, Sparkles, ChevronLeft } from "lucide-react";
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

    // Always poll as a robust fallback to ensure synchronization
    const interval = setInterval(fetchOrder, 3000);

    let channel: any;
    if (supabase) {
      channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId.replace('#', '').replace('ORD-', '')}` },
          (payload) => {
            fetchOrder();
          }
        )
        .subscribe();
    }
    
    return () => {
      clearInterval(interval);
      if (channel) {
        supabase?.removeChannel(channel);
      }
    };
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-warm-bg">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-warm-bg rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-warm-bg rounded mb-2"></div>
          <div className="h-3 w-24 bg-warm-bg rounded"></div>
        </div>
      </div>
    );
  }

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
    <div className="w-full h-full flex flex-col bg-warm-bg relative overflow-hidden font-sans">
      <header className="bg-warm-bg px-6 py-8 flex flex-col items-center border-b border-warm-border shrink-0">
        <div className="w-16 h-16 bg-customer-primary/10 text-customer-primary rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-text-main tracking-tight">Order Active</h1>
        <p className="text-sm text-text-sec font-medium mt-1">Thank you, {customerName}</p>
        <div className="mt-4 bg-warm-bg text-text-main font-bold px-4 py-2 rounded-xl text-sm tracking-widest border border-warm-border">
          ID: {order.id}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 z-10 pb-20">
        <div className="bg-warm-bg rounded-3xl p-6 shadow-lg border border-warm-border mb-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black uppercase text-text-sec tracking-wider">Live Status</h2>
            <div className="flex items-center gap-1.5 text-customer-primary bg-customer-primary/10 px-2 py-1 rounded-md text-[10px] font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-customer-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-customer-primary"></span>
              </span>
              Auto-updating
            </div>
          </div>

          <div className="relative pl-4 space-y-8">
            {/* Vertical Line */}
            <div className="absolute left-[27px] top-4 bottom-4 w-0.5 bg-warm-card"></div>
            
            {/* Progress Line */}
            {currentStepIndex >= 0 && (
              <motion.div 
                className="absolute left-[27px] top-4 w-0.5 bg-customer-primary origin-top"
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
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors duration-500 ${
                    isActive 
                      ? 'bg-customer-primary text-white ring-4 ring-amber-500/20' 
                      : isCompleted 
                        ? 'bg-warm-bg border-2 border-customer-primary text-customer-primary' 
                        : 'bg-warm-bg border-2 border-warm-border text-text-muted'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-black ${isActive ? 'text-customer-primary' : 'text-text-main'}`}>{step.label}</h4>
                    <p className="text-[11px] font-bold text-text-sec mt-0.5 flex items-center gap-1">
                      {isActive && <Clock className="w-3 h-3 text-customer-primary" />}
                      {isActive ? "Currently in progress" : step.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-warm-bg rounded-3xl p-6 shadow-lg border border-warm-border">
          <h2 className="text-sm font-black uppercase text-text-sec tracking-wider mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm">
                <span className="font-bold text-text-main">{item.quantity}x {item.name}</span>
                <span className="font-black text-text-main">₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 border-t border-warm-border flex justify-between items-center">
            <span className="font-bold text-text-sec">Total Paid</span>
            <span className="text-lg font-black text-customer-primary">₹{order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
