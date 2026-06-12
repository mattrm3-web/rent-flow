import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useFirebase } from '../FirebaseProvider';
import { Property, Listing, ListingApplication, InspectionRequest } from '../../types';
import { Building2, Search, Filter, Plus, Home, Users, ArrowRight, CheckCircle2, Clock, MapPin, Eye, FileText, Star, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import ApplicationsTab from './ApplicationsTab';

function CreateListingForm({ properties, onBack, onCreated }: { properties: Property[], onBack: () => void, onCreated: () => void }) {
   const { userProfile } = useFirebase();
   const [loading, setLoading] = useState(false);
   const [propertyId, setPropertyId] = useState('');
   const [title, setTitle] = useState('');
   const [desc, setDesc] = useState('');
   const [rent, setRent] = useState('');
   const [serviceCharge, setServiceCharge] = useState('');
   const [deposit, setDeposit] = useState('');
   const [availDate, setAvailDate] = useState('');
   const [leaseDur, setLeaseDur] = useState('1 Year');
   const [furnished, setFurnished] = useState(false);

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!propertyId || !title || !rent || !availDate) return alert("Fill required fields");
      setLoading(true);
      try {
         const p = properties.find(x => x.id === propertyId);
         await addDoc(collection(db, 'listings'), {
            PropertyID: propertyId,
            LandlordID: p?.LandlordID,
            PostedByRole: userProfile?.role || 'Landlord',
            PostedByName: userProfile?.name || 'Verified Agency',
            Title: title,
            Description: desc,
            Status: 'Published',
            RentAmount: Number(rent),
            ServiceCharge: Number(serviceCharge) || 0,
            DepositRequired: Number(deposit) || 0,
            AvailableDate: availDate,
            LeaseDuration: leaseDur,
            Furnished: furnished,
            Images: p?.imageUrls || [],
            CoverImage: p?.imageUrls?.[0] || '',
            Views: 0,
            ApplicationsCount: 0,
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
         });
         await updateDoc(doc(db, 'properties', propertyId), { status: 'Vacant' });
         onCreated();
      } catch(e) {
         console.error(e);
         alert("Failed to create listing");
      }
      setLoading(false);
   };

   return (
      <div className="bg-card border rounded-3xl p-6 shadow-sm max-w-3xl animate-in fade-in zoom-in-95 duration-300">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Publish New Listing</h2>
            <Button onClick={onBack} variant="outline" size="sm">Cancel</Button>
         </div>
         <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-sm font-medium">Select Property / Unit</label>
                  <select value={propertyId} onChange={e=>setPropertyId(e.target.value)} required className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none">
                     <option value="">-- Choose Property --</option>
                     {properties.map(p => <option key={p.id} value={p.id!}>{p.PropertyName} - {p.Address}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Listing Title</label>
                  <input type="text" required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Luxury 3 Bedroom Detached Duplex" className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Rent Amount (Annual)</label>
                  <input type="number" required value={rent} onChange={e=>setRent(e.target.value)} className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Service Charge</label>
                  <input type="number" value={serviceCharge} onChange={e=>setServiceCharge(e.target.value)} className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Caution Deposit Required</label>
                  <input type="number" value={deposit} onChange={e=>setDeposit(e.target.value)} className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none" />
               </div>
               <div className="space-y-2">
                  <label className="text-sm font-medium">Available Date</label>
                  <input type="date" required value={availDate} onChange={e=>setAvailDate(e.target.value)} className="w-full border bg-background rounded-xl px-4 py-2 text-sm outline-none" />
               </div>
            </div>
            <div className="space-y-2">
               <label className="text-sm font-medium">Description Highlights</label>
               <textarea rows={4} value={desc} onChange={e=>setDesc(e.target.value)} className="w-full border bg-background rounded-xl p-4 text-sm outline-none" placeholder="Enter amenities, rules, and property perks..." />
            </div>
            <div className="flex items-center gap-2">
               <input type="checkbox" id="furn" checked={furnished} onChange={e=>setFurnished(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600" />
               <label htmlFor="furn" className="text-sm font-medium">Property is fully furnished</label>
            </div>
            <Button disabled={loading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-md font-semibold">
               {loading ? 'Publishing...' : 'Publish Listing'}
            </Button>
         </form>
      </div>
   );
}

export default function VacanciesAdmin() {
  const { userProfile, userRole } = useFirebase();
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [applications, setApplications] = useState<ListingApplication[]>([]);
  const [inspections, setInspections] = useState<InspectionRequest[]>([]);
  const [leads, setLeads] = useState<any[]>([]); // New Leads state
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'listings' | 'create_listing' | 'applications' | 'inspections' | 'leads'>('dashboard');

  useEffect(() => {
    if (!userProfile) return;
    fetchData();
  }, [userProfile]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let pQ;
      if (userRole === 'Admin') {
        pQ = query(collection(db, 'properties'));
      } else if (userRole === 'Property Manager') {
        pQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile?.uid));
      } else {
        pQ = query(collection(db, 'properties'), where('LandlordID', '==', userProfile?.uid));
      }
      
      const pSnap = await getDocs(pQ);
      const props = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Property));
      setProperties(props);

      let lQ;
      if (userRole === 'Admin') lQ = query(collection(db, 'listings'));
      else lQ = query(collection(db, 'listings'), where('LandlordID', '==', userProfile?.uid));
      const lSnap = await getDocs(lQ);
      setListings(lSnap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));

      let aQ;
      if (userRole === 'Admin') aQ = query(collection(db, 'listingApplications'));
      else aQ = query(collection(db, 'listingApplications'), where('LandlordID', '==', userProfile?.uid));
      const aSnap = await getDocs(aQ);
      setApplications(aSnap.docs.map(d => ({ id: d.id, ...d.data() } as ListingApplication)));

      let iQ;
      if (userRole === 'Admin') iQ = query(collection(db, 'inspectionRequests'));
      else iQ = query(collection(db, 'inspectionRequests'), where('LandlordID', '==', userProfile?.uid));
      const iSnap = await getDocs(iQ);
      setInspections(iSnap.docs.map(d => ({ id: d.id, ...d.data() } as InspectionRequest)));

      // Mock fetching leads for vendor dashboard
      setLeads([
         { id: '1', ApplicantName: 'John Doe', Status: 'New', Source: 'Marketplace', Property: 'Luxury Duplex' },
         { id: '2', ApplicantName: 'Jane Smith', Status: 'Contacted', Source: 'Direct', Property: 'Office Block B' }
      ]);

    } catch (e) {
       console.error("Error fetching market data", e);
    }
    setLoading(false);
  };

  const totalVacant = properties.filter(p => p.status === 'Vacant').length;
  const totalOccupied = properties.filter(p => p.status === 'Occupied').length;
  const totalUnits = properties.length;
  const occupancyRate = totalUnits ? Math.round((totalOccupied / totalUnits) * 100) : 0;
  const vacancyRate = totalUnits ? Math.round((totalVacant / totalUnits) * 100) : 0;

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Vacancies data...</div>;

  return (
    <div className="w-full h-full bg-background flex flex-col md:p-[24px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 px-4 md:px-0 mt-4 md:mt-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-serif">Marketplace Hub <span className="text-emerald-600 italic">Vendor Dashboard</span></h1>
          <p className="text-sm text-muted-foreground mt-1">Manage listings, track leads, and monitor marketplace performance.</p>
        </div>
        <div className="flex gap-2">
          {view !== 'create_listing' ? (
            <Button onClick={() => setView('create_listing')} className="bg-emerald-600 hover:bg-emerald-700 shadow-sm gap-2">
              <Plus className="w-4 h-4"/> Publish Listing
            </Button>
          ) : (
            <Button onClick={() => setView('dashboard')} variant="outline" className="shadow-sm">Back</Button>
          )}
        </div>
      </div>

      <div className="flex overflow-x-auto snap-x hide-scrollbar gap-2 mb-6 px-4 md:px-0 pb-2 border-b">
        <button onClick={()=>setView('dashboard')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold transition-all border-b-2 ${view==='dashboard' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <LayoutDashboard className="w-4 h-4" /> Overview
        </button>
        <button onClick={()=>setView('listings')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold transition-all border-b-2 ${view==='listings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <Search className="w-4 h-4" /> Listings
        </button>
        <button onClick={()=>setView('leads')} className={`flex items-center justify-between gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold transition-all border-b-2 ${view==='leads' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <span className="flex items-center gap-2"><Star className="w-4 h-4" /> Leads</span>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">{leads.length}</span>
        </button>
        <button onClick={()=>setView('applications')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold transition-all border-b-2 ${view==='applications' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <FileText className="w-4 h-4" /> Applications
        </button>
        <button onClick={()=>setView('inspections')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold transition-all border-b-2 ${view==='inspections' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          <Clock className="w-4 h-4" /> Inspections
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-0 pb-12">
         {view === 'dashboard' && (
            <div className="space-y-6">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                     <p className="text-sm font-semibold text-muted-foreground mb-1">Vacant Units</p>
                     <p className="text-3xl font-bold">{totalVacant}</p>
                     <p className="text-xs mt-2 text-rose-500 font-medium">{vacancyRate}% Vacancy Rate</p>
                  </div>
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                     <p className="text-sm font-semibold text-muted-foreground mb-1">Occupied Units</p>
                     <p className="text-3xl font-bold text-emerald-600">{totalOccupied}</p>
                     <p className="text-xs mt-2 text-emerald-600 font-medium">{occupancyRate}% Occupancy Rate</p>
                  </div>
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                     <p className="text-sm font-semibold text-muted-foreground mb-1">Active Listings</p>
                     <p className="text-3xl font-bold">{listings.filter(l => l.Status === 'Published').length}</p>
                     <p className="text-xs mt-2 text-primary font-medium">{applications.length} Total Applications</p>
                  </div>
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                     <p className="text-sm font-semibold text-muted-foreground mb-1">Pending Inspections</p>
                     <p className="text-3xl font-bold text-amber-500">{inspections.filter(i => i.Status === 'Pending').length}</p>
                     <p className="text-xs mt-2 text-amber-600 font-medium">Needs Attention</p>
                  </div>
               </div>
               
               <div className="bg-card border rounded-3xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold mb-4">Properties Status Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {properties.slice(0,6).map(p => {
                       const isVacant = p.status === 'Vacant' || !p.status;
                       return (
                       <div key={p.id} className="border bg-background rounded-2xl p-4 flex flex-col justify-between">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <p className="font-semibold text-sm">{p.PropertyName}</p>
                             <p className="text-xs text-muted-foreground">{p.Address || 'No Address'}</p>
                           </div>
                           <div className={`px-2 py-1 rounded-md text-xs font-semibold ${isVacant?'bg-rose-100 text-rose-700':p.status==='Occupied'?'bg-emerald-100 text-emerald-700':'bg-muted text-muted-foreground'}`}>
                             {p.status || 'Vacant'}
                           </div>
                         </div>
                         {isVacant && (
                           <div className="mt-3 pt-3 border-t">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full text-[10px] uppercase font-bold tracking-widest text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => {
                                   alert(`Auto-post permission requested from Landlord for ${p.PropertyName}.`);
                                }}
                              >
                                Request Auto-List
                              </Button>
                           </div>
                         )}
                       </div>
                       )
                     })}
                  </div>
               </div>
            </div>
         )}
         {view === 'listings' && (
            <div className="space-y-4">
               {listings.map(l => (
                 <div key={l.id} className="bg-card border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                    {l.CoverImage && <img src={l.CoverImage} alt={l.Title} className="w-full md:w-48 h-32 object-cover rounded-xl" />}
                    <div className="flex-1">
                       <div className="flex justify-between">
                          <h3 className="font-bold text-lg">{l.Title}</h3>
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${l.Status==='Published'?'bg-emerald-100 text-emerald-700':'bg-muted text-muted-foreground'}`}>{l.Status}</span>
                       </div>
                       <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{l.Description}</p>
                       <div className="flex gap-4 mt-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-4 h-4"/> {l.Views} Views</span>
                          <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> {l.ApplicationsCount} Applications</span>
                          <span className="flex items-center gap-1 text-emerald-600 font-bold">₦{(l.RentAmount || 0).toLocaleString()}/yr</span>
                       </div>
                    </div>
                 </div>
               ))}
               {listings.length === 0 && <div className="text-center p-8 text-muted-foreground">No listings found.</div>}
            </div>
         )}
         {view === 'create_listing' && <CreateListingForm properties={properties} onBack={()=>setView('dashboard')} onCreated={()=>{setView('listings'); fetchData();}}/>}
         
         {view === 'leads' && (
            <div className="space-y-6">
               <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 border border-emerald-100 p-6 rounded-3xl">
                  <div>
                     <h2 className="text-xl font-bold font-serif mb-1">Lead Management Hub</h2>
                     <p className="text-sm">Track, contact, and convert inquiries from the marketplace.</p>
                  </div>
                  <div className="text-right">
                     <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Total Leads</p>
                     <p className="text-4xl font-mono font-bold tracking-tight">{leads.length}</p>
                  </div>
               </div>

               <div className="bg-card border rounded-3xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm text-left">
                     <thead className="bg-muted text-muted-foreground text-xs uppercase font-semibold">
                        <tr>
                           <th className="px-6 py-4">Applicant</th>
                           <th className="px-6 py-4">Property Interested</th>
                           <th className="px-6 py-4">Source</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-border">
                        {leads.map(lead => (
                           <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-6 py-4 font-bold">{lead.ApplicantName}</td>
                              <td className="px-6 py-4 text-emerald-600 font-medium">{lead.Property}</td>
                              <td className="px-6 py-4 text-muted-foreground">{lead.Source}</td>
                              <td className="px-6 py-4">
                                 <span className="px-3 py-1 bg-emerald-100/50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">
                                    {lead.Status}
                                 </span>
                              </td>
                              <td className="px-6 py-4">
                                 <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">View Details</Button>
                              </td>
                           </tr>
                        ))}
                        {leads.length === 0 && (
                           <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                 No leads generated yet. Check back soon.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </div>
         )}
         
         {view === 'applications' && (
            <ApplicationsTab 
              applications={applications} 
              listings={listings} 
              onUpdate={fetchData} 
            />
         )}
         {view === 'inspections' && (
            <div className="space-y-4">
               {inspections.map(i => {
                  const listing = listings.find(l => l.id === i.ListingID);
                  return (
                     <div key={i.id} className="bg-card border rounded-3xl p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                           <div>
                              <h3 className="font-bold text-lg">{i.ApplicantName}</h3>
                              <p className="text-sm text-muted-foreground">{i.ApplicantEmail} • {i.ApplicantPhone}</p>
                           </div>
                           <span className={`px-2 py-1 rounded-md text-xs font-semibold ${i.Status==='Approved'?'bg-emerald-100 text-emerald-700':i.Status==='Rejected'?'bg-rose-100 text-rose-700':'bg-amber-100 text-amber-700'}`}>{i.Status}</span>
                        </div>
                        <p className="text-sm font-medium mb-4 bg-muted/30 p-3 rounded-xl inline-block border">
                           Requested Time: <span className="text-primary font-bold">{i.RequestedDate} at {i.RequestedTime}</span>
                        </p>
                        {listing && <p className="text-xs text-muted-foreground mb-4">For: {listing.Title}</p>}
                        
                        {i.Status === 'Pending' && (
                           <div className="flex gap-2">
                              <Button variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={async () => {
                                 await updateDoc(doc(db, 'inspectionRequests', i.id!), { Status: 'Rejected' });
                                 fetchData();
                              }}>Reject</Button>
                              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                                 await updateDoc(doc(db, 'inspectionRequests', i.id!), { Status: 'Approved' });
                                 fetchData();
                              }}>Approve Schedule</Button>
                           </div>
                        )}
                     </div>
                  )
               })}
               {inspections.length === 0 && <div className="text-center p-8 text-muted-foreground">No inspection requests found.</div>}
            </div>
         )}
      </div>
    </div>
  );
}

function LayoutDashboard({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
}
