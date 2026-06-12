import React, { useState } from 'react';
import { Expense, Vendor, Property, UserProfile } from '../../types';
import { Button } from '../ui/button';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { ArrowLeft } from 'lucide-react';

export function CreateExpense({ properties, vendors, userProfile, userRole, onBack }: { properties: Property[], vendors: Vendor[], userProfile: UserProfile, userRole: string, onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Expense>>({
    Title: '',
    Category: 'Repairs & Maintenance',
    PropertyID: properties[0]?.id || '',
    Amount: 0,
    ExpenseDate: new Date().toISOString().split('T')[0],
    Priority: 'Medium',
    Status: 'Pending Approval', // Default
    Description: '',
    VendorID: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isLandlord = userRole === 'Landlord';
      const selectedProp = properties.find(p => p.id === formData.PropertyID);
      
      const newExp: Expense = {
         ...formData as Expense,
         LandlordID: selectedProp?.LandlordID || userProfile.uid,
         CreatedBy: userProfile.uid,
         RequiresApproval: !isLandlord,
         Status: isLandlord ? 'Approved' : 'Pending Approval', 
         CreatedAt: new Date().toISOString(),
         UpdatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'expenses'), newExp);
      
      await addDoc(collection(db, 'auditLogs'), {
         Action: 'Expense Created',
         PerformedBy: userProfile.uid,
         Role: userRole,
         Details: `Created Expense: ${newExp.Title} for ${newExp.Amount}`,
         Timestamp: new Date().toISOString()
      });

      onBack();
    } catch(err) {
       console.error(err);
       alert("Failed to log expense");
    } finally {
       setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
       <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors"><ArrowLeft className="w-5 h-5"/></button>
          <h2 className="text-2xl font-bold">Log New Expense</h2>
       </div>

       <form onSubmit={handleSubmit} className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-sm font-medium">Expense Title</label>
                <input required className="w-full p-3 bg-background border rounded-xl" value={formData.Title} onChange={e=>setFormData({...formData, Title: e.target.value})} placeholder="E.g. Plumbings Fix - Unit 4B" />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <select required className="w-full p-3 bg-background border rounded-xl" value={formData.Category} onChange={e=>setFormData({...formData, Category: e.target.value as any})}>
                  <option value="Repairs & Maintenance">Repairs & Maintenance</option>
                  <option value="Security">Security</option>
                  <option value="Cleaning">Cleaning</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Water">Water</option>
                  <option value="Waste Disposal">Waste Disposal</option>
                  <option value="Internet">Internet</option>
                  <option value="Staff Salaries">Staff Salaries</option>
                  <option value="Office Expenses">Office Expenses</option>
                  <option value="Generator Fuel">Generator Fuel</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Property</label>
                <select required className="w-full p-3 bg-background border rounded-xl" value={formData.PropertyID} onChange={e=>setFormData({...formData, PropertyID: e.target.value})}>
                   {properties.map(p => <option key={p.id} value={p.id}>{p.PropertyName}</option>)}
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Amount</label>
                <input required type="number" min="0" className="w-full p-3 bg-background border rounded-xl" value={formData.Amount} onChange={e=>setFormData({...formData, Amount: Number(e.target.value)})} />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Date Incurred</label>
                <input required type="date" className="w-full p-3 bg-background border rounded-xl" value={formData.ExpenseDate} onChange={e=>setFormData({...formData, ExpenseDate: e.target.value})} />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-medium">Vendor (Optional)</label>
                <select className="w-full p-3 bg-background border rounded-xl" value={formData.VendorID} onChange={e=>setFormData({...formData, VendorID: e.target.value})}>
                   <option value="">No specific vendor</option>
                   {vendors.map(v => <option key={v.id} value={v.id}>{v.VendorName} ({v.ServiceCategory})</option>)}
                </select>
             </div>
             <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-sm font-medium">Description</label>
                <textarea rows={3} className="w-full p-3 bg-background border rounded-xl resize-none" value={formData.Description} onChange={e=>setFormData({...formData, Description: e.target.value})} placeholder="Detailed explanation..."></textarea>
             </div>
          </div>
          <div className="flex justify-end pt-4 border-t">
             <Button disabled={loading} type="submit" className="w-full sm:w-auto px-8 h-12 text-base">{loading ? 'Saving...' : 'Log Expense'}</Button>
          </div>
       </form>
    </div>
  );
}
