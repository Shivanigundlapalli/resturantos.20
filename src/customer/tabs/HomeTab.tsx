import React, { useState, useEffect } from "react";
import { Search, Mic, Star, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TabType } from "../CustomerDashboard";

interface HomeTabProps {
  customerName: string;
  tableNumber: string;
  setActiveTab: (tab: TabType) => void;
}

export default function HomeTab({ customerName, tableNumber, setActiveTab }: HomeTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  const heroBanners = [
    { image: "https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=1200&q=80", title: "Authentic Indian Cuisine", subtitle: "Prepared Fresh for You" },
    { image: "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=1200&q=80", title: "Today's Special", subtitle: "Hyderabadi Dum Biryani" },
    { image: "https://images.unsplash.com/photo-1555126634-323283e090fa?w=1200&q=80", title: "Flat 20% Off", subtitle: "On all Starters" }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroBanners.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const categories = [
    { name: "Main Course", items: 24, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80" },
    { name: "Starters", items: 16, image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&q=80" },
    { name: "Biryani", items: 8, image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&q=80" },
    { name: "Desserts", items: 12, image: "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=400&q=80" },
    { name: "Beverages", items: 10, image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400&q=80" },
  ];

  const bestSellers = [
    { name: "Butter Chicken", rating: 4.8, price: 320, time: "25 min", type: "non-veg", image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&q=80" },
    { name: "Paneer Butter Masala", rating: 4.7, price: 280, time: "20 min", type: "veg", image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=400&q=80" },
    { name: "Masala Dosa", rating: 4.9, price: 120, time: "15 min", type: "veg", image: "https://images.unsplash.com/photo-1589301760014-d929f39ce9b0?w=400&q=80" }
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <header className="px-6 pt-8 pb-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#0A241C] border-2 border-[#D4A53A]/30 rounded-2xl flex items-center justify-center overflow-hidden">
              <img src="/vite.svg" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#FFFFFF] tracking-tight">Spice Heaven</h1>
              <p className="text-sm text-[#A7B4AE] font-medium flex items-center gap-1.5">
                Table {tableNumber || "Guest"}
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F8F5B] inline-block shadow-[0_0_5px_#0F8F5B]"></span>
              </p>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#0A241C] shadow-lg relative">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80" alt="Avatar" className="w-full h-full object-cover" />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0F8F5B] rounded-full border-2 border-[#041A13]"></div>
          </div>
        </div>

        {/* Search Bar */}
        <motion.div 
          animate={{ scale: isSearchFocused ? 1.02 : 1 }}
          className={`relative flex items-center bg-[#0A241C] border ${isSearchFocused ? 'border-[#D4A53A]' : 'border-[#1B3629]'} rounded-2xl shadow-inner transition-colors duration-300`}
        >
          <Search className="absolute left-4 w-5 h-5 text-[#A7B4AE]" />
          <input 
            type="text"
            placeholder="Search for your favorite dish..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            className="w-full pl-12 pr-12 py-4 bg-transparent text-[#FFFFFF] text-sm focus:outline-none placeholder:text-[#A7B4AE]"
          />
          <button className="absolute right-4 text-[#D4A53A]">
            <Mic className="w-5 h-5" />
          </button>
        </motion.div>
      </header>

      {/* Hero Banner */}
      <div className="px-6 mb-8 relative">
        <div className="w-full h-48 rounded-3xl overflow-hidden relative shadow-lg shadow-[#0A241C]">
          <AnimatePresence mode="wait">
            <motion.img
              key={heroIndex}
              src={heroBanners[heroIndex].image}
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-[#041A13]/90 via-[#041A13]/50 to-transparent"></div>
          
          <div className="absolute inset-0 p-6 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={heroIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <span className="px-2 py-1 bg-[#D4A53A]/20 border border-[#D4A53A]/50 text-[#D4A53A] text-xs font-black rounded-lg uppercase tracking-wider mb-2 inline-block backdrop-blur-md">
                  {heroBanners[heroIndex].title}
                </span>
                <h2 className="text-2xl font-black text-[#FFFFFF] w-2/3 leading-tight mb-4">
                  {heroBanners[heroIndex].subtitle}
                </h2>
                <button 
                  onClick={() => setActiveTab("menu")}
                  className="bg-[#0F8F5B] text-[#FFFFFF] px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-[#0F8F5B]/20"
                >
                  View Menu
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Pagination dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {heroBanners.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === heroIndex ? 'w-4 bg-[#D4A53A]' : 'w-1.5 bg-[#FFFFFF]/50'}`}></div>
            ))}
          </div>
        </div>
      </div>

      {/* Food Categories */}
      <div className="mb-8">
        <div className="flex justify-between items-end px-6 mb-4">
          <h3 className="text-lg font-black text-[#FFFFFF]">Categories</h3>
          <button onClick={() => setActiveTab("menu")} className="text-[#D4A53A] text-xs font-bold">See All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-6 pb-4 snap-x hide-scrollbar">
          {categories.map((cat, idx) => (
            <motion.div 
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.95 }}
              key={idx} 
              onClick={() => setActiveTab("menu")}
              className="snap-start shrink-0 w-24 flex flex-col items-center gap-2 cursor-pointer"
            >
              <div className="w-20 h-20 rounded-[24px] overflow-hidden shadow-lg border border-[#1B3629] relative">
                <img src={cat.image} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-[#0A241C]/20"></div>
              </div>
              <div className="text-center">
                <p className="text-[13px] font-bold text-[#FFFFFF]">{cat.name}</p>
                <p className="text-[10px] text-[#A7B4AE]">{cat.items} Items</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Special Offer Card */}
      <div className="px-6 mb-8">
        <div className="bg-gradient-to-br from-[#0F8F5B]/20 to-[#0A241C] border border-[#0F8F5B]/30 rounded-3xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#D4A53A] text-[#041A13] px-2.5 py-1 rounded-lg text-xs font-black mb-2">
              <Star className="w-3 h-3 fill-[#041A13]" /> 20% OFF
            </div>
            <h4 className="text-[#FFFFFF] font-black text-lg">Butter Chicken Combo</h4>
            <p className="text-[#A7B4AE] text-xs mt-1">Valid till midnight!</p>
          </div>
          <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl border-2 border-[#D4A53A]/20">
            <img src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=200&q=80" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      {/* Best Sellers */}
      <div className="mb-8 px-6">
        <h3 className="text-lg font-black text-[#FFFFFF] mb-4">Best Sellers</h3>
        <div className="grid grid-cols-1 gap-4">
          {bestSellers.map((item, idx) => (
            <div key={idx} className="bg-[#0A241C] rounded-2xl p-3 flex gap-4 border border-[#1B3629] shadow-sm items-center">
              <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0">
                <img src={item.image} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="text-[#FFFFFF] font-bold text-sm leading-tight pr-2">{item.name}</h4>
                  <div className={`w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 ${item.type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center text-[#D4A53A] text-[10px] font-black bg-[#D4A53A]/10 px-1.5 py-0.5 rounded-md">
                    <Star className="w-3 h-3 mr-0.5 fill-[#D4A53A]" /> {item.rating}
                  </span>
                  <span className="flex items-center text-[#A7B4AE] text-[10px] font-medium">
                    <Clock className="w-3 h-3 mr-0.5" /> {item.time}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-[#FFFFFF] font-black text-sm">₹{item.price}</span>
                  <button onClick={() => setActiveTab("menu")} className="bg-[#041A13] border border-[#0F8F5B] text-[#0F8F5B] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#0F8F5B] hover:text-[#FFFFFF] transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
