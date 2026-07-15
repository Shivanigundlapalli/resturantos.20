import React, { useState } from "react";
import { Plus, Search, Filter, MoreVertical, Edit2, Trash2, Upload, Wand2 } from "lucide-react";
import { MenuItem, Category } from "../../types";
import MenuItemEditor from "./MenuItemEditor";

export default function MenuItemGrid({ items, categories, onRefresh }: { items: MenuItem[], categories: Category[], onRefresh: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.short_description?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "All" || item.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this dish?")) return;
    try {
      await fetch(`/api/menu/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (item: MenuItem, newStatus: string) => {
    try {
      await fetch(`/api/menu/${item.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-zinc-50/50">
      <div className="p-8 border-b border-zinc-200 bg-white/50 flex gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search dishes..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm font-medium"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory("All")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeCategory === "All" ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${activeCategory === cat.id ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/20" : "bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => {
            setEditingItem({ status: "Available", price: 0, tags: [] });
            setIsEditorOpen(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Dish
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredItems.map(item => (
            <div key={item.id} className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col">
              <div className="relative h-48 bg-zinc-100 overflow-hidden">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-in-out opacity-0 animate-[fadeIn_0.5s_ease-in-out_forwards]"
                    onLoad={(e) => (e.currentTarget.style.opacity = '1')} 
                  />
                ) : (
                  <div className="w-full h-full flex flex-col gap-2 items-center justify-center bg-zinc-50 border-b border-zinc-100/50 p-4">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }}
                      className="w-full justify-center text-xs bg-white text-zinc-700 px-3 py-2 rounded-lg font-bold border border-zinc-200 shadow-sm flex items-center gap-2 hover:bg-zinc-50 hover:text-emerald-600 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setEditingItem(item); setIsEditorOpen(true); }}
                      className="w-full justify-center text-xs bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg font-bold border border-indigo-100 shadow-sm flex items-center gap-2 hover:bg-indigo-100 hover:text-indigo-800 transition-colors"
                    >
                      <Wand2 className="w-3.5 h-3.5" /> Generate AI Image
                    </button>
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[80%]">
                  {item.isVeg && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded-md border border-emerald-200 shadow-sm backdrop-blur-md">
                      VEG
                    </span>
                  )}
                  {item.tags?.map(tag => (
                    <span key={tag} className="bg-white/90 text-zinc-800 text-[10px] font-bold px-2 py-1 rounded-md border border-white/40 shadow-sm backdrop-blur-md">
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Status Toggle Dropdown */}
                <div className="absolute top-3 right-3">
                  <select 
                    value={item.status}
                    onChange={(e) => handleToggleStatus(item, e.target.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border shadow-sm outline-none cursor-pointer appearance-none pr-8 ${
                      item.status === 'Available' ? 'bg-emerald-500 text-white border-emerald-600' : 
                      item.status === 'Out Of Stock' ? 'bg-red-500 text-white border-red-600' :
                      'bg-amber-500 text-white border-amber-600'
                    }`}
                  >
                    <option value="Available">Available</option>
                    <option value="Out Of Stock">Out Of Stock</option>
                    <option value="Seasonal">Seasonal</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg text-zinc-900 leading-tight">{item.name}</h3>
                  <div className="text-lg font-black text-emerald-600">${item.price.toFixed(2)}</div>
                </div>
                
                <p className="text-sm text-zinc-500 line-clamp-2 mb-4 flex-1">
                  {item.short_description || item.description || "No description provided."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                  <div className="text-xs text-zinc-400 font-medium bg-zinc-100 px-2.5 py-1 rounded-md">
                    {item.category || "Uncategorized"}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(item); setIsEditorOpen(true); }} className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isEditorOpen && editingItem && (
        <MenuItemEditor 
          item={editingItem} 
          categories={categories}
          onClose={() => setIsEditorOpen(false)} 
          onSave={() => {
            setIsEditorOpen(false);
            onRefresh();
          }} 
        />
      )}
    </div>
  );
}
