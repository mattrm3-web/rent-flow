import { useState, useEffect } from 'react';
import { db, storage } from '../firebase';
import { collection, getDocs, addDoc, query, where, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useFirebase } from './FirebaseProvider';
import { Building2, Plus, MapPin, Search, X, Loader2, Trash2 } from 'lucide-react';
import { Property, UserProfile } from '../types';
import { Button } from './ui/button';

function AddPropertyModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  managers
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSuccess: (msg: string) => void,
  managers: UserProfile[]
}) {
  const { userProfile, userRole } = useFirebase();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [numberOfBedrooms, setNumberOfBedrooms] = useState('');
  const [numberOfFlats, setNumberOfFlats] = useState('');
  const [status, setStatus] = useState('Vacant');
  const [managerId, setManagerId] = useState('');
  const [currency, setCurrency] = useState(userProfile?.currency || 'USD');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);

      let uploadedUrl = '';
      if (imageFile && landlordId) {
        const storageRef = ref(storage, `properties/${landlordId}/${Date.now()}`);
        await uploadBytes(storageRef, imageFile);
        uploadedUrl = await getDownloadURL(storageRef);
      }

      await addDoc(collection(db, 'properties'), {
        PropertyName: name,
        Address: address,
        propertyType,
        numberOfBedrooms: numberOfBedrooms ? parseInt(numberOfBedrooms) : 0,
        numberOfFlats: numberOfFlats ? parseInt(numberOfFlats) : 0,
        status,
        LandlordID: landlordId || 'unknown',
        PropertyManagerID: managerId || null,
        currency,
        imageUrls: uploadedUrl ? [uploadedUrl] : []
      });

      onSuccess('Property created successfully.');
      onClose();
      setName('');
      setAddress('');
      setPropertyType('Apartment');
      setNumberOfBedrooms('');
      setNumberOfFlats('');
      setManagerId('');
      setCurrency(userProfile?.currency || 'USD');
      setImageFile(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create property.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-float border p-6 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-6">Add New Property</h2>
        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Property Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Address</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Property Type</label>
              <select value={propertyType} onChange={e => setPropertyType(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="Apartment">Apartment</option>
                <option value="House">House</option>
                <option value="Commercial">Commercial</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">No. of Flats</label>
              <input type="number" min="0" value={numberOfFlats} onChange={e => setNumberOfFlats(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="Vacant">Vacant</option>
                <option value="Occupied">Occupied</option>
                <option value="Reserved">Reserved</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Coming Soon">Coming Soon</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium block">No. of Bedrooms (Per flat/unit)</label>
            <input type="number" min="0" value={numberOfBedrooms} onChange={e => setNumberOfBedrooms(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium block">Property Image</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            />
          </div>
          {userRole === 'Landlord' && managers.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign Property Manager (Optional)</label>
              <select value={managerId} onChange={e => setManagerId(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="">None</option>
                {managers.map(m => (
                  <option key={m.uid} value={m.uid}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Currency</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="CAD">CAD (C$)</option>
              <option value="AUD">AUD (A$)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="INR">INR (₹)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="CHF">CHF (CHF)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Property
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Properties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [managers, setManagers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const { userProfile, userRole } = useFirebase();

  const fetchData = async () => {
    try {
      setLoading(true);
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);
      
      let pSnap;
      if (userRole === 'Admin') {
         pSnap = await getDocs(collection(db, 'properties'));
      } else if (userRole === 'Property Manager') {
         const q = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile?.uid));
         pSnap = await getDocs(q);
      } else {
         const q = query(collection(db, 'properties'), where('LandlordID', '==', landlordId));
         pSnap = await getDocs(q);
      }

      const props = pSnap.docs.map(doc => ({
        ...doc.data(),
        PropertyID: doc.id
      })) as Property[];
      
      setProperties(props);

      if (landlordId) {
        const qM = query(collection(db, 'users'), where('landlordId', '==', landlordId), where('role', '==', 'Property Manager'));
        const mSnap = await getDocs(qM);
        setManagers(mSnap.docs.map(d => d.data() as UserProfile));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile]);

  const handleSuccess = (msg: string) => {
    setStatusMsg({ type: 'success', text: msg });
    setTimeout(() => setStatusMsg(null), 3000);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'properties', id));
      // Delete associated tenants as well
      const q = query(collection(db, 'tenants'), where('PropertyID', '==', id));
      const tSnap = await getDocs(q);
      for (const t of tSnap.docs) {
         await deleteDoc(doc(db, 'tenants', t.id));
         if (t.data().AssociatedAuthUid) {
            await deleteDoc(doc(db, 'users', t.data().AssociatedAuthUid));
         }
      }
      setStatusMsg({ type: 'success', text: 'Property deleted successfully' });
      setTimeout(() => setStatusMsg(null), 3000);
      fetchData();
    } catch (e) {
      console.error(e);
      setStatusMsg({ type: 'error', text: 'Failed to delete property.' });
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  if (loading) {
    return <div className="p-8"><div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-24 rounded-2xl"></div></div>;
  }

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-[60] px-[24px] py-[12px] rounded-[16px] shadow-lg transform transition-all flex items-center gap-[8px] ${statusMsg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="font-[600] text-[14px]">{statusMsg.text}</div>
        </div>
      )}
      <AddPropertyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} managers={managers} onSuccess={handleSuccess} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Properties</h1>
          <p className="text-body text-muted-foreground">Manage your real estate portfolio.</p>
        </div>
        {(userRole === 'Admin' || userRole === 'Landlord' || userRole === 'Property Manager') && (
          <Button onClick={() => setIsModalOpen(true)} className="h-[40px] px-[16px] rounded-[12px]">
            <Plus className="w-[16px] h-[16px] mr-[8px]" /> <span className="text-btn">Add Property</span>
          </Button>
        )}
      </div>

      <div className="bg-card border rounded-[16px] mb-[32px] p-[12px] flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-[12px] text-muted-foreground bg-muted/50 px-[16px] py-[8px] rounded-[12px] flex-1 max-w-sm">
          <Search className="w-[16px] h-[16px]" />
          <input 
            type="text" 
            placeholder="Search properties..." 
            className="bg-transparent border-none outline-none text-[14px] w-full"
          />
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-[64px] text-center rounded-[16px] border border-dashed bg-muted/20">
          <div className="w-[64px] h-[64px] bg-muted rounded-full flex items-center justify-center mb-[24px]">
            <Building2 className="w-[32px] h-[32px] text-muted-foreground" />
          </div>
          <h3 className="text-h2 mb-[8px]">No Properties Found</h3>
          <p className="text-body text-muted-foreground max-w-sm">Add your first property to start managing your portfolio.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
          {properties.map(p => (
            <div onClick={() => setSelectedProperty(p)} key={p.PropertyID} className="dense-card relative group p-[0px] overflow-hidden flex flex-col transition-colors duration-300 hover:border-emerald-500/30 cursor-pointer">
              {(userRole === 'Landlord' || userRole === 'Admin') && (
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(p.PropertyID); }}
                  className="absolute top-[12px] right-[12px] z-10 p-[8px] bg-background/80 backdrop-blur-sm text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-[14px] h-[14px]" />
                </button>
              )}
              <div className="h-[120px] bg-emerald-500 bg-opacity-10 relative overflow-hidden shrink-0">
                {p.imageUrls && p.imageUrls.length > 0 ? (
                  <img src={p.imageUrls[0]} alt={p.PropertyName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
                <div className="absolute bottom-[12px] left-[16px] flex items-center gap-[8px] text-white">
                  <div className="p-[6px] bg-emerald-500 rounded-[8px] shadow-sm">
                    <Building2 className="w-[16px] h-[16px]" />
                  </div>
                </div>
              </div>
              <div className="p-[16px] flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-card-title truncate">{p.PropertyName}</h3>
                  <div className="flex items-center gap-[8px] mt-[4px] text-muted-foreground text-secondary truncate">
                    <MapPin className="w-[12px] h-[12px] shrink-0" />
                    <span className="truncate">{p.Address || 'No address'}</span>
                  </div>
                </div>
                {p.PropertyManagerID && (
                  <div className="mt-[16px] text-[10px] uppercase font-[800] text-primary bg-primary/10 px-[8px] py-[4px] rounded-[6px] self-start">
                    Managed by PM
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedProperty && (
         <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl overflow-y-auto">
            <div className="bg-background max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl relative my-8">
               <div className="p-6 border-b flex justify-between items-center bg-muted/30">
                  <h2 className="text-xl font-bold font-serif">{selectedProperty.PropertyName}</h2>
                  <button onClick={() => setSelectedProperty(null)} className="p-2 hover:bg-muted rounded-full">
                     <X className="w-5 h-5" />
                  </button>
               </div>
               <div className="p-6 space-y-6">
                  {selectedProperty.imageUrls && selectedProperty.imageUrls.length > 0 && (
                     <img src={selectedProperty.imageUrls[0]} alt="Property" className="w-full h-48 object-cover rounded-xl" />
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                     <div className="bg-muted p-3 rounded-xl">
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Status</p>
                        <p className="font-bold">{selectedProperty.status}</p>
                     </div>
                     <div className="bg-muted p-3 rounded-xl">
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Type</p>
                        <p className="font-bold">{selectedProperty.propertyType}</p>
                     </div>
                     <div className="bg-muted p-3 rounded-xl">
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Rent</p>
                        <p className="font-bold">{selectedProperty.currency || 'NGN'}{selectedProperty.monthlyRent?.toLocaleString()}</p>
                     </div>
                     <div className="bg-muted p-3 rounded-xl">
                        <p className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-1">Bedrooms</p>
                        <p className="font-bold">{selectedProperty.numberOfBedrooms}</p>
                     </div>
                  </div>
                  <div>
                     <p className="text-sm font-bold mb-1">Address</p>
                     <p className="text-sm text-muted-foreground">{selectedProperty.Address}</p>
                  </div>
                  {selectedProperty.status === 'Vacant' && (userRole === 'Landlord' || userRole === 'Property Manager') && (
                     <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
                        <div>
                           <p className="text-sm font-bold text-emerald-900">Unit is Vacant</p>
                           <p className="text-xs text-emerald-700">Ready to find a new tenant?</p>
                        </div>
                        <Button 
                           size="sm" 
                           className="bg-emerald-600 hover:bg-emerald-700 text-xs"
                           onClick={() => window.location.href = '/vacancies'}
                        >
                           List on Marketplace
                        </Button>
                     </div>
                  )}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
