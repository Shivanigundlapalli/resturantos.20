import React, { useState } from "react";
import { Home, LayoutList, ShoppingCart, Clock, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CartItem } from "./CustomerApp";
import HomeTab from "./tabs/HomeTab";
import MenuTab from "./tabs/MenuTab";
import CartTab from "./tabs/CartTab";
import OrdersTab from "./tabs/OrdersTab";
import ProfileTab from "./tabs/ProfileTab";

interface CustomerDashboardProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  customerName: string;
  mobileNumber: string;
  tableNumber: string;
  onCheckout: () => void;
}

export type TabType = "home" | "menu" | "cart" | "orders" | "profile";

export default function CustomerDashboard({
  cart,
  setCart,
  customerName,
  mobileNumber,
  tableNumber,
  onCheckout
}: CustomerDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("home");

  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const tabs = [
    { id: "home", label: "Home", icon: Home },
    { id: "menu", label: "Menu", icon: LayoutList },
    { id: "cart", label: "Cart", icon: ShoppingCart, badge: cartItemCount },
    { id: "orders", label: "Orders", icon: Clock },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-[#041A13] text-[#FFFFFF] font-sans relative overflow-hidden">
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-[80px]">
        <AnimatePresence mode="wait">
          {activeTab === "home" && (
            <motion.div key="home" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <HomeTab customerName={customerName} tableNumber={tableNumber} setActiveTab={setActiveTab} />
            </motion.div>
          )}
          {activeTab === "menu" && (
            <motion.div key="menu" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <MenuTab cart={cart} setCart={setCart} setActiveTab={setActiveTab} />
            </motion.div>
          )}
          {activeTab === "cart" && (
            <motion.div key="cart" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <CartTab cart={cart} setCart={setCart} onCheckout={onCheckout} setActiveTab={setActiveTab} />
            </motion.div>
          )}
          {activeTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <OrdersTab mobileNumber={mobileNumber} />
            </motion.div>
          )}
          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <ProfileTab customerName={customerName} mobileNumber={mobileNumber} tableNumber={tableNumber} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#0A241C]/80 backdrop-blur-xl border-t border-[#0F8F5B]/20 px-6 py-4 pb-safe flex justify-between items-center z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(4,26,19,0.5)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className="relative flex flex-col items-center justify-center gap-1 w-12"
            >
              {isActive && (
                <motion.div layoutId="active-nav" className="absolute -top-6 w-12 h-1 bg-[#D4A53A] rounded-full shadow-[0_0_10px_#D4A53A]" />
              )}
              <div className="relative">
                <Icon className={`w-6 h-6 transition-all duration-300 ${isActive ? 'text-[#D4A53A]' : 'text-[#A7B4AE]'}`} />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-[#D4A53A] text-[#041A13] text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#D4A53A]' : 'text-[#A7B4AE]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
