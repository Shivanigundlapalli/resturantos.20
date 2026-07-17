import React, { useState } from "react";
import { Trash2, Plus, Minus, ArrowRight, Tag, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem } from "../CustomerApp";
import { TabType } from "../CustomerDashboard";

interface CartTabProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCheckout: () => void;
  setActiveTab: (tab: TabType) => void;
}

export default function CartTab({ cart, setCart, onCheckout, setActiveTab }: CartTabProps) {
  const [couponCode, setCouponCode] = useState("");

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(c => c.cartItemId !== cartItemId));
    } else {
      setCart(prev => prev.map(c => c.cartItemId === cartItemId ? { ...c, cartQuantity: newQty } : c));
    }
  };

  const handleRemove = (cartItemId: string) => {
    setCart(prev => prev.filter(c => c.cartItemId !== cartItemId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const taxes = subtotal * 0.05; // 5% GST
  const total = subtotal + taxes;

  const getDishImage = (dishName: string) => {
    const name = dishName.toLowerCase();
    if (name.includes("biryani")) return "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=400&q=80";
    if (name.includes("paneer")) return "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400&q=80";
    if (name.includes("chicken")) return "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80";
    if (name.includes("dosa")) return "https://images.unsplash.com/photo-1589301760014-d929f39ce9b0?w=400&q=80";
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
  };

  if (cart.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#041A13] px-6">
        <div className="w-32 h-32 bg-[#0A241C] rounded-full flex items-center justify-center mb-6 shadow-inner border border-[#1B3629]">
          <ShoppingBagIcon className="w-12 h-12 text-[#A7B4AE] opacity-50" />
        </div>
        <h2 className="text-xl font-black text-[#FFFFFF] mb-2">Your cart is empty</h2>
        <p className="text-[#A7B4AE] text-sm mb-8 text-center">Looks like you haven't added any dishes to your cart yet.</p>
        <button 
          onClick={() => setActiveTab("menu")}
          className="bg-[#0F8F5B] text-[#FFFFFF] px-8 py-4 rounded-xl font-bold shadow-lg shadow-[#0F8F5B]/20 w-full max-w-xs"
        >
          Explore Menu
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative bg-[#041A13]">
      <header className="px-6 pt-8 pb-4 border-b border-[#1B3629] bg-[#041A13]/95 backdrop-blur-md sticky top-0 z-20">
        <h2 className="text-2xl font-black text-[#FFFFFF]">Your Order</h2>
        <p className="text-[#A7B4AE] text-sm mt-1">{cart.reduce((s,i) => s + i.cartQuantity, 0)} items in cart</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        <div className="space-y-4">
          <AnimatePresence>
            {cart.map((item) => (
              <motion.div 
                key={item.cartItemId}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#0A241C] p-4 rounded-3xl border border-[#1B3629] flex gap-4 items-center shadow-md"
              >
                <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                  <img src={getDishImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-[#FFFFFF] text-sm leading-tight pr-6">{item.name}</h3>
                  <p className="text-xs text-[#A7B4AE] mt-0.5">{item.category}</p>
                  <p className="text-[15px] font-black text-[#D4A53A] mt-2">₹{item.price}</p>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <button onClick={() => handleRemove(item.cartItemId)} className="text-[#A7B4AE] hover:text-red-400 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center bg-[#041A13] border border-[#1B3629] rounded-xl overflow-hidden">
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, item.cartQuantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#FFFFFF] hover:bg-[#1B3629]"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-[13px] font-bold text-[#FFFFFF]">{item.cartQuantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.cartItemId, item.cartQuantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-[#FFFFFF] hover:bg-[#1B3629]"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Coupons */}
        <div className="bg-[#0A241C] p-4 rounded-3xl border border-[#1B3629]">
          <div className="flex items-center gap-3 mb-3">
            <Tag className="w-5 h-5 text-[#D4A53A]" />
            <h4 className="font-bold text-[#FFFFFF] text-sm">Apply Coupon</h4>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter code" 
              value={couponCode}
              onChange={e => setCouponCode(e.target.value.toUpperCase())}
              className="flex-1 bg-[#041A13] border border-[#1B3629] rounded-xl px-4 py-3 text-sm text-[#FFFFFF] placeholder:text-[#A7B4AE] focus:outline-none focus:border-[#D4A53A]"
            />
            <button className="bg-[#0F8F5B] text-[#FFFFFF] px-4 rounded-xl text-sm font-bold shadow-lg shadow-[#0F8F5B]/20">
              Apply
            </button>
          </div>
        </div>

        {/* Bill Details */}
        <div className="bg-[#0A241C] p-5 rounded-3xl border border-[#1B3629]">
          <h4 className="font-bold text-[#FFFFFF] mb-4">Bill Details</h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm text-[#A7B4AE]">
              <span>Item Total</span>
              <span className="text-[#FFFFFF]">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#A7B4AE]">
              <span>Taxes & GST (5%)</span>
              <span className="text-[#FFFFFF]">₹{taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-[#A7B4AE]">
              <span>Delivery / Service Charge</span>
              <span className="text-emerald-500 font-medium">Free</span>
            </div>
            <div className="border-t border-[#1B3629] pt-3 mt-3 flex justify-between items-center">
              <span className="font-bold text-[#FFFFFF] text-lg">Grand Total</span>
              <span className="font-black text-[#D4A53A] text-xl">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-[#0A241C] border-t border-[#1B3629]">
        <button 
          onClick={onCheckout}
          className="w-full bg-[#D4A53A] text-[#041A13] p-4 rounded-2xl shadow-xl shadow-[#D4A53A]/20 font-black text-lg flex justify-between items-center hover:bg-[#c09432] transition-colors"
        >
          <span>Place Order</span>
          <div className="flex items-center gap-2">
            <span>₹{total.toFixed(2)}</span>
            <ArrowRight className="w-5 h-5" />
          </div>
        </button>
      </div>
    </div>
  );
}

function ShoppingBagIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
