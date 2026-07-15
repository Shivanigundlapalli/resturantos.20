import React, { useState } from "react";
import { X, Save, Image as ImageIcon, Plus, Wand2, Upload, Loader2 } from "lucide-react";
import { MenuItem, Category } from "../../types";
import AiImageGenerator from "./AiImageGenerator";
import { supabase } from "../../lib/supabase";
import imageCompression from "browser-image-compression";

export default function MenuItemEditor({ item, categories, onClose, onSave }: { item: Partial<MenuItem>, categories: Category[], onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: "",
    description: "",
    short_description: "",
    price: 0,
    cost: 0,
    category_id: categories.length > 0 ? categories[0].id : "",
    status: "Available",
    image: "",
    isVeg: false,
    dietary_preference: "Veg",
    spice_level: "Mild",
    calories: 0,
    preparation_time: 15,
    tags: [],
    timing_slot: "All Day",
    stock_type: "Unlimited",
    current_stock: 0,
    gst_percentage: 5,
    ...item
  });

  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(fileName, compressedFile, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(fileName);
      setFormData({ ...formData, image: publicUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || "Failed to upload image. Check if Supabase bucket exists.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Sync dietary preference to isVeg for legacy components
    const mappedVeg = ["Veg", "Vegan", "Jain"].includes(formData.dietary_preference || "Veg");
    const dataToSave = { ...formData, isVeg: mappedVeg };

    const isNew = !dataToSave.id;
    const url = isNew ? "/api/menu" : `/api/menu/${dataToSave.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) {
        onSave();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-[100] flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{formData.id ? 'Edit Dish' : 'Create New Dish'}</h2>
            <p className="text-sm text-zinc-500 font-medium">Fill in the details for this menu item.</p>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-zinc-50/50">
          <form id="menu-item-form" onSubmit={handleSave} className="space-y-8 max-w-xl mx-auto">
            
            {/* Basic Info */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Basic Info</h3>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Dish Name *</label>
                <input 
                  type="text" required
                  value={formData.name || ""} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  placeholder="e.g. Classic Margherita Pizza"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Category *</label>
                  <select 
                    required
                    value={formData.category_id || ""}
                    onChange={e => setFormData({...formData, category_id: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium appearance-none"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Preparation Time (mins)</label>
                  <input 
                    type="number" 
                    value={formData.preparation_time || 15} 
                    onChange={e => setFormData({...formData, preparation_time: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Short Description</label>
                <input 
                  type="text" 
                  value={formData.short_description || ""} 
                  onChange={e => setFormData({...formData, short_description: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  placeholder="A short punchy tagline"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Full Description</label>
                <textarea 
                  value={formData.description || ""} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium min-h-[100px]"
                />
              </div>
            </section>

            {/* Pricing */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Pricing & Tax</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Price ($) *</label>
                  <input 
                    type="number" step="0.01" required
                    value={formData.price || 0} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Discounted Price ($)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.discounted_price || ""} 
                    onChange={e => setFormData({...formData, discounted_price: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Cost ($)</label>
                  <input 
                    type="number" step="0.01"
                    value={formData.cost || 0} 
                    onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">GST / Tax (%)</label>
                  <input 
                    type="number" step="0.1"
                    value={formData.gst_percentage || 0} 
                    onChange={e => setFormData({...formData, gst_percentage: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>
            </section>

            {/* Characteristics */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Characteristics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Dietary Preference</label>
                  <select 
                    value={formData.dietary_preference || "Veg"}
                    onChange={e => setFormData({...formData, dietary_preference: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium appearance-none"
                  >
                    <option value="Veg">Vegetarian</option>
                    <option value="Non Veg">Non-Vegetarian</option>
                    <option value="Vegan">Vegan</option>
                    <option value="Egg">Contains Egg</option>
                    <option value="Jain">Jain</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Spice Level</label>
                  <select 
                    value={formData.spice_level || "Mild"}
                    onChange={e => setFormData({...formData, spice_level: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium appearance-none"
                  >
                    <option value="None">None</option>
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Spicy">Spicy</option>
                    <option value="Extra Spicy">Extra Spicy</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-3 flex-wrap">
                  {formData.tags?.map(tag => (
                    <div key={tag} className="flex items-center gap-1 bg-zinc-100 text-zinc-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-zinc-200">
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium text-sm"
                    placeholder="Add tag (e.g. Best Seller)"
                  />
                  <button type="button" onClick={handleAddTag} className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 px-4 rounded-xl text-sm font-bold transition-colors">
                    Add
                  </button>
                </div>
              </div>
            </section>

            {/* Inventory & Timing */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Inventory & Availability</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Stock Type</label>
                  <select 
                    value={formData.stock_type || "Unlimited"}
                    onChange={e => setFormData({...formData, stock_type: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium appearance-none"
                  >
                    <option value="Unlimited">Unlimited</option>
                    <option value="Limited">Limited Quantity</option>
                  </select>
                </div>
                {formData.stock_type === "Limited" && (
                  <div>
                    <label className="block text-sm font-semibold text-zinc-700 mb-2">Current Stock</label>
                    <input 
                      type="number" 
                      value={formData.current_stock || 0} 
                      onChange={e => setFormData({...formData, current_stock: Number(e.target.value)})}
                      className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 mb-2">Timing Slot</label>
                  <select 
                    value={formData.timing_slot || "All Day"}
                    onChange={e => setFormData({...formData, timing_slot: e.target.value})}
                    className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium appearance-none"
                  >
                    <option value="All Day">All Day</option>
                    <option value="Breakfast">Breakfast (6 AM - 11 AM)</option>
                    <option value="Lunch">Lunch (11 AM - 4 PM)</option>
                    <option value="Dinner">Dinner (4 PM - 11 PM)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Media */}
            <section className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-2">Media</h3>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2">Main Image URL</label>
                <div className="flex gap-4 items-start">
                  {formData.image ? (
                    <img src={formData.image} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-zinc-200 shadow-sm" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-zinc-100 flex items-center justify-center border border-zinc-200 border-dashed text-zinc-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="url" 
                      value={formData.image || ""} 
                      onChange={e => setFormData({...formData, image: e.target.value})}
                      className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                      placeholder="https://..."
                    />
                    <div className="relative">
                      <input 
                        type="file" 
                        accept=".jpg,.jpeg,.png,.webp" 
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        disabled={isUploading}
                        title="Upload Image"
                      />
                      <button
                        type="button"
                        className="px-4 py-3 h-full bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm disabled:opacity-50"
                        disabled={isUploading}
                      >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAiGeneratorOpen(true)}
                      className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shadow-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      AI Generate
                    </button>
                  </div>
                </div>
                {formData.images && formData.images.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Gallery Images</label>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {formData.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative group w-20 h-20 shrink-0">
                          <img src={imgUrl} className="w-full h-full object-cover rounded-xl border border-zinc-200 shadow-sm" />
                          <button 
                            type="button" 
                            onClick={() => setFormData({...formData, images: formData.images?.filter(u => u !== imgUrl)})} 
                            className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity border border-zinc-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-3">Using Supabase Storage for automatic image hosting and compression.</p>
              </div>
            </section>
          </form>
        </div>

        <div className="p-6 border-t border-zinc-200 bg-white flex gap-4 sticky bottom-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-zinc-200 rounded-xl text-zinc-600 font-bold hover:bg-zinc-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit"
            form="menu-item-form"
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span> : <Save className="w-5 h-5" />}
            {isSaving ? 'Saving...' : 'Save Menu Item'}
          </button>
        </div>
      </div>
      
      <AiImageGenerator 
        isOpen={isAiGeneratorOpen}
        onClose={() => setIsAiGeneratorOpen(false)}
        initialFoodName={formData.name ? `${formData.name}. Category: ${categories.find(c => c.id === formData.category_id)?.name || 'General'}. ${formData.description || ''}` : ""}
        onSelectImage={(url, type) => {
          if (type === 'cover') setFormData({ ...formData, image: url });
          else if (type === 'gallery') setFormData({ ...formData, images: [...(formData.images || []), url] });
          setIsAiGeneratorOpen(false);
        }}
      />
    </div>
  );
}
