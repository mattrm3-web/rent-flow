import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { CheckCircle2, XCircle, AlertCircle, Building2, User, Search, RefreshCw, FileText } from 'lucide-react';

export default function UserApprovals() {
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingUsers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('verificationStatus', '==', 'Pending')
      );
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPendingUsers(usersList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleUpdateStatus = async (userId: string, newStatus: 'Approved' | 'Rejected' | 'Suspended' | 'Active', field: 'verificationStatus' | 'accountStatus' = 'verificationStatus') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        [field]: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Special handling for Service Providers: Also mirror to serviceProviders collection for compat
      const usersList = pendingUsers.find(p => p.id === userId);
      if (usersList?.role === 'Service Provider') {
         try {
           await updateDoc(doc(db, 'serviceProviders', userId), {
             [field]: newStatus,
             updatedAt: new Date().toISOString()
           });
         } catch(e) {
           console.log("Could not update serviceProvider doc natively", e);
         }
      }

      // Audit Log
      await addDoc(collection(db, 'audit_logs'), {
        action: `updated_${field}`,
        targetUserId: userId,
        newValue: newStatus,
        timestamp: new Date().toISOString(),
        performedByRole: 'Admin'
      });

      // Also update specific module documents if needed, e.g., serviceProviders collection
      fetchPendingUsers();
    } catch (err) {
      console.error("Failed to update user status", err);
      alert("Failed to update status");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch(role) {
      case 'Service Provider': return 'bg-blue-100 text-blue-700';
      case 'Agency': return 'bg-purple-100 text-purple-700';
      case 'Developer': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          User Approvals
          {pendingUsers.length > 0 && (
            <span className="bg-rose-500 text-white text-[12px] font-bold px-2.5 py-1 rounded-full">
              {pendingUsers.length} Pending
            </span>
          )}
        </h2>
        <p className="text-sm text-muted-foreground">Manage platform access for Service Providers, Agencies, and Developers.</p>
      </div>
      
      {loading ? (
        <div className="animate-pulse flex flex-col gap-4">
          <div className="h-16 bg-muted/20 rounded-xl" />
          <div className="h-16 bg-muted/20 rounded-xl" />
        </div>
      ) : pendingUsers.length === 0 ? (
        <div className="text-center p-12 border border-dashed rounded-[16px] bg-muted/10">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <p className="text-body font-semibold">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No pending verification requests.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pendingUsers.map(p => (
            <div key={p.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border bg-card rounded-2xl hover:border-primary/30 transition-colors gap-4 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                  {p.displayName ? p.displayName.charAt(0) : (p.name ? p.name.charAt(0) : 'U')}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-base">{p.displayName || p.name || 'Unnamed User'}</p>
                    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${getRoleBadgeColor(p.role)}`}>
                      {p.role}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{p.email} &bull; {p.phoneNumber}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/20 p-1.5 rounded-xl">
                <button 
                  onClick={() => handleUpdateStatus(p.id, 'Approved')}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-lg flex items-center gap-2 shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button 
                  onClick={() => handleUpdateStatus(p.id, 'Rejected')}
                  className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
                <button 
                  className="px-3 py-2 bg-background hover:bg-muted font-semibold text-sm rounded-lg flex items-center justify-center border shadow-sm transition-colors"
                  title="View Documents"
                  onClick={() => alert("Document viewer to be implemented")}
                >
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
