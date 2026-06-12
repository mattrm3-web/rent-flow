import React, { useState } from 'react';
import { Expense, Payment, Property, UserProfile } from '../../types';
import { Button } from '../ui/button';
import { FileText, Download } from 'lucide-react';

export function OwnerStatements({ expenses, payments, properties, userProfile }: { expenses: Expense[], payments: Payment[], properties: Property[], userProfile: UserProfile }) {
  const [period, setPeriod] = useState('Monthly');
  const [propertyId, setPropertyId] = useState('All');

  const filteredExpenses = expenses.filter(e => e.Status === 'Paid' && (propertyId === 'All' || e.PropertyID === propertyId));
  const filteredPayments = payments.filter(p => p.status === 'Paid' && (propertyId === 'All' || properties.find(prop => prop.id === propertyId)?.id === propertyId)); // rough filter
  
  const totalIncome = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalExpense = filteredExpenses.reduce((sum, e) => sum + e.Amount, 0);
  const netProfit = totalIncome - totalExpense;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-bold">Owner Statements</h2>
          <p className="text-sm text-muted-foreground">Generate and export financial reports</p>
        </div>
        <div className="flex gap-2">
           <select className="border rounded-lg text-sm px-3 py-2 bg-background focus:outline-none" value={period} onChange={e=>setPeriod(e.target.value)}>
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Yearly">Yearly</option>
           </select>
           <select className="border rounded-lg text-sm px-3 py-2 bg-background focus:outline-none" value={propertyId} onChange={e=>setPropertyId(e.target.value)}>
              <option value="All">All Properties</option>
              {properties.map(p => <option key={p.id} value={p.id}>{p.PropertyName}</option>)}
           </select>
           <Button onClick={handlePrint} variant="outline" className="gap-2"><Download className="w-4 h-4"/> Export</Button>
        </div>
      </div>

      <div className="bg-card border rounded-3xl p-8 shadow-sm space-y-8 print:shadow-none print:border-none print:p-0">
         <div className="border-b pb-6 text-center">
            <h1 className="text-3xl font-bold uppercase tracking-widest text-primary">Financial Statement</h1>
            <p className="text-muted-foreground mt-2">{period} Report • Prepared for {userProfile.name}</p>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-emerald-50/50 border rounded-2xl p-5">
               <p className="text-sm font-semibold mb-1 text-emerald-800 uppercase tracking-wider">Total Income</p>
               <p className="text-3xl font-bold text-emerald-600">₦{totalIncome.toLocaleString()}</p>
            </div>
            <div className="bg-rose-50/50 border rounded-2xl p-5">
               <p className="text-sm font-semibold mb-1 text-rose-800 uppercase tracking-wider">Total Expenses</p>
               <p className="text-3xl font-bold text-rose-600">₦{totalExpense.toLocaleString()}</p>
            </div>
            <div className="bg-primary/5 border rounded-2xl p-5">
               <p className="text-sm font-semibold mb-1 text-primary uppercase tracking-wider">Net Profit</p>
               <p className="text-3xl font-bold text-primary">₦{netProfit.toLocaleString()}</p>
            </div>
         </div>

         <div className="space-y-4">
           <h3 className="text-lg font-semibold border-b pb-2">Expense Breakdown</h3>
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-muted text-muted-foreground">
                 <tr>
                    <th className="p-3 font-medium rounded-tl-lg">Date</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Description</th>
                    <th className="p-3 font-medium text-right rounded-tr-lg">Amount</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredExpenses.length === 0 && <tr><td colSpan={4} className="p-4 text-center">No expenses recorded for this period.</td></tr>}
                 {filteredExpenses.map(e => (
                   <tr key={e.id} className="border-b">
                     <td className="p-3">{new Date(e.ExpenseDate).toLocaleDateString()}</td>
                     <td className="p-3"><span className="bg-muted px-2 py-1 rounded-md text-xs">{e.Category}</span></td>
                     <td className="p-3 font-medium">{e.Title}</td>
                     <td className="p-3 text-right font-bold text-rose-600">₦{e.Amount.toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>
      </div>
    </div>
  );
}
