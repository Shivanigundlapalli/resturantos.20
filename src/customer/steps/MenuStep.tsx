// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, Minus, Loader2, Star, Info, ShoppingCart } from 'lucide-react';
import { MenuItem } from '../../types';
import { CartItem } from '../CustomerApp';

interface MenuStepProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onNext: () => void;
}

export default function MenuStep({ cart, setCart, onNext }: MenuStepProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => {
        const items = data.success && Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        setMenuItems(items);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load menu", err);
        setIsLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(menuItems.map(item => item.category)))];
  
  // Filter items: search query and availability
  const displayedItems = menuItems.filter(item => {
    const isAvailable = item.status !== "Sold Out" && item.status !== "Out Of Stock" && item.status !== "Discontinued";
    if (!isAvailable) return false;

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
  
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

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
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col relative"
    >
      <div className="sticky top-0 bg-[#041A13]/95 backdrop-blur-md z-30 pt-6 px-6 pb-4 border-b border-warm-border">
        <h2 className="text-2xl font-black text-text-main mb-4 tracking-tight">Browse Menu</h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-sec" />
          <input 
            type="text" 
            placeholder="Search dishes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-warm-bg border border-warm-border rounded-2xl text-[15px] text-text-main placeholder:text-text-muted focus:outline-none focus:border-customer-primary transition-colors"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto hide-scrollbar snap-x pb-2">
          {categories.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setActiveCategory(cat)}
              className={`snap-start shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                activeCategory === cat 
                ? 'bg-customer-primary text-white border-customer-primary shadow-lg shadow-amber-500/20' 
                : 'bg-warm-bg text-text-sec border-warm-border hover:border-customer-primary/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 pb-[100px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted">
            <Loader2 className="w-8 h-8 animate-spin text-customer-primary mb-2" />
            <p className="text-xs font-medium">Loading Menu...</p>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-10 bg-warm-bg rounded-2xl border border-warm-border">
            <Info className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-50" />
            <h3 className="text-text-main font-bold text-lg mb-1">No dishes found</h3>
            <p className="text-text-muted text-sm">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {displayedItems.map((item) => {
              const qty = getCartQuantity(item.id);
              const typeIsVeg = item.isVeg !== undefined ? item.isVeg : (!item.name.toLowerCase().includes('chicken') && !item.name.toLowerCase().includes('mutton') && !item.name.toLowerCase().includes('egg'));
              
              return (
                <div key={item.id} className="bg-warm-bg rounded-3xl p-4 flex gap-4 border border-warm-border shadow-md relative overflow-hidden transition-all hover:border-customer-primary/30">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 shadow-inner relative">
                    <img src={getDishImage(item.name)} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-[15px] font-black text-text-main leading-tight pr-2">{item.name}</h3>
                        <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${typeIsVeg ? 'border-customer-primary' : 'border-red-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${typeIsVeg ? 'bg-customer-primary' : 'bg-red-500'}`}></div>
                        </div>
                      </div>
                      <p className="text-xs text-text-sec mt-1 line-clamp-1">{item.category}</p>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <span className="flex items-center text-customer-primary text-[10px] font-black bg-customer-primary/10 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3 h-3 mr-0.5 fill-amber-500" /> 4.{item.popularity || 5}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-lg font-black text-text-main">₹{item.price}</span>
                      
                      {qty > 0 ? (
                        <div className="flex items-center bg-customer-primary rounded-xl overflow-hidden shadow-lg shadow-amber-500/20">
                          <button 
                            onClick={() => handleRemoveFromCart(item.id)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-950 hover:bg-black/10 transition-colors"
                          >
                            <Minus className="w-4 h-4 font-bold" />
                          </button>
                          <span className="w-6 text-center text-[13px] font-black text-zinc-950">{qty}</span>
                          <button 
                            onClick={() => handleAddToCart(item)}
                            className="w-8 h-8 flex items-center justify-center text-zinc-950 hover:bg-black/10 transition-colors"
                          >
                            <Plus className="w-4 h-4 font-bold" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleAddToCart(item)}
                          className="px-4 py-1.5 rounded-xl text-sm font-bold transition-all shadow-sm bg-warm-bg border border-warm-border text-text-sec hover:bg-customer-primary hover:text-white hover:border-customer-primary"
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

      {/* Floating Action Button for Cart Checkout */}
      {cartItemCount > 0 && (
        <div className="absolute bottom-6 left-0 right-0 px-6 flex justify-center z-50">
          <motion.button
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={onNext}
            className="w-full max-w-md bg-customer-primary text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-between shadow-[0_10px_40px_rgba(245,158,11,0.3)] hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-warm-bg text-customer-primary rounded-full flex items-center justify-center text-sm">
                {cartItemCount}
              </div>
              <span>View Cart</span>
            </div>
            <span>₹{cartTotal.toFixed(2)} &rarr;</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
