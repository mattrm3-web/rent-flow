import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { Building2, LayoutDashboard, Users, Settings, LogOut, Sun, Moon, Shield, Bell, CreditCard, Wrench, AlertCircle } from 'lucide-react';
import { useFirebase } from './components/FirebaseProvider';
import { useState, useEffect, lazy, Suspense } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc, setDoc, addDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { Property } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { filteredCountryCodes } from './lib/countryCodes';

const sampleRevenueData = [
  { name: 'Jan', revenue: 4000 },
  { name: 'Feb', revenue: 3000 },
  { name: 'Mar', revenue: 5000 },
  { name: 'Apr', revenue: 4500 },
  { name: 'May', revenue: 6000 },
  { name: 'Jun', revenue: 7000 },
];

const sampleOccupancyData = [
  { name: 'Jan', rate: 85 },
  { name: 'Feb', rate: 88 },
  { name: 'Mar', rate: 90 },
  { name: 'Apr', rate: 89 },
  { name: 'May', rate: 92 },
  { name: 'Jun', rate: 95 },
];

const sampleRepairData = [
  { name: 'Jan', repairs: 12 },
  { name: 'Feb', repairs: 19 },
  { name: 'Mar', repairs: 15 },
  { name: 'Apr', repairs: 8 },
  { name: 'May', repairs: 10 },
  { name: 'Jun', repairs: 5 },
];

const Login = lazy(() => import('./components/Login'));
const Properties = lazy(() => import('./components/Properties'));
const Tenants = lazy(() => import('./components/Tenants'));
const Staff = lazy(() => import('./components/Staff'));
const Payments = lazy(() => import('./components/Payments'));
const ProviderDashboard = lazy(() => import('./components/ProviderDashboard'));
const Marketplace = lazy(() => import('./components/Marketplace'));

function AdminDashboard() {
  return (
    <div className="flex-1 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
      <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-sm">System administration and platform overview.</p>
    </div>
  );
}

