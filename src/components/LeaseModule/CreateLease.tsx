import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Lease, UserProfile } from '../../types';
import { Button } from '../ui/button';
import { ArrowLeft, Plus } from 'lucide-react';

export function CreateLease({ userRole, userProfile, onBack }: { userRole: string, userProfile: UserProfile, onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);

  const [formData, setFormData] = useState<Partial<Lease>>({
    LeaseNumber: `LSE-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`,
    LeaseType: 'Residential',
    Status: 'Draft',
    PaymentFrequency: 'Monthly',
    RentAmount: 0,
    SecurityDeposit: 0,
    LateFee: 0,
    GracePeriodDays: 5,
    UtilityResponsibility: 'Tenant',
    StartDate: '',
    EndDate: ''
  });

  useEffect(() => {
    const fetchSelectData = async () => {
      let pQ;
      if (userRole === 'Admin') pQ = query(collection(db, 'properties'));
      else if (userRole === 'Landlord') pQ = query(collection(db, 'properties'), where('LandlordID', '==', userProfile.uid));
      else if (userRole === 'Property Manager') pQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile.uid));
      else return;

      const pSnap = await getDocs(pQ);
      const props = pSnap.docs.map(d => ({id: d.id, ...d.data()}));
      setProperties(props);

      if (props.length > 0) {
        setFormData(prev => ({...prev, PropertyID: props[0].id}));
      }

      let tQ;
      if (userRole === 'Admin') tQ = query(collection(db, 'tenants'));
      else if (userRole === 'Landlord') tQ = query(collection(db, 'tenants'), where('LandlordID', '==', userProfile.uid));
      else if (userRole === 'Property Manager') {
          tQ = query(collection(db, 'tenants')); 
      }
      const tSnap = await getDocs(tQ!);
      // Filter tenants by property if needed
      setTenants(tSnap.docs.map(d => ({id: d.id, ...d.data()})));
    };
    fetchSelectData();
  }, [userProfile, userRole]);

  useEffect(() => {
    if (formData.PropertyID && userRole === 'Property Manager') {
      const pmTenants = tenants.filter(t => t.PropertyID === formData.PropertyID);
      if (pmTenants.length > 0) {
        setFormData(prev => ({...prev, TenantID: pmTenants[0].AssociatedAuthUid || pmTenants[0].id}));
      }
    }
  }, [formData.PropertyID, tenants, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedProp = properties.find(p => p.id === formData.PropertyID);
      const landlordId = selectedProp?.LandlordID || userProfile.uid;
      const pmId = selectedProp?.PropertyManagerID || null;

      const newLease: Lease = {
        ...formData as Lease,
        LandlordID: landlordId,
        PropertyManagerID: pmId,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'leases'), newLease);
      await updateDoc(doc(db, 'properties', formData.PropertyID), { status: 'Occupied' });
      onBack();
    } catch(err) {
      console.error(err);
      alert('Failed to construct lease.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Create New Lease</h1>
          <p className="text-sm text-muted-foreground">Draft a new digital tenancy agreement.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm space-y-8">
        
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Basic Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lease Number</label>
              <input required value={formData.LeaseNumber} onChange={e=>setFormData({...formData, LeaseNumber: e.target.value})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Lease Type</label>
              <select required value={formData.LeaseType} onChange={e=>setFormData({...formData, LeaseType: e.target.value as any})} className="w-full p-3 bg-background border rounded-xl">
                 <option value="Residential">Residential</option>
                 <option value="Commercial">Commercial</option>
                 <option value="Short Stay">Short Stay</option>
                 <option value="Office">Office</option>
                 <option value="Industrial">Industrial</option>
                 <option value="Mixed Use">Mixed Use</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <select required value={formData.PropertyID} onChange={e=>setFormData({...formData, PropertyID: e.target.value})} className="w-full p-3 bg-background border rounded-xl">
                <option value="">Select a property...</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.PropertyName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Unit / Apartment No.</label>
              <input required placeholder="e.g. Apt 4B" value={formData.Unit || ''} onChange={e=>setFormData({...formData, Unit: e.target.value})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <label className="text-sm font-medium">Tenant</label>
              <select required value={formData.TenantID || ''} onChange={e=>setFormData({...formData, TenantID: e.target.value})} className="w-full p-3 bg-background border rounded-xl">
                <option value="">Select a tenant...</option>
                {tenants.map(t => <option key={t.AssociatedAuthUid || t.id} value={t.AssociatedAuthUid || t.id}>{t.TenantName} ({t.Email})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Dates & Financials */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Terms & Financials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <input required type="date" value={formData.StartDate} onChange={e=>setFormData({...formData, StartDate: e.target.value})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <input required type="date" value={formData.EndDate} onChange={e=>setFormData({...formData, EndDate: e.target.value})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Frequency</label>
              <select required value={formData.PaymentFrequency} onChange={e=>setFormData({...formData, PaymentFrequency: e.target.value as any})} className="w-full p-3 bg-background border rounded-xl">
                 <option value="Monthly">Monthly</option>
                 <option value="Quarterly">Quarterly</option>
                 <option value="Biannual">Biannual</option>
                 <option value="Annual">Annual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rent Amount</label>
              <input required type="number" min="0" value={formData.RentAmount} onChange={e=>setFormData({...formData, RentAmount: Number(e.target.value)})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Security Deposit</label>
              <input required type="number" min="0" value={formData.SecurityDeposit} onChange={e=>setFormData({...formData, SecurityDeposit: Number(e.target.value)})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Late Fee Amount</label>
              <input type="number" min="0" value={formData.LateFee} onChange={e=>setFormData({...formData, LateFee: Number(e.target.value)})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
          </div>
        </div>

        {/* Clauses */}
        <div>
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">Custom Terms</h2>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Terms & Conditions</label>
              <textarea rows={4} placeholder="E.g. No pets allowed. Subletting is strictly prohibited..." value={formData.AdditionalTerms || ''} onChange={e=>setFormData({...formData, AdditionalTerms: e.target.value})} className="w-full p-3 bg-background border rounded-xl resize-none" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Jurisdiction Clause</label>
              <input placeholder="E.g. State of California" value={formData.Jurisdiction || ''} onChange={e=>setFormData({...formData, Jurisdiction: e.target.value})} className="w-full p-3 bg-background border rounded-xl" />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto h-12 px-8 text-base font-semibold">
            {loading ? 'Creating Draft...' : 'Create Lease Draft'}
          </Button>
        </div>
      </form>
    </div>
  );
}
