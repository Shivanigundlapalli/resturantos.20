import React, { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Minus, Loader2, ArrowLeft, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MenuItem } from "../types";
import { CartItem } from "./CustomerApp";

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
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null means showing categories list
  const [searchQuery, setSearchQuery] = useState("");
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customizations, setCustomizations] = useState<{ [key: string]: string }>({});

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

  // The single source of truth for categories comes directly from the Owner's menu data in Supabase/backend.
  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  // If search query is present, we show all matching items regardless of category view
  const isSearching = searchQuery.length > 0;
  
  const displayedItems = menuItems.filter(item => {
    if (isSearching) {
      return item.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return activeCategory ? item.category === activeCategory : false;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.cartQuantity, 0);

  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setCustomizations({
      spice: "Medium",
      onion: "With Onion"
    });
  };

  const closeCustomizer = () => {
    setCustomizingItem(null);
    setCustomizations({});
  };

  const handleAddToCart = (item: MenuItem, customOpts?: any) => {
    setCart(prev => {
      // Find exact same item with exact same customizations
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
      // Find the last added variation of this item
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
    // Total quantity of all variations of this item
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
    
    // Explicit Dish Matches
    if (name.includes("chicken dum biryani")) return "https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?w=800&q=80";
    if (name.includes("veg biryani")) return "https://images.unsplash.com/photo-1589302168068-964664d93cb0?w=800&q=80";
    if (name.includes("mutton")) return "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80";
    if (name.includes("paneer")) return "https://images.unsplash.com/photo-1631452180519-c014fe946bc0?w=800&q=80";
    if (name.includes("egg")) return "https://images.unsplash.com/photo-1600688640254-07d4b4a1fb5e?w=800&q=80"; 
    if (name.includes("fried rice")) return "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800&q=80";
    if (name.includes("butter chicken") || name.includes("chicken 65") || name.includes("chicken")) return "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=800&q=80";
    if (name.includes("gulab jamun") || name.includes("dessert") || name.includes("sweet")) return "https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?w=800&q=80";
    if (name.includes("filter coffee") || name.includes("coffee") || name.includes("drink")) return "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&q=80";
    
    // General Keyword Fallbacks
    if (name.includes("biryani") || name.includes("rice")) return "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80";
    if (name.includes("samosa") || name.includes("starter") || name.includes("tikka")) return "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80";

    // Hash the name to pick a deterministic but random-looking fallback image
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
    <div className="w-full h-full flex flex-col bg-zinc-50 relative">
      {/* Header */}
      <header className="bg-white shadow-sm z-10 shrink-0 border-b border-zinc-100">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Spice Heaven</h1>
            <p className="text-xs text-zinc-500 font-medium">Table {tableNumber} • {customerName}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold text-lg shadow-inner">
            {customerName.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search for your favorite dish..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-zinc-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner"
          />
        </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 pb-28 h-full">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400 min-h-[50vh]">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-xs font-medium">Loading Menu...</p>
            </div>
          ) : (
          <AnimatePresence mode="wait">
            {/* If searching or inside a category, show ITEMS */}
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
                    className="flex items-center gap-2 text-zinc-500 font-bold text-sm mb-4 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm hover:bg-zinc-50 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to Categories
                  </button>
                )}
                
                {activeCategory && !isSearching && (
                  <h2 className="text-xl font-black text-zinc-900 mb-4 tracking-tight">{activeCategory}</h2>
                )}
                
                {isSearching && (
                  <h2 className="text-sm font-bold text-zinc-500 mb-4 uppercase tracking-wider">Search Results</h2>
                )}

                {displayedItems.length === 0 ? (
                  <div className="text-center text-zinc-400 mt-10">
                    <p className="font-bold">No dishes found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedItems.map((item, i) => {
                      const qty = getCartQuantity(item.id);
                      const isAvailable = item.status === "Available";
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          key={item.id} 
                          className={`bg-white rounded-3xl shadow-sm border border-zinc-100 flex flex-col overflow-hidden ${!isAvailable ? 'opacity-60' : ''}`}
                        >
                          <div className="w-full h-48 bg-zinc-100 relative shrink-0">
                            <img 
                              src={item.image || getDishImage(item.name, item.category)} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const fallbackUrl = getDishImage(item.name, item.category);
                                if (target.src !== fallbackUrl) {
                                  target.src = fallbackUrl;
                                }
                              }}
                            />
                            
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                <span className="bg-zinc-900/90 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-xl backdrop-blur-md border border-white/10 uppercase tracking-wider">
                                  {item.status}
                                </span>
                              </div>
                            )}

                            {/* Tags */}
                            <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[80%] z-20">
                              {item.tags?.map(tag => (
                                <span key={tag} className="bg-white/95 text-zinc-800 text-[10px] font-bold px-2 py-1 rounded-md border border-white shadow-sm backdrop-blur-md uppercase">
                                  {tag}
                                </span>
                              ))}
                            </div>

                            {item.isVeg !== undefined ? (
                              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm p-1.5 rounded-md shadow-sm z-20">
                                <div className={`w-3 h-3 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`}></div>
                              </div>
                            ) : null}
                          </div>
                          <div className="flex-1 flex flex-col justify-between p-5 relative z-20">
                            <div>
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-bold text-zinc-900 text-lg leading-tight">{item.name}</h3>
                              </div>
                              <div className="flex items-center gap-1 mb-2">
                                <div className="flex text-amber-400 text-sm">
                                  {"★★★★★"}
                                </div>
                                {item.calories && (
                                  <span className="text-xs text-zinc-400 font-medium ml-2 bg-zinc-100 px-2 py-0.5 rounded-md">{item.calories} kcal</span>
                                )}
                              </div>
                              <p className="text-sm text-zinc-500 font-medium line-clamp-2 mb-4">{item.short_description || item.description || `Authentic ${item.category?.replace(/[^a-zA-Z ]/g, "").trim().toLowerCase()} dish prepared with fresh ingredients.`}</p>
                            </div>

                            <div className="flex justify-between items-end mt-auto pt-4 border-t border-zinc-50">
                              <div className="flex flex-col">
                                {item.discounted_price ? (
                                  <>
                                    <span className="text-xs text-zinc-400 line-through font-bold">₹{item.price}</span>
                                    <span className="font-black text-emerald-600 text-xl tracking-tight">₹{item.discounted_price}</span>
                                  </>
                                ) : (
                                  <span className="font-black text-zinc-900 text-xl tracking-tight">₹{item.price}</span>
                                )}
                              </div>
                              
                              {isAvailable ? (
                                qty > 0 ? (
                                  <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-1.5 border border-emerald-100">
                                    <button 
                                      onClick={() => handleRemoveFromCart(item.id)}
                                      className="w-8 h-8 bg-white text-emerald-600 rounded-lg flex items-center justify-center shadow-sm"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="text-sm font-black w-6 text-center">{qty}</span>
                                    <button 
                                      onClick={() => openCustomizer(item)}
                                      className="w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-sm"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => openCustomizer(item)}
                                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-6 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-colors shadow-sm"
                                  >
                                    ADD
                                  </button>
                                )
                              ) : (
                                <span className="text-xs font-black text-red-500 uppercase bg-red-50 px-3 py-1.5 rounded-lg">Sold Out</span>
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
              /* CATEGORY CARDS VIEW */
              <motion.div
                key="categories-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* 3D HD Video Banner - Direct MP4 */}
                <div className="relative w-full h-40 md:h-48 rounded-[2rem] overflow-hidden shadow-md group">
                  <video 
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="absolute inset-0 w-full h-full object-cover"
                  >
                    <source src="https://cdn.coverr.co/videos/coverr-pouring-syrup-on-pancakes-156/1080p.mp4" type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/80 to-transparent"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 left-6 md:left-8">
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">Authentic<br/><span className="text-emerald-400">Indian Cuisine</span></h2>
                    <p className="text-xs text-zinc-300 font-bold mt-1">Prepared fresh for you</p>
                  </div>
                </div>

                <h2 className="text-lg font-black text-zinc-900 tracking-tight pl-2">What are you craving?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categories.map((cat, i) => {
                    const count = menuItems.filter(m => m.category === cat).length;
                    return (
                      <motion.button
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="relative h-32 md:h-36 rounded-[1.5rem] overflow-hidden shadow-sm group cursor-pointer border border-zinc-200/50 block w-full text-left bg-zinc-900"
                      >
                        <img 
                          src={getCategoryImage(cat)} 
                          alt={cat} 
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-900/40 to-transparent"></div>
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                          <div>
                            <h3 className="text-white font-black text-lg sm:text-xl tracking-tight">{cat}</h3>
                            <p className="text-zinc-300 text-xs font-bold mt-0.5">{count} {count === 1 ? 'Item' : 'Items'}</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        </div>
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cartItemCount > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
          >
            <button 
              onClick={onCheckout}
              className="w-full bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl shadow-emerald-600/30 flex items-center justify-between cursor-pointer hover:bg-emerald-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-2 -right-2 bg-white text-emerald-600 w-4 h-4 rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">
                    {cartItemCount}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider">View Cart</p>
                  <p className="text-sm font-black">₹{cartTotal.toFixed(2)}</p>
                </div>
              </div>
              <div className="bg-white/20 p-2 rounded-xl text-white">
                Checkout <ChevronRight className="w-4 h-4 inline" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-3xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-center p-4 border-b border-zinc-100 bg-zinc-50 shrink-0">
                <div>
                  <h3 className="font-black text-zinc-900 text-lg">Customize</h3>
                  <p className="text-xs text-zinc-500 font-bold">{customizingItem.name}</p>
                </div>
                <button onClick={closeCustomizer} className="p-2 bg-zinc-200/50 rounded-full text-zinc-600 hover:bg-zinc-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto space-y-6 flex-1">
                {/* Spice Level */}
                <div>
                  <h4 className="text-sm font-black text-zinc-900 mb-3 uppercase tracking-wider">Spice Level</h4>
                  <div className="flex gap-2">
                    {["Mild", "Medium", "Spicy"].map(level => (
                      <button
                        key={level}
                        onClick={() => setCustomizations(p => ({ ...p, spice: level }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                          customizations.spice === level 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                            : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Onion */}
                <div>
                  <h4 className="text-sm font-black text-zinc-900 mb-3 uppercase tracking-wider">Onion</h4>
                  <div className="flex gap-2">
                    {["With Onion", "Without Onion"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setCustomizations(p => ({ ...p, onion: opt }))}
                        className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                          customizations.onion === opt 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' 
                            : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Add-ons */}
                <div>
                  <h4 className="text-sm font-black text-zinc-900 mb-3 uppercase tracking-wider">Add-ons (Optional)</h4>
                  <div className="space-y-2 text-sm font-bold text-zinc-600">
                    <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={customizations.cheese === "Extra Cheese"}
                        onChange={(e) => setCustomizations(p => ({ ...p, cheese: e.target.checked ? "Extra Cheese" : "" }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Add Extra Cheese (+₹30)</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 border border-zinc-200 rounded-xl cursor-pointer hover:bg-zinc-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={customizations.butter === "Extra Butter"}
                        onChange={(e) => setCustomizations(p => ({ ...p, butter: e.target.checked ? "Extra Butter" : "" }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      <span>Add Extra Butter (+₹20)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-zinc-100 bg-white shrink-0">
                <button
                  onClick={confirmCustomization}
                  className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
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
