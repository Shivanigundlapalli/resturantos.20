import React from "react";
import { Settings, Shield, User, Bot, RefreshCw, CheckCircle, Wifi, Globe, Trash2 } from "lucide-react";

interface SettingsViewProps {
  onResetDatabase: () => void;
}

export default function SettingsView({ onResetDatabase }: SettingsViewProps) {
  
  const handleHardReset = () => {
    const confirmed = window.confirm("⚠ WARNING: DATABASE HARD RESET\nThis will restore the entire restaurant memory (Menu, Orders, Inventory, Customers, Suppliers, finances) back to default values.\n\nDo you want to proceed?");
    if (confirmed) {
      onResetDatabase();
      alert("✔ Restaurant Database restored back to default Spice Heaven records!");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-warm-bg px-3 py-4 sm:p-6 overflow-y-auto font-sans select-none animate-fade-in">
      {/* View Header */}
      <div className="mb-6 pl-10 sm:pl-0">
        <h1 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-forest-accent" />
          <span className="hidden sm:inline">System Settings &amp; Integrations</span>
          <span className="sm:hidden">Settings</span>
        </h1>
        <p className="hidden sm:block text-xs text-text-sec mt-0.5">Configure restaurant details, test server-side AI connection, manage user permissions, and perform diagnostics.</p>
      </div>

      <div className="max-w-3xl space-y-6">
        
        {/* Profile Card */}
        <div className="bg-warm-bg border border-warm-border rounded-[18px] p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-text-main uppercase tracking-wide flex items-center gap-2 border-b border-warm-border pb-3">
            <User className="w-4 h-4 text-text-sec" />
            <span>Restaurant Profile</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-text-sec">
            <div>
              <label className="text-[9px] text-text-sec font-bold uppercase tracking-wider block mb-1">Restaurant Name</label>
              <input 
                type="text" 
                defaultValue="Spice Heaven Restaurant" 
                className="w-full bg-warm-bg border border-warm-border px-3 py-2 rounded-[12px] focus:outline-none font-semibold text-text-main"
              />
            </div>
            <div>
              <label className="text-[9px] text-text-sec font-bold uppercase tracking-wider block mb-1">Owner / Chief Operator</label>
              <input 
                type="text" 
                defaultValue="Chef Spice" 
                className="w-full bg-warm-bg border border-warm-border px-3 py-2 rounded-[12px] focus:outline-none font-semibold text-text-main"
              />
            </div>
            <div>
              <label className="text-[9px] text-text-sec font-bold uppercase tracking-wider block mb-1">Primary Email Address</label>
              <input 
                type="email" 
                defaultValue="chef@spiceheaven.com" 
                className="w-full bg-warm-bg border border-warm-border px-3 py-2 rounded-[12px] focus:outline-none font-semibold text-text-main"
              />
            </div>
            <div>
              <label className="text-[9px] text-text-sec font-bold uppercase tracking-wider block mb-1">Registered Address Line</label>
              <input 
                type="text" 
                defaultValue="23 Green Street, Hitech City, Hyderabad" 
                className="w-full bg-warm-bg border border-warm-border px-3 py-2 rounded-[12px] focus:outline-none font-semibold text-text-main"
              />
            </div>
          </div>
        </div>

        {/* AI OS Diagnostic Card */}
        <div className="bg-warm-bg border border-warm-border rounded-[18px] p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-text-main uppercase tracking-wide flex items-center gap-2 border-b border-warm-border pb-3">
            <Bot className="w-4 h-4 text-text-sec" />
            <span>RestaurantOS AI Diagnostics</span>
          </h3>

          <div className="bg-warm-bg border border-warm-border p-4 rounded-[12px] space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-sec font-medium flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-forest-accent animate-pulse" />
                Diagnostic Connection Status
              </span>
              <span className="font-extrabold text-forest-accent uppercase tracking-wider bg-transparent border border-forest-accent/30 border border-emerald-500/25 px-2 py-0.5 rounded text-[10px]">Connected</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-sec font-medium flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-forest-accent" />
                Operating System Gateway
              </span>
              <span className="font-mono text-text-sec font-bold bg-warm-bg border border-warm-border px-2 py-0.5 rounded text-[10px]">Cloud Run Container Ingress</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-text-sec font-medium flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-forest-accent" />
                Gemini AI Engine Connection
              </span>
              <span className="font-bold text-text-sec bg-warm-bg border border-warm-border px-2 py-0.5 rounded text-[10px]">
                Google Gemini API SDK
              </span>
            </div>
          </div>
          <p className="text-[10px] text-text-sec leading-tight">All connections are handled server-side securely. Secrets can be managed inside the Secrets settings of Google AI Studio.</p>
        </div>

        {/* Database resets */}
        <div className="bg-red-500/10/20 border border-rose-500/20/50 rounded-[18px] p-5 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-rose-800 uppercase tracking-wide flex items-center gap-2 border-b border-rose-500/20/30 pb-3">
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Danger Operational Actions</span>
          </h3>
          <p className="text-xs text-rose-500 font-medium leading-relaxed">
            Restoring the database state will destroy all orders logged, reset raw stock ingredients, settle supplier ledgers, and return Spice Heaven operating memory back to default values.
          </p>
          <button
            onClick={handleHardReset}
            className="bg-red-500 hover:bg-red-500 text-text-main font-bold text-xs px-4 py-2.5 rounded-[12px] flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-sm shadow-rose-600/10"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Restore Default Database Records</span>
          </button>
        </div>

      </div>
    </div>
  );
}
