import React from "react";
import { 
  History, 
  Pin, 
  Zap, 
  Activity, 
  Clock, 
  Layers, 
  Flame, 
  Utensils 
} from "lucide-react";

interface RightPanelProps {
  onTriggerPrompt: (prompt: string) => void;
  restaurantState: {
    orders: any[];
    inventory: any[];
  };
}

export default function RightPanel({ onTriggerPrompt, restaurantState }: RightPanelProps) {
  const recentChats = [
    { text: "Show today's sales summary", date: "10:30 AM" },
    { text: "Show low stock items", date: "10:31 AM" },
    { text: "Create an order for Rahul", date: "10:15 AM" },
  ];

  const pinnedCommands = [
    { label: "/sales-summary", desc: "Get sales performance", prompt: "Show today's sales summary" },
    { label: "/low-stock", desc: "List ingredients to buy", prompt: "Show low stock items" },
    { label: "/finance-report", desc: "View income/expense breakdown", prompt: "Show today's profit" },
    { label: "/suppliers-due", desc: "Check outstanding bills", prompt: "Show supplier pending payments" },
  ];

  const quickTemplates = [
    { label: "Dosa Order for Rahul", desc: "Rahul's regular Masala Dosa combo", prompt: "Create an order for Rahul. 2 Masala Dosa, 1 Filter Coffee" },
    { label: "Settle Dairy Craft", desc: "Pay off Dairy Craft outstanding bill", prompt: "Settle outstanding balance with Dairy Craft" },
    { label: "Ingredient Audit", desc: "Verify reorder limits", prompt: "Show low stock items" },
  ];

  // Calculate live restaurant status from state
  const activeOrdersCount = restaurantState.orders.filter(o => o.status === "Pending").length;
  const completedTodayCount = restaurantState.orders.filter(o => o.status === "Completed").length;
  const criticalLowStock = restaurantState.inventory.filter(i => i.currentQty <= i.reorderLevel).length;

  return (
    <aside id="utility-panel-container" className="w-[300px] bg-zinc-900 border-l border-zinc-800 p-5 flex flex-col gap-6 overflow-y-auto shrink-0 h-full font-sans select-none">
      {/* Restaurant Status Card */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-xs uppercase tracking-wider">
          <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
          <span>Spice Heaven Live Status</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-[18px] p-4 space-y-3 shadow-xs">
          <div className="flex justify-between items-center text-xs">
            <span className="text-zinc-400 font-medium">Table Occupancy</span>
            <span className="font-bold text-zinc-100">4 / 12 Tables</span>
          </div>
          <div className="w-full bg-zinc-900/60 rounded-full h-1.5 overflow-hidden">
            <div className="bg-amber-500 text-zinc-900 h-1.5 rounded-full" style={{ width: "33%" }} />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1.5">
            <div className="bg-transparent border border-amber-500/30 border border-amber-500/20 p-2.5 rounded-[12px] text-center">
              <div className="text-[9px] text-zinc-100 font-bold uppercase tracking-wider">Active Orders</div>
              <div className="text-lg font-bold text-zinc-100 mt-0.5">{activeOrdersCount}</div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-[12px] text-center">
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Completed</div>
              <div className="text-lg font-bold text-zinc-100 mt-0.5">{completedTodayCount}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-zinc-400 bg-zinc-900 p-2.5 rounded-[12px] border border-zinc-800">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>Shift: <strong className="text-zinc-300">Morning Kitchen</strong> (Ends 4 PM)</span>
          </div>
        </div>
      </div>

      {/* Recent Conversations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-xs uppercase tracking-wider">
          <History className="w-4 h-4 text-zinc-400" />
          <span>Recent Conversations</span>
        </div>
        <div className="space-y-1.5">
          {recentChats.map((chat, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerPrompt(chat.text)}
              className="w-full text-left bg-zinc-900 hover:bg-amber-500 text-zinc-900/5 border border-zinc-800 p-3 rounded-[14px] flex justify-between items-center transition-all duration-200 text-xs shadow-xs group"
            >
              <span className="text-zinc-300 truncate font-semibold group-hover:text-amber-500 pr-2">{chat.text}</span>
              <span className="text-[10px] text-zinc-400 shrink-0">{chat.date}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Commands */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-xs uppercase tracking-wider">
          <Pin className="w-4 h-4 text-amber-500 rotate-45" />
          <span>Pinned Commands</span>
        </div>
        <div className="space-y-1.5">
          {pinnedCommands.map((cmd, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerPrompt(cmd.prompt)}
              className="w-full text-left bg-zinc-900 hover:border-amber-500/30 hover:bg-amber-500 text-zinc-900/5 border border-zinc-800 p-3 rounded-[14px] transition-all duration-200 text-xs shadow-xs flex flex-col gap-0.5 group"
            >
              <span className="font-mono text-amber-500 font-bold group-hover:text-[#117534]">{cmd.label}</span>
              <span className="text-zinc-400 text-[10px] font-medium truncate">{cmd.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Templates */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-xs uppercase tracking-wider">
          <Zap className="w-4 h-4 text-amber-500" />
          <span>Quick Templates</span>
        </div>
        <div className="space-y-1.5">
          {quickTemplates.map((temp, idx) => (
            <button
              key={idx}
              onClick={() => onTriggerPrompt(temp.prompt)}
              className="w-full text-left bg-zinc-900 hover:bg-amber-500 text-zinc-900/5 border border-zinc-800 p-3 rounded-[14px] transition-all duration-200 text-xs shadow-xs flex flex-col gap-0.5 group"
            >
              <span className="text-zinc-300 font-bold group-hover:text-amber-500">{temp.label}</span>
              <span className="text-zinc-400 text-[10px] font-medium truncate">{temp.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
