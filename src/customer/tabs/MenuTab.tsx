import React, { useState, useEffect } from "react";
import { Search, Plus, Minus, Loader2, Star, Clock, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem } from "../../types";
import { CartItem } from "../CustomerApp";
import { TabType } from "../CustomerDashboard";

interface MenuTabProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  setActiveTab: (tab: TabType) => void;
}

export default function MenuTab({ cart, setCart, setActiveTab }: MenuTabProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => {
        setMenuItems(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load menu", err);
        setIsLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(menuItems.map(item => item.category)))];
  
  const displayedItems = menuItems.filter(item => {
    if (searchQuery) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return activeCategory === "All" ? true : item.category === activeCategory;
  });

  const handleAddToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) {
        return prev.map(c => c.cartItemId === existing.cartItemId ? { ...c, cartQuantity: c.cartQuantity + 1 } : c);
      }
      return [...prev, { ...item, cartItemId: Date.now().toString() + Math.random(), cartQuantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => {
      const itemVariations = prev.filter(c => c.id === itemId);
      if (itemVariations.length === 0) return prev;
      const targetCartItemId = itemVariations[itemVariations.length - 1].cartItemId;
      const target = prev.find(c => c.cartItemId === targetCartItemId);
      if (target && target.cartQuantity > 1) {
        return prev.map(c => c.cartItemId === targetCartItemId ? { ...c, cartQuantity: c.cartQuantity - 1 } : c);
      }
      return prev.filter(c => c.cartItemId !== targetCartItemId);
    });
  };

  const getCartQuantity = (itemId: string) => {
    return cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.cartQuantity, 0);
  };

  const getDishImage = (dishName: string) => {
    const name = dishName.toLowerCase();
    if (name.includes("chicken dum biryani")) return "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&q=80";
    if (name.includes("veg biryani")) return "https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=800&q=80";
    if (name.includes("mutton")) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80";
    if (name.includes("paneer")) return "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=800&q=80";
    if (name.includes("egg")) return "https://images.unsplash.com/photo-1600688640254-07d4b4a1fb5e?w=800&q=80"; 
    if (name.includes("fried rice")) return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80";
    if (name.includes("butter chicken") || name.includes("chicken 65") || name.includes("chicken")) return "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80";
    if (name.includes("gulab jamun") || name.includes("dessert") || name.includes("sweet") || name.includes("cake") || name.includes("brownie") || name.includes("ice cream")) return "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=800&q=80";
    if (name.includes("filter coffee") || name.includes("coffee") || name.includes("tea") || name.includes("soda") || name.includes("juice") || name.includes("lassi") || name.includes("drink")) return "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&q=80";
    if (name.includes("biryani") || name.includes("rice")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80";
    const fallbacks = [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80"
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return fallbacks[hash % fallbacks.length];
  };

  return (
    <div className="w-full h-full flex flex-col relative bg-[#041A13]">
      <div className="sticky top-0 bg-[#041A13]/95 backdrop-blur-md z-30 pt-6 px-6 pb-4 border-b border-[#1B3629]">
        <h2 className="text-2xl font-black text-[#FFFFFF] mb-4">Our Menu</h2>
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A7B4AE]" />
          <input 
            type="text" 
            placeholder="Search dishes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-[#0A241C] border border-[#1B3629] rounded-2xl text-[15px] text-[#FFFFFF] placeholder:text-[#A7B4AE] focus:outline-none focus:border-[#D4A53A] transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                activeCategory === cat 
                ? 'bg-[#0F8F5B] text-[#FFFFFF] border-[#0F8F5B] shadow-lg shadow-[#0F8F5B]/20' 
                : 'bg-[#0A241C] text-[#A7B4AE] border-[#1B3629] hover:border-[#D4A53A]/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#869990]">
            <Loader2 className="w-8 h-8 animate-spin text-[#D4A53A] mb-2" />
            <p className="text-xs font-medium">Loading Menu...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-10 bg-[#0A241C] rounded-2xl border border-[#1B3629]">
            <Info className="w-12 h-12 text-[#A7B4AE] mx-auto mb-3 opacity-50" />
            <h3 className="text-[#FFFFFF] font-bold text-lg mb-1">No dishes found</h3>
            <p className="text-[#A7B4AE] text-sm">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {displayedItems.map((item) => {
              const qty = getCartQuantity(item.id);
              const isVeg = item.is_veg !== false; // assuming true if undefined for UI sake based on name if needed, but using simple logic
              const typeIsVeg = !item.name.toLowerCase().includes('chicken') && !item.name.toLowerCase().includes('mutton') && !item.name.toLowerCase().includes('egg');
              
              return (
                <div key={item.id} className="bg-[#0A241C] rounded-3xl p-4 flex gap-4 border border-[#1B3629] shadow-md relative overflow-hidden">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-inner">
                    <img src={getDishImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-[15px] font-black text-[#FFFFFF] leading-tight pr-2">{item.name}</h3>
                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${typeIsVeg ? 'border-green-500' : 'border-red-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${typeIsVeg ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        </div>
                      </div>
                      <p className="text-xs text-[#A7B4AE] mt-1 line-clamp-1">{item.category}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center text-[#D4A53A] text-[10px] font-black bg-[#D4A53A]/10 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3 h-3 mr-0.5 fill-[#D4A53A]" /> 4.{item.popularity || 5}
                        </span>
                        <span className="flex items-center text-[#A7B4AE] text-[10px] font-medium bg-[#1B3629]/50 px-1.5 py-0.5 rounded-md">
                          <Clock className="w-3 h-3 mr-0.5" /> 15m
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-lg font-black text-[#FFFFFF]">₹{item.price}</span>
                      
                      {qty > 0 ? (
                        <div className="flex items-center bg-[#0F8F5B] rounded-xl overflow-hidden shadow-lg shadow-[#0F8F5B]/20">
                          <button 
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="w-8 h-8 flex items-center justify-center text-[#FFFFFF] hover:bg-black/20 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center text-[13px] font-black text-[#FFFFFF]">{qty}</span>
                          <button 
                            onClick={() => handleAddToCart(item)}
                            className="w-8 h-8 flex items-center justify-center text-[#FFFFFF] hover:bg-black/20 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="bg-[#041A13] border border-[#0F8F5B] text-[#0F8F5B] px-4 py-1.5 rounded-xl text-sm font-bold hover:bg-[#0F8F5B] hover:text-[#FFFFFF] transition-all shadow-sm"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
