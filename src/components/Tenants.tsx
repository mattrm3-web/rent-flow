import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
import { filteredCountryCodes } from '../lib/countryCodes';
import { Users, Plus, Mail, Building2, Search, X, Loader2, Trash2 } from 'lucide-react';
import { Tenant, Property } from '../types';
import { Button } from './ui/button';

function AddTenantModal({ isOpen, onClose, properties, onSuccess }: { isOpen: boolean, onClose: () => void, properties: Property[], onSuccess: (msg: string) => void }) {
  const { userProfile, userRole } = useFirebase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [rentAmount, setRentAmount] = useState('');
  const [rentFrequency, setRentFrequency] = useState<'Monthly' | 'Quarterly' | 'Annually'>('Monthly');
  const [moveInDate, setMoveInDate] = useState('');
  const [leaseEndDate, setLeaseEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);
      
      const tempPassword = Math.random().toString(36).slice(-8) + 'Tx9!';
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        name,
        email,
        phoneNumber,
        role: 'Tenant',
        landlordId: landlordId,
        createdAt: new Date().toISOString(),
        requirePasswordReset: true
      });

      await addDoc(collection(db, 'tenants'), {
        TenantName: name,
        Email: email,
        LoginEmail: email,
        phoneNumber,
        PropertyID: propertyId || null,
        UnitIdentifier: unitId,
        LandlordID: landlordId || 'unknown',
        AssociatedAuthUid: uid,
        RentAmount: rentAmount ? parseFloat(rentAmount) : 0,
        RentFrequency: rentFrequency,
        moveInDate,
        LeaseEndDate: leaseEndDate,
        status: 'Active'
      });

      await sendPasswordResetEmail(secondaryAuth, email);

      onSuccess(`Tenant created successfully. Temporary password: ${tempPassword}`);
      onClose();
      // Clear form
      setName('');
      setEmail('');
      setPropertyId('');
      setUnitId('');
      setRentAmount('');
      setRentFrequency('Monthly');
      setMoveInDate('');
      setLeaseEndDate('');
    } catch (err: any) {
      setError(err.message || 'Failed to create tenant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-float border p-6 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-6">Add New Tenant</h2>
        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tenant Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email Address (Login)</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Phone Number</label>
              <div className="flex bg-background border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all w-full">
                 <select
                   className="bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground outline-none border-r appearance-none min-w-[80px]"
                   defaultValue="+1"
                   onChange={(e) => {
                     if (!phoneNumber.startsWith('+')) {
                       setPhoneNumber(e.target.value + phoneNumber);
                     } else {
                       const currentNum = phoneNumber.replace(/^\+\d+\s*/, '');
                       setPhoneNumber(e.target.value + currentNum);
                     }
                   }}
                 >
                   {filteredCountryCodes.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                   ))}
                 </select>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-transparent px-4 py-2.5 text-sm outline-none" placeholder="20 7123 1234" />
              </div>
            </div>
            <div className="space-y-1.5">
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rent Amount</label>
              <input required type="number" min="0" step="0.01" value={rentAmount} onChange={e => setRentAmount(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rent Frequency</label>
              <select required value={rentFrequency} onChange={e => setRentFrequency(e.target.value as any)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Annually">Annually</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Property</label>
              <select required value={propertyId} onChange={e => setPropertyId(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="">Select Property</option>
                {properties.map(p => (
                  <option key={p.PropertyID} value={p.PropertyID}>{p.PropertyName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Unit Identifier</label>
              <input required type="text" value={unitId} onChange={e => setUnitId(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="e.g. Apt 4B" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Move-In Date</label>
              <input required type="date" value={moveInDate} onChange={e => setMoveInDate(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Lease End Date</label>
              <input required type="date" value={leaseEndDate} onChange={e => setLeaseEndDate(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Tenant
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const { userProfile, userRole } = useFirebase();
  const cur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  const currencySymbol = currencyMap[cur] || '$';

  const fetchData = async () => {
    try {
      const tSnap = await getDocs(collection(db, 'tenants'));
      setTenants(tSnap.docs.map(doc => ({...doc.data(), TenantID: doc.id}) as Tenant));
      
      const pSnap = await getDocs(collection(db, 'properties'));
      setProperties(pSnap.docs.map(doc => ({...doc.data(), PropertyID: doc.id}) as Property));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuccess = (msg: string) => {
    setStatusMsg({ type: 'success', text: msg });
    setTimeout(() => setStatusMsg(null), 5000);
    fetchData();
  };

  const handleDelete = async (id: string, authUid?: string) => {
    try {
      await deleteDoc(doc(db, 'tenants', id));
      if (authUid) {
        await deleteDoc(doc(db, 'users', authUid));
      }
      setStatusMsg({ type: 'success', text: 'Tenant deleted successfully' });
      setTimeout(() => setStatusMsg(null), 3000);
      fetchData();
    } catch (e) {
      console.error(e);
      setStatusMsg({ type: 'error', text: 'Failed to delete tenant' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredTenants = tenants.filter(t => 
    t.TenantName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.Email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="p-8"><div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-24 rounded-2xl"></div></div>;

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-[60] px-[24px] py-[12px] rounded-[16px] shadow-lg transform transition-all flex items-center gap-[8px] ${statusMsg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="font-[600] text-[14px]">{statusMsg.text}</div>
        </div>
      )}
      <AddTenantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} properties={properties} onSuccess={handleSuccess} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Tenants</h1>
          <p className="text-body text-muted-foreground">Manage tenant profiles and leases.</p>
        </div>
        {(userRole === 'Admin' || userRole === 'Landlord' || userRole === 'Property Manager') && (
          <Button onClick={() => setIsModalOpen(true)} className="h-[40px] px-[16px] rounded-[12px]">
            <Plus className="w-[16px] h-[16px] mr-[8px]" /> <span className="text-btn">Add Tenant</span>
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-[16px] mb-[32px] p-[12px] flex flex-col sm:flex-row items-center justify-between shadow-sm gap-[16px]">
        <div className="flex items-center gap-[12px] text-muted-foreground bg-muted/50 px-[16px] py-[8px] rounded-[12px] flex-1 w-full max-w-sm">
          <Search className="w-[16px] h-[16px]" />
          <input 
            type="text" 
            placeholder="Search tenants..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-[14px] w-full"
          />
        </div>
      </div>

      {filteredTenants.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-[64px] text-center rounded-[16px] border border-dashed bg-muted/20">
          <div className="w-[64px] h-[64px] bg-muted rounded-full flex items-center justify-center mb-[24px]">
            <Users className="w-[32px] h-[32px] text-muted-foreground" />
          </div>
          <h3 className="text-h2 mb-[8px]">No Tenants Found</h3>
          <p className="text-body text-muted-foreground max-w-sm">No tenants match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
          {filteredTenants.map(t => {
            const property = properties.find(p => p.PropertyID === t.PropertyID);
            return (
              <div key={t.TenantID} className="dense-card relative group shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-500/30 flex flex-col justify-between h-[180px]">
                {(userRole === 'Landlord' || userRole === 'Admin') && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(t.TenantID, t.AssociatedAuthUid); }}
                    className="absolute top-[12px] right-[12px] z-10 p-[8px] bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-[14px] h-[14px]" />
                  </button>
                )}
                <div className="flex items-start gap-[12px]">
                  <div className="w-[40px] h-[40px] rounded-[12px] bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-h3 shrink-0">
                    {t.TenantName.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden mt-[2px]">
                    <h3 className="text-card-title truncate">{t.TenantName}</h3>
                    <div className="flex items-center gap-[6px] text-secondary text-muted-foreground mt-[2px]">
                      <Mail className="w-[12px] h-[12px] shrink-0" />
                      <span className="truncate">{t.Email}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto pt-[16px] border-t border-dashed">
                  <div className="flex items-center gap-[6px] text-secondary text-muted-foreground mb-[8px]">
                    <Building2 className="w-[12px] h-[12px] text-emerald-500 shrink-0" />
                    <span className="truncate font-[600]">{property?.PropertyName || 'Unassigned'} {t.UnitIdentifier && `- ${t.UnitIdentifier}`}</span>
                  </div>
                  {t.RentAmount !== undefined && (
                    <div className="flex items-center justify-between text-[13px] font-[600]">
                      <span className="text-muted-foreground font-[400]">{t.RentFrequency === 'Monthly' ? 'Month' : t.RentFrequency}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}{t.RentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
