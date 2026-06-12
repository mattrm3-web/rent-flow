import React from 'react';
import { Expense, Payment, Property, UserProfile } from '../../types';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle, Building2 } from 'lucide-react';

export function FinanceDashboard({ expenses, payments, properties, userProfile, userRole }: { expenses: Expense[], payments: Payment[], properties: Property[], userProfile: UserProfile, userRole: string }) {
  
  // Basic calculations
  const totalRevenue = payments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpenses = expenses.filter(e => e.Status === 'Paid').reduce((sum, e) => sum + e.Amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  
  const pendingExpenses = expenses.filter(e => e.Status === 'Pending Approval').reduce((sum, e) => sum + e.Amount, 0);
  const unpaidRent = payments.filter(p => p.status === 'Pending' || p.status === 'Overdue').reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Property Profitability
  const propertyStats = properties.map(p => {
    const pRev = payments.filter(pay => pay.status === 'Paid').reduce((sum, pay) => sum + (pay.amount || 0), 0); // Simplified, normally filter by property
    const pExp = expenses.filter(e => e.PropertyID === p.id && e.Status === 'Paid').reduce((sum, e) => sum + e.Amount, 0);
    return {
      name: p.PropertyName,
      revenue: pRev,
      expense: pExp,
      profit: pRev - pExp
    };
  }).sort((a,b) => b.profit - a.profit);

  const topProp = propertyStats.length > 0 ? propertyStats[0] : null;
  const leastProp = propertyStats.length > 0 ? propertyStats[propertyStats.length - 1] : null;

  return (
    <div className="space-y-6">
      
      {/* Top Value Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-3xl p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
               <TrendingUp className="w-5 h-5" />
             </div>
             <p className="text-sm font-semibold text-muted-foreground">Total Revenue</p>
           </div>
           <p className="text-3xl font-bold">{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
        
        <div className="bg-card border rounded-3xl p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
               <TrendingDown className="w-5 h-5" />
             </div>
             <p className="text-sm font-semibold text-muted-foreground">Total Expenses</p>
           </div>
           <p className="text-3xl font-bold">{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
               <DollarSign className="w-5 h-5" />
             </div>
             <p className="text-sm font-semibold text-muted-foreground">Net Profit</p>
           </div>
           <p className="text-3xl font-bold">{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
           <div className="flex items-center gap-3 mb-2">
             <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
               <AlertCircle className="w-5 h-5" />
             </div>
             <p className="text-sm font-semibold text-muted-foreground">Pending Expenses</p>
           </div>
           <p className="text-3xl font-bold">{pendingExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance List */}
        <div className="bg-card border rounded-3xl shadow-sm p-6 overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Property Profitability</h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
             {propertyStats.length === 0 && <p className="text-sm text-muted-foreground">No properties analyzed.</p>}
             {propertyStats.map(p => (
                <div key={p.name} className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 last:border-0 last:pb-0 gap-2">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Building2 className="w-4 h-4"/></div>
                      <p className="font-semibold text-sm truncate max-w-[150px]">{p.name}</p>
                   </div>
                   <div className="grid grid-cols-3 gap-4 text-sm text-right flex-1 justify-end ml-4">
                      <div>
                        <p className="text-muted-foreground text-xs uppercase font-bold">Revenue</p>
                        <p className="font-medium text-emerald-600">{p.revenue.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase font-bold">Expense</p>
                        <p className="font-medium text-rose-600">{p.expense.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs uppercase font-bold">Profit</p>
                        <p className={`font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{p.profit.toLocaleString(undefined, {minimumFractionDigits: 0})}</p>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        </div>

        {/* Quick Insights */}
        <div className="space-y-4">
           {topProp && (
             <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 text-emerald-900 shadow-sm">
                <p className="text-sm font-semibold mb-1 opacity-80 uppercase tracking-wider">Most Profitable Property</p>
                <p className="text-2xl font-bold">{topProp.name}</p>
                <p className="text-sm mt-1">Generated {topProp.profit.toLocaleString()} in net profit</p>
             </div>
           )}
           {leastProp && leastProp.profit < 0 && (
             <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 text-rose-900 shadow-sm">
                <p className="text-sm font-semibold mb-1 opacity-80 uppercase tracking-wider">Losing Money</p>
                <p className="text-2xl font-bold">{leastProp.name}</p>
                <p className="text-sm mt-1">Running at a deficit of {Math.abs(leastProp.profit).toLocaleString()}</p>
             </div>
           )}
           <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-semibold mb-1 text-muted-foreground">Receivables: Outstanding Rent & Dues</p>
              <div className="flex items-end justify-between mb-2">
                 <p className="text-2xl font-bold text-amber-600">{unpaidRent.toLocaleString()}</p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                 <div className="bg-amber-500 h-2 rounded-full" style={{width: `${Math.min(100, Math.max(0, (unpaidRent / ((totalRevenue + unpaidRent) || 1)) * 100))}%`}}></div>
              </div>
           </div>
           <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <p className="text-sm font-semibold mb-1 text-muted-foreground">Payables: Owed to Vendors</p>
              <div className="flex items-end justify-between mb-2">
                 <p className="text-2xl font-bold text-rose-600">{pendingExpenses.toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">Pending invoices and approved expenses awaiting payment.</p>
           </div>
        </div>
      </div>

    </div>
  );
}