function SecurityDashboard() {
  return (
    <div className="flex-1 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300">
      <h1 className="text-3xl font-bold tracking-tight">Security Dashboard</h1>
      <p className="text-muted-foreground mt-1 text-sm">Monitor properties and report incidents.</p>
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
          <Link to="/marketplace" className="p-[16px] rounded-[16px] border border-dashed hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center">
            <div className="w-[48px] h-[48px] rounded-full bg-emerald-500/10 text-emerald-600 flex justify-center items-center mb-[12px]">
              <Sun className="w-[24px] h-[24px]" /> 
            </div>
            <span className="text-[13px] font-[600]">Cleaning</span>
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
  if (userRole === 'Landlord' || userRole === 'Property Manager') return <Navigate to="/dashboard" replace />;
  if (userRole === 'Service Provider') return <Navigate to="/provider" replace />;
  
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
  const cur = userProfile?.currency || 'USD';
  const currencyMap: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$', JPY: '¥', NGN: '₦', INR: '₹', SGD: 'S$', CHF: 'CHF', ZAR: 'R' };
  const currencySymbol = currencyMap[cur] || '$';

  useEffect(() => {
    const fetchManagerData = async () => {
      if (userRole === 'Landlord' && userProfile?.uid) {
        try {
          const mQ = query(collection(db, 'users'), where('landlordId', '==', userProfile.uid), where('role', '==', 'Property Manager'));
          const mSnap = await getDocs(mQ);
          const managers = mSnap.docs.map(d => ({ uid: d.id, ...d.data() } as {uid: string, name?: string, email?: string}));

          const pQ = query(collection(db, 'properties'), where('LandlordID', '==', userProfile.uid));
          const pSnap = await getDocs(pQ);
          const properties = pSnap.docs.map(d => d.data() as Property);

          let stats = managers.map(m => {
            const propCount = properties.filter(p => p.PropertyManagerID === m.uid).length;
            return {
              name: m.name || 'Unknown',
              email: m.email || '',
              count: propCount
            };
          });

          stats.sort((a, b) => b.count - a.count);
          setManagerStats(stats);
        } catch (e) {
          console.error(e);
        }
      }
    };
    fetchManagerData();
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
            <p className="text-metric">92%</p>
            <span className="text-label text-emerald-500 bg-emerald-500/10 px-[8px] py-[4px] rounded-[8px]">+2.1%</span>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Monthly Revenue</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">{currencySymbol}24,500</p>
            <span className="text-label text-emerald-500 bg-emerald-500/10 px-[8px] py-[4px] rounded-[8px]">+12.5%</span>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Outstanding Rent</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric text-rose-500">{currencySymbol}3,200</p>
            <span className="text-label text-rose-500 bg-rose-500/10 px-[8px] py-[4px] rounded-[8px]">-4.2%</span>
          </div>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Active Repairs</h3>
          <div className="flex items-end justify-between">
            <p className="text-metric">14</p>
            <span className="text-label text-amber-500 bg-amber-500/10 px-[8px] py-[4px] rounded-[8px]">-2</span>
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
        <div className="dense-card">
          <h3 className="text-h3 mb-[24px]">Revenue Trend</h3>
          <div className="h-[240px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
              <AreaChart data={sampleRevenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(value) => `${currencySymbol}${value/1000}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dense-card flex flex-col">
          <h3 className="text-h3 mb-[24px]">Occupancy Trend</h3>
          <div className="h-[240px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
              <LineChart data={sampleOccupancyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[24px] mb-[32px]">
        <div className="dense-card">
          <h3 className="text-h3 mb-[24px]">Repair Requests Trend</h3>
          <div className="h-[240px] w-full min-w-0 min-h-0">
            <ResponsiveContainer width="100%" height="100%" minHeight={1} minWidth={1}>
              <BarChart data={sampleRepairData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="repairs" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
  const { userProfile, userRole } = useFirebase();
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [currency, setCurrency] = useState(userProfile?.currency || 'USD');
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatarUrl || '');
  const [statusMsg, setStatusMsg] = useState<{type: 'success'|'error', text: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.uid) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${userProfile.uid}/${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadedUrl = await getDownloadURL(storageRef);
      setAvatarUrl(downloadedUrl);
      await setDoc(doc(db, 'users', userProfile.uid), {
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
    if (!userProfile?.uid) return;
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', userProfile.uid), {
        phoneNumber,
        avatarUrl,
        currency
      }, { merge: true });
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
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl border border-dashed">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-xs text-muted-foreground">Add an extra layer of security.</p>
            </div>
            <button disabled className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-medium opacity-50 cursor-not-allowed">
              Enforced
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainLayout() {
  const { userProfile, userRole, logout } = useFirebase();
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(collection(db, 'notifications'), where('userId', '==', userProfile.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      notifs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(notifs);
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

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const allNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['Landlord', 'Property Manager'] },
    { name: 'Provider', path: '/provider', icon: LayoutDashboard, roles: ['Service Provider'] },
    { name: 'Marketplace', path: '/marketplace', icon: Wrench, roles: ['Tenant', 'Landlord', 'Property Manager', 'Admin'] },
    { name: 'Admin', path: '/admin', icon: LayoutDashboard, roles: ['Admin'] },
    { name: 'Security', path: '/security', icon: LayoutDashboard, roles: ['Security Staff'] },
    { name: 'Tenant', path: '/tenant', icon: LayoutDashboard, roles: ['Tenant'] },
    { name: 'Properties', path: '/properties', icon: Building2, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Tenants', path: '/tenants', icon: Users, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Staff', path: '/staff', icon: Shield, roles: ['Admin', 'Landlord', 'Property Manager'] },
    { name: 'Payments', path: '/payments', icon: CreditCard, roles: ['Landlord', 'Property Manager', 'Tenant'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Admin', 'Landlord', 'Property Manager', 'Security Staff', 'Tenant'] },
  ];

  const navItems = allNavItems.filter(item => item.roles.includes(userRole || ''));

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r bg-card h-auto md:h-screen flex md:flex-col items-center md:items-start px-[16px] py-[16px] md:p-[24px] justify-between md:justify-start sticky top-0 z-50 shadow-sm md:shadow-none">
        
        <Link to="/dashboard" className="flex items-center justify-center md:justify-start gap-[12px] mb-0 md:mb-[32px] text-emerald-500 w-auto md:w-full shrink-0 hover:opacity-80 transition-opacity">
          <div className="relative flex items-center justify-center rounded-[8px] overflow-hidden shrink-0">
            <img src="/logo.png" alt="RentFlow Pro" className="w-8 h-8 md:w-8 md:h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <div className="p-1.5 bg-emerald-500 rounded-[8px] hidden">
              <Building2 className="w-6 h-6 md:w-5 md:h-5 text-white" />
            </div>
          </div>
          <span className="font-[800] text-[18px] text-foreground tracking-tight hidden sm:block">RentFlow Pro</span>
        </Link>

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

          {showNotifications && (
            <div className="absolute bottom-full left-0 mb-4 w-72 bg-card border rounded-2xl shadow-xl z-50 overflow-hidden">
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
                      onClick={() => !n.read && markAsRead(n.id)}
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

      <main className="flex-1 flex flex-col overflow-y-auto">
        <Routes>
          <Route path="/" element={<RoleBasedRedirect />} />
          <Route path="/dashboard" element={
            <RequireRole allowedRoles={['Landlord', 'Property Manager']}>
              <Dashboard />
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
          <Route path="/settings" element={
            <RequireRole allowedRoles={['Admin', 'Landlord', 'Property Manager', 'Security Staff', 'Tenant']}>
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
