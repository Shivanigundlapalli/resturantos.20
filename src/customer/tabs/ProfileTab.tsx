import React from "react";
import { User, MapPin, Heart, Bell, HelpCircle, LogOut, Settings, ChevronRight, Moon } from "lucide-react";

interface ProfileTabProps {
  customerName: string;
  mobileNumber: string;
  tableNumber: string;
}

export default function ProfileTab({ customerName, mobileNumber, tableNumber }: ProfileTabProps) {
  const menuItems = [
    { icon: Heart, label: "Favorite Dishes", value: "12 Items" },
    { icon: MapPin, label: "Saved Addresses", value: "2 Addresses" },
    { icon: Bell, label: "Notifications", value: "On" },
    { icon: Moon, label: "Theme", value: "Dark" },
    { icon: Settings, label: "Settings", value: "" },
    { icon: HelpCircle, label: "Help & Support", value: "" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] relative">
      <header className="px-6 pt-8 pb-4">
        <h2 className="text-2xl font-black text-[#FFFFFF]">My Profile</h2>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        
        {/* Profile Card */}
        <div className="bg-[#0A241C] border border-[#1B3629] rounded-3xl p-6 shadow-lg mb-6 flex items-center gap-5">
          <div className="w-20 h-20 rounded-full border-4 border-[#0F8F5B]/20 overflow-hidden shrink-0 shadow-inner">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-xl font-black text-[#FFFFFF]">{customerName || "Guest User"}</h3>
            <p className="text-[#A7B4AE] text-sm mt-1">+91 {mobileNumber || "N/A"}</p>
            <div className="inline-flex items-center gap-1.5 bg-[#D4A53A]/10 text-[#D4A53A] px-2.5 py-1 rounded-lg text-xs font-bold mt-3 border border-[#D4A53A]/30">
              <span className="w-1.5 h-1.5 bg-[#D4A53A] rounded-full"></span>
              Dining at Table {tableNumber || "?"}
            </div>
          </div>
        </div>

        {/* Menu Options */}
        <div className="bg-[#0A241C] border border-[#1B3629] rounded-3xl overflow-hidden shadow-lg mb-6">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button key={idx} className="w-full flex items-center justify-between p-5 border-b border-[#1B3629] last:border-b-0 hover:bg-[#10271E] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#041A13] rounded-xl flex items-center justify-center text-[#0F8F5B]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[#FFFFFF] font-bold text-[15px]">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.value && <span className="text-[#A7B4AE] text-xs font-medium">{item.value}</span>}
                  <ChevronRight className="w-5 h-5 text-[#A7B4AE]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button className="w-full bg-[#0A241C] border border-red-500/20 text-red-400 p-5 rounded-3xl shadow-lg flex items-center justify-center gap-3 font-bold hover:bg-red-500/10 transition-colors">
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
        
        <p className="text-center text-[#A7B4AE]/50 text-[10px] mt-6 mb-4 font-medium uppercase tracking-widest">
          Spice Heaven v2.0
        </p>
      </div>
    </div>
  );
}
