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
        className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6"
      >
        <Utensils className="w-12 h-12 text-amber-500" />
      </motion.div>
      <motion.h1 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.2 }}
        className="text-4xl font-black text-zinc-100 mb-2 tracking-tight"
      >
        SPICE HEAVEN
      </motion.h1>
      <motion.p 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.3 }}
        className="text-zinc-400 mb-12 font-medium"
      >
        Experience fine dining, reimagined.
      </motion.p>
      
      <motion.button 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.4 }}
        onClick={onNext}
        className="w-full max-w-sm bg-amber-500 text-zinc-950 font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-colors"
      >
        Start Ordering
      </motion.button>
    </div>
  );
}
