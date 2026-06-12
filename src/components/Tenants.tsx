import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
import { filteredCountryCodes } from '../lib/countryCodes';
import { Users, Plus, Mail, Building2, Search, X, Loader2, Trash2, Download } from 'lucide-react';
import { Tenant, Property } from '../types';
import { Button } from './ui/button';
import { jsPDF } from 'jspdf';

function CredentialsModal({ isOpen, onClose, credentials }: { isOpen: boolean, onClose: () => void, credentials: {email: string, password: string, name: string} | null }) {
  if (!isOpen || !credentials) return null;

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("RentFlow Pro - Tenant Credentials", 20, 30);
    doc.setFontSize(16);
    doc.text(`Hello ${credentials.name},`, 20, 50);
    doc.setFontSize(14);
    doc.text("Your tenant account has been created. Here are your login details:", 20, 65);
    
    doc.text(`Login URL: ${window.location.origin}/login`, 20, 85);
    doc.text(`Email: ${credentials.email}`, 20, 95);
    doc.text(`Temporary Password: ${credentials.password}`, 20, 105);
    
    doc.text("Please log in and reset your password immediately.", 20, 125);
    doc.save(`${credentials.name.replace(/\s+/g, '_')}_Credentials.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-float border p-6 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-4">Tenant Credentials</h2>
        <p className="text-sm text-muted-foreground mb-6">
          The tenant's account has been generated. An automatic password reset email has been sent to their inbox.
          You can also download this PDF to manually send them their login link and temporary password.
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 mb-6 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Login Link</p>
            <p className="font-medium">{window.location.origin}/login</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email (Login)</p>
            <p className="font-medium">{credentials.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Temporary Password</p>
            <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{credentials.password}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Done</Button>
          <Button type="button" className="flex-1" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddTenantModal({ isOpen, onClose, properties, onSuccess }: { isOpen: boolean, onClose: () => void, properties: Property[], onSuccess: (credentials: {email: string, password: string, name: string}) => void }) {
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

      try {
        await sendEmailVerification(userCredential.user);
        await sendPasswordResetEmail(secondaryAuth, email);
      } catch (emailErr) {
        console.warn("Failed to send reset email, but account was created.", emailErr);
      }

      onSuccess({ email, password: tempPassword, name });
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
      if (err.code === 'auth/email-already-in-use') {
         setError('Email is already registered. If they previously had an account, they must log in to it first to clean it up.');
      } else if (err.code === 'auth/network-request-failed') {
         setError('Network error. Ensure ad-blockers are disabled, or open the app in a new tab.');
      } else {
         setError(err.message || 'Failed to create tenant.');
      }
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

function TenantDetailsModal({ isOpen, onClose, tenant, properties }: { isOpen: boolean, onClose: () => void, tenant: Tenant | null, properties: Property[] }) {
  const { userProfile } = useFirebase();
  const [payments, setPayments] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultCur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  
  const property = properties.find(p => p.PropertyID === tenant?.PropertyID);
  const currSym = currencyMap[property?.currency || defaultCur] || '$';

  useEffect(() => {
    if (!isOpen || !tenant || !tenant.id) return;
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const pQ = query(collection(db, 'payments'), where('tenantId', '==', tenant.id));
        const pSnap = await getDocs(pQ);
        setPayments(pSnap.docs.map(doc => ({id: doc.id, ...doc.data()})).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        
        const rQ = query(collection(db, 'repairs'), where('TenantID', '==', tenant.AssociatedAuthUid || tenant.id));
        const rSnap = await getDocs(rQ);
        setRepairs(rSnap.docs.map(doc => ({id: doc.id, ...doc.data()})));
      } catch(e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [tenant, isOpen]);

  if (!isOpen || !tenant) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-float border">
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div>
            <h2 className="text-xl font-bold">{tenant.TenantName}'s Profile</h2>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><Mail className="w-4 h-4"/> {tenant.Email}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 bg-muted/20">
           {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
           ) : (
             <>
                <div className="bg-card rounded-2xl p-5 border shadow-sm flex flex-col sm:flex-row gap-6">
                   <div className="flex-1">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-1">Lease Details</h3>
                      <p className="font-medium text-lg">{property?.PropertyName || 'Unassigned Property'}</p>
                      {tenant.UnitIdentifier && <p className="text-sm">Unit: {tenant.UnitIdentifier}</p>}
                   </div>
                   <div className="flex-1">
                      <h3 className="text-sm font-semibold text-muted-foreground mb-1">Rent Settings</h3>
                      <p className="font-medium text-lg text-emerald-600">{currSym}{tenant.RentAmount?.toLocaleString()}</p>
                      <p className="text-sm">{tenant.RentFrequency || 'Monthly'}</p>
                   </div>
                </div>

                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                   <h3 className="text-sm font-semibold text-muted-foreground p-5 border-b bg-muted/10">Payment History</h3>
                   {payments.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No payments found.</p> : (
                      <table className="w-full text-sm">
                         <tbody>
                            {payments.map(p => (
                               <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10">
                                  <td className="p-4">{new Date(p.date).toLocaleDateString()}</td>
                                  <td className="p-4 font-semibold">{currSym}{p.amount.toLocaleString()}</td>
                                  <td className="p-4"><span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold">{p.status}</span></td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   )}
                </div>

                <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                   <h3 className="text-sm font-semibold text-muted-foreground p-5 border-b bg-muted/10">Maintenance Requests</h3>
                   {repairs.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No repair requests.</p> : (
                      <table className="w-full text-sm">
                         <tbody>
                            {repairs.map(r => (
                               <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                                  <td className="p-4 font-medium">{r.IssueTitle}</td>
                                  <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">{r.Status}</span></td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   )}
                </div>
             </>
           )}
        </div>
      </div>
    </div>
  );
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState<{isOpen: boolean, credentials: {email: string, password: string, name: string} | null}>({isOpen: false, credentials: null});
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const { userProfile, userRole } = useFirebase();

  const defaultCur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  
  const getCurrencySymbol = (propertyId: string | null) => {
    if (!propertyId) return currencyMap[defaultCur] || '$';
    const p = properties.find(prop => prop.PropertyID === propertyId);
    return currencyMap[p?.currency || defaultCur] || '$';
  };

  const fetchData = async () => {
    try {
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);

      let tSnap, pSnap;
      if (userRole === 'Admin') {
        tSnap = await getDocs(collection(db, 'tenants'));
        pSnap = await getDocs(collection(db, 'properties'));
      } else if (userRole === 'Property Manager') {
        const qP = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile?.uid));
        pSnap = await getDocs(qP);
        
        const qT = query(collection(db, 'tenants'), where('LandlordID', '==', landlordId));
        tSnap = await getDocs(qT);
      } else {
        const qT = query(collection(db, 'tenants'), where('LandlordID', '==', landlordId));
        tSnap = await getDocs(qT);
        
        const qP = query(collection(db, 'properties'), where('LandlordID', '==', landlordId));
        pSnap = await getDocs(qP);
      }
      
      setTenants(tSnap.docs.map(doc => ({...doc.data(), TenantID: doc.id}) as Tenant));
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

  const handleSuccess = (credentials: {email: string, password: string, name: string}) => {
    setStatusMsg({ type: 'success', text: 'Tenant created successfully.' });
    setCredentialsModal({ isOpen: true, credentials });
    setTimeout(() => setStatusMsg(null), 5000);
    fetchData();
  };

  const handleDelete = async (id: string, authUid?: string) => {
    try {
      await deleteDoc(doc(db, 'tenants', id));
      
      if (authUid) {
        // Find and delete associated payments
        const pQ = query(collection(db, 'payments'), where('TenantID', '==', authUid));
        const pSnap = await getDocs(pQ);
        for(let dSnap of pSnap.docs) {
           await deleteDoc(doc(db, 'payments', dSnap.id));
        }

        // Delete the user record
        await deleteDoc(doc(db, 'users', authUid));
      }

      setStatusMsg({ type: 'success', text: 'Tenant and associated records deleted' });
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
      <CredentialsModal isOpen={credentialsModal.isOpen} credentials={credentialsModal.credentials} onClose={() => setCredentialsModal({isOpen: false, credentials: null})} />
      <AddTenantModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} properties={properties} onSuccess={handleSuccess} />
      
      <TenantDetailsModal isOpen={!!selectedTenant} onClose={() => setSelectedTenant(null)} tenant={selectedTenant} properties={properties} />
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
              <div onClick={() => setSelectedTenant(t)} key={t.TenantID} className="dense-card relative group shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-emerald-500/30 flex flex-col justify-between h-[180px]">
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
                        {getCurrencySymbol(t.PropertyID || null)}{t.RentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
