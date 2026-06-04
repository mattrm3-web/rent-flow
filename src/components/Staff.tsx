import { useState, useEffect } from 'react';
import { db, secondaryAuth } from '../firebase';
import { collection, getDocs, doc, setDoc, query, where, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
import { Plus, Mail, Shield, X, Loader2, Trash2 } from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { Button } from './ui/button';

function AddStaffModal({ isOpen, onClose, onSuccess }: { isOpen: boolean, onClose: () => void, onSuccess: (msg: string) => void }) {
  const { userProfile, userRole } = useFirebase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [role, setRole] = useState<UserRole>('Security Staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);
      const tempPassword = Math.random().toString(36).slice(-8) + 'Tx9!';
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, tempPassword);
      const uid = userCredential.user.uid;

      await setDoc(doc(db, 'users', uid), {
        uid,
        name,
        email,
        phoneNumber,
        role: role,
        landlordId: landlordId,
        createdAt: new Date().toISOString(),
        requirePasswordReset: true
      });

      await sendPasswordResetEmail(secondaryAuth, email);

      onSuccess(`${role} created successfully. Temporary password: ${tempPassword}`);
      onClose();
      setName('');
      setEmail('');
      setPhoneNumber('');
      setRole('Security Staff');
    } catch (err: any) {
      setError(err.message || 'Failed to create staff member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-3xl shadow-float border p-6 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold mb-6">Add Staff Member</h2>
        {error && <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-xl">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Full Name</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Phone Number</label>
            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Role</label>
            <select required value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full bg-background border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/50 appearance-none">
              {userRole === 'Landlord' && <option value="Property Manager">Property Manager</option>}
              <option value="Security Staff">Security Staff</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Staff
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Staff() {
  const [staff, setStaff] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { userProfile, userRole } = useFirebase();

  const fetchData = async () => {
    try {
      const landlordId = userRole === 'Landlord' ? userProfile?.uid : (userProfile?.landlordId || userProfile?.uid);
      if (!landlordId) return;

      const q = query(collection(db, 'users'), where('landlordId', '==', landlordId));
      const snap = await getDocs(q);
      const allStaff = snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.role === 'Property Manager' || u.role === 'Security Staff');
      
      setStaff(allStaff);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userProfile]);

  const handleSuccess = (msg: string) => {
    alert(msg);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this staff member?")) {
      await deleteDoc(doc(db, 'users', id));
      fetchData();
    }
  };

  if (loading) return <div className="p-8"><div className="animate-pulse bg-slate-200 dark:bg-slate-800 h-24 rounded-2xl"></div></div>;

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <AddStaffModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleSuccess} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-[16px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Staff Management</h1>
          <p className="text-body text-muted-foreground">Manage your property managers and security team.</p>
        </div>
        {(userRole === 'Landlord' || userRole === 'Property Manager') && (
          <Button onClick={() => setIsModalOpen(true)} className="h-[40px] px-[16px] rounded-[12px]">
            <Plus className="w-[16px] h-[16px] mr-[8px]" /> <span className="text-btn">Add Staff</span>
          </Button>
        )}
      </div>

      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-[64px] text-center rounded-[16px] border border-dashed bg-muted/20">
          <div className="w-[64px] h-[64px] bg-muted rounded-full flex items-center justify-center mb-[24px]">
            <Shield className="w-[32px] h-[32px] text-muted-foreground" />
          </div>
          <h3 className="text-h2 mb-[8px]">No Staff Members Found</h3>
          <p className="text-body text-muted-foreground max-w-sm">You haven't added any staff members yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-[16px]">
          {staff.map(s => (
            <div key={s.uid} className="dense-card relative group shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[160px]">
              {(userRole === 'Landlord' || userRole === 'Admin') && (
                <button 
                  onClick={() => handleDelete(s.uid)}
                  className="absolute top-[12px] right-[12px] z-10 p-[8px] bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-[14px] h-[14px]" />
                </button>
              )}
              <div className="flex items-start gap-[12px]">
                <div className="w-[40px] h-[40px] rounded-[12px] bg-primary/10 text-primary flex items-center justify-center text-h3 shrink-0">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 overflow-hidden mt-[2px]">
                  <h3 className="text-card-title truncate">{s.name}</h3>
                  <div className="flex items-center gap-[6px] text-secondary text-muted-foreground mt-[2px]">
                    <Mail className="w-[12px] h-[12px] shrink-0" />
                    <span className="truncate">{s.email}</span>
                  </div>
                </div>
              </div>
              <div className="mt-auto pt-[16px] border-t border-dashed">
                <div className="inline-flex items-center px-[10px] py-[4px] rounded-full text-label bg-primary/10 text-primary border border-primary/20">
                  {s.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
