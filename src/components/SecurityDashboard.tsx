import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import { Repair, Property } from '../types';
import { Shield, Clock, Search, MapPin, Wrench, AlertCircle, LogIn, LogOut, Loader2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SecurityDashboard() {
  const { userProfile } = useFirebase();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Security Staff needs to monitor open repairs (e.g. assigned or in progress)
    // To know when a provider is arriving.
    const q = query(collection(db, 'repairs'), where('Status', 'in', ['Assigned', 'In Progress', 'Waiting For Parts', 'Completed']));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reps = snapshot.docs.map(d => ({id: d.id, ...d.data()} as Repair));
      // order client side
      reps.sort((a,b) => new Date(b.DateCreated || 0).getTime() - new Date(a.DateCreated || 0).getTime());
      setRepairs(reps);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogEntry = async (repairId: string, currentLogs: string = '') => {
    try {
      const time = new Date().toLocaleString();
      const newLog = `\n[ENTRY] ${time} - Provider arrived. Logged by ${userProfile?.name}`;
      await updateDoc(doc(db, 'repairs', repairId), {
        SecurityLogs: currentLogs + newLog
      });
      // Add timeline event
      await addDoc(collection(db, 'repairTimeline'), {
        repairId,
        status: 'In Progress',
        description: `Service Provider entered the premises. Logged by Security: ${userProfile?.name}`,
        timestamp: new Date().toISOString(),
        userId: userProfile?.uid
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogExit = async (repairId: string, currentLogs: string = '') => {
    try {
      const time = new Date().toLocaleString();
      const newLog = `\n[EXIT] ${time} - Provider departed. Logged by ${userProfile?.name}`;
      await updateDoc(doc(db, 'repairs', repairId), {
        SecurityLogs: currentLogs + newLog
      });
      // Add timeline event
      await addDoc(collection(db, 'repairTimeline'), {
        repairId,
        status: 'In Progress',
        description: `Service Provider exited the premises. Logged by Security: ${userProfile?.name}`,
        timestamp: new Date().toISOString(),
        userId: userProfile?.uid
      });
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = repairs.filter(r => r.IssueTitle.toLowerCase().includes(searchTerm.toLowerCase()) || r.RepairID.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-4">
        <div>
          <h1 className="text-h1 mb-[4px] flex items-center gap-2 pr-4">
            <Shield className="w-8 h-8 text-emerald-500" />
            Security Log
          </h1>
          <p className="text-body text-muted-foreground">Monitor service provider access and report incidents.</p>
        </div>
        <Link to="/repairs" className="btn-primary hover-lift shrink-0 bg-rose-600 hover:bg-rose-700">
           <AlertCircle className="w-5 h-5 mr-2" />
           Report Incident
        </Link>
      </div>

      <div className="dense-card">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-h3">Expected Service Providers</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search by ID or Title..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>
        </div>

        {loading ? (
           <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
           <div className="text-center p-12 text-muted-foreground border-2 border-dashed rounded-3xl">
             <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p className="font-medium text-foreground">No active repairs expecting providers.</p>
             <p className="text-sm mt-1">All clear at the moment.</p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map(repair => (
                 <div key={repair.id} className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-start border-b pb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold bg-muted px-2 py-0.5 rounded-md">{repair.RepairID}</span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-indigo-500/10 text-indigo-700 border-indigo-500/20">{repair.Status}</span>
                        </div>
                        <h3 className="font-semibold">{repair.IssueTitle}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" /> Unit: {repair.UnitNumber || 'General'}
                        </p>
                      </div>
                      <Link to={`/repairs`} className="text-primary text-sm font-medium hover:underline">View Ticket</Link>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                       <button 
                         onClick={() => handleLogEntry(repair.id!, (repair as any).SecurityLogs)}
                         className="flex-1 py-2 px-4 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-medium text-sm transition-colors flex justify-center items-center gap-2"
                       >
                         <LogIn className="w-4 h-4" /> Log Entry
                       </button>
                       <button 
                         onClick={() => handleLogExit(repair.id!, (repair as any).SecurityLogs)}
                         className="flex-1 py-2 px-4 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl font-medium text-sm transition-colors flex justify-center items-center gap-2"
                       >
                         <LogOut className="w-4 h-4" /> Log Exit
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        )}
      </div>
    </div>
  );
}
