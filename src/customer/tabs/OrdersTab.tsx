import React, { useState, useEffect } from "react";
import { Loader2, Receipt, Clock, CheckCircle2, ChefHat, Package } from "lucide-react";
import { Order } from "../../types";

interface OrdersTabProps {
  mobileNumber: string;
}

export default function OrdersTab({ mobileNumber }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/orders")
      .then(res => res.json())
      .then(data => {
        // Filter orders for this customer (in a real app, backend filters by auth token/phone)
        const myOrders = (data as Order[]).filter(o => o.phone.includes(mobileNumber.slice(-10)) || o.phone === mobileNumber);
        setOrders(myOrders.reverse());
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load orders", err);
        setIsLoading(false);
      });
  }, [mobileNumber]);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
      case 'preparing': 
      case 'cooking': return <ChefHat className="w-5 h-5 text-amber-500" />;
      case 'ready': return <Package className="w-5 h-5 text-[#0F8F5B]" />;
      case 'served':
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-[#0F8F5B]" />;
      default: return <Clock className="w-5 h-5 text-[#A7B4AE]" />;
    }
  };

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'served' || s === 'ready') return "bg-[#0F8F5B]/10 text-[#0F8F5B] border-[#0F8F5B]/30";
    if (s === 'pending') return "bg-amber-500/10 text-amber-500 border-amber-500/30";
    return "bg-[#D4A53A]/10 text-[#D4A53A] border-[#D4A53A]/30";
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#041A13]">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A53A]" />
        <p className="text-[#A7B4AE] text-sm mt-4 font-medium">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] relative">
      <header className="px-6 pt-8 pb-4 border-b border-[#1B3629] sticky top-0 bg-[#041A13]/95 backdrop-blur-md z-20">
        <h2 className="text-2xl font-black text-[#FFFFFF]">Order History</h2>
        <p className="text-[#A7B4AE] text-sm mt-1">Track and manage your orders</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-[#0A241C] rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-[#1B3629]">
              <Receipt className="w-10 h-10 text-[#A7B4AE] opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-[#FFFFFF] mb-2">No orders yet</h3>
            <p className="text-[#A7B4AE] text-sm">Looks like you haven't placed any orders.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order) => (
              <div key={order.id} className="bg-[#0A241C] border border-[#1B3629] rounded-3xl p-5 shadow-lg relative overflow-hidden">
                {/* Status indicator line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${order.status.toLowerCase() === 'completed' || order.status.toLowerCase() === 'served' ? 'bg-[#0F8F5B]' : 'bg-[#D4A53A]'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[#FFFFFF] font-black text-lg">Order #{order.id.replace('ORD-', '')}</h3>
                    <p className="text-[#A7B4AE] text-xs mt-1">
                      {new Date(order.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold ${getStatusColor(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status}
                  </div>
                </div>

                <div className="border-t border-[#1B3629] border-dashed pt-4 mb-4">
                  <div className="space-y-2">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex gap-2 items-center">
                          <span className="text-[#A7B4AE] font-black text-xs bg-[#041A13] px-1.5 py-0.5 rounded">{item.quantity}x</span>
                          <span className="text-[#FFFFFF]">{item.name}</span>
                        </div>
                        <span className="text-[#FFFFFF] font-medium">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-[#1B3629]">
                  <div>
                    <p className="text-xs text-[#A7B4AE]">Total Amount</p>
                    <p className="text-lg font-black text-[#D4A53A]">₹{order.total}</p>
                  </div>
                  <button className="bg-[#0F8F5B] text-[#FFFFFF] px-5 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-[#0F8F5B]/20">
                    Reorder
                  </button>
                </div>
                
                {/* Live progress bar for active orders */}
                {(order.status.toLowerCase() === 'pending' || order.status.toLowerCase() === 'preparing') && (
                  <div className="mt-5 bg-[#041A13] p-3 rounded-2xl border border-[#1B3629]">
                    <div className="flex justify-between text-xs text-[#A7B4AE] font-bold mb-2">
                      <span>Preparing</span>
                      <span>Cooking</span>
                      <span>Ready</span>
                    </div>
                    <div className="w-full bg-[#1B3629] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#D4A53A] h-full w-1/3 rounded-full relative">
                         <div className="absolute top-0 bottom-0 left-0 right-0 bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
