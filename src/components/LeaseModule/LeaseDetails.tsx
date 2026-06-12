import React, { useState, useRef } from 'react';
import { Lease, UserProfile } from '../../types';
import { ArrowLeft, Edit, FileText, Download, UserCheck, KeySquare, CalendarClock, History, Check, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import SignatureCanvas from 'react-signature-canvas';

export function LeaseDetails({ lease, userRole, userProfile, onBack }: { lease: Lease, userRole: string, userProfile: UserProfile, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'document' | 'signatures' | 'history'>('overview');
  const [loading, setLoading] = useState(false);
  
  const signPadRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const calculateDaysRemaining = () => {
     const end = new Date(lease.EndDate).getTime();
     const now = new Date().getTime();
     const diff = Math.ceil((end - now) / (1000 * 3600 * 24));
     return diff;
  };

  const daysRem = calculateDaysRemaining();

  const handleUpdateStatus = async (s: string) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'leases', lease.id!), { Status: s, UpdatedAt: new Date().toISOString() });
      if (s === 'Expired' || s === 'Terminated') {
         // Auto update property status to vacant
         await updateDoc(doc(db, 'properties', lease.PropertyID), { status: 'Vacant' });
      }
      await addDoc(collection(db, 'leaseAuditLogs'), {
         LeaseID: lease.id,
         Action: `Status changed to ${s}`,
         PerformedBy: userProfile.uid,
         Role: userRole,
         Details: '',
         Timestamp: new Date().toISOString()
      });
    } catch(err) {
      console.error(err);
      alert('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const saveSignature = async () => {
    if (signPadRef.current?.isEmpty()) {
       alert("Please provide a signature first.");
       return;
    }
    const dataUrl = signPadRef.current?.getTrimmedCanvas().toDataURL('image/png');
    if (!dataUrl) return;

    setLoading(true);
    try {
      const isTenant = userRole === 'Tenant';
      const isLandlord = ['Landlord', 'Property Manager'].includes(userRole);
      const updates: any = { UpdatedAt: new Date().toISOString() };
      
      let actionStr = "";
      if (isTenant) {
        updates.TenantSignature = dataUrl;
        updates.TenantSignatureDate = new Date().toISOString();
        actionStr = "Tenant signed the lease";
      } else if (isLandlord) {
        updates.LandlordSignature = dataUrl;
        updates.LandlordSignatureDate = new Date().toISOString();
        actionStr = "Landlord signed the lease";
      }

      await updateDoc(doc(db, 'leases', lease.id!), updates);
      await addDoc(collection(db, 'leaseAuditLogs'), {
         LeaseID: lease.id,
         Action: actionStr,
         PerformedBy: userProfile.uid,
         Role: userRole,
         Details: '',
         Timestamp: new Date().toISOString()
      });
      alert("Signature saved successfully!");
    } catch (e) {
       console.error(e);
       alert("Failed to save signature");
    } finally {
       setLoading(false);
    }
  };

  const clearSignature = () => {
    signPadRef.current?.clear();
  };

  // Mock PDF Generation
  const generatePDF = () => {
     alert("Digital PDF Generation triggered. Opening professional print view...");
     window.print();
  };

  const renderOverview = () => (
    <div className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
             <div className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2"><KeySquare className="w-5 h-5" /> Lease Terms</h3>
                <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div><p className="text-muted-foreground">Start Date</p><p className="font-semibold">{new Date(lease.StartDate).toLocaleDateString()}</p></div>
                  <div><p className="text-muted-foreground">End Date</p><p className="font-semibold">{new Date(lease.EndDate).toLocaleDateString()}</p></div>
                  <div><p className="text-muted-foreground">Rent Amount</p><p className="font-semibold">{lease.RentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-muted-foreground">Frequency</p><p className="font-semibold">{lease.PaymentFrequency}</p></div>
                  <div><p className="text-muted-foreground">Security Deposit</p><p className="font-semibold">{lease.SecurityDeposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-muted-foreground">Late Fee</p><p className="font-semibold">{lease.LateFee ? lease.LateFee.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'None'}</p></div>
                </div>
             </div>

             <div className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2"><CalendarClock className="w-5 h-5" /> Timeline Status</h3>
                
                {daysRem > 0 ? (
                  <div className="p-4 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-xl">
                     <p className="font-medium">Active Lease Time</p>
                     <p className="text-sm mt-1">There are {daysRem} days remaining on this agreement.</p>
                  </div>
                ) : daysRem === 0 ? (
                  <div className="p-4 bg-amber-50 text-amber-900 border border-amber-100 rounded-xl">
                     <p className="font-medium">Lease Expiring Today</p>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 text-rose-900 border border-rose-100 rounded-xl">
                     <p className="font-medium">Lease Expired</p>
                     <p className="text-sm mt-1">This lease expired {Math.abs(daysRem)} days ago.</p>
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-6">
             <div className="bg-card border rounded-3xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2"><ShieldCheck className="w-5 h-5" /> Signatures</h3>
                <div className="space-y-4">
                   <div className={`p-3 rounded-lg border ${lease.LandlordSignature ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/50 border-dashed'}`}>
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-sm font-medium">Landlord</span>
                         {lease.LandlordSignature ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-muted-foreground">Pending</span>}
                      </div>
                      {lease.LandlordSignatureDate && <p className="text-xs text-muted-foreground">{new Date(lease.LandlordSignatureDate).toLocaleDateString()}</p>}
                   </div>
                   <div className={`p-3 rounded-lg border ${lease.TenantSignature ? 'bg-emerald-50/50 border-emerald-100' : 'bg-muted/50 border-dashed'}`}>
                      <div className="flex items-center justify-between mb-1">
                         <span className="text-sm font-medium">Tenant</span>
                         {lease.TenantSignature ? <Check className="w-4 h-4 text-emerald-500" /> : <span className="text-xs text-muted-foreground">Pending</span>}
                      </div>
                      {lease.TenantSignatureDate && <p className="text-xs text-muted-foreground">{new Date(lease.TenantSignatureDate).toLocaleDateString()}</p>}
                   </div>
                </div>
                
                {['Pending Signature', 'Draft'].includes(lease.Status) && ['Admin', 'Landlord', 'Property Manager'].includes(userRole) && (
                   <Button disabled={loading} onClick={() => handleUpdateStatus('Active')} className="w-full mt-6 bg-primary">
                      Force Activate
                   </Button>
                )}
             </div>
          </div>
       </div>
    </div>
  );

  const renderDocumentView = () => (
    <div className="bg-white text-black p-8 md:p-12 border rounded-xl shadow-lg max-w-4xl mx-auto printable-lease">
       <div className="text-center border-b pb-6 mb-6">
          <h1 className="text-3xl font-serif font-bold uppercase tracking-widest">Tenancy Agreement</h1>
          <p className="text-sm mt-2 text-gray-500">Document Ref: {lease.LeaseNumber} | Gen: {new Date().toISOString().split('T')[0]}</p>
       </div>
       
       <div className="space-y-6 text-sm font-serif leading-relaxed">
         <p>This Tenancy Agreement is entered into on <strong>{new Date(lease.StartDate).toLocaleDateString()}</strong>, by and between the Landlord and the Tenant.</p>

         <div>
           <h3 className="font-bold uppercase tracking-wider text-sm mb-2 border-b pb-1">1. Property Subject to Lease</h3>
           <p>The Landlord agrees to lease to the Tenant the premises situated at Unit <strong>{lease.Unit}</strong>. The property shall be used exclusively for <strong>{lease.LeaseType}</strong> purposes.</p>
         </div>

         <div>
           <h3 className="font-bold uppercase tracking-wider text-sm mb-2 border-b pb-1">2. Term of Lease</h3>
           <p>The term of this Lease shall be for a period beginning on <strong>{new Date(lease.StartDate).toLocaleDateString()}</strong> and ending on <strong>{new Date(lease.EndDate).toLocaleDateString()}</strong>.</p>
         </div>

         <div>
           <h3 className="font-bold uppercase tracking-wider text-sm mb-2 border-b pb-1">3. Rent & Payments</h3>
           <p>Tenant agrees to pay the Landlord a base rent of <strong>{lease.RentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> payable <strong>{lease.PaymentFrequency.toLowerCase()}</strong> in advance. A security deposit of <strong>{lease.SecurityDeposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> shall be held by the Landlord.</p>
         </div>

         {lease.AdditionalTerms && (
           <div>
             <h3 className="font-bold uppercase tracking-wider text-sm mb-2 border-b pb-1">4. Additional Terms & Conditions</h3>
             <p className="whitespace-pre-wrap">{lease.AdditionalTerms}</p>
           </div>
         )}
         
         <div className="mt-12 pt-12 border-t grid grid-cols-2 gap-12">
            <div>
               <p className="font-bold mb-8">Landlord Signature</p>
               {lease.LandlordSignature ? (
                 <img src={lease.LandlordSignature} className="h-16 object-contain border-b border-black w-full" alt="signature" />
               ) : (
                 <div className="border-b border-black h-16 w-full"></div>
               )}
               <p className="text-xs mt-2 text-gray-500">Date: {lease.LandlordSignatureDate ? new Date(lease.LandlordSignatureDate).toLocaleDateString() : '____/____/______'}</p>
            </div>
            <div>
               <p className="font-bold mb-8">Tenant Signature</p>
               {lease.TenantSignature ? (
                 <img src={lease.TenantSignature} className="h-16 object-contain border-b border-black w-full" alt="signature" />
               ) : (
                 <div className="border-b border-black h-16 w-full"></div>
               )}
               <p className="text-xs mt-2 text-gray-500">Date: {lease.TenantSignatureDate ? new Date(lease.TenantSignatureDate).toLocaleDateString() : '____/____/______'}</p>
            </div>
         </div>
       </div>
    </div>
  );

  const renderSignatures = () => {
    const isTenant = userRole === 'Tenant';
    const isLandlord = ['Landlord', 'Property Manager'].includes(userRole);
    const hasSigned = (isTenant && lease.TenantSignature) || (isLandlord && lease.LandlordSignature);

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {hasSigned ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 text-center text-emerald-900">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Signature Recorded</h2>
            <p className="text-sm">Your digital signature for this lease has been securely recorded and timestamped.</p>
          </div>
        ) : (
          <div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-center">Digitally Sign Lease</h3>
            <p className="text-sm text-center text-muted-foreground mb-8">By signing below, you acknowledge and agree to the terms explicitly set out in the digital lease document.</p>
            
            <div className="border-2 border-dashed bg-white rounded-xl overflow-hidden mb-4">
               <SignatureCanvas 
                  ref={signPadRef} 
                  penColor="black" 
                  canvasProps={{className: "sigCanvas w-full h-[200px]"}} 
               />
            </div>
            
            <div className="flex gap-4">
              <Button onClick={clearSignature} variant="outline" className="flex-1">Clear</Button>
              <Button onClick={saveSignature} disabled={loading} className="flex-1 bg-primary text-primary-foreground">Confirm Signature</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 border rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-muted rounded-full transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{lease.LeaseNumber}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full bg-primary/10 text-primary`}>{lease.Status}</span>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">Created {new Date(lease.CreatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
           <Button variant="outline" onClick={generatePDF} className="gap-2">
              <Download className="w-4 h-4" /> Download PDF
           </Button>
           {userRole === 'Tenant' && !lease.TenantSignature && (
              <Button onClick={() => setActiveTab('signatures')} className="gap-2 bg-primary">
                Sign Lease
              </Button>
           )}
           {['Landlord', 'Property Manager'].includes(userRole) && !lease.LandlordSignature && (
              <Button onClick={() => setActiveTab('signatures')} className="gap-2 bg-primary">
                Sign Lease
              </Button>
           )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex w-full overflow-x-auto gap-2 p-1 bg-muted/50 rounded-xl">
        <button onClick={()=>setActiveTab('overview')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${activeTab==='overview' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>Overview</button>
        <button onClick={()=>setActiveTab('document')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${activeTab==='document' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>Digital Doc</button>
        <button onClick={()=>setActiveTab('signatures')} className={`flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${activeTab==='signatures' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>Signatures</button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
         {activeTab === 'overview' && renderOverview()}
         {activeTab === 'document' && renderDocumentView()}
         {activeTab === 'signatures' && renderSignatures()}
      </div>
      
    </div>
  );
}
