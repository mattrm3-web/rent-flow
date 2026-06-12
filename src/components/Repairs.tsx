import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Repair } from '../types';
import { RepairList } from './RepairModule/RepairList';
import { CreateRepair } from './RepairModule/CreateRepair';
import { RepairDetails } from './RepairModule/RepairDetails';
import { Loader2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable'; // we might not have autotable but we can do a simple draw or CSV. Let's do CSV for simplicity since it's foolproof and widely used for "Excel/CSV" requirement.

export default function Repairs() {
  const { userProfile, userRole } = useFirebase();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Views: 'list' | 'detail' | 'create'
  const [view, setView] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);

  useEffect(() => {
    if (!userProfile || !userRole) return;
    
    let q;
    const repairsRef = collection(db, 'repairs');
    
    if (userRole === 'Tenant') {
        q = query(repairsRef, where('TenantID', '==', userProfile.uid));
    } else if (userRole === 'Service Provider') {
        q = query(repairsRef, where('AssignedProviderID', '==', userProfile.uid));
    } else {
        q = query(repairsRef);
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reps = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Repair));
        reps.sort((a, b) => new Date(b.DateCreated || 0).getTime() - new Date(a.DateCreated || 0).getTime());
        setRepairs(reps);
        setLoading(false);
        
        setSelectedRepair(prev => {
           if (prev) {
              const updated = reps.find(r => r.id === prev.id);
              if (updated) return updated;
           }
           return prev;
        });
    }, (err) => {
        console.error("Failed to fetch repairs:", err);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile, userRole]);

  const exportCSV = () => {
    const headers = ['Repair ID', 'Category', 'Priority', 'Status', 'Date Created', 'Total Cost', 'Assigned Provider ID'];
    const rows = repairs.map(r => [
       r.RepairID, 
       r.Category, 
       r.Priority, 
       r.Status, 
       new Date(r.DateCreated).toLocaleDateString(), 
       r.TotalCost || 0,
       r.AssignedProviderID || 'None'
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `repairs_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex-1 p-[48px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] bg-muted/20 min-h-full">
      {['Admin', 'Landlord', 'Property Manager'].includes(userRole || '') && view === 'list' && (
         <div className="flex justify-end mb-4 animate-in fade-in">
            <Button onClick={exportCSV} variant="outline" className="gap-2 bg-background">
               <Download className="w-4 h-4" />
               Export to CSV
            </Button>
         </div>
      )}

      {view === 'list' && (
        <RepairList 
          repairs={repairs} 
          userRole={userRole || ''} 
          onViewDetail={(r) => { setSelectedRepair(r); setView('detail'); }} 
          onCreateNew={() => setView('create')} 
        />
      )}
      
      {view === 'create' && (
        <CreateRepair 
          onCancel={() => setView('list')} 
          onSuccess={() => setView('list')} 
        />
      )}
      
      {view === 'detail' && selectedRepair && (
          <RepairDetails 
            repair={selectedRepair} 
            userRole={userRole || ''} 
            userProfile={userProfile} 
            onBack={() => { setView('list'); setSelectedRepair(null); }} 
          />
      )}
    </div>
  );
}
