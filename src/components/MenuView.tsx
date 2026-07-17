import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Image as ImageIcon, Save, X, ToggleLeft, ToggleRight } from "lucide-react";
import { MenuItem } from "../types";

export default function MenuView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  const fetchMenu = () => {
    setIsLoading(true);
    fetch("/api/menu")
      .then(res => res.json())
      .then(data => {
        setMenuItems(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const categories = Array.from(new Set(menuItems.map(item => item.category)));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.category || !editingItem?.price) return;

    const isNew = !editingItem.id;
    const url = isNew ? "/api/menu" : `/api/menu/${editingItem.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchMenu();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: "DELETE" });
      if (res.ok) fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (item: MenuItem) => {
    const newStatus = item.status === "Available" ? "Sold Out" : "Available";
    try {
      await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const displayedItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-zinc-950 overflow-hidden">
      <header className="bg-zinc-900 border-b border-zinc-800 px-8 py-5 shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Menu Management</h1>
          <p className="text-sm text-zinc-400 font-medium mt-1">Manage categories, dishes, prices, and availability.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem({ status: "Available", isVeg: true, popularity: 5, cost: 0 });
            setIsModalOpen(true);
          }}
          className="bg-amber-500 text-zinc-900 hover:bg-amber-600 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Dish
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 overflow-y-auto">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-3">Categories</h2>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory("All")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeCategory === "All" ? "bg-transparent border border-amber-500/30 text-amber-500" : "text-zinc-300 hover:bg-zinc-950"}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeCategory === cat ? "bg-transparent border border-amber-500/30 text-amber-500" : "text-zinc-300 hover:bg-zinc-950"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search dishes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-400">Loading Menu...</div>
          ) : (
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-none overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950">
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Dish</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Price</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {displayedItems.map(item => (
                    <tr key={item.id} className="hover:bg-zinc-950 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-950 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-800">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-100 text-sm flex items-center gap-2">
                              {item.name}
                              {item.isVeg !== undefined && (
                                <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} title={item.isVeg ? "Veg" : "Non-Veg"}></div>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 truncate max-w-[200px]">{item.description || "No description"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-zinc-300 font-medium">
                        <span className="bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 shadow-none">{item.category}</span>
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-zinc-100">₹{item.price}</td>
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => toggleStatus(item)}
                          className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                            item.status === "Available" ? "bg-transparent border border-amber-500/30 text-amber-500 border border-amber-500/20 hover:bg-transparent border border-amber-500/30" : "bg-red-500/10 text-red-700 border border-red-100 hover:bg-red-100"
                          }`}
                        >
                          {item.status === "Available" ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {item.status}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingItem(item);
                              setIsModalOpen(true);
                            }}
                            className="cursor-pointer p-1.5 text-zinc-400 hover:text-amber-500 hover:bg-transparent border border-amber-500/30 rounded-lg transition-colors border border-transparent hover:border-amber-500/20"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="cursor-pointer p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="font-bold text-lg text-zinc-100">{editingItem?.id ? "Edit Dish" : "Add New Dish"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-zinc-400 hover:text-zinc-300 p-1 rounded-lg hover:bg-zinc-950 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="menu-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Dish Name</label>
                    <input 
                      type="text" 
                      required
                      value={editingItem?.name || ""}
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Category</label>
                    <input 
                      type="text" 
                      required
                      value={editingItem?.category || ""}
                      onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                      placeholder="e.g. ⭐ Special Dishes"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Selling Price (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={editingItem?.price || ""}
                      onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Food Type</label>
                    <select 
                      value={editingItem?.isVeg ? "veg" : "nonveg"}
                      onChange={e => setEditingItem({...editingItem, isVeg: e.target.value === "veg"})}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow cursor-pointer"
                    >
                      <option value="veg">Vegetarian</option>
                      <option value="nonveg">Non-Vegetarian</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Description</label>
                  <textarea 
                    value={editingItem?.description || ""}
                    onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-300">Image URL</label>
                  <input 
                    type="url" 
                    value={editingItem?.image || ""}
                    onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                  />
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">Availability</label>
                    <select 
                      value={editingItem?.status || "Available"}
                      onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Sold Out">Out of Stock</option>
                    </select>
                  </div>

              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 rounded-xl transition-colors border border-transparent hover:border-zinc-800"
              >
                Cancel
              </button>
              <button 
                form="menu-form"
                type="submit"
                className="cursor-pointer px-6 py-2 bg-amber-500 text-zinc-900 hover:bg-amber-600 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-none transition-all border-0"
              >
                <Save className="w-4 h-4" /> Save Dish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
