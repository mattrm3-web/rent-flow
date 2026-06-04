import { useState, useEffect } from 'react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceProvider } from '../types';
import { Search, MapPin, Star, Wrench, ShieldCheck, Mail, Calendar } from 'lucide-react';
import BookingModal from './BookingModal';

export default function Marketplace() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);

  const categories = [
    'All', 'Electrical', 'Plumbing', 'Painting', 'Cleaning', 'Moving Services',
    'Carpentry', 'Generator Repair', 'AC Repair', 'Internet Installation', 
    'Pest Control', 'Interior Design', 'CCTV Installation', 'Solar Installation', 
    'General Maintenance', 'Others'
  ];

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const q = query(collection(db, 'serviceProviders'), where('verificationStatus', '==', 'Verified'));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ServiceProvider));
        setProviders(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProviders();
  }, []);

  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.ownerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || p.serviceCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <div className="p-8"><div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-24 rounded-2xl"></div></div>;

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      {selectedProvider && (
        <BookingModal 
          isOpen={true} 
          onClose={() => setSelectedProvider(null)} 
          provider={selectedProvider} 
        />
      )}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Service Marketplace</h1>
          <p className="text-body text-muted-foreground">Discover and book verified service providers.</p>
        </div>
      </div>

      <div className="bg-card border rounded-[16px] mb-[32px] p-[12px] flex flex-col md:flex-row items-center gap-[16px] shadow-sm">
        <div className="flex items-center gap-[12px] text-muted-foreground bg-muted/50 px-[16px] py-[8px] rounded-[12px] flex-1 w-full">
          <Search className="w-[16px] h-[16px]" />
          <input 
            type="text" 
            placeholder="Search providers by name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-[14px] w-full"
          />
        </div>
        <select 
          value={categoryFilter} 
          onChange={e => setCategoryFilter(e.target.value)}
          className="w-full md:w-[200px] bg-muted/50 border-none rounded-[12px] px-[16px] py-[10px] text-[14px] outline-none"
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filteredProviders.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-[64px] text-center rounded-[16px] border border-dashed bg-muted/20">
          <div className="w-[64px] h-[64px] bg-muted rounded-full flex items-center justify-center mb-[24px]">
            <Wrench className="w-[32px] h-[32px] text-muted-foreground" />
          </div>
          <h3 className="text-h2 mb-[8px]">No Providers Found</h3>
          <p className="text-body text-muted-foreground max-w-sm">We couldn't find any service providers matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-[16px]">
          {filteredProviders.map(p => (
            <div key={p.id} className="dense-card relative group shadow-sm hover:shadow-md transition-all flex flex-col h-[280px]">
              <div className="absolute top-[12px] right-[12px] z-10 flex items-center gap-[4px] bg-primary/10 text-primary px-[8px] py-[4px] rounded-[8px] text-[10px] font-[800] uppercase">
                <ShieldCheck className="w-[12px] h-[12px]" /> Verified
              </div>
              <div className="flex items-center gap-[12px] mb-[16px]">
                <div className="w-[48px] h-[48px] rounded-[16px] bg-muted overflow-hidden shrink-0">
                  {p.businessLogoUrl ? (
                    <img src={p.businessLogoUrl} alt={p.businessName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-h3">
                      {p.businessName?.charAt(0) || p.ownerName?.charAt(0) || 'P'}
                    </div>
                  )}
                </div>
                <div className="overflow-hidden">
                  <h3 className="text-card-title truncate">{p.businessName || p.ownerName}</h3>
                  <p className="text-secondary text-muted-foreground truncate">{p.serviceCategory}</p>
                </div>
              </div>
              
              <div className="space-y-[8px] mb-[16px] flex-1">
                <div className="flex items-center gap-[8px] text-secondary text-muted-foreground">
                  <MapPin className="w-[14px] h-[14px] shrink-0" />
                  <span className="truncate">{p.city ? `${p.city}, ${p.state}` : 'Location hidden'}</span>
                </div>
                <div className="flex items-center gap-[8px] text-secondary text-muted-foreground">
                  <Star className="w-[14px] h-[14px] shrink-0 text-amber-500 fill-amber-500" />
                  <span>{p.averageRating ? p.averageRating.toFixed(1) : 'No ratings yet'} ({p.completedJobs || 0} jobs)</span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-[8px]">
                <button 
                  onClick={() => setSelectedProvider(p)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-[600] rounded-[8px] py-[8px] text-[12px] flex items-center justify-center gap-[6px] transition-all"
                >
                  <Calendar className="w-[14px] h-[14px]" /> Book Now
                </button>
                <button className="bg-muted hover:bg-muted/80 text-foreground font-[600] rounded-[8px] py-[8px] text-[12px] flex items-center justify-center gap-[6px] transition-all">
                  <Mail className="w-[14px] h-[14px]" /> Contact
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
