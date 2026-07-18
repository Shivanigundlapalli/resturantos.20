// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Minus, Loader2, ArrowLeft, ChevronRight, X, ArrowRight, Home, LayoutGrid, FileText, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem } from "../types";
import { CartItem } from "./CustomerApp";
import { supabase } from "../lib/supabaseClient";

interface CustomerMenuProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCheckout: () => void;
  customerName: string;
  tableNumber: string;
}

export default function CustomerMenu({ cart, setCart, onCheckout, customerName, tableNumber }: CustomerMenuProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizations, setCustomizations] = useState<{ [key: string]: string }>({});

  const fetchMenu = async () => {
    try {
      const res = await fetch("/api/menu");
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setMenuItems(result.data);
      } else if (Array.isArray(result)) {
        setMenuItems(result);
      } else {
        setMenuItems([]);
      }
    } catch (err) {
      console.error("Failed to load menu", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();

    if (!supabase) return;
    const channel = supabase.channel('customer-menu-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        console.log("[Realtime] Menu changed, refetching...");
        fetchMenu();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = Array.from(new Set(Array.isArray(menuItems) ? menuItems.map(item => item.category) : []));
  const isSearching = searchQuery.length > 0;
  
  const displayedItems = (Array.isArray(menuItems) ? menuItems : []).filter(item => {
    if (isSearching) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return activeCategory ? item.category === activeCategory : false;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setCustomizations({ spice: "Medium", onion: "With Onion" });
  };

  const closeCustomizer = () => {
    setCustomizingItem(null);
    setCustomizations({});
  };

  const handleAddToCart = (item: MenuItem, customOpts?: any) => {
    setCart(prev => {
      const existing = prev.find(c => 
        c.id === item.id && 
        JSON.stringify(c.customizations || {}) === JSON.stringify(customOpts || {})
      );
      if (existing) {
        return prev.map(c => c.cartItemId === existing.cartItemId ? { ...c, cartQuantity: c.cartQuantity + 1 } : c);
      }
      return [...prev, { ...item, cartItemId: Date.now().toString() + Math.random(), cartQuantity: 1, customizations: customOpts || {} }];
    });
  };

  const confirmCustomization = () => {
    if (customizingItem) {
      handleAddToCart(customizingItem, customizations);
      closeCustomizer();
    }
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

  const getCategoryImage = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes("biryani") || c.includes("rice")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80";
    if (c.includes("special") || c.includes("starter") || c.includes("main")) return "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80";
    if (c.includes("dessert") || c.includes("sweet")) return "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80";
    if (c.includes("beverage") || c.includes("drink")) return "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80";
    return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80";
  };

  const getDishImage = (dishName: string, category: string) => {
    const name = dishName.toLowerCase();
    if (name.includes("chicken dum biryani")) return "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&q=80";
    if (name.includes("veg biryani")) return "https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=800&q=80";
    if (name.includes("mutton")) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80";
    if (name.includes("paneer")) return "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=800&q=80";
    if (name.includes("egg")) return "https://images.unsplash.com/photo-1600688640254-07d4b4a1fb5e?w=800&q=80"; 
    if (name.includes("fried rice")) return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80";
    if (name.includes("butter chicken") || name.includes("chicken 65") || name.includes("chicken")) return "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80";
    if (name.includes("gulab jamun") || name.includes("dessert") || name.includes("sweet")) return "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=800&q=80";
    if (name.includes("filter coffee") || name.includes("coffee") || name.includes("drink")) return "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&q=80";
    
    if (name.includes("biryani") || name.includes("rice")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80";
    if (name.includes("samosa") || name.includes("starter") || name.includes("tikka")) return "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80";

    const fallbacks = [
      "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
      "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80",
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80",
      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80",
      "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
      "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&q=80",
      "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80"
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return fallbacks[hash % fallbacks.length];
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#071A12] relative font-sans">
      
      {/* Header */}
      <header className="px-6 py-5 shrink-0 relative z-20 bg-[#071A12]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-[28px] font-sans font-black text-[#F5F5F2] tracking-tight leading-tight">Spice Heaven</h1>
            <p className="text-[15px] text-[#C8C8C3] flex items-center gap-1.5 mt-0.5 font-medium">
              Table {tableNumber} <span className="w-1.5 h-1.5 rounded-full bg-[#D4A53A] inline-block"></span>
            </p>
          </div>
          <div className="relative">
            <div className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center bg-[#0B2217] text-[#D4A53A] font-bold text-xl overflow-hidden">
               <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#22C55E] rounded-full border-2 border-[#071A12]"></div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#869990]" />
          <input 
            type="text" 
            placeholder="Search for your favorite dish..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 bg-[#0B2217] border border-[#1B3629] rounded-[20px] text-[15px] text-[#F5F5F2] placeholder:text-[#869990] focus:outline-none focus:border-[#D4A53A] focus:ring-1 focus:ring-[#D4A53A] transition-all shadow-inner"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 pb-[100px] h-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-[#869990] min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4A53A] mb-2" />
              <p className="text-xs font-medium">Loading Menu...</p>
            </div>
          ) : (
          <AnimatePresence mode="wait">
            {(isSearching || activeCategory) ? (
              <motion.div
                key="items-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {!isSearching && (
                  <button 
                    onClick={() => setActiveCategory(null)}
                    className="flex items-center gap-2 text-[#C8C8C3] font-bold text-sm mb-6 bg-[#0B2217] px-4 py-2 rounded-xl border border-[#1B3629] hover:bg-[#10271E] transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Categories
                  </button>
                )}
                
                {activeCategory && !isSearching && (
                  <h2 className="text-[22px] font-black text-[#F5F5F2] mb-4 tracking-tight">{activeCategory}</h2>
                )}
                
                {isSearching && (
                  <h2 className="text-sm font-bold text-[#869990] mb-4 uppercase tracking-wider">Search Results</h2>
                )}

                {displayedItems.length === 0 ? (
                  <div className="text-center text-[#869990] mt-10">
                    <p className="font-bold">No dishes found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {displayedItems.map((item, i) => {
                      const qty = getCartQuantity(item.id);
                      const isAvailable = item.status === "Available";
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={item.id} 
                          className={`bg-[#0B2217] rounded-[24px] border border-[#1B3629] flex flex-col overflow-hidden ${!isAvailable ? 'opacity-60' : ''}`}
                        >
                          <div className="w-full h-48 bg-[#071A12] relative shrink-0">
                            <img 
                              src={item.image || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80"} 
                              alt={item.name}
                              className="w-full h-full object-cover rounded-t-[24px]"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallbackUrl = "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80";
                                if (target.src !== fallbackUrl) {
                                  target.src = fallbackUrl;
                                }
                              }}
                            />
                            
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-[#071A12]/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                <span className="bg-[#0B2217]/90 text-[#F5F5F2] font-bold px-4 py-2 rounded-xl text-sm shadow-md backdrop-blur-md border border-warm-border uppercase tracking-wider">
                                  {item.status}
                                </span>
                              </div>
                            )}

                            <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[80%] z-20">
                              {item.tags?.map(tag => (
                                <span key={tag} className="bg-[#0B2217]/90 text-[#F5F5F2] text-[10px] font-bold px-2 py-1 rounded-md border border-white/20 backdrop-blur-md uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {item.isVeg !== undefined ? (
                              <div className="absolute top-3 right-3 bg-[#0B2217]/90 backdrop-blur-sm p-1.5 rounded-md z-20">
                                <div className={`w-3 h-3 rounded-full ${item.isVeg ? "bg-[#10B981]" : "bg-[#EF4444]"}`}></div>
                              </div>
                            ) : null}
                          </div>
                          
                          <div className="flex-1 flex flex-col justify-between p-5 relative z-20">
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-[#F5F5F2] text-lg leading-tight">{item.name}</h3>
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex text-[#D4A53A] text-sm font-bold items-center gap-1">
                                  <span>★</span> {item.popularity ? (item.popularity / 10).toFixed(1) : "4.5"}
                                </div>
                                <span className="text-xs text-[#869990] font-medium bg-[#071A12] px-2 py-0.5 rounded-md border border-[#1B3629]">
                                  ⏱ {item.timing_slot || "15 mins"}
                                </span>
                                {item.calories && (
                                  <span className="text-xs text-[#869990] font-medium bg-[#071A12] px-2 py-0.5 rounded-md border border-[#1B3629]">{item.calories} kcal</span>
                                )}
                              </div>
                              <p className="text-sm text-[#C8C8C3] font-medium line-clamp-2 mb-4">{item.short_description || item.description || `Authentic ${item.category?.replace(/[^a-zA-Z ]/g, "").trim().toLowerCase()} dish prepared with fresh ingredients.`}</p>
                            </div>

                            <div className="flex justify-between items-end mt-auto pt-4 border-t border-[#1B3629]">
                              <div className="flex flex-col">
                                {item.discounted_price ? (
                                  <>
                                    <span className="text-xs text-[#869990] line-through font-bold">₹{item.price}</span>
                                    <span className="font-black text-[#D4A53A] text-xl tracking-tight">₹{item.discounted_price}</span>
                                  </>
                                ) : (
                                  <span className="font-black text-[#F5F5F2] text-xl tracking-tight">₹{item.price}</span>
                                )}
                              </div>
                              
                              {isAvailable ? (
                                qty > 0 ? (
                                  <div className="flex items-center gap-3 border border-[#D4A53A]/30 rounded-xl p-1.5 bg-[#071A12]">
                                    <button 
                                      onClick={() => handleRemoveFromCart(item.id)}
                                      className="w-8 h-8 bg-[#0B2217] text-[#D4A53A] rounded-lg flex items-center justify-center border border-[#1B3629]"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-black w-6 text-center text-[#F5F5F2]">{qty}</span>
                                    <button 
                                      onClick={() => openCustomizer(item)}
                                      className="w-8 h-8 bg-[#D4A53A] text-[#071A12] rounded-lg flex items-center justify-center"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => openCustomizer(item)}
                                    className="border border-[#D4A53A]/50 text-[#D4A53A] hover:bg-[#D4A53A]/10 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-colors"
                                  >
                                    ADD
                                  </button>
                                )
                              ) : (
                                <button 
                                  disabled
                                  className="border border-[#1B3629] text-[#869990] bg-[#071A12] opacity-70 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-not-allowed"
                                >
                                  OUT OF STOCK
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            ) : (
              /* CATEGORY / HOME VIEW */
              <motion.div
                key="categories-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Hero Banner */}
                <div className="relative w-full h-[220px] rounded-[28px] overflow-hidden shadow-2xl mb-8 group border border-warm-border">
                  <img src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80" alt="Authentic Indian Cuisine" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#071A12]/95 via-[#071A12]/80 to-transparent"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 left-8 z-10 max-w-[60%]">
                    <h2 className="text-[28px] font-black tracking-tight leading-[1.1] mb-2">
                      <span className="text-[#F5F5F2]">Authentic</span><br/>
                      <span className="text-[#D4A53A]">Indian Cuisine</span>
                    </h2>
                    <p className="text-[13px] text-[#C8C8C3] font-medium mb-5">Prepared fresh for you</p>
                    
                    <div className="flex items-center gap-2 opacity-80">
                      <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#D4A53A]"></div>
                      <div className="w-1.5 h-1.5 rotate-45 bg-[#D4A53A]"></div>
                      <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4A53A]"></div>
                    </div>
                  </div>
                </div>

                {/* Horizontal Scroll Categories */}
                <div className="mb-6">
                  <h2 className="text-[22px] font-black text-[#F5F5F2] tracking-tight mb-4 pl-1">What are you craving?</h2>
                  <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {categories.map((cat, i) => {
                      const count = menuItems.filter(m => m.category === cat).length;
                      return (
                        <motion.button
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className="relative h-[180px] min-w-[280px] w-[280px] rounded-[28px] overflow-hidden shadow-2xl group cursor-pointer border border-[#1B3629] snap-start shrink-0 text-left bg-[#0B2217]"
                        >
                          <img 
                            src={getCategoryImage(cat)} 
                            alt={cat} 
                            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#071A12] via-[#071A12]/50 to-transparent"></div>
                          
                          <div className="absolute bottom-5 left-5 right-5 flex justify-between items-end">
                            <div>
                              <h3 className="text-[#F5F5F2] font-black text-[22px] tracking-tight leading-tight mb-1">{cat}</h3>
                              <p className="text-[#869990] text-[13px] font-medium">{count} {count === 1 ? 'Item' : 'Items'}</p>
                            </div>
                            <div className="w-[38px] h-[38px] rounded-full border border-[#D4A53A]/50 bg-[#071A12]/40 backdrop-blur-md flex items-center justify-center text-[#D4A53A] shrink-0 group-hover:border-[#D4A53A] transition-colors">
                              <ArrowRight className="w-[18px] h-[18px]" />
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#071A12] border-t border-[#1B3629] pb-safe pt-2">
        <div className="max-w-md mx-auto flex justify-between items-end h-[68px] pb-2 px-2">
          {/* Home Tab */}
          <button 
            onClick={() => setActiveCategory(null)}
            className={`flex flex-col items-center justify-between h-full w-[20%] relative pt-2 ${!activeCategory ? 'text-[#D4A53A]' : 'text-[#869990] hover:text-[#C8C8C3]'}`}
          >
            <Home className="w-[26px] h-[26px] mb-1" strokeWidth={!activeCategory ? 2.5 : 2} />
            <span className="text-[11px] font-bold">Home</span>
            {!activeCategory && (
              <div className="absolute bottom-[-8px] w-6 h-1 bg-[#D4A53A] rounded-t-full"></div>
            )}
          </button>
          
          {/* Categories Tab */}
          <button className={`flex flex-col items-center justify-between h-full w-[20%] pt-2 pb-1.5 ${activeCategory ? 'text-[#D4A53A]' : 'text-[#869990] hover:text-[#C8C8C3]'}`}>
            <LayoutGrid className="w-[26px] h-[26px] mb-1" strokeWidth={activeCategory ? 2.5 : 2} />
            <span className="text-[11px] font-medium">Categories</span>
            {activeCategory && (
              <div className="absolute bottom-[-8px] w-6 h-1 bg-[#D4A53A] rounded-t-full"></div>
            )}
          </button>
          
          {/* Cart Tab */}
          <button onClick={onCheckout} className="flex flex-col items-center justify-between h-full w-[20%] text-[#869990] hover:text-[#C8C8C3] transition-colors relative pt-2 pb-1.5">
            <div className="relative">
              <ShoppingBag className="w-[26px] h-[26px] mb-1" strokeWidth={2} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-[#D4A53A] text-[#071A12] w-[18px] h-[18px] rounded-full text-[10px] font-black flex items-center justify-center border-2 border-[#071A12]">
                  {cartItemCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">Cart</span>
          </button>
          
          {/* Orders Tab */}
          <button className="flex flex-col items-center justify-between h-full w-[20%] text-[#869990] hover:text-[#C8C8C3] transition-colors pt-2 pb-1.5">
            <FileText className="w-[26px] h-[26px] mb-1" strokeWidth={2} />
            <span className="text-[11px] font-medium">Orders</span>
          </button>
          
          {/* Profile Tab */}
          <button className="flex flex-col items-center justify-between h-full w-[20%] text-[#869990] hover:text-[#C8C8C3] transition-colors pt-2 pb-1.5">
            <User className="w-[26px] h-[26px] mb-1" strokeWidth={2} />
            <span className="text-[11px] font-medium">Profile</span>
          </button>
        </div>
      </div>

      {/* Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-[#071A12]/80 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full md:max-w-md bg-[#0B2217] border border-[#1B3629] rounded-t-[32px] md:rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-2xl"
            >
              <div className="flex justify-between items-center p-5 border-b border-[#1B3629] bg-[#071A12] shrink-0">
                <div>
                  <h3 className="font-black text-[#F5F5F2] text-xl">Customize</h3>
                  <p className="text-xs text-[#869990] font-bold mt-1">{customizingItem.name}</p>
                </div>
                <button onClick={closeCustomizer} className="p-2.5 bg-[#0B2217] rounded-full text-[#C8C8C3] hover:text-[#F5F5F2] border border-[#1B3629]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-8 flex-1">
                <div>
                  <h4 className="text-xs font-black text-[#869990] mb-4 uppercase tracking-wider">Spice Level</h4>
                  <div className="flex gap-3">
                    {["Mild", "Medium", "Spicy"].map(level => (
                      <button
                        key={level}
                        onClick={() => setCustomizations(p => ({ ...p, spice: level }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                          customizations.spice === level 
                            ? 'bg-[#D4A53A]/10 border-[#D4A53A] text-[#D4A53A]' 
                            : 'bg-[#071A12] border-[#1B3629] text-[#C8C8C3] hover:bg-[#10271E]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-[#869990] mb-4 uppercase tracking-wider">Onion</h4>
                  <div className="flex gap-3">
                    {["With Onion", "Without Onion"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setCustomizations(p => ({ ...p, onion: opt }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all border ${
                          customizations.onion === opt 
                            ? 'bg-[#D4A53A]/10 border-[#D4A53A] text-[#D4A53A]' 
                            : 'bg-[#071A12] border-[#1B3629] text-[#C8C8C3] hover:bg-[#10271E]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-[#869990] mb-4 uppercase tracking-wider">Add-ons (Optional)</h4>
                  <div className="space-y-3 text-sm font-bold text-[#F5F5F2]">
                    <label className="flex items-center gap-4 p-4 border border-[#1B3629] bg-[#071A12] rounded-[16px] cursor-pointer hover:bg-[#10271E] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={customizations.cheese === "Extra Cheese"}
                        onChange={(e) => setCustomizations(p => ({ ...p, cheese: e.target.checked ? "Extra Cheese" : "" }))}
                        className="w-5 h-5 accent-[#D4A53A] rounded"
                      />
                      <span>Add Extra Cheese (+₹30)</span>
                    </label>
                    <label className="flex items-center gap-4 p-4 border border-[#1B3629] bg-[#071A12] rounded-[16px] cursor-pointer hover:bg-[#10271E] transition-colors">
                      <input 
                        type="checkbox" 
                        checked={customizations.butter === "Extra Butter"}
                        onChange={(e) => setCustomizations(p => ({ ...p, butter: e.target.checked ? "Extra Butter" : "" }))}
                        className="w-5 h-5 accent-[#D4A53A] rounded"
                      />
                      <span>Add Extra Butter (+₹20)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#1B3629] bg-[#071A12] shrink-0">
                <button
                  onClick={confirmCustomization}
                  className="w-full bg-[#10B981] text-[#071A12] font-black py-4 rounded-2xl transition-colors hover:bg-[#059669]"
                >
                  Add to Cart • ₹{customizingItem.price + (customizations.cheese ? 30 : 0) + (customizations.butter ? 20 : 0)}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
