import React, { useState } from "react";
import { Utensils, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "motion/react";

interface CustomerLandingProps {
  tableNumber: string;
  restaurantId: string;
  onSubmit: (name: string, mobile: string) => void;
}

export default function CustomerLanding({ tableNumber, restaurantId, onSubmit }: CustomerLandingProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && mobile.trim().length >= 10) {
      setIsSubmitting(true);
      // Simulate network delay
      setTimeout(() => {
        onSubmit(name, mobile);
      }, 600);
    }
  };

  const displayTable = tableNumber || "Guest";
  const displayRestaurant = restaurantId ? "Spice Heaven" : "Spice Heaven"; // Ideally map restaurantId to name

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-900 relative">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800" 
          alt="Restaurant Background" 
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/80 to-zinc-900/40"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-sm bg-white p-8 rounded-3xl shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
            <Utensils className="w-7 h-7" />
          </div>
        </div>

        <div className="text-center space-y-1 mb-8">
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Welcome to {displayRestaurant}</h1>
          <p className="text-emerald-600 font-bold bg-emerald-50 inline-block px-3 py-1 rounded-full text-sm">Table {displayTable}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Your Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-zinc-50 text-sm text-zinc-900 font-semibold p-4 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block">Mobile Number</label>
            <input 
              type="tel" 
              required
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="10-digit mobile number"
              pattern="[0-9]{10}"
              className="w-full bg-zinc-50 text-sm text-zinc-900 font-semibold p-4 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          <button 
            type="submit"
            disabled={isSubmitting || !name || mobile.length < 10}
            className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-4 rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Continue <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
