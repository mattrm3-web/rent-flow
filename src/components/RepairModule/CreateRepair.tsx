import React, { useState, useEffect } from 'react';
import { useFirebase } from '../FirebaseProvider';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { Repair, RepairCategory, RepairPriority, Property, Tenant } from '../../types';
import { ArrowLeft, Upload, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';

export function CreateRepair({ onCancel, onSuccess }: { onCancel: () => void, onSuccess: () => void }) {
  const { userProfile } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<RepairCategory>('Other');
  const [priority, setPriority] = useState<RepairPriority>('Low');
  const [description, setDescription] = useState('');
  
  const [propertyId, setPropertyId] = useState('');
  const [unitNumber, setUnitNumber] = useState('');
  
  const [tenantRecord, setTenantRecord] = useState<Tenant | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!userProfile) return;
      if (userProfile.role === 'Tenant') {
        const tQ = query(collection(db, 'tenants'), where('AssociatedAuthUid', '==', userProfile.uid));
        const tSnap = await getDocs(tQ);
        if (!tSnap.empty) {
          const t = tSnap.docs[0].data() as Tenant;
          setTenantRecord(t);
          if (t.PropertyID) setPropertyId(t.PropertyID);
          if (t.UnitIdentifier) setUnitNumber(t.UnitIdentifier);
        }
      } else {
         let pQ = query(collection(db, 'properties'));
         if (userProfile.role === 'Landlord') pQ = query(collection(db, 'properties'), where('LandlordID', '==', userProfile.uid));
         if (userProfile.role === 'Property Manager') pQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile.uid));
         const pSnap = await getDocs(pQ);
         const ps = pSnap.docs.map(d => ({id: d.id, ...d.data()}) as Property);
         setProperties(ps);
         if (ps.length > 0) setPropertyId(ps[0].id!);
      }
    };
    fetchTenantData();
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    if (!title || !description || !propertyId) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const repairId = `RFP-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
      
      const repair: Partial<Repair> = {
        RepairID: repairId,
        TenantID: userProfile.uid,
        PropertyID: propertyId,
        UnitNumber: unitNumber,
        IssueTitle: title,
        Description: description,
        Category: category,
        Priority: priority,
        Status: 'Submitted',
        ReportDate: now,
        Photos: [], // We would upload these to storage first in a real scenario with full storage rules
        DateCreated: now,
        CreatedAt: now,
        UpdatedAt: now
      };
      
      const docRef = await addDoc(collection(db, 'repairs'), repair);
      
      // Create initial timeline event
      await addDoc(collection(db, 'repairTimeline'), {
        repairId: docRef.id,
        status: 'Submitted',
        description: 'Repair request created by tenant.',
        timestamp: now,
        userId: userProfile.uid
      });
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit repair request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full bg-card border rounded-3xl p-6 sm:p-8 animate-in slide-in-from-bottom-8 duration-300 shadow-xl">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <div>
          <h2 className="text-2xl font-bold">New Repair Request</h2>
          <p className="text-muted-foreground text-sm">Please provide details about the issue</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl mb-6 text-sm font-medium border border-rose-100 flex items-center gap-2">
           <AlertCircle className="w-4 h-4 shrink-0" />
           {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userProfile?.role !== 'Tenant' && (
             <div className="space-y-2 md:col-span-2">
                 <label className="text-sm font-medium">Select Property <span className="text-rose-500">*</span></label>
                 <select
                    className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
                    value={propertyId}
                    onChange={e => setPropertyId(e.target.value)}
                 >
                    {properties.map(p => (
                       <option key={p.id} value={p.id}>{p.Name} ({p.Address})</option>
                    ))}
                 </select>
             </div>
          )}
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Issue Title <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              required
              placeholder="e.g. Leaking pipe in bathroom" 
              className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Category <span className="text-rose-500">*</span></label>
            <select 
              className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              value={category}
              onChange={e => setCategory(e.target.value as RepairCategory)}
            >
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Roofing">Roofing</option>
              <option value="HVAC">HVAC (AC/Heating)</option>
              <option value="Security">Security</option>
              <option value="Painting">Painting</option>
              <option value="Flooring">Flooring</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Generator">Generator</option>
              <option value="Solar System">Solar System</option>
              <option value="CCTV">CCTV</option>
              <option value="Internet">Internet</option>
              <option value="Doors & Windows">Doors & Windows</option>
              <option value="Pest Control">Pest Control</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Landscaping">Landscaping</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Priority Level <span className="text-rose-500">*</span></label>
            <select 
              className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              value={priority}
              onChange={e => setPriority(e.target.value as RepairPriority)}
            >
              <option value="Low">Low - Not urgent</option>
              <option value="Medium">Medium - Needs attention soon</option>
              <option value="High">High - Affects daily living</option>
              <option value="Emergency">Emergency - Safety hazard or major damage risk</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Unit Number (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. Flat 3A" 
              className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none"
              value={unitNumber}
              onChange={e => setUnitNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Detailed Description <span className="text-rose-500">*</span></label>
          <textarea 
            required
            rows={4}
            placeholder="Please describe the issue in detail. When did it start? What exactly is broken?" 
            className="w-full p-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/50 outline-none resize-none"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>
        
        {/* Placeholder for Photo/Video uploads. File inputs visually styling, but upload mocked or skipped if Storage not full active */}
        <div className="space-y-2">
            <label className="text-sm font-medium">Photos</label>
            <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition cursor-pointer">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium">Click to upload photos</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
            </div>
            <p className="text-xs text-muted-foreground">Uploading files will be available once the issue is created</p>
        </div>

        <div className="pt-6 border-t flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </div>
      </form>
    </div>
  );
}
