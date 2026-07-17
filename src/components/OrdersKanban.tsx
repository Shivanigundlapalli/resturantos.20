import React, { useState } from "react";
import { Order } from "../types";
import { Clock, AlertCircle, RefreshCw } from "lucide-react";
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

export default function OrdersKanban({ orders, onUpdateStatus }: OrdersKanbanProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    if (currentIndex < KANBAN_COLUMNS.length - 2) { // Cannot click past Completed
      const nextStatus = KANBAN_COLUMNS[currentIndex + 1];
      setUpdatingId(order.id);
      await onUpdateStatus(order.id, nextStatus);
      setUpdatingId(null);
    }
  };

  return (
    <div className="flex h-full w-full overflow-x-auto bg-zinc-950 p-6 space-x-6 pb-20">
      {KANBAN_COLUMNS.map(colStatus => {
        const colOrders = orders.filter(o => o.status === colStatus);
        
        return (
          <div 
            key={colStatus} 
            className="flex-shrink-0 w-80 bg-zinc-900/50 rounded-2xl flex flex-col h-full border border-zinc-800 shadow-inner"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, colStatus)}
          >
            {/* Column Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
              <h3 className="font-bold text-sm text-zinc-100 uppercase tracking-wider">{colStatus}</h3>
              <span className="bg-zinc-900 text-zinc-300 text-[10px] font-black px-2 py-1 rounded-full shadow-none">
                {colOrders.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="p-3 flex-1 overflow-y-auto space-y-3">
              <AnimatePresence>
                {colOrders.map(order => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    draggable
                    onDragStart={(e) => handleDragStart(e as any, order.id)}
                    className={`bg-zinc-900 p-4 rounded-xl shadow-none border border-zinc-800 cursor-grab active:cursor-grabbing hover:shadow-black transition-shadow relative overflow-hidden group ${updatingId === order.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    {/* Color bar */}
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      colStatus === 'Pending' ? 'bg-red-500' :
                      colStatus === 'Preparing' ? 'bg-amber-500 text-zinc-900' :
                      colStatus === 'Ready' ? 'bg-emerald-500' : 'bg-zinc-900'
                    }`} />

                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div>
                        <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{order.tableOrType}</div>
                        <div className="font-bold text-sm text-zinc-100">{order.customerName}</div>
                        {order.phone && <div className="text-[10px] text-zinc-400 font-medium mt-0.5">{order.phone}</div>}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-mono font-bold text-zinc-400">#{order.id.split('-').pop()}</div>
                        <div className="flex items-center text-[10px] text-zinc-400 font-medium gap-1 mt-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() - new Date(order.timestamp).getTime()) / 60000)}m
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 my-2 pt-2 pl-2">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase mb-1">Items</div>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs mb-0.5">
                          <span className="text-zinc-300 font-medium"><span className="text-zinc-400">{item.quantity}x</span> {item.name}</span>
                        </div>
                      ))}
                    </div>

                    {order.special_instructions && (
                      <div className="mt-2 ml-2 bg-red-500/10 text-rose-500 p-2 rounded text-[10px] flex gap-1.5 items-start">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="font-medium leading-tight">{order.special_instructions}</span>
                      </div>
                    )}

                    <div className="mt-3 ml-2 flex items-center justify-between">
                      <div className="text-[10px] font-bold text-zinc-400">
                        {order.payment_method === 'CASH' ? '💵 Cash' : '💳 Online'} • <span className={order.payment_status === 'PAID' ? 'text-amber-500' : 'text-amber-500-hover'}>{order.payment_status || 'NOT PAID'}</span>
                      </div>
                      <div className="font-black text-sm text-zinc-100">₹{order.total.toLocaleString()}</div>
                    </div>

                    {/* Quick Move Action */}
                    {colStatus !== 'Completed' && colStatus !== 'Cancelled' && (
                      <button 
                        onClick={() => handleNextStatusClick(order)}
                        className="mt-3 w-full bg-zinc-950 hover:bg-zinc-900 text-zinc-300 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        {updatingId === order.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                        Move to {KANBAN_COLUMNS[KANBAN_COLUMNS.indexOf(colStatus) + 1]}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {colOrders.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-zinc-800 rounded-xl">
                  <span className="text-zinc-400 text-xs font-semibold">Drop here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
