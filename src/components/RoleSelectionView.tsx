import React from "react";
import { Utensils, UserCircle, Store, ChevronRight, ShieldCheck, Zap, TrendingUp, Sun, Moon } from "lucide-react";
import { motion } from "motion/react";

interface RoleSelectionViewProps {
  onSelectRole: (role: "owner" | "customer" | "kitchen") => void;
}

export default function RoleSelectionView({ onSelectRole }: RoleSelectionViewProps) {
  return (
    <div className="w-screen h-screen flex flex-col bg-zinc-950 overflow-hidden font-sans items-center justify-center relative">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200" 
          alt="Restaurant Background" 
          className="w-full h-full object-cover opacity-[0.15]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#011D14] via-[#0A2A1F]/80 to-[#0A2A1F]/60"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="z-10 bg-[#061811] p-10 rounded-[28px] shadow-2xl max-w-md w-full mx-4 border border-[#BB9240]/30"
      >
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-[#10271E] rounded-[14px] flex items-center justify-center shadow-inner border border-zinc-800/50">
            <Utensils className="w-6 h-6 text-[#BB9240]" />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-serif text-[#F5F5F2] tracking-wide mb-2" style={{ fontFamily: "Georgia, serif" }}>Welcome</h1>
          <p className="text-[13px] text-[#C8C8C3]">How would you like to continue?</p>
        </div>

        {/* Decorative Divider */}
        <div className="flex items-center justify-center gap-2 mb-8 opacity-60">
          <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#BB9240]"></div>
          <div className="w-1.5 h-1.5 rotate-45 bg-[#BB9240]"></div>
          <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#BB9240]"></div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectRole("owner")}
            className="w-full group bg-[#0A2A1F] hover:bg-[#0c3527] border border-[#2A3B33] hover:border-[#BB9240] p-5 rounded-[20px] transition-all duration-300 flex items-center gap-5 cursor-pointer"
          >
            <div className="text-[#BB9240] shrink-0">
              <Store className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-[#F5F5F2] text-[15px] mb-0.5">Restaurant Owner</h3>
              <p className="text-[11px] text-[#C8C8C3]">Manage orders, inventory, and staff</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#BB9240] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onSelectRole("customer")}
            className="w-full group bg-[#0A2A1F] hover:bg-[#0c3527] border border-[#2A3B33] hover:border-[#BB9240] p-5 rounded-[20px] transition-all duration-300 flex items-center gap-5 cursor-pointer"
          >
            <div className="text-[#BB9240] shrink-0">
              <UserCircle className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-[#F5F5F2] text-[15px] mb-0.5">Customer</h3>
              <p className="text-[11px] text-[#C8C8C3]">View menu and place an order</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#BB9240] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => onSelectRole("kitchen")}
            className="w-full group bg-[#0A2A1F] hover:bg-[#0c3527] border border-[#2A3B33] hover:border-[#BB9240] p-5 rounded-[20px] transition-all duration-300 flex items-center gap-5 cursor-pointer"
          >
            <div className="text-[#BB9240] shrink-0">
              <Utensils className="w-[22px] h-[22px]" strokeWidth={1.5} />
            </div>
            <div className="text-left flex-1">
              <h3 className="font-semibold text-[#F5F5F2] text-[15px] mb-0.5">Kitchen Staff</h3>
              <p className="text-[11px] text-[#C8C8C3]">View and update live orders</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#BB9240] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </motion.div>

      {/* Bottom Features & Theme Toggle */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="z-10 mt-12 flex flex-col items-center gap-8"
      >
        <div className="flex items-center gap-6 md:gap-10 text-center">
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
            <ShieldCheck className="w-5 h-5 text-[#BB9240]" strokeWidth={1.5} />
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#F5F5F2]">Secure & Reliable</div>
              <div className="text-[10px] text-[#C8C8C3]">Your data is protected</div>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-[#2A3B33] hidden md:block"></div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
            <Zap className="w-5 h-5 text-[#BB9240]" strokeWidth={1.5} />
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#F5F5F2]">Real-time Sync</div>
              <div className="text-[10px] text-[#C8C8C3]">Live updates everywhere</div>
            </div>
          </div>
          <div className="w-[1px] h-8 bg-[#2A3B33] hidden md:block"></div>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3">
            <TrendingUp className="w-5 h-5 text-[#BB9240]" strokeWidth={1.5} />
            <div className="text-left">
              <div className="text-[11px] font-bold text-[#F5F5F2]">Smarter Operations</div>
              <div className="text-[10px] text-[#C8C8C3]">Stronger restaurants</div>
            </div>
          </div>
        </div>

        {/* Theme Toggle (Decorative for screenshot match) */}
        <div className="bg-[#0A2A1F] border border-[#2A3B33] rounded-full p-2 px-4 flex items-center gap-4">
          <Sun className="w-4 h-4 text-[#C8C8C3]" />
          <div className="w-12 h-1.5 bg-[#173126] rounded-full relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-[#BB9240] to-[#D6A84D] shadow-md shadow-[#BB9240]/20"></div>
          </div>
          <Moon className="w-4 h-4 text-[#BB9240]" fill="currentColor" />
        </div>
      </motion.div>
    </div>
  );
}
