import React, { useState, useEffect } from 'react';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Expense, Vendor, Payment, Property } from '../types';
import { FinanceDashboard } from './FinanceModule/FinanceDashboard';
import { ExpenseList } from './FinanceModule/ExpenseList';
import { CreateExpense } from './FinanceModule/CreateExpense';
import { VendorList } from './FinanceModule/VendorList';
import { Button } from './ui/button';
import { LayoutDashboard, Receipt, Users, FileText } from 'lucide-react';
import { OwnerStatements } from './FinanceModule/OwnerStatements';

export default function Finance() {
  const { userRole, userProfile } = useFirebase();
  const [view, setView] = useState<'dashboard' | 'expenses' | 'create_expense' | 'vendors' | 'receivables' | 'payables' | 'reports'>('dashboard');
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const landlordId = userRole === 'Landlord' ? userProfile.uid : userProfile.landlordId || userProfile.uid;

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), where('LandlordID', '==', landlordId)), (snap) => {
      setExpenses(snap.docs.map(d => ({id: d.id, ...d.data()})) as Expense[]);
    });

    let liveVendors: any[] = [];
    let liveProviders: any[] = [];

    const mergeVendors = () => {
      const unified: Vendor[] = [
        ...liveVendors,
        ...liveProviders.map(p => ({
          id: p.id,
          uid: p.uid,
          VendorName: p.businessName || p.ownerName,
          ServiceCategory: p.serviceCategory,
          ContactNumber: p.phoneNumber,
          Email: p.email,
          Address: p.businessAddress,
          Rating: p.averageRating || 5,
          TotalJobsCompleted: p.totalJobsCompleted || 0,
          TotalPaymentsReceived: p.totalPaymentsReceived || 0,
          CreatedAt: p.createdAt || new Date().toISOString(),
          Type: 'Internal' as const
        }))
      ];
      setVendors(unified);
    };

    const unsubVendors = onSnapshot(query(collection(db, 'vendors'), where('LandlordID', '==', landlordId)), (snap) => {
      liveVendors = snap.docs.map(d => ({id: d.id, ...d.data(), Type: 'External'}));
      mergeVendors();
    });

    // global verified service providers can be used as internal vendors
    const unsubProviders = onSnapshot(query(collection(db, 'serviceProviders'), where('verificationStatus', '==', 'Verified')), (snap) => {
      liveProviders = snap.docs.map(d => ({id: d.id, ...d.data()}));
      mergeVendors();
    });

    const fetchOtherData = async () => {
       const payQ = query(collection(db, 'payments'), where('landlordId', '==', landlordId));
       const propQ = query(collection(db, 'properties'), where('LandlordID', '==', landlordId));
       
       const [paySnap, propSnap] = await Promise.all([getDocs(payQ), getDocs(propQ)]);
       setPayments(paySnap.docs.map(d => ({id: d.id, ...d.data()})) as Payment[]);
       setProperties(propSnap.docs.map(d => ({id: d.id, ...d.data()})) as Property[]);
       setLoading(false);
    };
    fetchOtherData();

    return () => {
      unsubExpenses();
      unsubVendors();
      unsubProviders();
    };
  }, [userProfile, userRole]);

  if (loading) {
    return <div className="p-8 flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto min-h-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Accounting</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage revenue, expenses, vendors, and profitability</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex w-full overflow-x-auto gap-2 p-1 bg-muted/50 rounded-xl">
        <button onClick={()=>setView('dashboard')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${view==='dashboard' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </button>
        <button onClick={()=>setView('expenses')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${['expenses', 'create_expense'].includes(view) ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>
          <Receipt className="w-4 h-4" /> Expenses
        </button>
        <button onClick={()=>setView('vendors')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${view==='vendors' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>
          <Users className="w-4 h-4" /> Vendors
        </button>
        <button onClick={()=>setView('reports')} className={`flex items-center gap-2 flex-1 min-w-[120px] py-2.5 px-4 text-sm font-semibold rounded-lg transition-all ${view==='reports' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/80'}`}>
          <FileText className="w-4 h-4" /> Reports
        </button>
      </div>

      <div className="mt-6">
        {view === 'dashboard' && <FinanceDashboard expenses={expenses} payments={payments} properties={properties} userProfile={userProfile!} userRole={userRole!} />}
        {view === 'expenses' && <ExpenseList expenses={expenses} vendors={vendors} properties={properties} onCreateNew={() => setView('create_expense')} userProfile={userProfile!} userRole={userRole!} />}
        {view === 'create_expense' && <CreateExpense properties={properties} vendors={vendors} userProfile={userProfile!} userRole={userRole!} onBack={() => setView('expenses')} />}
        {view === 'vendors' && <VendorList vendors={vendors} userProfile={userProfile!} userRole={userRole!} />}
        {view === 'reports' && <OwnerStatements expenses={expenses} payments={payments} properties={properties} userProfile={userProfile!} />}
      </div>
    </div>
  );
}
