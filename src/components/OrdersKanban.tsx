import React, { useState } from "react";
import { Order } from "../types";
import { Clock, AlertCircle, RefreshCw, Trash2, CheckCircle2, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface OrdersKanbanProps {
  orders: Order[];
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

const KANBAN_COLUMNS = [
  "Pending",
  "Accepted",
  "Preparing",
  "Ready",
  "Served",
  "Completed",
  "Cancelled"
];

const COL_COLORS: Record<string, string> = {
  Pending: "from-rose-500/20 to-rose-500/5 border-rose-500/30 text-rose-500",
  Accepted: "from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-500",
  Preparing: "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-500",
  Ready: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/30 text-indigo-400",
  Served: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-500",
  Completed: "from-teal-500/20 to-teal-500/5 border-teal-500/30 text-teal-500",
  Cancelled: "from-zinc-500/20 to-zinc-500/5 border-zinc-500/30 text-zinc-400"
};

const ACCENT_COLORS: Record<string, string> = {
  Pending: "bg-rose-500",
  Accepted: "bg-blue-500",
  Preparing: "bg-amber-500",
  Ready: "bg-indigo-500",
  Served: "bg-emerald-500",
  Completed: "bg-teal-500",
  Cancelled: "bg-zinc-500"
};

export default function OrdersKanban({ orders, onUpdateStatus }: OrdersKanbanProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [clearedOrders, setClearedOrders] = useState<Set<string>>(new Set());

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("orderId", orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData("orderId");
    if (!orderId) return;

    const order = orders.find(o => o.id === orderId);
    if (order && order.status !== targetStatus) {
      setUpdatingId(orderId);
      await onUpdateStatus(orderId, targetStatus);
      setUpdatingId(null);
    }
  };

  const handleNextStatusClick = async (order: Order) => {
    const currentIndex = KANBAN_COLUMNS.indexOf(order.status);
    if (currentIndex < KANBAN_COLUMNS.length - 2) { 
      const nextStatus = KANBAN_COLUMNS[currentIndex + 1];
      setUpdatingId(order.id);
      await onUpdateStatus(order.id, nextStatus);
      setUpdatingId(null);
    }
  };

  const handleClearColumn = (colStatus: string) => {
    const idsToClear = orders?.filter(o => o.status === colStatus).map(o => o.id);
    setClearedOrders(prev => new Set([...prev, ...idsToClear]));
  };

  return (
    <div className="flex h-full w-full overflow-x-auto bg-[#04080B] p-8 space-x-8 pb-20 custom-scrollbar relative">
      {/* Subtle Background Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

      {KANBAN_COLUMNS?.map(colStatus => {
        const colOrders = orders?.filter(o => o.status === colStatus && !clearedOrders.has(o.id));
        const colorClasses = COL_COLORS[colStatus];
        const accentClass = ACCENT_COLORS[colStatus];
        const isTerminal = colStatus === 'Completed' || colStatus === 'Cancelled';
        
        return (
          <div 
            key={colStatus} 
            className={`flex-shrink-0 w-[350px] bg-gradient-to-b ${colorClasses.split(' ')[0]} ${colorClasses.split(' ')[1]} rounded-[2rem] flex flex-col h-full border border-white/5 backdrop-blur-2xl shadow-2xl overflow-hidden relative`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colStatus)}
          >
            {/* Top Accent Line */}
            <div className={`h-1.5 w-full ${accentClass}`} />

            {/* Column Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-black/40 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full animate-pulse ${accentClass} shadow-[0_0_10px_currentColor]`} />
                <h3 className={`font-black text-sm uppercase tracking-widest ${colorClasses.split(' ')[3]}`}>{colStatus}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`bg-black/60 text-white/90 text-xs font-black px-3 py-1 rounded-full border border-white/10`}>
                  {colOrders.length}
                </span>
                {isTerminal && colOrders.length > 0 && (
                  <button 
                    onClick={() => handleClearColumn(colStatus)}
                    className="p-1.5 hover:bg-white/10 bg-white/5 rounded-full transition-colors text-white/60 hover:text-white border border-white/5"
                    title={`Clear ${colStatus} Orders`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Column Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
              <AnimatePresence>
                {colOrders?.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as any, order.id)}
                    className={`bg-[#0A1016]/95 p-5 rounded-[1.5rem] border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:border-white/20 transition-all relative group overflow-hidden ${updatingId === order.id ? 'opacity-50 pointer-events-none scale-95' : ''}`}
                  >
                    {/* Hover Glow Background */}
                    <div className={`absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />

                    {/* Header Row */}
                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div>
                        <div className="inline-block px-2.5 py-1 bg-white/5 rounded-md text-[10px] text-white/70 font-black uppercase tracking-widest mb-3 border border-white/10">
                          {order.tableOrType}
                        </div>
                        <div className="font-black text-xl text-white leading-tight tracking-tight">{order.customerName}</div>
                        {order.phone && <div className="text-xs text-white/40 font-medium mt-1">{order.phone}</div>}
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="text-[10px] font-mono font-bold text-white/30 bg-black/50 px-2 py-0.5 rounded-md border border-white/5">#{order.id.split('-').pop()}</div>
                        <div className={`flex items-center text-xs font-bold gap-1.5 mt-2 px-2.5 py-1 rounded-full border ${Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000) > 20 ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-white/5 text-white/60 border-white/10'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000)}m
                        </div>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="bg-black/40 rounded-2xl p-4 mb-5 border border-white/5 relative z-10 shadow-inner">
                      <div className="text-[10px] font-black text-white/30 uppercase mb-3 tracking-widest flex items-center gap-3">
                        <div className="w-4 h-[1px] bg-white/10" /> ORDER DETAILS <div className="flex-1 h-[1px] bg-white/10" />
                      </div>
                      <div className="space-y-2.5">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm items-start">
                            <span className="text-white/80 font-medium flex gap-3 items-start leading-tight">
                              <span className={`text-[11px] font-black ${accentClass} text-white px-2 py-0.5 rounded-md shadow-sm`}>{item.quantity}x</span> 
                              <span className="mt-0.5">{item.name}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {order.special_instructions && (
                      <div className="mb-5 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2.5 items-start relative z-10">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="font-semibold leading-relaxed">{order.special_instructions}</span>
                      </div>
                    )}

                    {/* Footer / Total */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/10 relative z-10">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Total Amount</span>
                        <div className="font-black text-2xl text-white tracking-tight">₹{order.total.toLocaleString()}</div>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] text-white/30 font-black uppercase tracking-widest mb-1">Payment</span>
                        <div className={`flex items-center gap-1.5 text-xs font-black ${order.payment_status === 'PAID' || order.status === 'Completed' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-amber-400 bg-amber-400/10 border-amber-400/20'} px-2.5 py-1 rounded-lg border`}>
                          {order.payment_status === 'PAID' || order.status === 'Completed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                          {order.status === 'Completed' ? 'Done' : (order.payment_status || 'NOT PAID')}
                        </div>
                      </div>
                    </div>

                    {/* Quick Move Action */}
                    {!isTerminal && (
                      <button 
                        onClick={() => handleNextStatusClick(order)}
                        className={`mt-5 w-full ${accentClass} hover:opacity-90 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-between px-5 shadow-lg shadow-black/20 active:scale-[0.98] relative z-10 group/btn`}
                      >
                        <span className="flex items-center gap-2">
                          {updatingId === order.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                          Move to {KANBAN_COLUMNS[KANBAN_COLUMNS.indexOf(colStatus) + 1]}
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {colOrders.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl bg-black/20 text-white/20">
                  <span className="text-xs font-black uppercase tracking-widest">Empty</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
