import { BrowserRouter, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, Users, Settings, LogOut, Sun, Moon, Shield, Bell, CreditCard, Wrench, AlertCircle, CheckCircle2, XCircle, MessageSquare, Mail, Home, FileText, Search } from 'lucide-react';
import { useFirebase } from './components/FirebaseProvider';
import { useState, useEffect, lazy, Suspense } from 'react';
import { updatePassword, deleteUser } from 'firebase/auth';
import { doc, updateDoc, setDoc, addDoc, collection, query, where, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Property } from './types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { filteredCountryCodes } from './lib/countryCodes';



const Login = lazy(() => import('./components/Login'));
const Properties = lazy(() => import('./components/Properties'));
const Tenants = lazy(() => import('./components/Tenants'));
const Staff = lazy(() => import('./components/Staff'));
const Payments = lazy(() => import('./components/Payments'));
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const Repairs = lazy(() => import('./components/Repairs'));
const Leases = lazy(() => import('./components/Leases'));
const Finance = lazy(() => import('./components/Finance'));
const Messages = lazy(() => import('./components/Messages'));
const SecurityDashboard = lazy(() => import('./components/SecurityDashboard'));
const VacanciesAdmin = lazy(() => import('./components/ListingsModule/VacanciesAdmin'));
const PublicMarketplace = lazy(() => import('./components/ListingsModule/PublicMarketplace'));

const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ProfileCompletion = lazy(() => import('./components/ProfileCompletion'));

function ManagerDashboard() {
  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-[32px]">
        <h1 className="text-h1 mb-[4px]">Manager Dashboard</h1>
        <p className="text-body text-muted-foreground">Manage your assigned properties.</p>
      </div>
    </div>
  );
}

function AgencyDashboard() {
  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-[32px]">
        <h1 className="text-h1 mb-[4px]">Agency Dashboard</h1>
        <p className="text-body text-muted-foreground">Manage your listings.</p>
      </div>
    </div>
  );
}

function DeveloperDashboard() {
  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-[32px]">
        <h1 className="text-h1 mb-[4px]">Developer Dashboard</h1>
        <p className="text-body text-muted-foreground">Manage your development projects.</p>
      </div>
    </div>
  );
}

