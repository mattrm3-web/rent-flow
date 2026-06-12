import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, collection, addDoc, onSnapshot, query, orderBy, getDocs, where, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Repair, RepairTimeline, RepairMessage, ServiceProvider, UserProfile, RepairStatus } from '../../types';
import { ArrowLeft, Clock, MessageSquare, ListTodo, DollarSign, Image as ImageIcon, Send, User, Building2, Upload, AlertCircle, CheckCircle2, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';

export function RepairDetails({ repair, userRole, userProfile, onBack }: { repair: Repair, userRole: string, userProfile: UserProfile, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'timeline' | 'costs'>('details');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [assignedProvider, setAssignedProvider] = useState<ServiceProvider | null>(null);

  // Status mapping
  const statuses: RepairStatus[] = [
    'Submitted', 'Under Review', 'Assigned', 'In Progress', 
    'Waiting For Parts', 'Waiting For Tenant', 'Inspection', 'Completed', 'Closed'
  ];

  useEffect(() => {
    // Fetch service providers if Admin/Landlord/PM
    if (['Admin', 'Landlord', 'Property Manager'].includes(userRole)) {
      getDocs(query(collection(db, 'serviceProviders'))).then(snap => {
        setProviders(snap.docs.map(d => ({id: d.id, ...d.data()} as ServiceProvider)));
      });
    }
  }, [userRole]);

  useEffect(() => {
    // Fetch assigned provider info if there's one
    if (repair.AssignedProviderID) {
       getDocs(query(collection(db, 'serviceProviders'), where('uid', '==', repair.AssignedProviderID))).then(snap => {
         if (!snap.empty) setAssignedProvider(snap.docs[0].data() as ServiceProvider);
       });
    } else {
       setAssignedProvider(null);
    }
  }, [repair.AssignedProviderID]);

  const updateStatus = async (newStatus: RepairStatus) => {
    if (!userProfile) return;
    setStatusUpdating(true);
    try {
      const now = new Date().toISOString();
      let updates: Partial<Repair> = { Status: newStatus, UpdatedAt: now };
      
      if (newStatus === 'Under Review') updates.DateReviewed = now;
      if (newStatus === 'Assigned') updates.DateAssigned = now;
      if (newStatus === 'In Progress') updates.DateWorkStarted = now;
      if (newStatus === 'Completed') updates.DateCompleted = now;
      if (newStatus === 'Closed') updates.DateClosed = now;

      await updateDoc(doc(db, 'repairs', repair.id!), updates);
      
      // Log timeline
      await addDoc(collection(db, 'repairTimeline'), {
        repairId: repair.id,
        status: newStatus,
        description: `Status updated to ${newStatus} by ${userRole}.`,
        timestamp: now,
        userId: userProfile.uid
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const assignProvider = async (providerUid: string) => {
    if (!userProfile) return;
    try {
      const now = new Date().toISOString();
      await updateDoc(doc(db, 'repairs', repair.id!), {
        AssignedProviderID: providerUid,
        Status: 'Assigned',
        DateAssigned: now,
        UpdatedAt: now
      });
      
      await addDoc(collection(db, 'repairTimeline'), {
        repairId: repair.id,
        status: 'Assigned',
        description: `Repair assigned to service provider.`,
        timestamp: now,
        userId: userProfile.uid
      });

      // Auto start message group
      const chatDocRef = doc(db, 'chats', `repair_${repair.id}`);
      await setDoc(chatDocRef, {
        name: `Repair Ticket - ${repair.IssueTitle}`,
        type: 'group',
        Participants: [repair.TenantID, providerUid, userProfile.uid].filter(Boolean),
        repairId: repair.id,
        createdAt: now
      }, { merge: true });

      await addDoc(collection(db, `chats/repair_${repair.id}/messages`), {
        senderId: 'SYSTEM',
        senderName: 'System Auto-Message',
        senderRole: 'System',
        text: `Job assigned to ${providerUid}. Group messaging is now open. Landlord, tenant, and the service provider can communicate here.`,
        type: 'text',
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      
      // Kept legacy repairMessages for backwards compatibility in the UI component
      await addDoc(collection(db, 'repairMessages'), {
        repairId: repair.id,
        senderId: 'SYSTEM',
        senderName: 'System Auto-Message',
        senderRole: 'Admin',
        messageText: `Job assigned. Group messaging is now open. Landlord, tenant, and the service provider can communicate here. Staff members can be tagged as needed.`,
        timestamp: now,
        readBy: []
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!userProfile) return;
    if (!window.confirm("Are you sure you want to delete this repair request?")) return;
    try {
      await deleteDoc(doc(db, 'repairs', repair.id!));
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to delete repair.");
    }
  };

  const currentStatusIndex = statuses.indexOf(repair.Status);

  return (
    <div className="max-w-5xl mx-auto w-full animate-in slide-in-from-right-8 duration-300">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors bg-card border shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{repair.IssueTitle}</h1>
            <span className="text-xs font-mono font-semibold bg-muted px-2 py-1 rounded-md">{repair.RepairID}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-1">Logged on {new Date(repair.DateCreated).toLocaleDateString()}</p>
        </div>
        
        <div className="flex gap-2">
          {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && repair.Status !== 'Closed' && (
             <Button onClick={() => updateStatus('Closed')} variant="outline" className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50">
                 Close Ticket
             </Button>
          )}
          
          {(userRole === 'Landlord' || userProfile?.uid === repair.TenantID) && (
             <Button onClick={handleDelete} variant="outline" className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50">
                 <Trash2 className="w-4 h-4" /> Delete
             </Button>
          )}
        </div>
      </div>

      {/* Status Pipeline Visualization */}
      <div className="bg-card border rounded-3xl p-6 mb-6 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px]">
           {statuses.filter(s => !['Cancelled', 'Rejected'].includes(s)).map((s, idx) => {
              const isCompleted = idx < currentStatusIndex;
              const isCurrent = s === repair.Status;
              return (
                 <div key={s} className="flex flex-col items-center gap-2 relative z-10 flex-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10
                       ${isCompleted ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-primary text-white ring-4 ring-primary/20' : 'bg-muted text-muted-foreground' }
                    `}>
                       {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider text-center ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                       {s}
                    </span>
                 </div>
              );
           })}
           {/* Connecting Line */}
           <div className="absolute left-12 right-12 top-[46px] h-1 bg-muted -z-0">
               <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.max(0, (currentStatusIndex / (statuses.length - 1)) * 100)}%` }} />
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b mb-6 no-scrollbar">
        <TabButton active={activeTab === 'details'} onClick={() => setActiveTab('details')} icon={ListTodo} label="Overview & Action" />
        <TabButton active={activeTab === 'timeline'} onClick={() => setActiveTab('timeline')} icon={Clock} label="Timeline" />
        <TabButton active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={MessageSquare} label="Messages" />
        <TabButton active={activeTab === 'costs'} onClick={() => setActiveTab('costs')} icon={DollarSign} label="Cost & Invoice" />
      </div>

      {/* Tab Content */}
      <div className="lg:grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-4">
                   <h3 className="text-lg font-semibold border-b pb-2">Description</h3>
                   <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{repair.Description}</p>
                   
                   {/* Photos */}
                   {repair.Photos && repair.Photos.length > 0 && (
                     <div className="pt-4 mt-4 border-t">
                       <h3 className="text-sm font-semibold mb-3">Attached Media</h3>
                       <div className="flex gap-2 flex-wrap">
                          {repair.Photos.map((url, i) => (
                             <img key={i} src={url} alt={`Repair pic ${i}`} className="w-24 h-24 rounded-xl object-cover border" />
                          ))}
                       </div>
                     </div>
                   )}
                </div>

                {/* Assignment Module (Visible to Admin/PM/Landlord) */}
                {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && repair.Status !== 'Closed' && (
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Service Assignment</h3>
                    
                    {repair.AssignedProviderID ? (
                       <div className="bg-muted/30 p-4 rounded-2xl flex items-center justify-between border">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                <User className="w-5 h-5" />
                             </div>
                             <div>
                                <p className="font-semibold text-sm">{assignedProvider?.businessName || 'Unknown Provider'}</p>
                                <p className="text-xs text-muted-foreground">{assignedProvider?.email}</p>
                             </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => updateDoc(doc(db, 'repairs', repair.id!), { AssignedProviderID: '' })}>
                             Reassign
                          </Button>
                       </div>
                    ) : (
                       <div className="space-y-4">
                          <p className="text-sm text-muted-foreground mb-4">Suggested providers based on repair category (sorted by rating).</p>
                          <div className="grid gap-3">
                             {providers
                               .filter(p => !p.serviceCategory || repair.Category === 'Other' || p.serviceCategory.includes(repair.Category))
                               .sort((a,b) => (b.averageRating || 4.5) - (a.averageRating || 4.5)) // fallback rating 4.5 if none exists
                               .map(p => (
                                <div key={p.id} className="flex items-center justify-between p-3 border rounded-xl hover:border-primary/50 transition">
                                   <div>
                                      <p className="font-medium text-sm flex items-center gap-2">
                                        {p.businessName}
                                        <span className="flex items-center text-amber-500 text-xs font-bold">
                                           <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
                                           {(p.averageRating || 4.5).toFixed(1)}
                                        </span>
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-0.5">{p.serviceCategory || 'General Handyman'}</p>
                                   </div>
                                   <Button size="sm" onClick={() => assignProvider(p.uid)} className="shrink-0 bg-primary/10 text-primary hover:bg-primary/20">Assign</Button>
                                </div>
                             ))}
                             {providers.filter(p => !p.serviceCategory || repair.Category === 'Other' || p.serviceCategory.includes(repair.Category)).length === 0 && <p className="text-xs text-muted-foreground italic">No related providers available.</p>}
                          </div>
                       </div>
                    )}
                  </div>
                )}
                
                {/* Status Override Module (Visible to Admin/PM/Landlord) */}
                {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && repair.Status !== 'Closed' && (
                  <div className="bg-card border rounded-3xl p-6 shadow-sm mt-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Manual Status Update</h3>
                    <div className="flex flex-wrap gap-3 items-center">
                       <select 
                         className="flex h-10 w-full md:w-auto items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                         value={repair.Status}
                         onChange={(e) => updateStatus(e.target.value as RepairStatus)}
                         disabled={statusUpdating}
                       >
                         {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                       </select>
                       <p className="text-xs text-muted-foreground">Select a stage to instantly update the tenant's view.</p>
                       {statusUpdating && <span className="text-xs text-primary animate-pulse ml-2">Updating...</span>}
                    </div>
                  </div>
                )}

                {/* Actions for Provider */}
                {userRole === 'Service Provider' && repair.Status !== 'Closed' && (
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Provider Actions</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={() => updateStatus('In Progress')} disabled={repair.Status === 'In Progress'} variant="outline" className="border-primary text-primary hover:bg-primary/5">Mark In Progress</Button>
                        <Button onClick={() => updateStatus('Waiting For Parts')} disabled={repair.Status === 'Waiting For Parts'} variant="outline">Waiting for Parts</Button>
                        <Button onClick={() => updateStatus('Completed')} disabled={repair.Status === 'Completed'} className="bg-emerald-600 hover:bg-emerald-700">Submit as Completed</Button>
                    </div>
                  </div>
                )}
                
                {/* Security Actions */}
                {userRole === 'Security Staff' && repair.Status !== 'Closed' && repair.AssignedProviderID && (
                  <div className="bg-card border rounded-3xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Facility Security Controls</h3>
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={async () => {
                           await addDoc(collection(db, 'repairTimeline'), {
                             repairId: repair.id,
                             status: 'Security Log',
                             description: `Provider ARRIVED at site. Verified by Security.`,
                             timestamp: new Date().toISOString(),
                             userId: userProfile.uid
                           });
                           alert("Logged provider arrival.");
                        }} className="bg-blue-600 hover:bg-blue-700">Log Provider Arrival</Button>
                        <Button onClick={async () => {
                           await addDoc(collection(db, 'repairTimeline'), {
                             repairId: repair.id,
                             status: 'Security Log',
                             description: `Provider DEPARTED from site. Verified by Security.`,
                             timestamp: new Date().toISOString(),
                             userId: userProfile.uid
                           });
                           alert("Logged provider departure.");
                        }} variant="outline">Log Provider Departure</Button>
                    </div>
                  </div>
                )}
                
                {/* Tenant Actions */}
                {userRole === 'Tenant' && repair.Status === 'Completed' && (
                  <div className="bg-card border-2 border-emerald-500/20 rounded-3xl p-6 shadow-sm bg-emerald-50/30">
                    <h3 className="text-lg font-semibold mb-2 text-emerald-800">Confirm Resolution</h3>
                    <p className="text-sm text-emerald-600/80 mb-4">The service provider has marked this repair as completed. Please confirm the issue is resolved to close the ticket.</p>
                    <div className="flex gap-3">
                       <Button onClick={() => updateStatus('Closed')} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                          Confirm & Close Ticket
                       </Button>
                       <Button onClick={() => updateStatus('In Progress')} variant="outline" className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50">
                          Issue Persists
                       </Button>
                    </div>
                  </div>
                )}
                
                {/* Rating System Component rendered here */}
                {['Completed', 'Closed'].includes(repair.Status) && repair.AssignedProviderID && ['Tenant', 'Landlord'].includes(userRole) && (
                   <div className="bg-card border rounded-3xl p-6 shadow-sm">
                      <RepairRatingModule repair={repair} userProfile={userProfile} />
                   </div>
                )}
              </div>
            )}
            
            {activeTab === 'timeline' && <RepairTimelineView repairId={repair.id!} />}
            {activeTab === 'messages' && <RepairChat repair={repair} userProfile={userProfile} />}
            {activeTab === 'costs' && <RepairCostManager repair={repair} userRole={userRole} userProfile={userProfile} />}
        </div>
        
        {/* Sidebar Info */}
        <div className="mt-6 lg:mt-0 space-y-6">
           <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">Quick Stats</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-semibold bg-muted px-2 py-0.5 rounded-full">{repair.Category}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Priority</span>
                    <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{repair.Priority}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold">{repair.Status}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Unit</span>
                    <span className="font-semibold">{repair.UnitNumber || 'N/A'}</span>
                 </div>
              </div>
           </div>

           <div className="bg-card border rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">SLA Tracking</h3>
              <div className="space-y-4">
                 {(() => {
                    let slaHours = 0;
                    if (repair.Priority === 'Emergency') slaHours = 4;
                    else if (repair.Priority === 'High') slaHours = 24;
                    else if (repair.Priority === 'Medium') slaHours = 72;
                    else slaHours = 168; // Low = 7 days

                    let elapsedHours = (new Date().getTime() - new Date(repair.DateCreated).getTime()) / (1000 * 60 * 60);
                    let isBreached = elapsedHours > slaHours && !['Completed', 'Closed'].includes(repair.Status);
                    let SLAStatus = ['Completed', 'Closed'].includes(repair.Status) ? 'Met' : (isBreached ? 'Breached' : 'Within SLA');
                    
                    return (
                       <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Target Resolution</span>
                            <span className="font-semibold">{slaHours} Hours</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isBreached ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                               {SLAStatus}
                            </span>
                         </div>
                       </div>
                    );
                 })()}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// Subcomponent stub for Timeline
function RepairTimelineView({ repairId }: { repairId: string }) {
  const [events, setEvents] = useState<RepairTimeline[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'repairTimeline'), where('repairId', '==', repairId));
    const unsub = onSnapshot(q, snap => {
       const evts = snap.docs.map(d => ({id: d.id, ...d.data()} as RepairTimeline));
       evts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
       setEvents(evts);
    });
    return () => unsub();
  }, [repairId]);

  return (
    <div className="bg-card border rounded-3xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-6 border-b pb-2">Activity Timeline</h3>
      <div className="relative border-l-2 border-muted ml-3 space-y-8 pb-4">
        {events.map((e, i) => (
           <div key={e.id} className="relative pl-6">
              <div className="absolute w-4 h-4 rounded-full bg-primary ring-4 ring-card left-[-9px] top-1" />
              <div className="flex justify-between items-start mb-1">
                 <span className="text-sm font-bold">{e.status}</span>
                 <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">{e.description}</p>
           </div>
        ))}
        {events.length === 0 && <p className="text-sm text-muted-foreground pl-6">No timeline events recorded.</p>}
      </div>
    </div>
  );
}

// Subcomponent stub for Chat
function RepairChat({ repair, userProfile }: { repair: Repair, userProfile: UserProfile }) {
  const [messages, setMessages] = useState<RepairMessage[]>([]);
  const [text, setText] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'repairMessages'), where('repairId', '==', repair.id));
    const unsub = onSnapshot(q, snap => {
       const msgs = snap.docs.map(d => ({id: d.id, ...d.data()} as RepairMessage));
       msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
       setMessages(msgs);
       
       // Mark as read
       msgs.forEach(m => {
          if (!m.readBy.includes(userProfile.uid)) {
             updateDoc(doc(db, 'repairMessages', m.id!), {
                readBy: [...m.readBy, userProfile.uid]
             });
          }
       });
    });
    return () => unsub();
  }, [repair.id, userProfile.uid]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      const now = new Date().toISOString();
      await addDoc(collection(db, 'repairMessages'), {
        repairId: repair.id,
        senderId: userProfile.uid,
        senderName: userProfile.name,
        senderRole: userProfile.role,
        messageText: text,
        timestamp: now,
        readBy: [userProfile.uid]
      });
      setText('');

      // Send notifications
      const notifyUsers = [repair.TenantID, repair.AssignedProviderID].filter(Boolean) as string[];
      // We can also fetch property landlord to notify them, but tenant and provider are priority
      for (const uid of notifyUsers) {
        if (uid !== userProfile.uid) {
           await addDoc(collection(db, 'notifications'), {
             userId: uid,
             title: `New Message: ${repair.IssueTitle}`,
             message: `From ${userProfile.name}: ${text.substring(0, 50)}...`,
             createdAt: now,
             read: false,
             type: 'message'
           });
        }
      }

    } catch (err) {}
  };

  return (
    <div className="bg-card border rounded-3xl p-6 shadow-sm h-[500px] flex flex-col">
       <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map(m => {
             const isMe = m.senderId === userProfile.uid;
             return (
               <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                 <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-xs font-semibold">{m.senderName}</span>
                    <span className="text-[10px] text-muted-foreground">{m.senderRole}</span>
                 </div>
                 <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'}`}>
                   {m.messageText}
                 </div>
                 <span className="text-[10px] text-muted-foreground mt-1">{new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
               </div>
             )
          })}
          {messages.length === 0 && <div className="text-center text-muted-foreground py-10">No messages yet. Start the conversation!</div>}
       </div>
       <form onSubmit={handleSend} className="relative">
          <input 
             type="text"
             value={text}
             onChange={e => setText(e.target.value)}
             placeholder="Type a message..."
             className="w-full bg-muted/50 border rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button type="submit" disabled={!text.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center disabled:opacity-50">
             <Send className="w-4 h-4 ml-0.5" />
          </button>
       </form>
    </div>
  );
}

// Subcomponent stub for Costs
function RepairCostManager({ repair, userRole, userProfile }: { repair: Repair, userRole: string, userProfile: UserProfile }) {
  const [estCost, setEstCost] = useState(repair.EstimatedCost || 0);

  const saveCost = async () => {
    try {
      await updateDoc(doc(db, 'repairs', repair.id!), { EstimatedCost: Number(estCost) });
      alert("Cost Estimate Saved");
    } catch(e) {}
  };

  const submitInvoice = async () => {
    try {
      const amt = Number(window.prompt("Enter invoice amount:"));
      if (!amt) return;
      const invRef = await addDoc(collection(db, 'invoices'), {
         InvoiceNumber: `INV-${Date.now()}`,
         VendorID: userProfile.uid,
         PropertyID: repair.PropertyID,
         RepairID: repair.id,
         Amount: amt,
         DueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
         Status: 'Pending',
         CreatedAt: new Date().toISOString(),
         UpdatedAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'repairs', repair.id!), { InvoiceID: invRef.id, TotalCost: amt });
      alert("Invoice submitted successfully.");
    } catch(e) {
      console.error(e);
      alert("Failed to submit invoice");
    }
  };

  const approveInvoice = async () => {
    if (!repair.InvoiceID || !repair.TotalCost) return;
    try {
      // Create Expense
      const expRef = await addDoc(collection(db, 'expenses'), {
         Title: `Repair Invoice - ${repair.IssueTitle}`,
         Category: 'Repairs & Maintenance',
         PropertyID: repair.PropertyID,
         LandlordID: repair.LandlordID,
         Unit: repair.UnitNumber,
         VendorID: repair.AssignedProviderID,
         InvoiceID: repair.InvoiceID,
         Description: `Auto-generated from repair ticket ${repair.RepairID}`,
         Amount: repair.TotalCost,
         ExpenseDate: new Date().toISOString(),
         Priority: 'High',
         RequiresApproval: false,
         Status: 'Approved',
         CreatedBy: userProfile.uid,
         CreatedAt: new Date().toISOString(),
         UpdatedAt: new Date().toISOString()
      });

      // Create Payable
      await addDoc(collection(db, 'payables'), {
         ExpenseID: expRef.id,
         InvoiceID: repair.InvoiceID,
         VendorID: repair.AssignedProviderID,
         PropertyID: repair.PropertyID,
         Amount: repair.TotalCost,
         DueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
         Status: 'Pending',
         CreatedAt: new Date().toISOString()
      });

      // Update Invoice status
      await updateDoc(doc(db, 'invoices', repair.InvoiceID), {
         Status: 'Approved',
         UpdatedAt: new Date().toISOString()
      });

      // Update Audit
      await addDoc(collection(db, 'auditLogs'), {
         Action: 'Repair Invoice Approved. Expense and Payable created.',
         PerformedBy: userProfile.uid,
         Role: userRole,
         Details: `Invoice ${repair.InvoiceID} for ${repair.TotalCost}`,
         Timestamp: new Date().toISOString()
      });

      alert("Invoice approved. Expense and Payable auto-generated.");
    } catch(e) {
      console.error(e);
      alert("Failed to approve invoice");
    }
  };

  return (
    <div className="bg-card border rounded-3xl p-6 shadow-sm space-y-6">
       <h3 className="text-lg font-semibold border-b pb-2">Financials & Cost</h3>
       
       <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border rounded-xl bg-muted/20">
             <p className="text-xs text-muted-foreground font-medium mb-1">Estimated Cost</p>
             <p className="text-xl font-bold">₦{(repair.EstimatedCost || 0).toLocaleString()}</p>
          </div>
          <div className="p-4 border rounded-xl bg-emerald-50/50">
             <p className="text-xs text-muted-foreground font-medium mb-1">Total Actual Cost</p>
             <p className="text-xl font-bold text-emerald-600">₦{(repair.TotalCost || 0).toLocaleString()}</p>
          </div>
       </div>

       {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && repair.InvoiceID && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3 text-emerald-700">Submitted Invoice: ₦{(repair.TotalCost || 0).toLocaleString()}</h4>
            <Button onClick={approveInvoice} className="bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">Approve Invoice & Auto-Log Expense</Button>
          </div>
       )}

       {userRole === 'Service Provider' && repair.Status === 'Completed' && !repair.InvoiceID && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Submit Invoice</h4>
            <Button onClick={submitInvoice} className="w-full sm:w-auto">Create Final Invoice</Button>
          </div>
       )}

       {['Admin', 'Landlord', 'Property Manager'].includes(userRole) && !repair.InvoiceID && (
         <div className="pt-4 border-t">
           <h4 className="text-sm font-semibold mb-3">Update Cost Estimate</h4>
           <div className="flex gap-3">
              <div className="relative flex-1">
                 <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                 <input 
                   type="number" 
                   value={estCost} 
                   onChange={e => setEstCost(Number(e.target.value))} 
                   className="w-full pl-9 pr-4 py-2 border rounded-xl bg-background"
                   placeholder="Enter Amount"
                 />
              </div>
              <Button onClick={saveCost}>Save</Button>
           </div>
         </div>
       )}
    </div>
  );
}

function RepairRatingModule({ repair, userProfile }: { repair: Repair, userProfile: UserProfile }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, 'repairRatings'), where('repairId', '==', repair.id), where('raterId', '==', userProfile.uid))).then(snap => {
       if (!snap.empty) {
          setSubmitted(true);
          setRating(snap.docs[0].data().rating);
          setComment(snap.docs[0].data().reviewComment);
       }
    });
  }, [repair.id, userProfile.uid]);

  const submitRating = async () => {
    if (rating === 0) return;
    try {
      await addDoc(collection(db, 'repairRatings'), {
        repairId: repair.id,
        providerId: repair.AssignedProviderID,
        raterId: userProfile.uid,
        raterRole: userProfile.role,
        rating,
        reviewComment: comment,
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
    } catch(e) {}
  };

  return (
    <>
      <h3 className="text-lg font-semibold mb-4 border-b pb-2">Rate Service Provider</h3>
      {submitted ? (
        <div className="space-y-3">
           <div className="flex text-amber-500">
             {[1,2,3,4,5].map(star => (
                <svg key={star} className={`w-6 h-6 ${star <= rating ? 'fill-current' : 'text-muted stroke-current fill-none'}`} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
             ))}
           </div>
           {comment && <p className="text-sm text-muted-foreground italic">"{comment}"</p>}
           <p className="text-xs text-emerald-600 font-semibold">Thank you for your feedback!</p>
        </div>
      ) : (
        <div className="space-y-4">
           <div className="flex text-amber-500 cursor-pointer">
             {[1,2,3,4,5].map(star => (
                <svg 
                  key={star} 
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className={`w-8 h-8 transition-colors ${star <= (hoverRating || rating) ? 'fill-current' : 'text-muted stroke-current fill-none hover:text-amber-300'}`} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
             ))}
           </div>
           <textarea 
             value={comment} 
             onChange={e => setComment(e.target.value)} 
             placeholder="Leave a review comment (optional)" 
             className="w-full p-3 rounded-xl border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
             rows={3}
           />
           <Button onClick={submitRating} disabled={rating === 0}>Submit Rating</Button>
        </div>
      )}
    </>
  );
}
