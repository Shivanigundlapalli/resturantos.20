import React, { useState } from "react";
import { Coins, Search, ArrowUpRight, ArrowDownRight, TrendingUp, DollarSign, Plus } from "lucide-react";
import { FinanceEntry } from "../types";

interface FinanceViewProps {
  finances: FinanceEntry[];
  onAddLog: (type: "Income" | "Expense", category: any, amount: number, description: string) => void;
}

export default function FinanceView({ finances, onAddLog }: FinanceViewProps) {
  const [filterType, setFilterType] = useState<"All" | "Income" | "Expense">("All");

  const filteredFinances = finances.filter(f => {
    return filterType === "All" || f.type === filterType;
  });

  const totalIncome = finances
    .filter(f => f.type === "Income")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = finances
    .filter(f => f.type === "Expense")
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  const handleLogManualTransaction = () => {
    const type = window.confirm("Transaction type:\n- Click OK for 'Income' (Revenue)\n- Click Cancel for 'Expense' (Payout)") ? "Income" : "Expense";
    const categoryInput = window.prompt("Enter category (Order Revenue, Supplier Payment, Rent, Salaries, Utilities, Other):", "Other");
    const amountInput = window.prompt("Enter amount (₹):", "1000");
    const descInput = window.prompt("Enter description:", "Manual transaction log");

    if (!categoryInput || !amountInput || isNaN(Number(amountInput)) || !descInput) {
      alert("Invalid inputs. Transaction logging aborted.");
      return;
    }

    onAddLog(
      type,
      categoryInput as any,
      Number(amountInput),
      descInput
    );

    alert("✔ Transaction successfully added to live accounts ledger!");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-warm-bg px-3 py-4 sm:p-6 overflow-y-auto font-sans select-none animate-fade-in">
      {/* View Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="pl-10 sm:pl-0">
          <h1 className="text-xl font-bold text-text-main tracking-tight flex items-center gap-2">
            <Coins className="w-5 h-5 text-forest-accent" />
            <span className="hidden sm:inline">Operational Cash Flow Ledger</span>
            <span className="sm:hidden">Finance</span>
          </h1>
          <p className="hidden sm:block text-xs text-text-sec mt-0.5">High-density spreadsheet tracking credits (sales, order bills) and debits (supplier settlements, rent, kitchen operations).</p>
        </div>
        
        <button
          onClick={handleLogManualTransaction}
          className="bg-forest-accent text-zinc-900 hover:bg-forest-hover font-bold text-xs px-3 sm:px-4 py-2 rounded-[12px] flex items-center gap-1.5 shadow-none shadow-amber-500/10 transition-all cursor-pointer active:scale-95 animate-fade-in shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Manual Entry Log</span>
        </button>
      </div>

      {/* High-density account sheet balance summary */}
      <div className="bg-warm-bg border border-warm-border rounded-[18px] p-4.5 mb-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="px-4 py-2 border-r border-warm-border">
          <span className="text-[10px] text-text-sec font-bold uppercase tracking-wider block">Cumulative Income (Credits)</span>
          <div className="text-lg font-black text-forest-accent mt-0.5">₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="px-4 py-2 border-r border-warm-border">
          <span className="text-[10px] text-text-sec font-bold uppercase tracking-wider block">Cumulative Expenses (Debits)</span>
          <div className="text-lg font-black text-rose-500 mt-0.5">₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="px-4 py-2">
          <span className="text-[10px] text-text-sec font-bold uppercase tracking-wider block">Net Operating Capital</span>
          <div className={`text-lg font-black mt-0.5 ${netCashFlow >= 0 ? "text-forest-accent" : "text-rose-500"}`}>
            ₹{netCashFlow.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter and toggle options */}
      <div className="flex items-center justify-between bg-warm-bg border border-warm-border p-3.5 rounded-[18px] mb-5 shadow-xs">
        <div className="flex items-center gap-1 bg-warm-bg p-1 rounded-[12px] border border-warm-border/50">
          {(["All", "Income", "Expense"] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all ${
                filterType === type 
                  ? "bg-warm-bg text-text-main shadow-xs" 
                  : "text-text-sec hover:text-text-main"
              }`}
            >
              {type === "All" ? "Full Ledger" : type === "Income" ? "Credits Only" : "Debits Only"}
            </button>
          ))}
        </div>

        <div className="text-[10px] text-text-sec font-bold uppercase tracking-wider pl-1 flex items-center gap-1">
          <TrendingUp className="w-3.5 h-3.5 text-text-sec" />
          <span>Real-time Capital Sync Active</span>
        </div>
      </div>

      {/* Main ledger sheets sheet */}
      <div className="bg-warm-bg border border-warm-border rounded-[18px] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-warm-border text-left font-sans text-xs">
            <thead className="bg-warm-bg/5 text-text-main font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Transaction ID</th>
                <th className="px-5 py-3.5">Date & Timestamp</th>
                <th className="px-5 py-3.5">Account Ledger Category</th>
                <th className="px-5 py-3.5">Narrative Description</th>
                <th className="px-5 py-3.5">Cash Flow</th>
                <th className="px-5 py-3.5 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-warm-border bg-warm-bg font-medium text-text-sec">
              {filteredFinances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-text-sec font-semibold">
                    No matching ledger transactions identified.
                  </td>
                </tr>
              ) : (
                filteredFinances.map(entry => {
                  const isIncome = entry.type === "Income";

                  return (
                    <tr key={entry.id} className="hover:bg-warm-bg/40 transition-colors">
                      {/* ID */}
                      <td className="px-5 py-4 font-bold text-text-main font-mono text-xs">{entry.id}</td>

                      {/* Date */}
                      <td className="px-5 py-4 text-text-sec font-mono text-[10px]">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${
                          entry.category === "Order Revenue" ? "bg-transparent border border-forest-accent/30 text-forest-accent border-emerald-500/15" :
                          entry.category === "Supplier Payment" ? "bg-transparent border border-forest-accent/30 text-forest-accent border-emerald-500/15" :
                          "bg-blue-500/10 text-blue-700 border-blue-500/15"
                        }`}>
                          {entry.category}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="px-5 py-4 text-text-sec font-medium max-w-sm truncate" title={entry.description}>
                        {entry.description}
                      </td>

                      {/* Flow status */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          isIncome ? "text-forest-accent" : "text-rose-500"
                        }`}>
                          {isIncome ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-forest-accent" />
                              <span>Credit</span>
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3 h-3 text-rose-500" />
                              <span>Debit</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className={`px-5 py-4 text-right font-black font-mono text-xs ${
                        isIncome ? "text-forest-accent font-extrabold" : "text-rose-500"
                      }`}>
                        {isIncome ? "+" : "-"} ₹{entry.amount.toLocaleString()}
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
  );
}
