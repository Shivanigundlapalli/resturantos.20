import React, { useState } from "react";
import { X, Save, Image as ImageIcon, Plus, Wand2, Upload, Loader2, Info, Leaf, Activity, Settings as SettingsIcon, Eye, Sparkles, DollarSign } from "lucide-react";
import { MenuItem, Category } from "../../types";
import AiImageGenerator from "./AiImageGenerator";
import { supabase } from "../../lib/supabaseClient";
import imageCompression from "browser-image-compression";
import { motion } from "motion/react";

type TabType = "basic" | "ai" | "nutrition" | "settings" | "preview";

export default function MenuItemEditor({ item, categories, onClose, onSave }: { item: Partial<MenuItem>, categories: Category[], onClose: () => void, onSave: () => void }) {
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  
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
  
  // AI States
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isSuggestingPrice, setIsSuggestingPrice] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      
      const { data, error: uploadError } = await supabase!.storage.from('menu-images').upload(fileName, compressedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase!.storage.from('menu-images').getPublicUrl(fileName);
      setFormData({ ...formData, image: publicUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(err.message || "Failed to upload image. Check if Supabase bucket exists.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateDescription = async () => {
    if (!formData.name) return alert("Please enter a dish name first.");
    setIsGeneratingDesc(true);
    try {
      const categoryName = categories.find(c => c.id === formData.category_id)?.name || "";
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ name: formData.name, category: categoryName })
      });
      const data = await res.json();
      if (data.success && data.description) {
        setFormData({ ...formData, description: data.description });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDesc(false);
    }
  };

  const handleSuggestPrice = async () => {
    if (!formData.cost || formData.cost <= 0) return alert("Please enter a valid cost first.");
    setIsSuggestingPrice(true);
    try {
      const categoryName = categories.find(c => c.id === formData.category_id)?.name || "";
      const res = await fetch("/api/suggest-price", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ cost: formData.cost, category: categoryName })
      });
      const data = await res.json();
      if (data.success && data.suggestedPrice) {
        setFormData({ ...formData, price: data.suggestedPrice });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSuggestingPrice(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const mappedVeg = ["Veg", "Vegan", "Jain"].includes(formData.dietary_preference || "Veg");
    const dataToSave = { ...formData, isVeg: mappedVeg };

    const isNew = !dataToSave.id;
    const url = isNew ? "/api/menu" : `/api/menu/${dataToSave.id}`;
    const method = isNew ? "POST" : "PUT";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify(dataToSave)
      });
      if (res.ok) onSave();
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

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tagToRemove) });
  };

  return (
    <div className="fixed inset-0 bg-warm-bg/60 backdrop-blur-sm z-[100] flex justify-end">
      <div className="w-full max-w-3xl bg-warm-bg h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
        <div className="p-6 border-b border-warm-border flex justify-between items-center bg-warm-bg sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-text-main tracking-tight">{formData.id ? 'Edit Menu Item' : 'Create Menu Item'}</h2>
            <p className="text-sm text-text-sec font-medium">Enterprise ERP Menu Configuration</p>
          </div>
          <button onClick={onClose} className="p-2 text-text-sec hover:text-text-sec hover:bg-warm-bg rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 space-x-1 bg-warm-bg border-b border-warm-border overflow-x-auto">
          {[
            { id: "basic", label: "Basic Info", icon: Info },
            { id: "ai", label: "AI & Pricing", icon: Sparkles },
            { id: "nutrition", label: "Nutrition & Allergens", icon: Activity },
            { id: "settings", label: "Availability", icon: SettingsIcon },
            { id: "preview", label: "Customer Preview", icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? "border-emerald-500 text-forest-accent bg-warm-bg" : "border-transparent text-text-sec hover:text-text-sec hover:bg-warm-bg"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-warm-bg">
          <form id="menu-item-form" onSubmit={handleSave} className="max-w-2xl mx-auto h-full">
            
            {activeTab === "basic" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <section className="bg-warm-bg p-6 rounded-2xl border border-warm-border shadow-none space-y-4">
                  <h3 className="text-sm font-bold text-text-sec uppercase tracking-wider mb-2">Core Details</h3>
                  <div>
                    <label className="block text-sm font-semibold text-text-sec mb-2">Dish Name *</label>
                    <input 
                      type="text" required value={formData.name || ""} 
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-sec mb-2">Dietary Preference</label>
                      <select 
                        value={formData.dietary_preference || "Veg"}
                        onChange={e => setFormData({...formData, dietary_preference: e.target.value})}
                        className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium appearance-none text-text-main placeholder-text-muted"
                      >
                        <option value="Veg">Vegetarian</option>
                        <option value="Non Veg">Non-Vegetarian</option>
                        <option value="Vegan">Vegan</option>
                        <option value="Egg">Contains Egg</option>
                        <option value="Jain">Jain</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="bg-warm-bg p-6 rounded-2xl border border-warm-border shadow-none space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-sec uppercase tracking-wider">Product Image</h3>
                  </div>
                  
                  {formData.image ? (
                    <div className="relative group rounded-xl overflow-hidden aspect-video border border-warm-border">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-warm-bg/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => setIsAiGeneratorOpen(true)} className="p-2 bg-emerald-500 text-text-main rounded-lg hover:bg-emerald-500 font-medium text-sm flex items-center gap-2 shadow-lg">
                          <Wand2 className="w-4 h-4" /> AI Generate
                        </button>
                        <label className="p-2 bg-warm-bg text-text-main rounded-lg hover:bg-warm-bg font-medium text-sm flex items-center gap-2 cursor-pointer shadow-lg">
                          <Upload className="w-4 h-4" /> Upload
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button type="button" onClick={() => setFormData({...formData, image: ""})} className="p-2 bg-red-500 text-text-main rounded-lg hover:bg-red-500 shadow-lg">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-warm-border rounded-xl p-8 text-center bg-warm-bg flex flex-col items-center gap-4">
                      <div className="p-4 bg-warm-bg rounded-full text-text-sec">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-sec mb-1">No image uploaded</p>
                        <p className="text-xs text-text-sec mb-4">High quality images increase orders by 30%</p>
                      </div>
                      <div className="flex gap-3">
                        <label className="px-4 py-2 bg-warm-bg border border-warm-border text-text-sec rounded-lg font-medium text-sm hover:bg-warm-bg cursor-pointer shadow-none flex items-center gap-2 transition-colors">
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isUploading ? "Uploading..." : "Upload Photo"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                        </label>
                        <button type="button" onClick={() => setIsAiGeneratorOpen(true)} className="px-4 py-2 bg-emerald-500 text-text-main rounded-lg font-medium text-sm hover:bg-emerald-500 shadow-none shadow-amber-500/10 flex items-center gap-2 transition-colors">
                          <Wand2 className="w-4 h-4" /> AI Generate Image
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}

            {activeTab === "ai" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <section className="bg-gradient-to-br from-emerald-50 to-teal-50 p-6 rounded-2xl border border-forest-accent/20 shadow-none space-y-6">
                  <div className="flex items-center gap-2 text-forest-accent mb-2">
                    <Sparkles className="w-5 h-5" />
                    <h3 className="font-bold">AI Assistant Tools</h3>
                  </div>

                  {/* AI Description */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-emerald-900">Marketing Description</label>
                      <button 
                        type="button" 
                        onClick={handleGenerateDescription}
                        disabled={isGeneratingDesc}
                        className="text-xs bg-emerald-500 text-text-main px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/80 disabled:opacity-50"
                      >
                        {isGeneratingDesc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                        Generate Copy
                      </button>
                    </div>
                    <textarea 
                      value={formData.description || ""} 
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-warm-bg border border-forest-accent/20 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium min-h-[120px]"
                      placeholder="Rich, appetizing description..."
                    />
                  </div>

                  {/* AI Pricing */}
                  <div className="space-y-3 pt-4 border-t border-forest-accent/20/60">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-semibold text-emerald-900">Intelligent Pricing</label>
                      <button 
                        type="button" 
                        onClick={handleSuggestPrice}
                        disabled={isSuggestingPrice}
                        className="text-xs bg-emerald-500 text-text-main px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-500/80 disabled:opacity-50"
                      >
                        {isSuggestingPrice ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                        Suggest Retail Price
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-forest-accent mb-1">Food Cost ($)</label>
                        <input 
                          type="number" step="0.01"
                          value={formData.cost || 0} 
                          onChange={e => setFormData({...formData, cost: Number(e.target.value)})}
                          className="w-full px-4 py-2.5 bg-warm-bg border border-forest-accent/20 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-forest-accent mb-1">Selling Price ($) *</label>
                        <input 
                          type="number" step="0.01" required
                          value={formData.price || 0} 
                          onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                          className="w-full px-4 py-2.5 bg-warm-bg border border-forest-accent/20 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-bold text-forest-accent"
                        />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "nutrition" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <section className="bg-warm-bg p-6 rounded-2xl border border-warm-border shadow-none space-y-4">
                  <h3 className="text-sm font-bold text-text-sec uppercase tracking-wider mb-2">Health & Diet</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-sec mb-2">Calories (kcal)</label>
                      <input 
                        type="number" 
                        value={formData.calories || 0} 
                        onChange={e => setFormData({...formData, calories: Number(e.target.value)})}
                        className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-sec mb-2">Spice Level</label>
                      <select 
                        value={formData.spice_level || "Mild"}
                        onChange={e => setFormData({...formData, spice_level: e.target.value})}
                        className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium appearance-none"
                      >
                        <option value="None">None</option>
                        <option value="Mild">Mild</option>
                        <option value="Medium">Medium</option>
                        <option value="Spicy">Spicy</option>
                        <option value="Extra Spicy">Extra Spicy</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <label className="block text-sm font-semibold text-text-sec mb-2">Allergens & Tags</label>
                    <div className="flex gap-2 mb-3">
                      <input 
                        type="text" 
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                        className="flex-1 px-4 py-2.5 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium text-sm"
                        placeholder="e.g. Contains Nuts, Gluten-Free"
                      />
                      <button type="button" onClick={handleAddTag} className="px-4 py-2.5 bg-warm-bg text-text-main rounded-xl hover:bg-warm-bg font-medium text-sm flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-warm-bg border border-warm-border text-xs font-semibold text-text-sec">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag(tag)} className="text-text-sec hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ))}
                      {(!formData.tags || formData.tags.length === 0) && (
                        <span className="text-xs text-text-sec font-medium">No tags added</span>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <section className="bg-warm-bg p-6 rounded-2xl border border-warm-border shadow-none space-y-4">
                  <h3 className="text-sm font-bold text-text-sec uppercase tracking-wider mb-2">Lifecycle & Availability</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-sec mb-2">Publish Status</label>
                      <select 
                        value={formData.status || "Draft"}
                        onChange={e => setFormData({...formData, status: e.target.value as any})}
                        className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium appearance-none"
                      >
                        <option value="Draft">📝 Draft (Hidden)</option>
                        <option value="Available">🟢 Available (Live)</option>
                        <option value="Sold Out">🔴 Sold Out</option>
                        <option value="Seasonal">🍂 Seasonal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-sec mb-2">Timing Slot</label>
                      <select 
                        value={formData.timing_slot || "All Day"}
                        onChange={e => setFormData({...formData, timing_slot: e.target.value})}
                        className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-emerald-500 font-medium appearance-none"
                      >
                        <option value="All Day">All Day</option>
                        <option value="Breakfast">Breakfast (6am - 11am)</option>
                        <option value="Lunch">Lunch (11am - 4pm)</option>
                        <option value="Dinner">Dinner (4pm - 11pm)</option>
                      </select>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="bg-warm-bg p-8 rounded-3xl flex justify-center items-center">
                  {/* Mock Mobile Device */}
                  <div className="w-[320px] bg-warm-bg rounded-[2rem] shadow-2xl overflow-hidden border-8 border-warm-border relative">
                    <div className="h-6 bg-warm-bg absolute top-0 w-full z-20 flex justify-center rounded-b-xl">
                      <div className="w-16 h-4 bg-warm-bg rounded-b-xl"></div>
                    </div>
                    
                    {/* Rendered Dish as seen by Customer */}
                    <div className="pt-10 pb-6 px-4">
                      <div className="rounded-2xl overflow-hidden bg-warm-bg shadow-none border border-warm-border mb-4">
                        <div className="aspect-video relative bg-warm-bg">
                          {formData.image ? (
                            <img src={formData.image} alt={formData.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-text-sec">No Image</div>
                          )}
                          {["Veg", "Vegan", "Jain"].includes(formData.dietary_preference || "Veg") ? (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-warm-bg rounded flex items-center justify-center p-0.5 shadow-none border border-emerald-500">
                              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                            </div>
                          ) : (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-warm-bg rounded flex items-center justify-center p-0.5 shadow-none border border-rose-500">
                              <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-rose-600"></div>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-text-main text-lg leading-tight mb-1">{formData.name || "Dish Name"}</h4>
                          <div className="text-forest-accent font-bold mb-2">₹{formData.price || "0.00"}</div>
                          {formData.description && (
                            <p className="text-xs text-text-sec mb-3 line-clamp-2">{formData.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {formData.tags?.map(t => (
                              <span key={t} className="text-[10px] bg-warm-bg text-text-sec px-2 py-0.5 rounded-full border border-warm-border font-medium">{t}</span>
                            ))}
                          </div>
                          <button type="button" className="w-full py-2 bg-transparent border border-forest-accent/30 text-forest-accent font-bold text-sm rounded-xl border border-forest-accent/20 hover:bg-transparent border border-forest-accent/30">
                            ADD
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="p-6 border-t border-warm-border bg-warm-bg flex justify-end gap-3 sticky bottom-0 z-10">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-text-sec hover:bg-warm-bg rounded-xl transition-colors">
            Cancel
          </button>
          <button 
            type="submit" 
            form="menu-item-form"
            disabled={isSaving}
            className="px-6 py-2.5 text-sm font-bold bg-emerald-500 text-text-main rounded-xl hover:bg-emerald-500 shadow-lg shadow-amber-500/10 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {formData.id ? 'Update Dish' : 'Publish Dish'}
          </button>
        </div>
      </div>

      <AiImageGenerator
        isOpen={isAiGeneratorOpen}
        initialFoodName={formData.name || ""}
        onClose={() => setIsAiGeneratorOpen(false)}
        onSelectImage={(url) => {
          setFormData({ ...formData, image: url });
          setIsAiGeneratorOpen(false);
        }}
      />
    </div>
  );
}
