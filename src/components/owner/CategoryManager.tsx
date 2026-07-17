import React, { useState } from "react";
import { Plus, Edit2, Trash2, GripVertical, CheckCircle2, Circle } from "lucide-react";
import { Category } from "../../types";

export default function CategoryManager({ categories, onRefresh }: { categories: Category[], onRefresh: () => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat?.name) return;

    const isNew = !editingCat.id;
    const url = isNew ? "/api/categories" : `/api/categories/${editingCat.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(editingCat)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setEditingCat(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the category.")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (cat: Category) => {
    try {
      await fetch(`/api/categories/${cat.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ is_active: !cat.is_active })
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Category Organization</h2>
          <p className="text-sm text-zinc-400">Drag to reorder or click to edit categories.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCat({ is_active: true, display_order: categories.length, background_color: "bg-zinc-900", icon: "Utensils" });
            setIsModalOpen(true);
          }}
          className="bg-amber-500 text-zinc-900 hover:bg-amber-600 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-none transition-all"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="grid gap-4 max-w-4xl">
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className={`bg-zinc-900 border ${cat.is_active ? 'border-zinc-800' : 'border-zinc-800 opacity-60'} p-4 rounded-2xl shadow-none flex items-center justify-between group transition-all hover:shadow-black`}
          >
            <div className="flex items-center gap-4">
              <button className="text-zinc-300 hover:text-zinc-400 cursor-grab active:cursor-grabbing">
                <GripVertical className="w-5 h-5" />
              </button>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-none ${cat.background_color}`}>
                 <span className="text-zinc-300 font-bold text-lg">{cat.name.charAt(0)}</span>
              </div>
              <div>
                <h3 className="font-bold text-zinc-100 text-lg">{cat.name}</h3>
                <p className="text-sm text-zinc-400 truncate max-w-xs">{cat.description || "No description"}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <button 
                onClick={() => toggleStatus(cat)}
                className="flex items-center gap-2 text-sm font-medium"
              >
                {cat.is_active ? (
                  <><CheckCircle2 className="w-5 h-5 text-amber-500" /> <span className="text-amber-500">Active</span></>
                ) : (
                  <><Circle className="w-5 h-5 text-zinc-400" /> <span className="text-zinc-400">Hidden</span></>
                )}
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingCat(cat); setIsModalOpen(true); }}
                  className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(cat.id)}
                  className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center p-12 text-zinc-400 border-2 border-dashed border-zinc-800 rounded-2xl">
            No categories found. Create one to get started!
          </div>
        )}
      </div>

      {isModalOpen && editingCat && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-[500px] bg-zinc-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
              <h2 className="text-xl font-bold text-zinc-100">{editingCat.id ? 'Edit Category' : 'New Category'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-300 p-2 rounded-full hover:bg-zinc-950">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 flex-1 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Category Name</label>
                <input 
                  type="text" 
                  value={editingCat.name || ""} 
                  onChange={e => setEditingCat({...editingCat, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 transition-all font-medium"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Description</label>
                <textarea 
                  value={editingCat.description || ""} 
                  onChange={e => setEditingCat({...editingCat, description: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 transition-all font-medium h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Display Order</label>
                  <input 
                    type="number" 
                    value={editingCat.display_order || 0} 
                    onChange={e => setEditingCat({...editingCat, display_order: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 transition-all font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-300 mb-2">Theme Color</label>
                  <select 
                    value={editingCat.background_color || "bg-zinc-900"}
                    onChange={e => setEditingCat({...editingCat, background_color: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 transition-all font-medium appearance-none"
                  >
                    <option value="bg-zinc-900">White</option>
                    <option value="bg-rose-100">Rose</option>
                    <option value="bg-transparent border border-amber-500/30">Emerald</option>
                    <option value="bg-amber-100">Amber</option>
                    <option value="bg-indigo-100">Indigo</option>
                  </select>
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-zinc-800 bg-zinc-950 flex gap-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-3 border border-zinc-800 rounded-xl text-zinc-300 font-semibold hover:bg-zinc-950 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-3 bg-zinc-900 text-zinc-100 rounded-xl font-semibold hover:bg-zinc-900 transition-colors shadow-lg shadow-zinc-900/20"
              >
                Save Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
