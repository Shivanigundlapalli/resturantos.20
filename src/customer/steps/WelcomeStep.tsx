import React from 'react';
import { motion } from 'motion/react';
import { Utensils } from 'lucide-react';

interface WelcomeStepProps {
  onNext: () => void;
}

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        transition={{ duration: 0.5 }}
        className="w-24 h-24 bg-customer-primary/10 rounded-full flex items-center justify-center mb-6"
      >
        <Utensils className="w-12 h-12 text-customer-primary" />
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="text-4xl font-black text-text-main mb-2 tracking-tight"
      >
        SPICE HEAVEN
      </motion.h1>
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-text-sec mb-12 font-medium"
      >
        Experience fine dining, reimagined.
      </motion.p>
      
      <motion.button 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.4 }}
        onClick={onNext}
        className="w-full max-w-sm bg-customer-primary text-white font-bold py-4 rounded-xl shadow-md hover:bg-customer-hover transition-colors"
      >
        Start Ordering
      </motion.button>
    </div>
  );
}
