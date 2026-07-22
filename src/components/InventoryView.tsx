// @ts-nocheck
import React, { useState, useEffect } from "react";
import { 
  Warehouse, 
  Search, 
  Plus, 
  Edit2,
  Trash2,
  History,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  DollarSign,
  Box,
  RefreshCw,
  X,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  MessageCircle,
  PhoneCall,
  Info
} from "lucide-react";
import { InventoryItem, Supplier, RestaurantState } from "../types";

interface InventoryViewProps {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateState: (state: RestaurantState) => void;
}

const CATEGORIES = ["Vegetables", "Dairy", "Spices", "Meat", "Beverages", "Other"];
const UNITS = ["Kg", "Grams", "Litres", "Pieces", "Packets"];

export default function InventoryView({ 
  inventory, 
  suppliers, 
  onUpdateInventory,
  onUpdateState
}: InventoryViewProps) {
  const [localInventory, setLocalInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | "Healthy" | "Low Stock" | "Out Of Stock">("All");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [filterSupplier, setFilterSupplier] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "supplier" | "updated">("name");

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Form States
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    currentQty: number | string;
    unit: string;
    reorderLevel: number | string;
    supplierId: string;
    unitPrice: number | string;
  }>({
    name: "",
    category: "Vegetables",
    currentQty: 0,
    unit: "Kg",
    reorderLevel: 0,
    supplierId: "",
    unitPrice: 0
  });

  const [adjustForm, setAdjustForm] = useState<{
    type: string;
    quantity: number | string;
    reason: string;
  }>({
    type: "IN",
    quantity: 0,
    reason: "Purchase"
  });

  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch("/api/inventory", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setLocalInventory(data);
          onUpdateInventory(data);
        } else {
          console.warn("Inventory API returned non-array data:", data);
          setLocalInventory([]);
          onUpdateInventory([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch inventory", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    setLocalInventory(inventory);
  }, [inventory]);

  // API Actions
  const handleSaveIngredient = async () => {
    if (!formData.name) return showToast("Ingredient Name is required", "error");
    if (formData.currentQty < 0 || formData.unitPrice < 0 || formData.reorderLevel < 0) {
      return showToast("Values cannot be negative", "error");
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem("token") || "";
      const url = editingItem ? `/api/inventory/${editingItem.id}` : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        showToast(editingItem ? "Ingredient Updated Successfully" : "Ingredient Added Successfully", "success");
        setIsAddEditModalOpen(false);
        setFormData({
          name: "",
          category: "Vegetables",
          currentQty: 0,
          unit: "Kg",
          reorderLevel: 0,
          supplierId: "",
          unitPrice: 0
        });
        setEditingItem(null);
        await fetchInventory();
      } else {
        const errorData = await res.json();
        showToast(errorData.error || "Database Error", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Database Error", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this ingredient?")) return;
    
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast("Ingredient Deleted Successfully", "success");
        setLocalInventory(prev => prev?.filter(i => i.id !== id));
        onUpdateInventory(localInventory?.filter(i => i.id !== id));
      } else {
        showToast("Database Error", "error");
      }
    } catch (err) {
      showToast("Database Error", "error");
    }
  };

  const handleAdjustStock = async () => {
    if (adjustForm.quantity <= 0) return showToast("Quantity must be greater than 0", "error");
    
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/inventory/${adjustingItem.id}/adjust`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(adjustForm)
      });
      if (res.ok) {
        showToast("Stock Updated Successfully", "success");
        setIsAdjustModalOpen(false);
        fetchInventory();
      } else {
        showToast("Database Error", "error");
      }
    } catch (err) {
      showToast("Database Error", "error");
    }
  };

  const openHistory = async (item: any) => {
    setHistoryItem(item);
    setIsHistoryModalOpen(true);
    setHistoryData([]);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await fetch(`/api/inventory/${item.id}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "Vegetables",
      currentQty: 0,
      unit: "Kg",
      reorderLevel: 0,
      supplierId: suppliers[0]?.id || "",
      unitPrice: 0
    });
    setIsAddEditModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || "Vegetables",
      currentQty: item.currentQty,
      unit: item.unit,
      reorderLevel: item.reorderLevel,
      supplierId: item.supplierId || "",
      unitPrice: item.unitPrice
    });
    setIsAddEditModalOpen(true);
  };

  const openAdjustModal = (item: any) => {
    setAdjustingItem(item);
    setAdjustForm({
      type: "IN",
      quantity: 0,
      reason: "Purchase"
    });
    setIsAdjustModalOpen(true);
  };

  // Summaries
  const totalIngredients = localInventory.length;
  const healthyCount = localInventory?.filter(i => i.currentQty > i.reorderLevel).length;
  const outOfStockCount = localInventory?.filter(i => i.currentQty === 0).length;
  const lowStockCount = totalIngredients - healthyCount - outOfStockCount;
  const totalValue = localInventory?.reduce((acc, i) => acc + (i.currentQty * i.unitPrice), 0);

  // Filtering & Sorting
  let filteredData = localInventory?.filter(item => {
    const safeSearchQuery = (searchQuery || "").toLowerCase();
    const safeName = (item.name || "").toLowerCase();
    const safeSupplier = (item.supplierName || "").toLowerCase();
    const safeCategory = (item.category || "").toLowerCase();

    const matchesSearch = safeName.includes(safeSearchQuery) || 
                          safeSupplier.includes(safeSearchQuery) ||
                          safeCategory.includes(safeSearchQuery);
    
    let matchesStatus = true;
    if (filterStatus === "Healthy") matchesStatus = item.currentQty > item.reorderLevel;
    else if (filterStatus === "Low Stock") matchesStatus = item.currentQty <= item.reorderLevel && item.currentQty > 0;
    else if (filterStatus === "Out Of Stock") matchesStatus = item.currentQty === 0;

    let matchesCat = true;
    if (filterCategory !== "All") matchesCat = item.category === filterCategory;

    let matchesSupplier = true;
    if (filterSupplier !== "All") matchesSupplier = String(item.supplierId) === filterSupplier;

    return matchesSearch && matchesStatus && matchesCat && matchesSupplier;
  });

  filteredData?.sort((a, b) => {
    if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
    if (sortBy === "stock") return (b.currentQty || 0) - (a.currentQty || 0);
    if (sortBy === "supplier") return (a.supplierName || "").localeCompare(b.supplierName || "");
    if (sortBy === "updated") return new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime();
    return 0;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-warm-bg px-4 py-6 sm:px-8 overflow-y-auto font-sans select-none animate-fade-in text-text-main relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in ${
          toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="font-semibold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-forest-accent/10 rounded-xl">
              <Warehouse className="w-6 h-6 text-forest-accent" />
            </div>
            Inventory Management
          </h1>
          <p className="text-sm text-text-sec mt-1">Real-time stock tracking and supplier management</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-emerald-600 hover:bg-emerald-500 text-text-main font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Ingredient
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-warm-bg/50 backdrop-blur-md border border-warm-border/80 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-text-sec">
            <Package className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Total Ingredients</span>
          </div>
          <span className="text-3xl font-black text-text-main">{totalIngredients}</span>
        </div>
        
        <div className="bg-emerald-900/10 backdrop-blur-md border border-emerald-500/20 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Healthy</span>
          </div>
          <span className="text-3xl font-black text-emerald-400">{healthyCount}</span>
        </div>

        <div className="bg-amber-900/10 backdrop-blur-md border border-forest-accent/20 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-forest-accent">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock</span>
          </div>
          <span className="text-3xl font-black text-forest-accent">{lowStockCount}</span>
        </div>

        <div className="bg-red-900/10 backdrop-blur-md border border-red-500/20 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <XCircle className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Out Of Stock</span>
          </div>
          <span className="text-3xl font-black text-red-500">{outOfStockCount}</span>
        </div>

        <div className="bg-warm-bg/50 backdrop-blur-md border border-warm-border/80 p-5 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center gap-2 text-forest-accent">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Value</span>
          </div>
          <span className="text-3xl font-black text-forest-accent">₹{totalValue.toLocaleString()}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-warm-bg/50 backdrop-blur-md border border-warm-border/80 p-4 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-4 mb-6">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-sec" />
          <input
            type="text"
            placeholder="Search by ingredient, category, supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-warm-bg border border-warm-border pl-10 pr-4 py-2 rounded-xl text-sm font-medium text-text-main focus:outline-none focus:border-forest-accent transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select 
            value={filterStatus}
            onChange={(e: any) => setFilterStatus(e.target.value)}
            className="bg-warm-bg border border-warm-border text-text-sec text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-forest-accent"
          >
            <option value="All">All Status</option>
            <option value="Healthy">Healthy</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out Of Stock">Out Of Stock</option>
          </select>

          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-warm-bg border border-warm-border text-text-sec text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-forest-accent"
          >
            <option value="All">All Categories</option>
            {CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="bg-warm-bg border border-warm-border text-text-sec text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-forest-accent"
          >
            <option value="All">All Suppliers</option>
            {suppliers?.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
          </select>

          <select 
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-warm-bg border border-warm-border text-text-sec text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:border-forest-accent"
          >
            <option value="name">Sort by Name</option>
            <option value="stock">Sort by Stock</option>
            <option value="supplier">Sort by Supplier</option>
            <option value="updated">Sort by Recently Updated</option>
          </select>

          <button onClick={fetchInventory} className="p-2.5 bg-warm-card hover:bg-warm-surface rounded-xl transition-colors text-text-sec">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-warm-bg/50 backdrop-blur-md border border-warm-border/80 rounded-2xl overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-warm-bg/50 text-text-sec font-semibold text-xs uppercase tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Ingredient</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Reorder</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Supplier</th>
                <th className="px-6 py-4">Cost / Unit</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4">WhatsApp Status</th>
                <th className="px-6 py-4">Voice Call Status</th>
                <th className="px-6 py-4">Comms Status</th>
                <th className="px-6 py-4">Last Notified</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border/50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-6 py-12 text-center text-text-muted">
                    <Box className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    No ingredients found.
                  </td>
                </tr>
              ) : (
                filteredData?.map(item => {
                  const isOut = item.currentQty === 0;
                  const isLow = !isOut && item.currentQty <= item.reorderLevel;
                  const value = item.currentQty * item.unitPrice;

                  return (
                    <tr key={item.id} className="hover:bg-warm-card/30 transition-colors group">
                      <td className="px-6 py-4 font-bold text-text-main">{item.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 bg-warm-card text-text-sec rounded-lg text-xs font-medium">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold">
                        {item.currentQty} <span className="text-text-muted text-xs">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-text-sec">{item.reorderLevel}</td>
                      <td className="px-6 py-4">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-forest-accent/10 text-forest-accent border border-forest-accent/20 rounded-lg text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-text-sec">{item.supplierName || "Unknown"}</td>
                      <td className="px-6 py-4 font-mono">₹{item.unitPrice}</td>
                      <td className="px-6 py-4 font-mono font-bold text-forest-accent">₹{value.toLocaleString()}</td>
                      <td className="px-6 py-4 text-text-sec text-xs">
                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleString() : "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        {item.whatsapp_status === 'Sent' ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold w-fit">
                              <MessageCircle className="w-3 h-3" /> Sent
                            </span>
                            <span className="text-[10px] text-text-muted font-medium whitespace-nowrap">
                              Sent • {item.whatsapp_sent_at ? new Date(item.whatsapp_sent_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                            </span>
                          </div>
                        ) : item.whatsapp_status === 'Sending...' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-forest-accent/10 text-amber-400 border border-forest-accent/20 rounded-lg text-[10px] font-bold w-fit">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Sending...
                          </span>
                        ) : item.whatsapp_status === 'Failed' ? (
                          <div className="relative group inline-block">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold cursor-help w-fit">
                              <XCircle className="w-3 h-3" /> Failed <Info className="w-3 h-3 opacity-50" />
                            </span>
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-warm-bg border border-warm-border text-text-sec text-[10px] p-2 rounded shadow-md z-50 whitespace-normal">
                              <div className="font-bold mb-1 text-red-400">Twilio Error</div>
                              {item.whatsapp_error || "Unknown Error"}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-card/50 text-text-muted border border-warm-border/50 rounded-lg text-[10px] font-bold w-fit">
                            ⚪ Never Sent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {item.voice_status === 'Completed' ? (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold w-fit">
                              <PhoneCall className="w-3 h-3" /> Completed
                            </span>
                            <span className="text-[10px] text-text-muted font-medium whitespace-nowrap">
                              Called • {item.voice_called_at ? new Date(item.voice_called_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Today'}
                            </span>
                          </div>
                        ) : item.voice_status === 'Calling...' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-forest-accent/10 text-amber-400 border border-forest-accent/20 rounded-lg text-[10px] font-bold w-fit">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Calling...
                          </span>
                        ) : item.voice_status === 'Failed' ? (
                          <div className="relative group inline-block">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[10px] font-bold cursor-help w-fit">
                              <XCircle className="w-3 h-3" /> Failed <Info className="w-3 h-3 opacity-50" />
                            </span>
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-warm-bg border border-warm-border text-text-sec text-[10px] p-2 rounded shadow-md z-50 whitespace-normal">
                              <div className="font-bold mb-1 text-red-400">Twilio Error</div>
                              {item.voice_error || "Unknown Error"}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-warm-card/50 text-text-muted border border-warm-border/50 rounded-lg text-[10px] font-bold w-fit">
                            ⚪ Never Called
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${(item.last_notification_type) ? ((item.whatsapp_status === 'Failed' || item.voice_status === 'Failed') ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-400') : 'bg-warm-card text-text-sec'}`}>
                          {item.last_notification_type || "No Comms"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-text-sec text-xs">
                        {item.last_notification_type ? new Date(item.last_notification_type === 'Voice Call' && item.voice_called_at ? item.voice_called_at : item.whatsapp_sent_at || Date.now()).toLocaleString() : "Never Notified"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openAdjustModal(item)} className="p-1.5 text-text-sec hover:text-amber-400 bg-warm-card hover:bg-warm-surface rounded-md transition-colors" title="Adjust Stock">
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button onClick={() => openHistory(item)} className="p-1.5 text-text-sec hover:text-blue-400 bg-warm-card hover:bg-warm-surface rounded-md transition-colors" title="History">
                            <History className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEditModal(item)} className="p-1.5 text-text-sec hover:text-text-main bg-warm-card hover:bg-warm-surface rounded-md transition-colors" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-text-sec hover:text-red-400 bg-warm-card hover:bg-red-900/30 rounded-md transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modals --- */}
      
      {/* Add / Edit Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-warm-bg border border-warm-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-warm-border">
              <h2 className="text-lg font-black tracking-tight">{editingItem ? "Edit Ingredient" : "Add Ingredient"}</h2>
              <button onClick={() => setIsAddEditModalOpen(false)} className="text-text-sec hover:text-text-main transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Ingredient Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Category</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors">
                    {CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Supplier</label>
                  <select value={formData.supplierId} onChange={e => setFormData({...formData, supplierId: e.target.value})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors">
                    <option value="">Select Supplier</option>
                    {suppliers?.map(s => <option key={s.id} value={s.id}>{s.companyName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Current Quantity</label>
                  <input type="number" step="0.01" value={formData.currentQty} onChange={e => setFormData({...formData, currentQty: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Unit</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors">
                    {UNITS?.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Cost Per Unit (₹)</label>
                  <input type="number" step="0.01" value={formData.unitPrice} onChange={e => setFormData({...formData, unitPrice: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-text-sec mb-1.5">Reorder Level</label>
                  <input type="number" step="0.01" value={formData.reorderLevel} onChange={e => setFormData({...formData, reorderLevel: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none transition-colors" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-warm-border flex justify-end gap-3 bg-warm-bg/50">
              <button onClick={() => setIsAddEditModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-sec hover:text-text-main hover:bg-warm-card transition-colors">Cancel</button>
              <button onClick={handleSaveIngredient} disabled={isSaving} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-text-main shadow-lg shadow-emerald-900/20 transition-colors">{isSaving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-warm-bg border border-warm-border rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-5 border-b border-warm-border">
              <h2 className="text-lg font-black tracking-tight">Adjust Stock</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-text-sec hover:text-text-main transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex gap-2 p-1 bg-warm-bg rounded-xl border border-warm-border">
                <button 
                  onClick={() => setAdjustForm({...adjustForm, type: "IN", reason: "Purchase"})}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${adjustForm.type === "IN" ? "bg-emerald-500/20 text-emerald-400" : "text-text-muted hover:text-text-sec"}`}
                >
                  <ArrowUpCircle className="w-4 h-4"/> Stock In
                </button>
                <button 
                  onClick={() => setAdjustForm({...adjustForm, type: "OUT", reason: "Cooking"})}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${adjustForm.type === "OUT" ? "bg-red-500/20 text-red-400" : "text-text-muted hover:text-text-sec"}`}
                >
                  <ArrowDownCircle className="w-4 h-4"/> Stock Out
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-sec mb-1.5">Quantity ({adjustingItem?.unit})</label>
                <input type="number" step="0.01" value={adjustForm.quantity} onChange={e => setAdjustForm({...adjustForm, quantity: e.target.value === '' ? '' : parseFloat(e.target.value) || 0})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-forest-accent focus:outline-none transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-sec mb-1.5">Reason</label>
                <select value={adjustForm.reason} onChange={e => setAdjustForm({...adjustForm, reason: e.target.value})} className="w-full bg-warm-bg border border-warm-border rounded-xl px-4 py-2.5 text-sm focus:border-forest-accent focus:outline-none transition-colors">
                  {adjustForm.type === "IN" ? (
                    <>
                      <option value="Purchase">Purchase</option>
                      <option value="Return">Return</option>
                      <option value="Manual Adjustment">Manual Adjustment</option>
                    </>
                  ) : (
                    <>
                      <option value="Cooking">Cooking</option>
                      <option value="Waste">Waste</option>
                      <option value="Expired">Expired</option>
                      <option value="Damaged">Damaged</option>
                      <option value="Manual Adjustment">Manual Adjustment</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="p-5 border-t border-warm-border flex justify-end gap-3 bg-warm-bg/50">
              <button onClick={() => setIsAdjustModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-sm text-text-sec hover:text-text-main hover:bg-warm-card transition-colors">Cancel</button>
              <button onClick={handleAdjustStock} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-forest-accent hover:bg-amber-400 text-zinc-950 shadow-lg shadow-amber-900/20 transition-colors">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-warm-bg border border-warm-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-warm-border">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <History className="w-5 h-5 text-forest-accent" />
                {historyItem?.name} Transaction History
              </h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-text-sec hover:text-text-main transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-0">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-warm-bg/80 text-text-sec font-semibold text-[11px] uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-5 py-3">Date & Time</th>
                      <th className="px-5 py-3">Type</th>
                      <th className="px-5 py-3 font-mono">Amount</th>
                      <th className="px-5 py-3 w-full">Reason</th>
                      <th className="px-5 py-3 font-mono text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-warm-border/50">
                    {historyData.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-8 text-center text-text-muted">No transaction history.</td></tr>
                    ) : (
                      historyData?.map((record, index) => {
                        let remaining = historyItem.currentQty;
                        for (let i = 0; i < index; i++) {
                          if (historyData[i].type === 'IN') remaining -= historyData[i].amount;
                          else remaining += historyData[i].amount;
                        }
                        
                        return (
                        <tr key={record.id} className="hover:bg-warm-card/30">
                          <td className="px-5 py-3.5 text-text-sec font-mono text-xs">
                            {new Date(record.timestamp).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            {record.type === "IN" ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                                <ArrowUpCircle className="w-3 h-3"/> IN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">
                                <ArrowDownCircle className="w-3 h-3"/> OUT
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-zinc-200">
                            {record.type === 'IN' ? '+' : '-'}{record.amount} {historyItem?.unit}
                          </td>
                          <td className="px-5 py-3.5 text-text-sec text-xs">
                            {record.reason}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-forest-accent text-right">
                            {remaining} {historyItem?.unit}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