function TenantDashboard() {
  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-[32px]">
        <h1 className="text-h1 mb-[4px]">Tenant Dashboard</h1>
        <p className="text-body text-muted-foreground">Manage your lease, payments, and discover services.</p>
      </div>

      <div className="dense-card mb-[32px]">
        <div className="flex justify-between items-center mb-[24px]">
          <h2 className="text-h3">Quick Services</h2>
          <Link to="/marketplace" className="text-[12px] font-[600] text-primary hover:underline">View All Providers &rarr;</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[16px]">
          <Link to="/marketplace" className="p-[16px] rounded-[16px] border border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-amber-500/10 text-amber-600 flex justify-center items-center mb-[12px]">
              <Sun className="w-[24px] h-[24px]" /> 
            </div>
            <span className="text-[13px] font-[600]">Electrician</span>
          </Link>
          <Link to="/marketplace" className="p-[16px] rounded-[16px] border border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-blue-500/10 text-blue-600 flex justify-center items-center mb-[12px]">
              <Sun className="w-[24px] h-[24px]" /> 
            </div>
            <span className="text-[13px] font-[600]">Plumbing</span>
          </Link>
          <Link to="/leases" className="p-[16px] rounded-[16px] border border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-emerald-500/10 text-emerald-600 flex justify-center items-center mb-[12px]">
              <FileText className="w-[24px] h-[24px]" /> 
            </div>
            <span className="text-[13px] font-[600]">My Lease</span>
          </Link>
          <Link to="/marketplace" className="p-[16px] rounded-[16px] border border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-all text-center flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-rose-500/10 text-rose-600 flex justify-center items-center mb-[12px]">
              <AlertCircle className="w-[24px] h-[24px]" /> 
            </div>
            <span className="text-[13px] font-[600] text-rose-600">Emergency Repair</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function RoleBasedRedirect() {
  const { userRole, logout } = useFirebase();
  
  if (userRole === 'Admin') return <Navigate to="/admin" replace />;
  if (userRole === 'Security Staff') return <Navigate to="/security" replace />;
  if (userRole === 'Tenant') return <Navigate to="/tenant" replace />;
  if (userRole === 'Landlord') return <Navigate to="/dashboard" replace />;
  if (userRole === 'Property Manager') return <Navigate to="/manager" replace />;
  if (userRole === 'Service Provider') return <Navigate to="/provider" replace />;
  if (userRole === 'Property Seeker') return <Navigate to="/portal" replace />;
  if (userRole === 'Agency') return <Navigate to="/agency" replace />;
  if (userRole === 'Developer') return <Navigate to="/developer" replace />;
  
  return (
    <div className="flex-1 p-6 flex flex-col items-center justify-center">
      <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
      <p className="text-muted-foreground mt-2 text-center text-sm md:text-base">Your user role ({userRole || 'None'}) is not authorized to view this page or your profile is incomplete.</p>
      <div className="mt-8">
        <button onClick={() => { logout(); window.location.href = '/login'; }} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:opacity-90">
          Sign Out & Return to Login
        </button>
      </div>
    </div>
  );
}

function RequireRole({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) {
  const { userRole, isLoading, logout } = useFirebase();
  if (isLoading) return null;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="text-muted-foreground mt-2 text-center text-sm md:text-base">You do not have the required permissions to view this content.</p>
        <p className="text-xs text-muted-foreground mt-1">Required: {allowedRoles.join(', ')}</p>
        <div className="mt-8">
          <button onClick={() => { logout(); window.location.href = '/login'; }} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold shadow-sm hover:opacity-90">
            Sign Out & Return to Login
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

function Dashboard() {
  const { userProfile, userRole } = useFirebase();
  const [managerStats, setManagerStats] = useState<{name: string, count: number, email: string}[]>([]);
  const [metrics, setMetrics] = useState({ revenue: 0, outstanding: 0, repairs: 0, occupancyRate: 0, activeLeases: 0 });
  const [dataLoaded, setDataLoaded] = useState(false);
  const cur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  const currencySymbol = currencyMap[cur] || '$';

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.uid) return;
      try {
        const landlordId = userRole === 'Admin' ? userProfile.uid : (userProfile.landlordId || userProfile.uid);
        
        let tenants: any[] = [];
        let payments: any[] = [];
        
        if (userRole === 'Property Manager') {
            const propQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile.uid));
            const pSnap = await getDocs(propQ);
            const managedProps = pSnap.docs.map(d => d.id);
            if (managedProps.length > 0) {
               // Assuming few properties for the PM, or just fetch all tenants and filter client side
               const tQ = query(collection(db, 'tenants'), where('LandlordID', '==', landlordId));
               const tSnap = await getDocs(tQ);
               tenants = tSnap.docs.filter(d => managedProps.includes(d.data().PropertyID)).map(d => ({id: d.id, ...d.data()}));
            }
        } else {
            const tQ = query(collection(db, 'tenants'), where('LandlordID', '==', landlordId));
            const tSnap = await getDocs(tQ);
            tenants = tSnap.docs.map(d => ({id: d.id, ...d.data()}));
        }

        const paySnap = await getDocs(collection(db, 'payments'));
        payments = paySnap.docs.map(d => ({id: d.id, ...d.data()}));

        const tenantIds = tenants.map(t => t.id);
        const myPayments = payments.filter(p => tenantIds.includes(p.tenantId));
        
        const rev = myPayments.filter(p => p.status === 'Paid').reduce((acc, curr) => acc + (curr.amount || 0), 0);
        
        const outstanding = tenants.reduce((acc, t) => {
            const paid = myPayments.filter(p => p.tenantId === t.id && p.status === 'Paid').reduce((sum, p) => sum + (p.amount || 0), 0);
            return acc + Math.max(0, (t.RentAmount || 0) - paid);
        }, 0);

        let activeRepairs = 0;
        try {
            const rQ = query(collection(db, 'repairs'), where('LandlordID', '==', landlordId));
            const rSnap = await getDocs(rQ);
            activeRepairs = rSnap.docs.filter(d => d.data().Status !== 'Resolved').length;
        } catch(e) {}

        let activeLeases = 0;
        try {
            const lQ = query(collection(db, 'leases'), where('LandlordID', '==', landlordId));
            const lSnap = await getDocs(lQ);
            activeLeases = lSnap.docs.filter(d => d.data().Status === 'Active').length;
        } catch(e) {}

        let propertiesCount = 0;
        if (userRole === 'Property Manager') {
           const propQ = query(collection(db, 'properties'), where('PropertyManagerID', '==', userProfile.uid));
           const pSnap = await getDocs(propQ);
           propertiesCount = pSnap.docs.length;
        } else {
           const propQ = query(collection(db, 'properties'), where('LandlordID', '==', landlordId));
           const pSnap = await getDocs(propQ);
           propertiesCount = pSnap.docs.length;
        }
        
        // Active tenant records usually are ones that exist and are linked to a property.
        const activeTenantsCount = tenants.filter(t => t.PropertyID).length;
        const occupancyRate = propertiesCount > 0 ? Math.round((activeTenantsCount / propertiesCount) * 100) : 0;

        setMetrics({ revenue: rev, outstanding, repairs: activeRepairs, occupancyRate, activeLeases });
        setDataLoaded(true);

        if (userRole === 'Landlord') {
           const mQ = query(collection(db, 'users'), where('landlordId', '==', userProfile.uid), where('role', '==', 'Property Manager'));
           const mSnap = await getDocs(mQ);
           const managers = mSnap.docs.map(d => ({ uid: d.id, ...d.data() } as any));

           const pQ2 = query(collection(db, 'properties'), where('LandlordID', '==', userProfile.uid));
           const pSnap2 = await getDocs(pQ2);
           const properties = pSnap2.docs.map(d => d.data() as Property);

           let stats = managers.map(m => {
             const propCount = properties.filter(p => p.PropertyManagerID === m.uid).length;
             return { name: m.name || 'Unknown', email: m.email || '', count: propCount };
           });
           stats.sort((a, b) => b.count - a.count);
           setManagerStats(stats);
        }
      } catch(e) {
        console.error(e);
      }
    };
    fetchData();
  }, [userProfile, userRole]);

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-[32px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Dashboard Overview</h1>
          <p className="text-body text-muted-foreground">Welcome back, {userProfile?.name || 'there'}. Here's what's happening.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] mb-[32px]">
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Occupancy Rate</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">{dataLoaded ? `${metrics.occupancyRate}%` : '...'}</p>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Total Revenue (Paid)</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">{dataLoaded ? `${currencySymbol}${metrics.revenue.toLocaleString()}` : 'Loading...'}</p>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Outstanding Rent</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric text-rose-500">{dataLoaded ? `${currencySymbol}${metrics.outstanding.toLocaleString()}` : 'Loading...'}</p>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Active Repairs</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">{dataLoaded ? metrics.repairs : '...'}</p>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Active Leases</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">{dataLoaded ? metrics.activeLeases : '...'}</p>
          </div>
        </div>
      </div>

      <div className="dense-card mb-[32px] bg-gradient-to-r from-emerald-500/10 to-primary/5 hover:border-primary/30 transition-colors">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-[16px]">
          <div>
            <h3 className="text-h3 flex items-center gap-[8px]"><Wrench className="w-[18px] h-[18px] text-primary" /> Service Marketplace</h3>
            <p className="text-body text-muted-foreground mt-[4px]">Find verified electricians, plumbers, and maintenance providers for your properties.</p>
          </div>
          <Link to="/marketplace" className="px-[16px] py-[10px] bg-primary text-primary-foreground font-[600] text-[13px] rounded-[12px] flex items-center gap-[6px] shadow-sm hover:shadow-md transition-all shrink-0">
            Browse Providers &rarr;
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px] mb-[32px]">
        {userRole === 'Landlord' && (
          <div className="dense-card h-min">
            <h2 className="text-h3 mb-[16px]">Property Manager Performance</h2>
            {managerStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-[32px] text-center bg-muted/20 rounded-[12px] border border-dashed">
                <p className="text-secondary text-muted-foreground">No property managers found.</p>
              </div>
            ) : (
              <div className="space-y-[8px] max-h-[240px] overflow-y-auto pr-2 scrollbar-hide">
                {managerStats.map((ms, i) => (
                  <div key={i} className="flex items-center justify-between p-[12px] bg-muted/20 rounded-[12px] border border-dashed">
                    <div className="flex items-center gap-[12px]">
                      <div className="w-[32px] h-[32px] rounded-full bg-primary/10 text-primary flex items-center justify-center text-label shrink-0">
                        {ms.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-btn truncate">{ms.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{ms.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-body font-[800]">{ms.count}</p>
                      <p className="text-[10px] uppercase font-[800] text-muted-foreground">Properties</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  const { userProfile, userRole, currentUser } = useFirebase();
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [currency, setCurrency] = useState(userProfile?.currency || 'USD');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.uid) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${currentUser.uid}/${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadedUrl = await getDownloadURL(storageRef);
      setAvatarUrl(downloadedUrl);
      await setDoc(doc(db, 'users', currentUser.uid), {
        avatarUrl: downloadedUrl
      }, { merge: true });
      setStatusMsg({ type: 'success', text: 'Avatar uploaded successfully' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg({ type: 'error', text: 'Failed to upload avatar' });
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        phoneNumber,
        avatarUrl,
        currency
      });
      setStatusMsg({ type: 'success', text: 'Profile updated successfully' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (e) {
      console.error(e);
      setStatusMsg({ type: 'error', text: 'Failed to update profile' });
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
      {statusMsg && (
        <div className={`fixed top-4 right-4 z-[60] px-6 py-3 rounded-xl shadow-lg transform transition-all flex items-center gap-2 ${statusMsg.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <div className="font-medium text-sm">{statusMsg.text}</div>
        </div>
      )}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and platform preferences.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center overflow-hidden relative group shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold">{userProfile?.name?.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">Avatar Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 disabled:opacity-50 mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Full Name</label>
              <p className="font-medium text-lg">{userProfile?.name || 'Unknown User'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email Address</label>
              <p className="font-medium">{userProfile?.email || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-background border rounded-lg mt-1 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="INR">INR (₹)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="CHF">CHF (CHF)</option>
                <option value="ZAR">ZAR (R)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Phone Number</label>
              <div className="flex bg-background border rounded-lg mt-1 overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <select
                  className="bg-transparent px-3 py-2 text-sm font-medium text-muted-foreground outline-none border-r appearance-none min-w-[80px]"
                  defaultValue="+1"
                  onChange={(e) => {
                    if (!phoneNumber.startsWith('+')) {
                      setPhoneNumber(e.target.value + phoneNumber);
                    } else {
                      const currentNum = phoneNumber.replace(/^\+\d+\s*/, '');
                      setPhoneNumber(e.target.value + currentNum);
                    }
                  }}
                >
                   {filteredCountryCodes.map((c) => (
                      <option key={c.code} value={c.code}>{c.code} ({c.name})</option>
                   ))}
                </select>
                <input 
                  type="tel" 
                  value={phoneNumber} 
                  onChange={e => setPhoneNumber(e.target.value)} 
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none" 
                  placeholder="20 7123 1234"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Role</label>
              <div className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {userRole || 'User'}
              </div>
            </div>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>

        <div className="bg-card border rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">System Preferences</h2>
          <p className="text-muted-foreground text-sm mb-4">These settings are currently managed by your organization's administrator.</p>
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-dashed mb-4">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
            </div>
            <button disabled className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">
              Enforced
            </button>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/50 rounded-3xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-rose-600 dark:text-rose-400">Danger Zone</h2>
          <p className="text-muted-foreground text-sm mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <button 
            onClick={async () => {
              if (window.confirm("Are you absolutely sure you want to delete your account? This will permanently erase your profile and records.")) {
                try {
                  const uid = userProfile?.uid;
                  if (!uid || !currentUser) return;
                  
                  // Re-authenticate before starting the complex deletion transaction
                  // This guarantees that deleteUser won't fail with requires-recent-login after we've already wiped the DB.
                  const pwd = window.prompt("Security check: Please enter your password to confirm deletion.");
                  if (!pwd) {
                     setStatusMsg({ type: 'error', text: 'Deletion cancelled: Password required.' });
                     return;
                  }
                  
                  const { EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth');
                  const credential = EmailAuthProvider.credential(currentUser.email!, pwd);
                  await reauthenticateWithCredential(currentUser, credential);

                  if (userRole === 'Service Provider') {
                    await deleteDoc(doc(db, 'serviceProviders', uid));
                  } else if (userRole === 'Tenant') {
                    const tQ = query(collection(db, 'tenants'), where('AssociatedAuthUid', '==', uid));
                    const tSnap = await getDocs(tQ);
                    await Promise.all(tSnap.docs.map(d => deleteDoc(d.ref)));
                  }
                  
                  // Delete user record from Firestore FIRST to ensure permissions exist
                  await deleteDoc(doc(db, 'users', uid));
                  
                  // Delete Firebase Auth user LAST
                  await deleteUser(currentUser);
                  
                  setStatusMsg({ type: 'success', text: 'Account deleted. Redirecting...' });
                  setTimeout(() => window.location.href = '/login', 2000);
                } catch (e) {
                  console.error(e);
                  setStatusMsg({ type: 'error', text: 'Failed to delete account' });
                  setTimeout(() => setStatusMsg(null), 3000);
                }
              }
            }}
            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { userProfile, userRole, logout } = useFirebase();
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [globalIncomingCall, setGlobalIncomingCall] = useState<any>(null);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (globalIncomingCall && globalIncomingCall.status === 'calling') {
      timeout = setTimeout(async () => {
         try {
           await updateDoc(doc(db, 'calls', globalIncomingCall.id), { status: 'missed' });
         } catch(e) { console.error('Missed call update failed', e); }
      }, 60000);
    }
    return () => clearTimeout(timeout);
  }, [globalIncomingCall]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('receiverId', '==', userProfile.uid), where('status', '==', 'calling'));
    
    const unsub = onSnapshot(q, (snap) => {
       if (!snap.empty) {
          const callData = snap.docs[0].data();
          setGlobalIncomingCall({ id: snap.docs[0].id, ...callData });
          
          if ('Notification' in window && Notification.permission === 'granted' && location.pathname !== '/messages') {
             const n = new Notification(`Incoming Call`, {
                body: `${callData.callerName || 'Someone'} is calling you...`,
                icon: '/logo.png',
                tag: 'incoming-call',
                requireInteraction: true
             });
             n.onclick = () => {
                window.focus();
                n.close();
                navigate('/messages', { state: { autoAnswerCallId: snap.docs[0].id } });
             };
          }
       } else {
          setGlobalIncomingCall(null);
       }
    });
    return () => unsub();
  }, [userProfile, location.pathname, navigate]);

  useEffect(() => {
     let audio: HTMLAudioElement;
     if (globalIncomingCall && location.pathname !== '/messages') {
         // Play ringtone for incoming call globally
         audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2832/2832-preview.mp3');
         audio.loop = true;
         audio.play().catch(e => console.log('Audio play blocked', e));
     }
     return () => {
        if (audio) { audio.pause(); audio.src = ''; }
     };
  }, [globalIncomingCall, location.pathname]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);

      snap.docChanges().forEach(change => {
        if (change.type === 'added') {
          const data = change.doc.data();
          if (!data.read && 'Notification' in window && Notification.permission === 'granted') {
             const isRecent = new Date().getTime() - new Date(data.createdAt).getTime() < 60000;
             if (isRecent) {
                const browserNotif = new Notification(data.title || 'New Alert', {
                   body: data.message || 'You have a new message.',
                   icon: '/logo.png'
                });
                browserNotif.onclick = () => {
                   window.focus();
                   browserNotif.close();
                   if (data.type === 'message') {
                      navigate('/messages');
                   }
                };
             }
          }
        }
      });
    });
    return () => unsubscribe();
  }, [userProfile]);

  useEffect(() => {
    if (userRole !== 'Landlord' || !userProfile?.uid) return;
    
    const checkReminders = async () => {
      try {
        const tSnap = await getDocs(query(collection(db, 'tenants'), where('LandlordID', '==', userProfile.uid)));
        const tenants = tSnap.docs.map(d => ({id: d.id, ...d.data()}) as any);
        const now = new Date();
        
        for (const t of tenants) {
          if (t.status === 'Active' && t.LeaseEndDate) {
            const endDate = new Date(t.LeaseEndDate);
            const daysDiff = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
            
            const checkAndGenerate = async (targetDays: number, msg: string) => {
              if (daysDiff <= targetDays && daysDiff >= 0) {
                const rQ = query(collection(db, 'reminders'), where('tenantId', '==', t.id), where('type', '==', msg));
                const rSnap = await getDocs(rQ);
                if (rSnap.empty) {
                  await addDoc(collection(db, 'reminders'), {
                    tenantId: t.id,
                    landlordId: t.LandlordID,
                    type: msg,
                    message: `Rent is due in ${daysDiff} days.`,
                    createdAt: new Date().toISOString()
                  });
                  
                  if (t.AssociatedAuthUid) {
                    await addDoc(collection(db, 'notifications'), {
                      userId: t.AssociatedAuthUid,
                      title: 'Rent Reminder',
                      message: `Your rent is due in ${daysDiff} days.`,
                      createdAt: new Date().toISOString(),
                      read: false
                    });
                  }
                }
              }
            };

            await checkAndGenerate(7, '7_days_before');
            if (t.RentFrequency === 'Annually') {
               await checkAndGenerate(90, '3_months_before');
               await checkAndGenerate(30, '1_month_before');
            }
          }
        }
      } catch (e) {
        console.error('Failed to check reminders:', e);
      }
    };

    checkReminders();
  }, [userProfile, userRole]);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const unreadMsgCount = notifications.filter(n => !n.read && n.type === 'message').length;

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  if (userProfile && !userProfile.profileCompleted && ['Landlord', 'Property Manager', 'Service Provider', 'Agency', 'Developer'].includes(userProfile.role)) {
    return <ProfileCompletion />;
  }

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Landlord'] },
    { name: 'Manager', path: '/manager', icon: LayoutDashboard, roles: ['Property Manager'] },
    { name: 'Tenant', path: '/tenant', icon: LayoutDashboard, roles: ['Tenant'] },
    { name: 'Security', path: '/security', icon: LayoutDashboard, roles: ['Security Staff'] },
    { name: 'Provider', path: '/provider', icon: LayoutDashboard, roles: ['Service Provider'] },
    { name: 'Agency', path: '/agency', icon: LayoutDashboard, roles: ['Agency'] },
    { name: 'Developer', path: '/developer', icon: LayoutDashboard, roles: ['Developer'] },
    { name: 'Admin', path: '/admin', icon: LayoutDashboard, roles: ['Admin'] },
    { name: 'Repairs', path: '/repairs', icon: Wrench, roles: ['Tenant', 'Landlord', 'Property Manager', 'Security Staff', 'Service Provider', 'Admin'] },
    { name: 'Leases', path: '/leases', icon: FileText, roles: ['Tenant', 'Landlord', 'Property Manager', 'Admin'] },
    { name: 'Finance', path: '/finance', icon: CreditCard, roles: ['Landlord', 'Property Manager', 'Admin'] },
    { name: 'Vacancies', path: '/vacancies', icon: Home, roles: ['Landlord', 'Property Manager', 'Admin'] },
    { name: 'Service Provider', path: '/marketplace', icon: Building2, roles: ['Admin', 'Landlord', 'Property Manager', 'Tenant'] },
    { name: 'Marketplace', path: '/portal', icon: Search, roles: ['Admin', 'Landlord', 'Property Manager', 'Tenant', 'Service Provider', 'Security Staff', 'Property Seeker', 'Agency', 'Developer'] },
    { name: 'Properties', path: '/properties', icon: Home, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Tenants', path: '/tenants', icon: Users, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Staff', path: '/staff', icon: Shield, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['Landlord', 'Property Manager', 'Tenant'] },
    { name: 'Messages', path: '/messages', icon: MessageSquare, roles: ['Admin', 'Landlord', 'Property Manager', 'Tenant'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin', 'Landlord', 'Property Manager', 'Security Staff', 'Tenant', 'Service Provider', 'Property Seeker', 'Agency', 'Developer'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole || ''));

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card h-auto md:h-screen flex flex-col items-center md:items-start px-[16px] py-[16px] md:p-[24px] justify-between md:justify-start sticky top-0 z-50 shadow-sm md:shadow-none relative">
        
        {showNotifications && (
          <div className="absolute top-[60px] right-4 md:right-auto md:bottom-[72px] md:left-4 md:top-auto w-72 bg-card border rounded-2xl shadow-xl z-[999] overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-muted-foreground text-sm">No new notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div 
                    key={n.id} 
                    onClick={() => {
                      if (!n.read) markAsRead(n.id);
                      setShowNotifications(false);
                      if (n.type === 'message') {
                         navigate('/messages');
                      }
                    }}
                    className={`p-4 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/30 ${!n.read ? 'bg-primary/5' : ''}`}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                    {!n.read && <div className="mt-2 text-[10px] text-primary font-bold tracking-wider uppercase">Mark as read</div>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="flex w-full items-center justify-between mb-[16px] md:mb-[32px]">
          <Link to="/dashboard" className="flex items-center justify-center md:justify-start gap-[12px] text-emerald-500 w-auto shrink-0 hover:opacity-80 transition-opacity">
            <div className="relative flex items-center justify-center rounded-[8px] overflow-hidden shrink-0">
              <img src="/logo.png" alt="RentFlow Pro" className="w-8 h-8 md:w-8 md:h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="p-1.5 bg-emerald-500 rounded-[8px] hidden">
                <Building2 className="w-6 h-6 md:w-5 md:h-5 text-white" />
              </div>
            </div>
            <span className="font-[800] text-[18px] text-foreground tracking-tight hidden sm:block">RentFlow Pro</span>
          </Link>

          <div className="flex md:hidden items-center gap-[8px]">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={logout}
              className="p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 text-muted-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex md:flex-col gap-[8px] w-full flex-row justify-start md:justify-start overflow-x-auto scrollbar-hide md:mb-auto pb-[16px] md:pb-0 px-[8px] md:px-0">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.name} 
                to={item.path} 
                className={`flex shrink-0 items-center justify-center md:justify-start gap-[12px] px-[12px] py-[10px] rounded-[12px] transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-[600]' 
                    : 'hover:bg-accent hover:text-accent-foreground text-muted-foreground font-[500]'
                }`}
              >
                <item.icon className="w-5 h-5 md:w-4 md:h-4 shrink-0" />
                <span className="hidden sm:block text-[12px] md:text-[14px]">{item.name}</span>
                {item.name === 'Messages' && unreadMsgCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center font-bold">
                    {unreadMsgCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex flex-col gap-[16px] mt-auto w-full pt-[24px] border-t relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-[12px] overflow-hidden">
              <div className="w-[32px] h-[32px] rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-[800] text-[12px] tracking-tighter shrink-0 overflow-hidden">
                {userProfile?.avatarUrl ? (
                  <img src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  userProfile?.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="truncate">
                <p className="text-body font-[600] truncate">{userProfile?.name}</p>
                <p className="text-secondary text-muted-foreground truncate">{userRole || 'User'}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setIsDark(!isDark)}
              className="flex-1 flex items-center justify-center p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={logout}
              className="flex-1 flex items-center justify-center p-2 rounded-lg hover:bg-rose-500/10 hover:text-rose-600 text-muted-foreground transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {/* Global Call Overlay */}
        {globalIncomingCall && location.pathname !== '/messages' && (
           <div className="fixed top-4 md:top-6 right-4 md:right-6 z-[100] bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl p-4 md:p-5 flex flex-col items-center animate-in slide-in-from-top-10 text-white w-[280px]">
              <div className="bg-emerald-500/20 p-4 rounded-full mb-3 animate-pulse border border-emerald-500/30">
                 <Phone className="w-8 h-8 text-emerald-400" />
              </div>
              <h4 className="font-bold text-lg mb-1">{globalIncomingCall.callerName}</h4>
              <p className="text-xs text-zinc-400 mb-5">Incoming voice call...</p>
              <div className="flex w-full gap-3">
                 <button onClick={() => updateDoc(doc(db, 'calls', globalIncomingCall.id), { status: 'ended' })} className="flex-1 py-2.5 bg-rose-500/10 text-rose-400 rounded-[12px] text-sm font-semibold hover:bg-rose-500 hover:text-white transition-colors border border-rose-500/20">Decline</button>
                 <button onClick={() => navigate('/messages', { state: { autoAnswerCallId: globalIncomingCall.id } })} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-[12px] text-sm font-semibold hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">Answer</button>
              </div>
           </div>
        )}
        <Routes>
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/dashboard" element={
            <RequireRole allowedRoles={['Landlord']}>
              <Dashboard />
            </RequireRole>
          } />
          <Route path="/manager" element={
            <RequireRole allowedRoles={['Property Manager']}>
              <ManagerDashboard />
            </RequireRole>
          } />
          <Route path="/agency" element={
            <RequireRole allowedRoles={['Agency']}>
              <AgencyDashboard />
            </RequireRole>
          } />
          <Route path="/developer" element={
            <RequireRole allowedRoles={['Developer']}>
              <DeveloperDashboard />
            </RequireRole>
          } />
          <Route path="/provider" element={
            <RequireRole allowedRoles={['Service Provider']}>
              <ProviderDashboard />
            </RequireRole>
          } />
          <Route path="/marketplace" element={
            <RequireRole allowedRoles={['Tenant', 'Landlord', 'Property Manager', 'Admin']}>
              <Marketplace />
            </RequireRole>
          } />
          <Route path="/repairs" element={
            <RequireRole allowedRoles={['Tenant', 'Landlord', 'Property Manager', 'Admin', 'Service Provider', 'Security Staff']}>
              <Repairs />
            </RequireRole>
          } />
          <Route path="/leases" element={
            <RequireRole allowedRoles={['Tenant', 'Landlord', 'Property Manager', 'Admin']}>
              <Leases />
            </RequireRole>
          } />
          <Route path="/finance" element={
            <RequireRole allowedRoles={['Landlord', 'Property Manager', 'Admin']}>
              <Finance />
            </RequireRole>
          } />
          <Route path="/vacancies" element={
            <RequireRole allowedRoles={['Landlord', 'Property Manager', 'Admin']}>
              <VacanciesAdmin />
            </RequireRole>
          } />
          <Route path="/admin" element={
            <RequireRole allowedRoles={['Admin']}>
              <AdminDashboard />
            </RequireRole>
          } />
          <Route path="/security" element={
            <RequireRole allowedRoles={['Security Staff']}>
              <SecurityDashboard />
            </RequireRole>
          } />
          <Route path="/tenant" element={
            <RequireRole allowedRoles={['Tenant']}>
              <TenantDashboard />
            </RequireRole>
          } />
          <Route path="/properties" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager']}>
              <Properties />
            </RequireRole>
          } />
          <Route path="/tenants" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager']}>
              <Tenants />
            </RequireRole>
          } />
          <Route path="/staff" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager']}>
              <Staff />
            </RequireRole>
          } />
          <Route path="/payments" element={
            <RequireRole allowedRoles={['Landlord', 'Property Manager', 'Tenant']}>
              <Payments />
            </RequireRole>
          } />
          <Route path="/messages" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager', 'Tenant']}>
              <Messages />
            </RequireRole>
          } />
          <Route path="/settings" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager', 'Security Staff', 'Tenant', 'Service Provider']}>
              <SettingsView />
            </RequireRole>
          } />
        </Routes>
      </main>
    </div>
  );
}

function ForcePasswordReset() {
  const { currentUser } = useFirebase();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      await updatePassword(currentUser, password);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        requirePasswordReset: false
      });
      window.location.reload();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setError('Please log out and log back in to reset your password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-card border rounded-[2rem] p-8 shadow-float">
        <h1 className="text-2xl font-bold mb-2">Reset Password Required</h1>
        <p className="text-sm text-muted-foreground mb-6">
          For security reasons, please choose a new password before continuing.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold rounded-xl px-4 py-3 text-sm disabled:opacity-70"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function VerifyEmailScreen() {
  const { currentUser } = useFirebase();
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResend = async () => {
    if (!currentUser) return;
    setResending(true);
    setMessage('');
    setError('');
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(currentUser);
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    if (currentUser) {
      await currentUser.reload();
      window.location.reload(); // Quick way to re-check the emailVerified state from auth and refresh UI
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="max-w-md w-full bg-card p-8 rounded-3xl border shadow-xl flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <Mail className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Verify your email</h2>
        <p className="text-muted-foreground mb-8">
          We sent a verification link to <span className="font-semibold text-foreground">{currentUser?.email}</span>. 
          Please check your inbox and click the link to verify your account.
        </p>

        {message && <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl mb-4 w-full text-sm font-medium">{message}</div>}
        {error && <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl mb-4 w-full text-sm font-medium">{error}</div>}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleRefresh}
            className="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-emerald-700 transition"
          >
            I have verified my email
          </button>
          
          <button
            onClick={handleResend}
            disabled={resending}
            className="w-full bg-muted text-foreground font-semibold py-3 px-4 rounded-xl hover:bg-muted/80 transition"
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </button>

          <button
            onClick={async () => {
              const { auth } = await import('./firebase');
              const { signOut } = await import('firebase/auth');
              await signOut(auth);
            }}
            className="w-full text-muted-foreground font-semibold py-2 px-4 rounded-xl hover:text-foreground transition mt-2 text-sm"
          >
            Use a different account
          </button>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, isLoading } = useFirebase();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="p-4 bg-emerald-500/20 rounded-2xl">
            <Building2 className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentUser.emailVerified) {
    return <VerifyEmailScreen />;
  }

  if (userProfile?.requirePasswordReset) {
    return <ForcePasswordReset />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="p-4 bg-emerald-500/20 rounded-2xl">
              <Building2 className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Loading</p>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portal/*" element={<PublicMarketplace />} />
          <Route path="/*" element={
            <RequireAuth>
              <MainLayout />
            </RequireAuth>
          } />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
