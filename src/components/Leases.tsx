import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Lease } from '../types';
import { LeaseList } from './LeaseModule/LeaseList';
import { LeaseDetails } from './LeaseModule/LeaseDetails';
import { CreateLease } from './LeaseModule/CreateLease';

export default function Leases() {
  const { userRole, userProfile } = useFirebase();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;

    let q;
    const leasesRef = collection(db, 'leases');

    if (userRole === 'Admin') {
      q = query(leasesRef, orderBy('CreatedAt', 'desc'));
    } else if (userRole === 'Landlord') {
      q = query(leasesRef, where('LandlordID', '==', userProfile.uid), orderBy('CreatedAt', 'desc'));
    } else if (userRole === 'Property Manager') {
      q = query(leasesRef, where('PropertyManagerID', '==', userProfile.uid), orderBy('CreatedAt', 'desc'));
    } else if (userRole === 'Tenant') {
      q = query(leasesRef, where('TenantID', '==', userProfile.uid), orderBy('CreatedAt', 'desc'));
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snap) => {
        const results: Lease[] = [];
        snap.forEach(doc => {
           results.push({ id: doc.id, ...doc.data() } as Lease);
        });
        setLeases(results);
        setLoading(false);
        
        setSelectedLease(prev => {
           if (prev) {
              const updated = results.find(l => l.id === prev.id);
              if (updated) return updated;
           }
           return prev;
        });
    }, (err) => {
        console.error("Failed to fetch leases:", err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, userRole]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto min-h-full">
      {view === 'list' && (
        <LeaseList 
          leases={leases} 
          userRole={userRole || ''} 
          onSelect={(l) => { setSelectedLease(l); setView('detail'); }} 
          onCreateNew={() => setView('create')} 
        />
      )}
      
      {view === 'detail' && selectedLease && (
        <LeaseDetails 
          lease={selectedLease} 
          userRole={userRole || ''} 
          userProfile={userProfile!} 
          onBack={() => setView('list')} 
        />
      )}
      
      {view === 'create' && (
        <CreateLease 
          userRole={userRole || ''}
          userProfile={userProfile!}
          onBack={() => setView('list')} 
        />
      )}
    </div>
  );
}

export { Leases };
