import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock } from 'lucide-react';

interface ConfirmedStepProps {
  orderId: string;
  customerName: string;
  onTrackOrder: () => void;
}

export default function ConfirmedStep({ orderId, customerName, onTrackOrder }: ConfirmedStepProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ type: "spring", damping: 15, delay: 0.1 }}
        className="mb-8"
      >
        <div className="w-32 h-32 bg-customer-primary/10 rounded-full flex items-center justify-center mx-auto relative">
          <div className="absolute inset-0 bg-customer-primary/20 rounded-full animate-ping"></div>
          <CheckCircle2 className="w-16 h-16 text-customer-primary" />
        </div>
      </motion.div>
      
      <motion.h2 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-3xl font-black text-text-main mb-2 tracking-tight"
      >
        Order Confirmed!
      </motion.h2>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.4 }}
        className="text-text-sec mb-8"
      >
        Thank you, {customerName}. Your order has been sent to the kitchen.
      </motion.p>
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.5 }}
        className="bg-warm-bg border border-warm-border rounded-2xl p-6 w-full max-w-sm mb-8"
      >
        <div className="flex justify-between items-center mb-4">
          <span className="text-text-muted text-sm">Order Number</span>
          <span className="text-text-main font-black">{orderId}</span>
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-text-muted text-sm">Status</span>
          <span className="text-customer-primary font-bold bg-customer-primary/10 px-2 py-1 rounded">Preparing</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-muted text-sm">Est. Time</span>
          <span className="text-text-main font-bold flex items-center gap-1">
            <Clock className="w-4 h-4 text-text-sec" /> 15 mins
          </span>
        </div>
      </motion.div>
      
      <motion.button 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.6 }}
        onClick={onTrackOrder}
        className="w-full max-w-sm bg-customer-primary text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-colors"
      >
        Track Order
      </motion.button>
    </div>
  );
}
