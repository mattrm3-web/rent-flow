import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Listing } from '../../types';
import { Search, MapPin, Building2, Calendar, Phone, Mail, CheckCircle2, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Link, Route, Routes, useNavigate, useParams, useLocation } from 'react-router-dom';
import ApplicantDashboard from './ApplicantDashboard';
import { useFirebase } from '../FirebaseProvider';

function ListingDetail() {
  const { listingId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useFirebase();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  
  // Basic info
  const [name, setName] = useState(userProfile?.name || '');
  const [email, setEmail] = useState(userProfile?.email || '');
  const [phone, setPhone] = useState(userProfile?.phoneNumber || '');
  
  // Extended info for Phase 8A
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [occupation, setOccupation] = useState('');
  const [employer, setEmployer] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!listingId) return;
    fetchListing();
  }, [listingId]);

  const fetchListing = async () => {
    setLoading(true);
    const d = await getDoc(doc(db, 'listings', listingId!));
    if (d.exists()) {
       setListing({ id: d.id, ...d.data() } as Listing);
       await updateDoc(doc(db, 'listings', listingId!), { Views: (d.data().Views || 0) + 1 });
    }
    setLoading(false);
  };

  const handleApply = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!name || !email || !phone) return;
     setSubmitting(true);
     await addDoc(collection(db, 'listingApplications'), {
        applicantId: userProfile?.uid || '',
        ListingID: listing!.id,
        vacancyId: listing!.id,
        PropertyID: listing!.PropertyID,
        propertyName: listing!.Title,
        unitId: listing!.unitId || '',
        unitName: listing!.unitName || '',
        
        ApplicantName: name,
        ApplicantEmail: email,
        ApplicantPhone: phone,
        
        maritalStatus,
        occupation,
        employer,
        monthlyIncome: monthlyIncome ? Number(monthlyIncome) : 0,
        guarantorName,
        guarantorPhone,
        guarantorAddress,
        
        ApplicationNotes: notes,
        Status: 'Submitted',
        paymentRequired: false,
        LandlordID: listing!.LandlordID || listing!.VendorID,
        CreatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
     });
     await updateDoc(doc(db, 'listings', listing!.id!), { ApplicationsCount: (listing!.ApplicationsCount || 0) + 1 });
     
     if (listing!.LandlordID || listing!.VendorID) {
        await addDoc(collection(db, 'notifications'), {
           userId: listing!.LandlordID || listing!.VendorID,
           title: 'New Property Application',
           message: `${name} has applied for ${listing!.Title}`,
           type: 'application',
           read: false,
           link: '/vacancies',
           createdAt: new Date().toISOString()
        });
     }
     
     setSubmitting(false);
     alert("Application submitted successfully!");
     setShowApply(false);
  };

  const handleInspect = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!name || !email || !phone || !date || !time) return;
     setSubmitting(true);
     await addDoc(collection(db, 'inspectionRequests'), {
        ListingID: listing!.id,
        PropertyID: listing!.PropertyID,
        ApplicantName: name,
        ApplicantEmail: email,
        ApplicantPhone: phone,
        RequestedDate: date,
        RequestedTime: time,
        Status: 'Pending',
        LandlordID: listing!.LandlordID,
        CreatedAt: new Date().toISOString()
     });
     
     if (listing!.LandlordID) {
        await addDoc(collection(db, 'notifications'), {
           userId: listing!.LandlordID,
           title: 'New Inspection Request',
           message: `${name} requested to inspect ${listing!.Title} on ${date}`,
           type: 'inspection',
           read: false,
           link: '/vacancies',
           createdAt: new Date().toISOString()
        });
     }
     
     setSubmitting(false);
     alert("Inspection requested successfully!");
     setShowInspect(false);
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-muted-foreground mt-20">Loading property...</div>;
  if (!listing) return <div className="p-20 text-center mt-20">Listing not found</div>;

  return (
    <div className="max-w-5xl mx-auto mt-24 p-6">
       <button onClick={()=>navigate('/portal')} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Listings
       </button>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-muted rounded-3xl overflow-hidden aspect-video relative">
             {listing.CoverImage ? <img src={listing.CoverImage} className="w-full h-full object-cover" alt="Cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><ImageIcon className="w-12 h-12 opacity-50"/></div>}
          </div>
          <div className="flex flex-col justify-center">
             <h1 className="text-3xl md:text-5xl font-bold mb-4">{listing.Title}</h1>
             <div className="flex gap-4 items-center mb-6">
                <span className="text-3xl font-bold text-emerald-600 font-mono">₦{(listing.RentAmount || 0).toLocaleString()}<span className="text-sm text-muted-foreground">/yr</span></span>
                <span className="px-3 py-1 bg-muted rounded-full text-xs font-semibold uppercase tracking-widest">{listing.Status}</span>
             </div>
             
             <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-card border rounded-2xl p-4">
                   <p className="text-xs text-muted-foreground font-medium mb-1">Available From</p>
                   <p className="font-bold flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-600"/> {listing.AvailableDate}</p>
                </div>
                <div className="bg-card border rounded-2xl p-4">
                   <p className="text-xs text-muted-foreground font-medium mb-1">Furnishing</p>
                   <p className="font-bold">{listing.Furnished ? 'Fully Furnished' : 'Unfurnished'}</p>
                </div>
                <div className="bg-card border rounded-2xl p-4">
                   <p className="text-xs text-muted-foreground font-medium mb-1">Service Charge</p>
                   <p className="font-bold">₦{listing.ServiceCharge ? listing.ServiceCharge.toLocaleString() : '0'}</p>
                </div>
                <div className="bg-card border rounded-2xl p-4">
                   <p className="text-xs text-muted-foreground font-medium mb-1">Caution Fee</p>
                   <p className="font-bold">₦{listing.DepositRequired ? listing.DepositRequired.toLocaleString() : '0'}</p>
                </div>
             </div>

             <div className="flex gap-4">
                <Button onClick={()=>setShowApply(true)} size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20">Apply Now</Button>
                <Button onClick={()=>setShowInspect(true)} size="lg" variant="outline" className="flex-1 shadow-sm">Book Inspection</Button>
             </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="md:col-span-2 space-y-8">
             <div className="bg-card border rounded-3xl p-8">
                <h2 className="text-2xl font-bold mb-4 font-serif">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{listing.Description}</p>
             </div>
             
             <div className="bg-card border rounded-3xl p-8">
                <h2 className="text-xl font-bold mb-4 font-serif">Property Comparison</h2>
                <p className="text-sm text-muted-foreground mb-4">How this property compares to similar listings in the area.</p>
                <div className="grid grid-cols-3 gap-4 text-sm text-center">
                   <div className="bg-muted p-4 rounded-xl">
                      <p className="text-muted-foreground mb-1 uppercase tracking-wider text-[10px] font-bold">Avg Area Rent</p>
                      <p className="font-bold text-lg">₦{(listing.RentAmount ? listing.RentAmount * 1.15 : 0).toLocaleString()}</p>
                   </div>
                   <div className="bg-muted p-4 rounded-xl">
                      <p className="text-muted-foreground mb-1 uppercase tracking-wider text-[10px] font-bold">Avg Size</p>
                      <p className="font-bold text-lg">{listing.Bedrooms} Beds</p>
                   </div>
                   <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 p-4 rounded-xl">
                      <p className="text-emerald-700/80 mb-1 uppercase tracking-wider text-[10px] font-bold">Value Score</p>
                      <p className="font-bold text-lg flex justify-center items-center gap-1">Excellent <CheckCircle2 className="w-4 h-4 text-emerald-600"/></p>
                   </div>
                </div>
             </div>
             
             <div className="bg-card border rounded-3xl p-8">
               <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold font-serif">Verified Reviews</h2>
                 <div className="flex items-center gap-2">
                   <div className="flex text-amber-400"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>
                   <span className="font-bold text-lg">4.8</span>
                   <span className="text-muted-foreground text-sm">(12 reviews)</span>
                 </div>
               </div>
               <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-2xl">
                     <div className="flex justify-between mb-2">
                        <p className="font-bold text-sm">Sarah Jenks (Former Tenant)</p>
                        <span className="text-xs text-muted-foreground">2 months ago</span>
                     </div>
                     <p className="text-sm text-muted-foreground">"Great property, the agency was very responsive to maintenance requests. Loved living here!"</p>
                  </div>
               </div>
             </div>
          </div>

          <div className="md:col-span-1 space-y-8">
             <div className="bg-card border rounded-3xl p-6 text-center sticky top-28">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                   <Building2 className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-bold">{listing.PostedByName || 'Prime Estates Ltd'}</h3>
                <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mb-2">{listing.PostedByRole || 'Verified Agency'}</p>
                <p className="text-muted-foreground text-sm mb-6">Managing 45 premium listings across the city since 2015.</p>
                <div className="flex gap-2">
                   <Button variant="outline" className="flex-1 rounded-xl shadow-sm text-xs"><Phone className="w-3.5 h-3.5 mr-1"/> Call</Button>
                   <Button variant="outline" className="flex-1 rounded-xl shadow-sm text-xs"><Mail className="w-3.5 h-3.5 mr-1"/> Message</Button>
                </div>
                <Button className="w-full mt-2 rounded-xl shadow-sm text-xs" variant="ghost">View Full Profile</Button>
             </div>
          </div>
       </div>

       {showApply && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-card border shadow-2xl rounded-3xl p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto outline-none animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold mb-2">Submit Application</h3>
                <p className="text-sm text-muted-foreground mb-6">Complete your profile to apply for {listing.Title}.</p>
                <form onSubmit={handleApply} className="space-y-6">
                   <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Personal Details</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input required type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <input required type="email" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <input required type="tel" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <select required value={maritalStatus} onChange={e=>setMaritalStatus(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm appearance-none">
                            <option value="Single">Single</option>
                            <option value="Married">Married</option>
                            <option value="Divorced">Divorced</option>
                            <option value="Widowed">Widowed</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Employment & Income</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input required type="text" placeholder="Occupation" value={occupation} onChange={e=>setOccupation(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <input required type="text" placeholder="Employer / Company" value={employer} onChange={e=>setEmployer(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <div className="md:col-span-2 relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">₦</span>
                            <input required type="number" min="0" placeholder="Monthly Income" value={monthlyIncome} onChange={e=>setMonthlyIncome(e.target.value)} className="w-full bg-background border pl-8 pr-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground border-b pb-2">Guarantor Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <input required type="text" placeholder="Guarantor Name" value={guarantorName} onChange={e=>setGuarantorName(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <input required type="tel" placeholder="Guarantor Phone" value={guarantorPhone} onChange={e=>setGuarantorPhone(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm" />
                         <input required type="text" placeholder="Guarantor Address" value={guarantorAddress} onChange={e=>setGuarantorAddress(e.target.value)} className="w-full bg-background border px-4 py-2.5 rounded-xl outline-none focus:border-emerald-500 text-sm md:col-span-2" />
                      </div>
                   </div>

                   <div className="space-y-4">
                      <textarea placeholder="Additional Notes (Optional)" value={notes} onChange={e=>setNotes(e.target.value)} className="w-full bg-background border p-4 rounded-xl outline-none focus:border-emerald-500 text-sm" rows={2}/>
                   </div>

                   <div className="flex gap-3 pt-2">
                      <Button type="button" variant="ghost" onClick={()=>setShowApply(false)} className="flex-1">Cancel</Button>
                      <Button disabled={submitting} type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{submitting?'Submitting...':'Submit Application'}</Button>
                   </div>
                </form>
             </div>
          </div>
       )}

       {showInspect && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-card border shadow-2xl rounded-3xl p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-bold mb-6">Request Inspection</h3>
                <form onSubmit={handleInspect} className="space-y-4">
                   <input required type="text" placeholder="Full Name" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-background border px-4 py-3 rounded-xl outline-none" />
                   <input required type="email" placeholder="Email Address" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-background border px-4 py-3 rounded-xl outline-none" />
                   <input required type="tel" placeholder="Phone Number" value={phone} onChange={e=>setPhone(e.target.value)} className="w-full bg-background border px-4 py-3 rounded-xl outline-none" />
                   <div className="grid grid-cols-2 gap-2">
                       <input required type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full bg-background border px-4 py-3 rounded-xl outline-none" />
                       <input required type="time" value={time} onChange={e=>setTime(e.target.value)} className="w-full bg-background border px-4 py-3 rounded-xl outline-none" />
                   </div>
                   <div className="flex gap-2 pt-4">
                      <Button type="button" variant="ghost" onClick={()=>setShowInspect(false)} className="flex-1">Cancel</Button>
                      <Button disabled={submitting} type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">{submitting?'Requesting...':'Confirm'}</Button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}

function MarketplaceHome() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [propertyType, setPropertyType] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('All');
  const [savedSearchAlert, setSavedSearchAlert] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    const q = query(collection(db, 'listings'), where('Status', '==', 'Published'));
    const snap = await getDocs(q);
    setListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
    setLoading(false);
  };

  const filtered = listings.filter(l => {
     const matchSearch = (l.Title || '').toLowerCase().includes(search.toLowerCase()) || (l.Description || '').toLowerCase().includes(search.toLowerCase()) || (l.City || '').toLowerCase().includes(search.toLowerCase());
     const matchType = propertyType === 'All' || l.PropertyType === propertyType || (propertyType === 'Apartment' && (!l.PropertyType)); // fallback
     const matchMin = minPrice ? (l.RentAmount >= parseInt(minPrice)) : true;
     const matchMax = maxPrice ? (l.RentAmount <= parseInt(maxPrice)) : true;
     const matchBed = bedrooms === 'All' ? true : l.Bedrooms === parseInt(bedrooms);
     return matchSearch && matchType && matchMin && matchMax && matchBed;
  });

  const handleSaveSearch = () => {
     setSavedSearchAlert(true);
     setTimeout(()=>setSavedSearchAlert(false), 3000);
  }

  return (
      <main className="flex-1 mt-20 p-6 md:p-12 max-w-7xl mx-auto w-full">
         <div className="text-center space-y-6 mb-12 animate-in slide-in-from-bottom-4 duration-500 bg-emerald-900 rounded-[3rem] p-12 lg:p-20 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075&auto=format&fit=crop')] opacity-20 bg-cover bg-center mix-blend-overlay"></div>
            <div className="relative z-10">
               <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-4 font-serif">Discover Your Perfect Space.</h1>
               <p className="text-lg text-emerald-100 max-w-2xl mx-auto mb-10">Search vetted listings from top landlords, developers, and estate agencies across the country.</p>
               
               <div className="max-w-4xl mx-auto bg-background p-4 rounded-3xl shadow-2xl flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex-1 w-full relative">
                     <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                     <input 
                        type="text" 
                        placeholder="City, neighborhood, or address..." 
                        value={search}
                        onChange={e=>setSearch(e.target.value)}
                        className="w-full bg-transparent border-none py-3 pl-12 pr-4 text-base focus:outline-none"
                     />
                  </div>
                  <div className="h-8 w-px bg-border hidden md:block"></div>
                  <select value={propertyType} onChange={e=>setPropertyType(e.target.value)} className="w-full md:w-auto bg-transparent border-none py-3 px-4 text-base focus:outline-none font-medium cursor-pointer">
                     <option value="All">All Types</option>
                     <option value="Apartment">Apartment</option>
                     <option value="House">House</option>
                     <option value="Villa">Villa</option>
                     <option value="Office">Office Space</option>
                     <option value="Shop">Retail Shop</option>
                  </select>
                  <div className="h-8 w-px bg-border hidden md:block"></div>
                  <Button size="lg" className="w-full md:w-auto rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold px-8">Search</Button>
               </div>
            </div>
         </div>

         <div className="flex flex-col md:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="w-full md:w-64 space-y-8 flex-shrink-0">
               <div className="flex justify-between items-center">
                  <h3 className="font-bold text-lg">Filters</h3>
                  <Button variant="ghost" onClick={handleSaveSearch} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs rounded-full h-8 px-3 transition-colors">
                     {savedSearchAlert ? 'Saved!' : 'Save Search'}
                  </Button>
               </div>

               <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">Price Range (₦)</h4>
                  <div className="flex items-center gap-2">
                     <input type="number" placeholder="Min" value={minPrice} onChange={e=>setMinPrice(e.target.value)} className="w-full bg-muted border-none rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50" />
                     <span className="text-muted-foreground">-</span>
                     <input type="number" placeholder="Max" value={maxPrice} onChange={e=>setMaxPrice(e.target.value)} className="w-full bg-muted border-none rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>
               </div>

               <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-foreground">Bedrooms</h4>
                  <div className="flex flex-wrap gap-2">
                     {['All', '1', '2', '3', '4', '5+'].map(b => (
                        <button key={b} onClick={() => setBedrooms(b)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${bedrooms === b ? 'bg-emerald-600 text-white shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                           {b}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="pt-4 border-t">
                  <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                     <h4 className="font-bold text-emerald-900 mb-2">Property Alerts</h4>
                     <p className="text-sm text-emerald-700/80 mb-4 leading-relaxed">Get notified instantly when new properties match your saved searches.</p>
                     <Button size="sm" onClick={handleSaveSearch} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm">Notify Me</Button>
                  </div>
               </div>
            </aside>

            {/* Leads & Listings Grid */}
            <div className="flex-1">
               <div className="flex justify-between items-end mb-6">
                  <div>
                     <h2 className="text-2xl font-bold tracking-tight">Available Properties</h2>
                     <p className="text-muted-foreground text-sm mt-1">{filtered.length} matched your criteria</p>
                  </div>
                  <select className="bg-background border rounded-xl py-2 px-3 text-sm outline-none cursor-pointer hover:bg-muted transition-colors">
                     <option>Sort by: Newest</option>
                     <option>Sort by: Lowest Price</option>
                     <option>Sort by: Highest Price</option>
                  </select>
               </div>

               {loading ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {[1,2,3,4].map(i => (
                        <div key={i} className="h-80 bg-muted/50 rounded-3xl animate-pulse"></div>
                     ))}
                  </div>
               ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {filtered.map(listing => (
                        <div key={listing.id} onClick={() => navigate(`/portal/${listing.id}`)} className="bg-card border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group cursor-pointer flex flex-col hover:-translate-y-1">
                           <div className="h-56 bg-muted relative overflow-hidden">
                              {listing.CoverImage ? (
                                 <img src={listing.CoverImage} alt={listing.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                 <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <Building2 className="w-12 h-12 mb-2 opacity-50" />
                                    <span className="text-sm font-medium">No Image</span>
                                 </div>
                              )}
                              <div className="absolute top-4 left-4 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md">
                                 {listing.VendorType === 'Developer' ? 'New Development' : (new Date(listing.AvailableDate).toDateString() === new Date().toDateString() ? 'Available Now' : 'Available Soon')}
                              </div>
                              <button className="absolute top-4 right-4 w-8 h-8 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 transition-colors shadow-sm">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                              </button>
                           </div>
                           <div className="p-5 flex-1 flex flex-col">
                              <div className="flex justify-between items-start mb-2 gap-2">
                                 <h3 className="font-bold text-lg line-clamp-1 group-hover:text-emerald-600 transition-colors">{listing.Title}</h3>
                              </div>
                              <p className="text-muted-foreground font-medium text-sm flex items-center gap-1 mb-4">
                                 <MapPin className="w-3.5 h-3.5" /> 
                                 {listing.City || 'Lagos'}, {listing.State || 'Nigeria'}
                              </p>
                              
                              <div className="flex gap-4 mb-4 text-sm text-foreground font-medium">
                                 {listing.Bedrooms && <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg> {listing.Bedrooms} Beds</span>}
                                 {listing.Bathrooms && <span className="flex items-center gap-1.5"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M10 5 L8 7 L12 11 L14 9 L10 5 Z"/></svg> {listing.Bathrooms} Baths</span>}
                                 {listing.Furnished && <span className="bg-muted px-2 py-0.5 rounded-md text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-auto self-center">Furnished</span>}
                              </div>

                              <div className="border-t pt-4 flex justify-between items-center mt-auto">
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-0.5">Rent per year</p>
                                    <p className="text-xl font-bold font-mono text-emerald-600 tracking-tight">₦{(listing.RentAmount || 0).toLocaleString()}</p>
                                 </div>
                                 <Button size="sm" className="rounded-xl shadow-sm bg-foreground text-background hover:bg-emerald-600 hover:text-white transition-colors">Details</Button>
                              </div>
                           </div>
                        </div>
                     ))}
                     {filtered.length === 0 && (
                        <div className="col-span-full py-20 text-center text-muted-foreground bg-muted/30 border rounded-[3rem] border-dashed">
                           <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                           <h3 className="font-bold text-lg text-foreground mb-2">No matching properties</h3>
                           <p>Try adjusting your search filters to find more properties.</p>
                           <Button variant="outline" className="mt-6 rounded-full" onClick={() => {setSearch(''); setPropertyType('All'); setMinPrice(''); setMaxPrice(''); setBedrooms('All');}}>Clear Filters</Button>
                        </div>
                     )}
                  </div>
               )}
            </div>
         </div>
      </main>
  )
}

export default function PublicMarketplace() {
  const { userProfile } = useFirebase();
  const location = useLocation();
  
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b bg-card py-4 px-6 md:px-12 fixed top-0 w-full z-50 flex justify-between items-center shadow-sm">
        <Link to="/portal" className="flex items-center gap-2 text-emerald-600">
           <Building2 className="w-8 h-8" />
           <span className="font-bold text-2xl tracking-tight text-foreground">RentFlow <span className="text-emerald-500 font-serif italic">Homes</span></span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
           <Link to="/portal" className="hover:text-emerald-600 transition-colors">Buy</Link>
           <Link to="/portal" className="text-emerald-600 font-bold transition-colors">Rent</Link>
           <Link to="/portal" className="hover:text-emerald-600 transition-colors">Agencies</Link>
           <Link to="/portal" className="hover:text-emerald-600 transition-colors">New Projects</Link>
        </div>
        <div className="flex items-center gap-4">
           {userProfile ? (
             <>
               <Link to="/portal/dashboard">
                  <Button variant={location.pathname === '/portal/dashboard' ? 'default' : 'ghost'} className={location.pathname === '/portal/dashboard' ? 'rounded-full bg-emerald-600 hover:bg-emerald-700' : 'rounded-full font-semibold'}>Dashboard</Button>
               </Link>
               <Button variant="ghost" className="rounded-full shadow-none font-semibold text-muted-foreground" onClick={() => window.location.href = '/'}>Exit / Portal</Button>
             </>
           ) : (
             <>
               <Link to="/login">
                  <Button variant="ghost" className="rounded-full shadow-none font-semibold">Sign In</Button>
               </Link>
               <Link to="/login">
                  <Button className="rounded-full shadow-sm bg-emerald-600 hover:bg-emerald-700">List Property</Button>
               </Link>
             </>
           )}
        </div>
      </header>
      <Routes>
        <Route path="/" element={<MarketplaceHome />} />
        <Route path="/dashboard" element={<ApplicantDashboard />} />
        <Route path="/:listingId" element={<ListingDetail />} />
      </Routes>
    </div>
  );
}
