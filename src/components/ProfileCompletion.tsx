import React, { useState } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import { Building2, Save } from 'lucide-react';

export default function ProfileCompletion() {
  const { userProfile } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    registrationNumber: '',
    licenseNumber: '',
    governmentId: '',
    category: '',
    phoneNumber: userProfile?.phoneNumber || '',
  });

  if (!userProfile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        ...formData,
        profileCompleted: true,
        updatedAt: new Date().toISOString()
      });
      // A full page reload to reset the cache and router
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Failed to save profile details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 animate-in fade-in zoom-in-95">
      <div className="w-full max-w-lg bg-card border rounded-[2rem] p-8 shadow-float">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Building2 className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Complete Your Profile</h1>
        <p className="text-sm text-center text-muted-foreground mb-8">
          Please provide some additional information about your {userProfile.role.toLowerCase()} account to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {(userProfile.role === 'Service Provider' || userProfile.role === 'Agency' || userProfile.role === 'Developer') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Business / Company Name</label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={e => setFormData({...formData, businessName: e.target.value})}
                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {(userProfile.role === 'Landlord' || userProfile.role === 'Property Manager') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Government ID Number</label>
              <input
                type="text"
                required
                value={formData.governmentId}
                onChange={e => setFormData({...formData, governmentId: e.target.value})}
                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {(userProfile.role === 'Agency' || userProfile.role === 'Developer') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Registration Number</label>
              <input
                type="text"
                required
                value={formData.registrationNumber}
                onChange={e => setFormData({...formData, registrationNumber: e.target.value})}
                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}

          {(userProfile.role === 'Service Provider') && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Service Category</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
                className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. Electrician, Plumbing"
              />
            </div>
          )}

          {!formData.phoneNumber && (
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Phone Number</label>
               <input
                 type="tel"
                 required
                 value={formData.phoneNumber}
                 onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                 className="w-full bg-background border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary/50"
               />
             </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-primary text-primary-foreground font-semibold rounded-xl px-4 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-70 hover:shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
