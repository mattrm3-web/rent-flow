import { useState, useEffect, useRef } from 'react';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant, Property } from '../types';
import { CreditCard, Plus, X, Loader2, CheckCircle, XCircle, FileText, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

function PaymentGatewayModal({ isOpen, onClose, amount, currencySymbol, onSuccess, method, tenantId, userProfile }: any) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = async () => {
     setLoading(true);
     try {
       // Create initial Pending payment
       const pRef = await addDoc(collection(db, 'payments'), {
         tenantId,
         amount: parseFloat(amount),
         method,
         status: 'Processing',
         date: new Date().toISOString(),
         createdBy: userProfile?.uid,
         dateCreated: new Date().toISOString()
       });

       // Call simulated webhook endpoint
       await fetch('/api/simulate-payment-success', { method: 'POST' });

       // Webhook verification simulation - mark as Paid
       await updateDoc(doc(db, 'payments', pRef.id), {
         status: 'Paid',
         gatewayReference: `${method.toUpperCase()}_TEST_${Math.floor(Math.random()*1000000)}`,
         transactionId: `TXN_${pRef.id}`,
         verifiedBy: 'WebhookSystem',
         dateVerified: new Date().toISOString()
       });

       onSuccess();
     } catch(e) {
       console.error("Gateway error", e);
     } finally {
       setLoading(false);
     }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border shadow-xl rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
             <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Checkout: {method}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Pay <strong>{currencySymbol}{amount.toLocaleString()}</strong> via {method}.
          </p>
          <button 
             onClick={handleSimulate} 
             disabled={loading}
             className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-4 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
          >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Payment'}
          </button>
          <button onClick={onClose} disabled={loading} className="w-full mt-2 text-sm text-muted-foreground hover:text-foreground">
             Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPaymentModal({ isOpen, onClose, tenants, properties, onSuccess, defaultCur, userRole, userProfile }: any) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState(userRole === 'Tenant' ? 'Stripe' : 'Cash');
  const [refNum, setRefNum] = useState('');
  const [notes, setNotes] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGateway, setShowGateway] = useState(false);

  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  
  const getCurrencySymbol = (tId: string) => {
    if (!tId && userRole === 'Tenant') tId = userProfile?.uid;
    const t = tenants.find((t: any) => t.id === tId || t.AssociatedAuthUid === tId);
    if (!t || !t.PropertyID) return currencyMap[defaultCur] || '$';
    const p = properties.find((p: any) => p.PropertyID === t.PropertyID);
    return currencyMap[p?.currency || defaultCur] || '$';
  };

  const currencySymbol = getCurrencySymbol(tenantId);

  if (!isOpen && !showGateway) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole === 'Tenant') {
      if (method === 'Offline Transfer') {
        // Submit Awaiting Verification
        setLoading(true);
        try {
           await addDoc(collection(db, 'payments'), {
             tenantId: userProfile?.uid,
             amount: parseFloat(amount),
             method: 'Bank Transfer',
             status: 'Awaiting Verification',
             date: new Date().toISOString(),
             referenceNumber: refNum,
             notes,
             proofOfPaymentUrl: proofUrl || 'Uploaded_Proof.pdf',
             createdBy: userProfile?.uid,
             dateCreated: new Date().toISOString()
           });
           onSuccess();
           onClose();
        } catch(e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      } else {
        setShowGateway(true);
      }
    } else {
      // Landlord manual recording
      setLoading(true);
      try {
        await addDoc(collection(db, 'payments'), {
           tenantId,
           amount: parseFloat(amount),
           method,
           status: 'Paid',
           date: new Date().toISOString(),
           referenceNumber: refNum,
           notes,
           createdBy: userProfile?.uid,
           verifiedBy: userProfile?.uid,
           dateCreated: new Date().toISOString(),
           dateVerified: new Date().toISOString()
        });
        onSuccess();
        onClose();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  if (showGateway) {
     return <PaymentGatewayModal isOpen={true} onClose={() => setShowGateway(false)} amount={parseFloat(amount || '0')} currencySymbol={currencySymbol} onSuccess={() => {
        setShowGateway(false);
        onSuccess();
        onClose();
     }} method={method} tenantId={userRole === 'Tenant' ? userProfile?.uid : tenantId} userProfile={userProfile} />;
  }

  const isTenant = userRole === 'Tenant';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border shadow-xl rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{isTenant ? 'Initiate Payment' : 'Record Manual Payment'}</h2>
            <p className="text-sm text-muted-foreground mt-1">{isTenant ? 'Pay rent securely' : 'Log offline cash or bank transfer'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!isTenant && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Tenant</label>
              <select required value={tenantId} onChange={e => setTenantId(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="" disabled>Select a tenant...</option>
                {tenants.map((t: any) => (
                   <option key={t.id} value={t.id}>{t.TenantName} (Rent: {getCurrencySymbol(t.id)}{t.RentAmount})</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Amount</label>
               <input required type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="0.00" />
             </div>
             <div className="space-y-1.5">
               <label className="text-sm font-medium">{isTenant ? 'Payment Method' : 'Manual Method'}</label>
               <select required value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                 {isTenant ? (
                   <>
                     <option value="Stripe">Stripe</option>
                     <option value="Paystack">Paystack</option>
                     <option value="Flutterwave">Flutterwave</option>
                     <option value="Offline Transfer">Offline Transfer</option>
                   </>
                 ) : (
                   <>
                     <option value="Cash">Cash</option>
                     <option value="POS">POS</option>
                     <option value="Bank Transfer">Bank Transfer</option>
                   </>
                 )}
               </select>
             </div>
          </div>

          {(userRole !== 'Tenant' || method === 'Offline Transfer') && (
             <>
               <div className="space-y-1.5">
                 <label className="text-sm font-medium">Reference Number (Optional)</label>
                 <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="Txn ID or Receipt No." />
               </div>
               
               {isTenant && method === 'Offline Transfer' && (
                 <div className="space-y-1.5">
                   <label className="text-sm font-medium">Proof of Payment URL</label>
                   <div className="flex gap-2">
                     <input type="url" value={proofUrl} onChange={e => setProofUrl(e.target.value)} className="flex-1 bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="https://..." />
                     <button type="button" className="p-2 border rounded-xl hover:bg-muted"><Upload className="w-5 h-5"/></button>
                   </div>
                 </div>
               )}

               <div className="space-y-1.5">
                 <label className="text-sm font-medium">Notes</label>
                 <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="Additional details..." />
               </div>
             </>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold hover:bg-muted rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isTenant && method !== 'Offline Transfer' ? 'Proceed to Gateway' : 'Submit Record')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Payments() {
  const { userProfile, userRole } = useFirebase();
  const [payments, setPayments] = useState<any[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const defaultCur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  
  const getCurrencySymbol = (tenantId: string) => {
    const t = tenants.find(t => t.id === tenantId);
    if (!t || !t.PropertyID) return currencyMap[defaultCur] || '$';
    const p = properties.find(p => p.PropertyID === t.PropertyID);
    return currencyMap[p?.currency || defaultCur] || '$';
  };

  const fetchPayments = async () => {
    try {
      if (!userProfile?.uid) return;

      const propSnap = await getDocs(collection(db, 'properties'));
      setProperties(propSnap.docs.map(d => ({...d.data(), PropertyID: d.id}) as Property));

      let tQ;
      if (userRole === 'Landlord' || userRole === 'Admin') {
        tQ = query(collection(db, 'tenants'), where('LandlordID', '==', userRole === 'Admin' ? userProfile.uid : userProfile.uid)); // Simplifying for Admin context
        const tSnap = await getDocs(tQ);
        setTenants(tSnap.docs.map(d => ({id: d.id, ...d.data()}) as Tenant));
      } else if (userRole === 'Tenant') {
        tQ = query(collection(db, 'tenants'), where('AssociatedAuthUid', '==', userProfile.uid));
        const tSnap = await getDocs(tQ);
        setTenants(tSnap.docs.map(d => ({id: d.id, ...d.data()}) as Tenant));
      } else {
        return;
      }

      const tSnap2 = await getDocs(tQ);
      const tList = tSnap2.docs.map(d => ({id: d.id, ...d.data()}) as Tenant);
      if (tList.length === 0) {
         setPayments([]);
         setLoading(false);
         return;
      }

      const chunks = [];
      for (let i = 0; i < tList.length; i += 10) {
         chunks.push(tList.map(t=>t.id).slice(i, i + 10));
      }

      let allPayments: any[] = [];
      for (const chunk of chunks) {
          const pQ = query(collection(db, 'payments'), where('tenantId', 'in', chunk));
          const pSnap = await getDocs(pQ);
          allPayments = [...allPayments, ...pSnap.docs.map(d => ({id: d.id, ...d.data()}))];
      }

      allPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(allPayments);
    } catch (err) {
      console.error("Error fetching payments", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [userProfile, userRole]);

  const verifyPayment = async (paymentId: string, approve: boolean) => {
    try {
       await updateDoc(doc(db, 'payments', paymentId), {
         status: approve ? 'Paid' : 'Failed',
         verifiedBy: userProfile?.uid,
         dateVerified: new Date().toISOString()
       });
       
       if (approve) {
         const p = payments.find(px => px.id === paymentId);
         if (p) {
           await addDoc(collection(db, 'income'), {
             TransactionID: paymentId,
             PropertyID: p.tenantId ? (tenants.find(t=>t.id === p.tenantId)?.PropertyID || '') : '',
             TenantID: p.tenantId,
             Amount: p.amount,
             PaymentMethod: p.method,
             PaymentDate: new Date().toISOString(),
             Status: 'Completed',
             Source: 'Rent',
             CreatedBy: userProfile?.uid,
             CreatedAt: new Date().toISOString()
           });
           
           await addDoc(collection(db, 'auditLogs'), {
              Action: 'Income Created',
              PerformedBy: userProfile?.uid,
              Role: userRole,
              Details: `Payment ${paymentId} verified and logged as Income.`,
              Timestamp: new Date().toISOString()
           });
         }
       }
       
       fetchPayments();
    } catch(e) {
      console.error(e);
    }
  };

  const deletePayment = async (paymentId: string) => {
    if (userRole !== 'Landlord') return;
    if (window.confirm("Are you sure you want to delete this payment record?")) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
        fetchPayments();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptData, setReceiptData] = useState<any>(null);

  const performGenerateReceipt = async (format: 'pdf' | 'jpg') => {
    if (!receiptRef.current || !receiptData) return;
    try {
       const canvas = await html2canvas(receiptRef.current, { scale: 2 });
       if (format === 'jpg') {
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const link = document.createElement('a');
          link.href = imgData;
          link.download = `Receipt_${receiptData.id}.jpg`;
          link.click();
       } else {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
             orientation: 'portrait',
             unit: 'px',
             format: [canvas.width / 2, canvas.height / 2]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
          pdf.save(`Receipt_${receiptData.id}.pdf`);
       }
    } catch(err) {
       console.error("Failed to generate receipt:", err);
    } finally {
       setReceiptData(null); // Clear after printing
    }
  };

  useEffect(() => {
     if (receiptData) {
        // give it a short moment to render
        setTimeout(() => {
           // auto-trigger download dialogs if not needing a popup
        }, 100);
     }
  }, [receiptData]);

  const triggerReceipt = (payment: any, format: 'pdf' | 'jpg') => {
    if (payment.status !== 'Paid') {
       alert("Receipts can only be generated for Paid transactions.");
       return;
    }
    const tenant = tenants.find(t => t.id === payment.tenantId);
    const currSym = getCurrencySymbol(payment.tenantId);
    const prop = properties.find(p => p.PropertyID === tenant?.PropertyID);

    setReceiptData({
      ...payment,
      tenantName: tenant?.TenantName || 'Unknown',
      propertyName: prop?.PropertyName || 'RentFlow Property',
      currencySymbol: currSym
    });
    
    setTimeout(() => {
       performGenerateReceipt(format);
    }, 150); // wait for state to update and render
  };

  if (loading) {
     return (
        <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
     );
  }

  const completedPayments = payments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'Pending' || p.status === 'Processing').reduce((acc, curr) => acc + curr.amount, 0);
  const outstandingBalances = tenants.reduce((acc, t) => {
     const paid = payments.filter(p => p.tenantId === t.id && p.status === 'Paid').reduce((sum, p) => sum + p.amount, 0);
     const expected = (t.RentAmount || 0);
     return acc + Math.max(0, expected - paid);
  }, 0);

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <AddPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tenants={tenants} properties={properties} onSuccess={() => {
         fetchPayments();
      }} defaultCur={defaultCur} userRole={userRole} userProfile={userProfile} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Payments & Revenue</h1>
          <p className="text-body text-muted-foreground">Manage rent payments, verifications, and financial stats.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-[16px] py-[10px] rounded-[12px] font-[600] flex items-center gap-[8px] transition-colors shadow-sm text-btn">
          <Plus className="w-[16px] h-[16px]" />
          {userRole === 'Tenant' ? 'Make Payment' : 'Record Manual Payment'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[32px]">
        <div className="stat-card border-none bg-emerald-500/10">
          <h3 className="text-label text-emerald-800 dark:text-emerald-300 mb-[8px]">Total Revenue (Paid)</h3>
          <p className="text-metric text-emerald-600 dark:text-emerald-400">{currencyMap[defaultCur] || '$'}{completedPayments.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Pending Processing</h3>
          <p className="text-metric text-amber-500">{currencyMap[defaultCur] || '$'}{pendingPayments.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Awaiting Verification</h3>
          <p className="text-metric font-medium">{payments.filter(p=>p.status === 'Awaiting Verification').length} payments</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Total Outstanding</h3>
          <p className="text-metric text-rose-500">{currencyMap[defaultCur] || '$'}{outstandingBalances.toLocaleString()}</p>
        </div>
      </div>

      <div className="dense-card mb-[32px]">
         <h2 className="text-h3 mb-[24px]">Payment Audit Ledger</h2>
         <div className="overflow-x-auto">
           <table className="w-full text-[14px] text-left">
             <thead className="text-[12px] text-muted-foreground uppercase bg-muted/20 border-b">
               <tr>
                 <th className="px-[16px] py-[12px] font-[600]">Date</th>
                 {userRole !== 'Tenant' && <th className="px-[16px] py-[12px] font-[600]">Tenant</th>}
                 <th className="px-[16px] py-[12px] font-[600]">Amount</th>
                 <th className="px-[16px] py-[12px] font-[600]">Method / Ref</th>
                 <th className="px-[16px] py-[12px] font-[600]">Status</th>
                 <th className="px-[16px] py-[12px] font-[600] text-right">Action</th>
               </tr>
             </thead>
             <tbody>
               {payments.length === 0 ? (
                 <tr>
                   <td colSpan={6} className="px-[16px] py-[32px] text-center text-muted-foreground text-body">No payments found.</td>
                 </tr>
               ) : payments.map(p => {
                 const t = tenants.find(t => t.id === p.tenantId);
                 const statusColors: any = {
                    'Paid': 'bg-emerald-500/10 text-emerald-600',
                    'Pending': 'bg-amber-500/10 text-amber-600',
                    'Processing': 'bg-blue-500/10 text-blue-600',
                    'Failed': 'bg-rose-500/10 text-rose-600',
                    'Awaiting Verification': 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                 };
                 return (
                   <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                     <td className="px-[16px] py-[12px]">
                        <div className="font-medium">{new Date(p.date).toLocaleDateString()}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">ID: {p.id.slice(-6)}</div>
                     </td>
                     {userRole !== 'Tenant' && <td className="px-[16px] py-[12px] font-[600]">{t?.TenantName || 'Unknown'}</td>}
                     <td className="px-[16px] py-[12px] font-[800]">{getCurrencySymbol(p.tenantId)}{p.amount.toLocaleString()}</td>
                     <td className="px-[16px] py-[12px]">
                        <div className="flex items-center gap-1.5 font-medium">{p.method}</div>
                        {(p.gatewayReference || p.referenceNumber) && (
                           <div className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[120px]" title={p.gatewayReference || p.referenceNumber}>Ref: {p.gatewayReference || p.referenceNumber}</div>
                        )}
                     </td>
                     <td className="px-[16px] py-[12px]">
                       <span className={`inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full text-[10px] font-[800] uppercase tracking-wider ${statusColors[p.status] || 'bg-muted'}`}>
                         {p.status}
                       </span>
                     </td>
                     <td className="px-[16px] py-[12px] text-right">
                       <div className="flex items-center justify-end gap-2">
                         {userRole !== 'Tenant' && p.status === 'Awaiting Verification' && (
                           <>
                             <button onClick={() => verifyPayment(p.id, true)} className="p-[6px] hover:bg-emerald-500/10 rounded-[8px] text-emerald-600 transition-colors" title="Approve">
                               <CheckCircle className="w-4 h-4" />
                             </button>
                             <button onClick={() => verifyPayment(p.id, false)} className="p-[6px] hover:bg-rose-500/10 rounded-[8px] text-rose-600 transition-colors" title="Reject">
                               <XCircle className="w-4 h-4" />
                             </button>
                             {p.proofOfPaymentUrl && (
                                <a href={p.proofOfPaymentUrl} target="_blank" rel="noreferrer" className="p-[6px] hover:bg-muted rounded-[8px] text-muted-foreground transition-colors" title="View Proof">
                                   <FileText className="w-4 h-4" />
                                </a>
                             )}
                           </>
                         )}
                         {p.status === 'Paid' && (
                            <div className="flex items-center gap-1">
                               <button onClick={() => triggerReceipt(p, 'pdf')} className="p-[6px] border hover:bg-muted rounded-[8px] text-primary font-[600] text-[12px] transition-colors flex items-center justify-center" title="Save PDF Receipt">
                                 <FileText className="w-[12px] h-[12px]" />
                               </button>
                               <button onClick={() => triggerReceipt(p, 'jpg')} className="p-[6px] border hover:bg-muted rounded-[8px] text-primary font-[600] text-[12px] transition-colors flex items-center justify-center" title="Save JPG Receipt">
                                 <ImageIcon className="w-[12px] h-[12px]" />
                               </button>
                            </div>
                         )}
                         {userRole === 'Landlord' && (
                            <button onClick={() => deletePayment(p.id)} className="p-[6px] hover:bg-rose-500/10 rounded-[8px] text-rose-600 transition-colors" title="Delete record">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         )}
                       </div>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
      </div>

      {receiptData && (
         <div className="fixed top-[-9999px] left-[-9999px]">
            <div ref={receiptRef} className="w-[600px] bg-white p-12 text-black font-sans border-2 border-emerald-500 shadow-xl">
               <div className="text-center mb-8 border-b-2 border-emerald-500 pb-6">
                  <h1 className="text-2xl font-bold bg-emerald-500 text-white inline-block px-6 py-2 rounded-full tracking-wide">CONFIRMED PAYMENT</h1>
                  <h2 className="text-xl font-semibold text-emerald-800 mt-4">{receiptData.propertyName}</h2>
                  <p className="text-gray-500 mt-1">Receipt ID: {receiptData.id}</p>
               </div>
               
               <div className="grid grid-cols-2 gap-8 mb-8 text-lg">
                  <div>
                     <p className="text-sm text-gray-500 font-semibold mb-1">DATE PAID</p>
                     <p className="font-medium text-gray-800">{new Date(receiptData.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-semibold mb-1">TENANT</p>
                     <p className="font-medium text-gray-800">{receiptData.tenantName}</p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-semibold mb-1">PAYMENT METHOD</p>
                     <p className="font-medium text-gray-800">{receiptData.method}</p>
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-semibold mb-1">REFERENCE</p>
                     <p className="font-medium text-gray-800 text-sm">{receiptData.gatewayReference || receiptData.referenceNumber || 'N/A'}</p>
                  </div>
               </div>

               <div className="bg-gray-50 rounded-lg p-6 flex justify-between items-center text-xl font-bold border border-gray-200">
                   <span className="text-gray-500">TOTAL PAID</span>
                   <span className="text-emerald-600 text-3xl">{receiptData.currencySymbol}{receiptData.amount.toLocaleString()}</span>
               </div>

               <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500 flex flex-col items-center">
                  <p>Thank you for your timely payment.</p>
                  <p className="mt-1 font-medium">RentFlow Pro Automated Receipt</p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
