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
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (name.trim().length < 2) {
      setErrorMsg("Name must be at least 2 characters.");
      return;
    }

    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!indianMobileRegex.test(mobile.trim())) {
      setErrorMsg("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit(name, mobile);
    }, 600);
  };

  const displayTable = tableNumber || "Guest";

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-[#041A13] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800" 
          alt="Restaurant Background" 
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#041A13]/90 via-[#041A13]/80 to-[#0A241C]/90"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="z-10 w-full max-w-sm bg-[#0A241C]/80 backdrop-blur-xl border border-[#1B3629] p-8 rounded-3xl shadow-[0_20px_50px_rgba(4,26,19,0.8)]"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-[#0F8F5B] rounded-2xl flex items-center justify-center text-[#FFFFFF] shadow-lg shadow-[#0F8F5B]/30 rotate-3">
            <Utensils className="w-8 h-8 -rotate-3" />
          </div>
        </div>

        <div className="text-center space-y-2 mb-10">
          <h1 className="text-[28px] font-black text-[#FFFFFF] tracking-tight">Spice Heaven</h1>
          <p className="text-[#D4A53A] font-bold bg-[#D4A53A]/10 border border-[#D4A53A]/30 inline-block px-4 py-1.5 rounded-xl text-sm shadow-sm">Table {displayTable}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs p-3 rounded-xl text-center font-semibold">
              {errorMsg}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[11px] text-[#A7B4AE] font-bold uppercase tracking-widest block ml-1">Your Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Kumar"
              className="w-full bg-[#041A13] text-sm text-[#FFFFFF] font-semibold px-5 py-4 rounded-2xl border border-[#1B3629] focus:outline-none focus:border-[#D4A53A] transition-colors placeholder:text-[#A7B4AE]/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-[#A7B4AE] font-bold uppercase tracking-widest block ml-1">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#FFFFFF] font-bold text-sm">+91</span>
              <input 
                type="tel" 
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit number"
                pattern="[0-9]{10}"
                className="w-full pl-14 pr-5 py-4 bg-[#041A13] text-sm text-[#FFFFFF] font-semibold rounded-2xl border border-[#1B3629] focus:outline-none focus:border-[#D4A53A] transition-colors placeholder:text-[#A7B4AE]/50"
              />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting || !name || mobile.length < 10}
            className="w-full mt-6 bg-[#D4A53A] text-[#041A13] disabled:opacity-50 disabled:bg-[#1B3629] disabled:text-[#A7B4AE] py-4 rounded-2xl text-[15px] font-black transition-all shadow-xl shadow-[#D4A53A]/20 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Enter Restaurant <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
