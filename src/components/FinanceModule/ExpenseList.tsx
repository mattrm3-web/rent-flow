import React, { useState } from 'react';
import { Expense, Vendor, Property, UserProfile } from '../../types';
import { Button } from '../ui/button';
import { Plus, Search, Filter, Download, ArrowRight, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { updateDoc, doc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../firebase';

export function ExpenseList({ expenses, vendors, properties, onCreateNew, userProfile, userRole }: { expenses: Expense[], vendors: Vendor[], properties: Property[], onCreateNew: () => void, userProfile: UserProfile, userRole: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = expenses.filter(e => {
     const matchesSearch = e.Title.toLowerCase().includes(searchTerm.toLowerCase()) || e.Category.toLowerCase().includes(searchTerm.toLowerCase());
     const matchesStatus = statusFilter ? e.Status === statusFilter : true;
     return matchesSearch && matchesStatus;
  });

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Pending Approval': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Rejected': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPropName = (id: string) => properties.find(p => p.id === id)?.PropertyName || 'Unknown';
  
  const handleAction = async (exp: Expense, action: 'Approved' | 'Rejected' | 'Paid') => {
     try {
       await updateDoc(doc(db, 'expenses', exp.id!), { Status: action, UpdatedAt: new Date().toISOString() });
       
       if (action === 'Paid' && exp.InvoiceID) {
          // Mark invoice as paid
          await updateDoc(doc(db, 'invoices', exp.InvoiceID), { Status: 'Paid', UpdatedAt: new Date().toISOString() });
          
          // Mark payable as paid
          const pQ = query(collection(db, 'payables'), where('InvoiceID', '==', exp.InvoiceID));
          const pSnap = await getDocs(pQ);
          for (const p of pSnap.docs) {
             await updateDoc(doc(db, 'payables', p.id), { Status: 'Paid' });
          }
          
          if (exp.VendorID) {
              const vDoc = vendors.find(v => v.uid === exp.VendorID || v.id === exp.VendorID);
              if (vDoc && vDoc.Type === 'Internal') {
                 // Update service provider's earnings
                 const spSnap = await getDocs(query(collection(db, 'serviceProviders'), where('uid', '==', exp.VendorID)));
                 if (!spSnap.empty) {
                    const sp = spSnap.docs[0];
                    await updateDoc(doc(db, 'serviceProviders', sp.id), {
                       totalPaymentsReceived: (sp.data().totalPaymentsReceived || 0) + exp.Amount,
                       totalJobsCompleted: (sp.data().totalJobsCompleted || 0) + 1
                    });
                 }
              }
          }
       }

       await addDoc(collection(db, 'auditLogs'), {
          Action: `Expense ${action}`,
          PerformedBy: userProfile.uid,
          Role: userRole,
          Details: `Expense: ${exp.Title}`,
          Timestamp: new Date().toISOString()
       });
       
       // Optional: Notification Logic here
     } catch(e) {
       console.error("Failed to update status", e);
     }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
             <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input 
                   placeholder="Search expenses..." 
                   className="w-full pl-9 pr-4 py-2 text-sm bg-card border rounded-lg focus:outline-none"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <select 
               className="bg-card border rounded-lg text-sm px-3 py-2 focus:outline-none"
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
             >
               <option value="">All Status</option>
               <option value="Pending Approval">Pending</option>
               <option value="Approved">Approved</option>
               <option value="Paid">Paid</option>
               <option value="Rejected">Rejected</option>
             </select>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
             {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && (
               <Button onClick={onCreateNew} className="gap-2 shrink-0">
                 <Plus className="w-4 h-4" /> Log Expense
               </Button>
             )}
          </div>
       </div>

       <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                   <th className="p-4 font-medium">Expense & Property</th>
                   <th className="p-4 font-medium">Category</th>
                   <th className="p-4 font-medium">Date</th>
                   <th className="p-4 font-medium text-right">Amount</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No expenses found</td></tr>
                ) : (
                  filtered.map(exp => (
                    <tr key={exp.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                      <td className="p-4">
                         <div className="font-semibold text-foreground truncate max-w-[200px]">{exp.Title}</div>
                         <div className="text-xs text-muted-foreground truncate max-w-[200px]">{getPropName(exp.PropertyID)}</div>
                      </td>
                      <td className="p-4">
                         <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-xs font-medium">
                           {exp.Category}
                         </span>
                      </td>
                      <td className="p-4">
                         <div className="text-foreground">{new Date(exp.ExpenseDate).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 text-right">
                         <div className="font-semibold">{exp.Amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                      </td>
                      <td className="p-4">
                         <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(exp.Status)}`}>
                            {exp.Status}
                         </span>
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex gap-2 justify-end">
                            {exp.Status === 'Pending Approval' && ['Landlord', 'Admin'].includes(userRole) && (
                               <>
                                 <button onClick={() => handleAction(exp, 'Approved')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"><CheckCircle2 className="w-4 h-4" /></button>
                                 <button onClick={() => handleAction(exp, 'Rejected')} className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"><XCircle className="w-4 h-4" /></button>
                               </>
                            )}
                            {exp.Status === 'Approved' && ['Landlord', 'Admin', 'Property Manager'].includes(userRole) && (
                               <button onClick={() => handleAction(exp, 'Paid')} className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors">Mark Paid</button>
                            )}
                         </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
}
