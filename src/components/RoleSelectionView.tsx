import React from "react";
import { Utensils, UserCircle, Store } from "lucide-react";
import { motion } from "motion/react";

interface RoleSelectionViewProps {
  onSelectRole: (role: "owner" | "customer" | "kitchen") => void;
}

export default function RoleSelectionView({ onSelectRole }: RoleSelectionViewProps) {
  return (
    <div className="w-screen h-screen flex bg-zinc-50 overflow-hidden font-sans items-center justify-center relative">
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1200" 
          alt="Restaurant Background" 
          className="w-full h-full object-cover opacity-20"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/80 to-zinc-900/40"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-zinc-100"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
            <Utensils className="w-8 h-8" />
          </div>
        </div>

        <div className="text-center space-y-2 mb-10">
          <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Welcome</h1>
          <p className="text-sm text-zinc-500 font-medium">How would you like to continue?</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => onSelectRole("owner")}
            className="w-full group bg-white hover:bg-zinc-50 border-2 border-zinc-200 hover:border-emerald-500 p-4 rounded-2xl transition-all duration-200 flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-zinc-900 text-base">Restaurant Owner</h3>
              <p className="text-xs text-zinc-500">Manage orders, inventory, and staff</p>
            </div>
          </button>

          <button
            onClick={() => onSelectRole("customer")}
            className="w-full group bg-white hover:bg-zinc-50 border-2 border-zinc-200 hover:border-emerald-500 p-4 rounded-2xl transition-all duration-200 flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCircle className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-zinc-900 text-base">Customer</h3>
              <p className="text-xs text-zinc-500">View menu and place an order</p>
            </div>
          </button>

          <button
            onClick={() => onSelectRole("kitchen")}
            className="w-full group bg-white hover:bg-zinc-50 border-2 border-zinc-200 hover:border-emerald-500 p-4 rounded-2xl transition-all duration-200 flex items-center gap-4 cursor-pointer"
          >
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-zinc-900 text-base">Kitchen Staff</h3>
              <p className="text-xs text-zinc-500">View and update live orders</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
