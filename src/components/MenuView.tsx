import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Search, Image as ImageIcon, Save, X, ToggleLeft, ToggleRight, Loader2, UploadCloud } from "lucide-react";
import { MenuItem } from "../types";

export default function MenuView() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchMenu = () => {
    setIsLoading(true);
    fetch("/api/menu")
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) {
          setMenuItems(result.data);
        } else if (Array.isArray(result)) {
          setMenuItems(result);
        } else {
          setMenuItems([]);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
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
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
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
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/menu/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchMenu();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (item: MenuItem) => {
    const newStatus = item.status === "Available" ? "Sold Out" : "Available";
    try {
      const token = localStorage.getItem("token");
      await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
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
    <div className="h-full flex flex-col bg-warm-bg overflow-hidden">
      <header className="bg-warm-bg border-b border-warm-border px-8 py-5 shrink-0 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">Menu Management</h1>
          <p className="text-sm text-text-sec font-medium mt-1">Manage categories, dishes, prices, and availability.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem({ status: "Available", isVeg: true, popularity: 5, cost: 0 });
            setIsModalOpen(true);
          }}
          className="bg-forest-accent text-zinc-900 hover:bg-forest-hover px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-none transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Dish
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar */}
        <div className="w-64 bg-warm-bg border-r border-warm-border p-4 overflow-y-auto">
          <h2 className="text-xs font-bold text-text-sec uppercase tracking-wider mb-4 px-3">Categories</h2>
          <div className="space-y-1">
            <button
              onClick={() => setActiveCategory("All")}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeCategory === "All" ? "bg-transparent border border-forest-accent/30 text-forest-accent" : "text-text-sec hover:bg-warm-bg"}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeCategory === cat ? "bg-transparent border border-forest-accent/30 text-forest-accent" : "text-text-sec hover:bg-warm-bg"}`}
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
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
              <input 
                type="text" 
                placeholder="Search dishes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-text-sec">Loading Menu...</div>
          ) : (
            <div className="bg-warm-bg rounded-2xl border border-warm-border shadow-none overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-warm-border bg-warm-bg">
                    <th className="py-3 px-6 text-xs font-semibold text-text-sec uppercase tracking-wider">Dish</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-sec uppercase tracking-wider">Category</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-sec uppercase tracking-wider">Price</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-sec uppercase tracking-wider">Status</th>
                    <th className="py-3 px-6 text-xs font-semibold text-text-sec uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-border">
                  {displayedItems.map(item => (
                    <tr key={item.id} className="hover:bg-warm-bg transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-warm-bg flex items-center justify-center overflow-hidden shrink-0 border border-warm-border">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-text-sec" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-text-main text-sm flex items-center gap-2">
                              {item.name}
                              {item.isVeg !== undefined && (
                                <div className={`w-2 h-2 rounded-full ${item.isVeg ? "bg-emerald-500" : "bg-red-500"}`} title={item.isVeg ? "Veg" : "Non-Veg"}></div>
                              )}
                            </div>
                            <div className="text-xs text-text-sec truncate max-w-[200px]">{item.description || "No description"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-text-sec font-medium">
                        <span className="bg-warm-bg px-2 py-1 rounded-md border border-warm-border shadow-none">{item.category}</span>
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-text-main">₹{item.price}</td>
                      <td className="py-4 px-6">
                        <button 
                          onClick={() => toggleStatus(item)}
                          className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
                            item.status === "Available" ? "bg-transparent border border-forest-accent/30 text-forest-accent border border-forest-accent/20 hover:bg-transparent border border-forest-accent/30" : "bg-red-500/10 text-red-700 border border-red-100 hover:bg-red-100"
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
                            className="cursor-pointer p-1.5 text-text-sec hover:text-forest-accent hover:bg-transparent border border-forest-accent/30 rounded-lg transition-colors border border-transparent hover:border-forest-accent/20"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="cursor-pointer p-1.5 text-text-sec hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
        <div className="fixed inset-0 bg-warm-bg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-warm-bg rounded-2xl w-full max-w-2xl shadow-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-warm-border flex justify-between items-center bg-warm-bg">
              <h2 className="font-bold text-lg text-text-main">{editingItem?.id ? "Edit Dish" : "Add New Dish"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="cursor-pointer text-text-sec hover:text-text-sec p-1 rounded-lg hover:bg-warm-bg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <form id="menu-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-sec">Dish Name</label>
                    <input 
                      type="text" 
                      required
                      value={editingItem?.name || ""}
                      onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-sec">Category</label>
                    <input 
                      type="text" 
                      required
                      value={editingItem?.category || ""}
                      onChange={e => setEditingItem({...editingItem, category: e.target.value})}
                      placeholder="e.g. ⭐ Special Dishes"
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-sec">Selling Price (₹)</label>
                    <input 
                      type="number" 
                      required
                      value={editingItem?.price || ""}
                      onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-sec">Food Type</label>
                    <select 
                      value={editingItem?.isVeg ? "veg" : "nonveg"}
                      onChange={e => setEditingItem({...editingItem, isVeg: e.target.value === "veg"})}
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow cursor-pointer"
                    >
                      <option value="veg">Vegetarian</option>
                      <option value="nonveg">Non-Vegetarian</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-sec">Description</label>
                  <textarea 
                    value={editingItem?.description || ""}
                    onChange={e => setEditingItem({...editingItem, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-sec">Dish Image</label>
                  <div className="flex gap-2">
                    <input 
                      type="url" 
                      value={editingItem?.image || ""}
                      onChange={e => setEditingItem({...editingItem, image: e.target.value})}
                      placeholder="Image URL or upload..."
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow"
                    />
                    <label className="bg-warm-card hover:bg-warm-surface text-text-sec px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 cursor-pointer transition-colors whitespace-nowrap">
                      {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      <span>{isUploading ? "..." : "Upload"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        disabled={isUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          setIsUploading(true);
                          const formData = new FormData();
                          formData.append("image", file);
                          
                          try {
                            const token = localStorage.getItem("token");
                            const res = await fetch("/api/upload", {
                              method: "POST",
                              headers: { "Authorization": `Bearer ${token}` },
                              body: formData
                            });
                            const data = await res.json();
                            if (res.ok && data.success) {
                              setEditingItem({ ...editingItem, image: data.url });
                            } else {
                              alert("Upload failed: " + (data.message || "Unknown error"));
                            }
                          } catch (err) {
                            console.error(err);
                            alert("Network error during upload");
                          } finally {
                            setIsUploading(false);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-text-sec">Availability</label>
                    <select 
                      value={editingItem?.status || "Available"}
                      onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                      className="w-full px-3 py-2 bg-warm-bg border border-warm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 shadow-none transition-shadow cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Sold Out">Out of Stock</option>
                    </select>
                  </div>

              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-warm-border bg-warm-bg flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer px-4 py-2 text-sm font-semibold text-text-sec hover:bg-warm-bg rounded-xl transition-colors border border-transparent hover:border-warm-border"
              >
                Cancel
              </button>
              <button 
                form="menu-form"
                type="submit"
                className="cursor-pointer px-6 py-2 bg-forest-accent text-zinc-900 hover:bg-forest-hover rounded-xl text-sm font-semibold flex items-center gap-2 shadow-none transition-all border-0"
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
