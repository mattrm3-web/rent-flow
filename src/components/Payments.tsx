import { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Tenant } from '../types';
import { Download, CreditCard, Plus, X, Loader2 } from 'lucide-react';

function PaymentGatewayModal({ isOpen, onClose, amount, currencySymbol, onSuccess, method }: { isOpen: boolean, onClose: () => void, amount: number, currencySymbol: string, onSuccess: () => void, method: string }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulate = () => {
     setLoading(true);
     setTimeout(() => {
        setLoading(false);
        onSuccess();
     }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border shadow-xl rounded-3xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-500">
             <CreditCard className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold mb-2">Simulating {method}</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You are about to transfer <strong>{currencySymbol}{amount.toLocaleString()}</strong> via {method}.
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

function AddPaymentModal({ isOpen, onClose, tenants, onSuccess, cur }: { isOpen: boolean, onClose: () => void, tenants: Tenant[], onSuccess: () => void, cur: string }) {
  const [tenantId, setTenantId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Stripe');
  const [loading, setLoading] = useState(false);
  const [showGateway, setShowGateway] = useState(false);

  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  const currencySymbol = currencyMap[cur] || '$';

  if (!isOpen && !showGateway) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowGateway(true);
  };

  const finalizePayment = async () => {
    try {
      setShowGateway(false);
      setLoading(true);
      await addDoc(collection(db, 'payments'), {
         tenantId,
         amount: parseFloat(amount),
         method,
         status: 'Completed',
         date: new Date().toISOString()
      });
      onSuccess();
      onClose();
      setTenantId('');
      setAmount('');
    } catch (e) {
      console.error(e);
      alert('Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (showGateway) {
     return <PaymentGatewayModal isOpen={true} onClose={() => setShowGateway(false)} amount={parseFloat(amount || '0')} currencySymbol={currencySymbol} onSuccess={finalizePayment} method={method} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border shadow-xl rounded-3xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Record Payment</h2>
            <p className="text-sm text-muted-foreground mt-1">Make a new rent payment</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tenant</label>
            <select required value={tenantId} onChange={e => setTenantId(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
              <option value="" disabled>Select a tenant...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.TenantName} (Rent: {currencySymbol}{t.RentAmount})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Amount</label>
               <input required type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="0.00" />
             </div>
             <div className="space-y-1.5">
               <label className="text-sm font-medium">Payment Gateway</label>
               <select required value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                 <option value="Stripe">Stripe</option>
                 <option value="Paystack">Paystack</option>
                 <option value="Flutterwave">Flutterwave</option>
                 <option value="Local Bank Transfer">Local Bank Transfer</option>
               </select>
             </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold hover:bg-muted rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Proceed to Gateway'}
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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  const currencySymbol = currencyMap[cur] || '$';

  const fetchPayments = async () => {
    try {
      if (!userProfile?.uid) return;
      let tQ;
      if (userRole === 'Landlord') {
        tQ = query(collection(db, 'tenants'), where('LandlordID', '==', userProfile.uid));
        const tSnap = await getDocs(tQ);
        setTenants(tSnap.docs.map(d => ({id: d.id, ...d.data()}) as Tenant));
      } else if (userRole === 'Tenant') {
        tQ = query(collection(db, 'tenants'), where('AssociatedAuthUid', '==', userProfile.uid));
        const tSnap = await getDocs(tQ);
        setTenants(tSnap.docs.map(d => ({id: d.id, ...d.data()}) as Tenant));
      } else {
        return;
      }

      // Instead of getting tenants first then querying payments strictly grouped,
      // For landlord, we can get ALL landlord's payments if we linked properly.
      // But we just use tenant IDs with batches:
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

  const generateReceipt = (payment: any) => {
    const tenant = tenants.find(t => t.id === payment.tenantId);
    
    const receiptContent = `
RENTFLOW PRO - PAYMENT RECEIPT
------------------------------
Receipt ID: ${payment.id}
Date: ${new Date(payment.date).toLocaleDateString()}
      
Tenant: ${tenant?.TenantName || 'Unknown'}
Amount Paid: ${currencySymbol}${payment.amount}
Method: ${payment.method}
      
Status: ${payment.status}
------------------------------
Thank you for your payment!
    `;
    
    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${payment.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
     return (
        <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
     );
  }

  const completedPayments = payments.filter(p => p.status === 'Completed').reduce((acc, curr) => acc + curr.amount, 0);
  const pendingPayments = payments.filter(p => p.status === 'Pending').reduce((acc, curr) => acc + curr.amount, 0);
  const outstandingBalances = tenants.reduce((acc, t) => {
     const paid = payments.filter(p => p.tenantId === t.id && p.status === 'Completed').reduce((sum, p) => sum + p.amount, 0);
     const expected = (t.RentAmount || 0);
     return acc + Math.max(0, expected - paid);
  }, 0);

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <AddPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tenants={tenants} onSuccess={() => {
         fetchPayments();
      }} cur={cur} />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Payments & Revenue</h1>
          <p className="text-body text-muted-foreground">Manage rent payments, receipts, and view financial stats.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-[16px] py-[10px] rounded-[12px] font-[600] flex items-center gap-[8px] transition-colors shadow-sm text-btn">
          <Plus className="w-[16px] h-[16px]" />
          Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[32px]">
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Total Revenue</h3>
          <p className="text-metric text-emerald-600">{currencySymbol}{completedPayments.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Pending Processing</h3>
          <p className="text-metric text-amber-500">{currencySymbol}{pendingPayments.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Total Outstanding</h3>
          <p className="text-metric text-rose-500">{currencySymbol}{outstandingBalances.toLocaleString()}</p>
        </div>
      </div>

      <div className="dense-card mb-[32px]">
         <h2 className="text-h3 mb-[24px]">Payment History</h2>
         <div className="overflow-x-auto">
           <table className="w-full text-[14px] text-left">
             <thead className="text-[12px] text-muted-foreground uppercase bg-muted/20 border-b">
               <tr>
                 <th className="px-[16px] py-[12px] font-[600]">Date</th>
                 {userRole !== 'Tenant' && <th className="px-[16px] py-[12px] font-[600]">Tenant</th>}
                 <th className="px-[16px] py-[12px] font-[600]">Amount</th>
                 <th className="px-[16px] py-[12px] font-[600]">Method</th>
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
                 return (
                   <tr key={p.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                     <td className="px-[16px] py-[12px]">{new Date(p.date).toLocaleDateString()}</td>
                     {userRole !== 'Tenant' && <td className="px-[16px] py-[12px] font-[600]">{t?.TenantName || 'Unknown'}</td>}
                     <td className="px-[16px] py-[12px] font-[800]">{currencySymbol}{p.amount.toLocaleString()}</td>
                     <td className="px-[16px] py-[12px]">{p.method}</td>
                     <td className="px-[16px] py-[12px]">
                       <span className={`inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full text-[10px] font-[800] uppercase tracking-wider
                         ${p.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' : 
                            p.status === 'Pending' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}
                       `}>
                         {p.status}
                       </span>
                     </td>
                     <td className="px-[16px] py-[12px] text-right">
                       {p.status === 'Completed' && (
                          <button onClick={() => generateReceipt(p)} className="p-[8px] border hover:bg-muted rounded-[12px] text-primary font-[600] text-[12px] transition-colors flex items-center justify-center gap-[4px] ml-auto" title="Generate Receipt">
                            <Download className="w-[12px] h-[12px]" /> Receipt
                          </button>
                       )}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
}
