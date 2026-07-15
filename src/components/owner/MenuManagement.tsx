import React, { useState, useEffect } from "react";
import { Coffee, Tag, Utensils, TrendingUp, AlertCircle, EyeOff, LayoutGrid, List } from "lucide-react";
import CategoryManager from "./CategoryManager";
import MenuItemGrid from "./MenuItemGrid";
import { MenuItem, Category } from "../../types";

export default function MenuManagement() {
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch("/api/menu"),
        fetch("/api/categories")
      ]);
      const [menuData, catData] = await Promise.all([
        menuRes.json(),
        catRes.json()
      ]);
      setMenuItems(menuData);
      setCategories(catData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalItems = menuItems.length;
  const activeItems = menuItems.filter(i => i.status === "Available").length;
  const outOfStockItems = menuItems.filter(i => i.status === "Out Of Stock").length;
  const hiddenItems = menuItems.filter(i => i.status === "Discontinued").length;
  const bestCategory = categories.length > 0 ? categories[0].name : "N/A"; // Simplified for now

  return (
    <div className="h-full flex flex-col bg-zinc-50 overflow-hidden">
      <header className="bg-white border-b border-zinc-200 px-8 py-6 shrink-0 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Menu Management</h1>
            <p className="text-sm text-zinc-500 font-medium mt-1">Manage categories, dishes, availability, and customizations.</p>
          </div>
        </div>

        {/* Dashboard Summary Cards */}
        <div className="grid grid-cols-5 gap-4">
          <StatCard icon={<Utensils />} label="Total Items" value={totalItems} color="text-zinc-700" bg="bg-zinc-100" />
          <StatCard icon={<TrendingUp />} label="Active Items" value={activeItems} color="text-emerald-600" bg="bg-emerald-50" />
          <StatCard icon={<AlertCircle />} label="Out of Stock" value={outOfStockItems} color="text-red-600" bg="bg-red-50" />
          <StatCard icon={<EyeOff />} label="Discontinued" value={hiddenItems} color="text-zinc-400" bg="bg-zinc-100" />
          <StatCard icon={<Tag />} label="Best Category" value={bestCategory} color="text-indigo-600" bg="bg-indigo-50" />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200">
          <TabButton 
            active={activeTab === "items"} 
            onClick={() => setActiveTab("items")} 
            icon={<List className="w-4 h-4" />} 
            label="Menu Items" 
          />
          <TabButton 
            active={activeTab === "categories"} 
            onClick={() => setActiveTab("categories")} 
            icon={<LayoutGrid className="w-4 h-4" />} 
            label="Categories" 
          />
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === "items" && (
              <MenuItemGrid 
                items={menuItems} 
                categories={categories} 
                onRefresh={fetchData} 
              />
            )}
            {activeTab === "categories" && (
              <CategoryManager 
                categories={categories} 
                onRefresh={fetchData} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, bg }: { icon: React.ReactNode, label: string, value: string | number, color: string, bg: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-black text-zinc-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
        active ? "border-emerald-600 text-emerald-700" : "border-transparent text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {icon} {label}
    </button>
  );
}
