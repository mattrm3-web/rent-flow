import React, { useState } from 'react';
import { Vendor, UserProfile } from '../../types';
import { Button } from '../ui/button';
import { db } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';

export function VendorList({ vendors, userProfile, userRole }: { vendors: Vendor[], userProfile: UserProfile, userRole: string }) {
   const [showAdd, setShowAdd] = useState(false);
   const [newV, setNewV] = useState<Partial<Vendor>>({
      VendorName: '',
      ServiceCategory: '',
      ContactNumber: '',
      Email: '',
   });

   const handleAdd = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         const v = {
            ...newV,
            LandlordID: userRole === 'Landlord' ? userProfile.uid : userProfile.landlordId || userProfile.uid,
            Rating: 5,
            TotalJobsCompleted: 0,
            TotalPaymentsReceived: 0,
            CreatedAt: new Date().toISOString()
         } as Vendor;
         await addDoc(collection(db, 'vendors'), v);
         setShowAdd(false);
      } catch (err) {
         console.error(err);
      }
   };

   return (
     <div className="space-y-6">
       
       <div className="flex justify-between items-center bg-card border rounded-3xl p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-bold">Vendor Directory</h2>
            <p className="text-sm text-muted-foreground">Manage service providers and contractors</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancel' : 'Add Vendor'}</Button>
       </div>

       {showAdd && (
         <form onSubmit={handleAdd} className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Add New Vendor</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input required placeholder="Vendor Name" className="p-3 bg-background border rounded-lg text-sm" value={newV.VendorName} onChange={e=>setNewV({...newV, VendorName: e.target.value})} />
               <input required placeholder="Service Category (e.g. Electrician)" className="p-3 bg-background border rounded-lg text-sm" value={newV.ServiceCategory} onChange={e=>setNewV({...newV, ServiceCategory: e.target.value})} />
               <input required placeholder="Contact Number" className="p-3 bg-background border rounded-lg text-sm" value={newV.ContactNumber} onChange={e=>setNewV({...newV, ContactNumber: e.target.value})} />
               <input placeholder="Email Address" className="p-3 bg-background border rounded-lg text-sm" value={newV.Email} onChange={e=>setNewV({...newV, Email: e.target.value})} />
            </div>
            <Button type="submit">Save Vendor</Button>
         </form>
       )}

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vendors.length === 0 && !showAdd && <p className="text-muted-foreground">No vendors added yet.</p>}
          {vendors.map(v => (
             <div key={v.id} className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col gap-3">
                <div>
                   <div className="flex items-start justify-between">
                      <h3 className="font-bold text-lg leading-tight">{v.VendorName}</h3>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-sm ${v.Type === 'Internal' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                         {v.Type || 'External'}
                      </span>
                   </div>
                   <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full mt-1 inline-block">{v.ServiceCategory}</span>
                </div>
                <div className="text-sm space-y-1 mt-2 text-muted-foreground">
                   <p>📞 {v.ContactNumber}</p>
                   {v.Email && <p>✉️ {v.Email}</p>}
                </div>
                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                   <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">Jobs</p>
                      <p className="font-semibold">{v.TotalJobsCompleted}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Paid</p>
                      <p className="font-semibold">{v.TotalPaymentsReceived.toLocaleString()}</p>
                   </div>
                </div>
             </div>
          ))}
       </div>

     </div>
   );
}
