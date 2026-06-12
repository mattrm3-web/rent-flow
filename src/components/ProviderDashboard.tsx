import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from './FirebaseProvider';
import { ServiceBooking, ServiceProvider } from '../types';
import { Calendar, Clock } from 'lucide-react';

export default function ProviderDashboard() {
  const { userProfile } = useFirebase();
  const [providerData, setProviderData] = useState<ServiceProvider | null>(null);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile?.uid) return;
      try {
        const pDoc = await getDoc(doc(db, 'serviceProviders', userProfile.uid));
        if (pDoc.exists()) {
          setProviderData({ id: pDoc.id, ...pDoc.data() } as ServiceProvider);
        }

        const bSnap = await getDocs(query(collection(db, 'serviceBookings'), where('providerId', '==', userProfile.uid)));
        const data = bSnap.docs.map(d => ({ id: d.id, ...d.data() } as ServiceBooking));
        // simple sort
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setBookings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userProfile]);

  const updateStatus = async (id: string, newStatus: string) => {
    await updateDoc(doc(db, 'serviceBookings', id), { status: newStatus });
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus as any } : b));
  };

  if (loading) return <div className="p-[24px]"><div className="animate-pulse bg-muted h-24 rounded-2xl"></div></div>;

  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const activeCount = bookings.filter(b => b.status === 'Accepted' || b.status === 'In Progress').length;
  const completedCount = bookings.filter(b => b.status === 'Completed').length;

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-[32px]">
        <div>
          <h1 className="text-h1 mb-[4px]">Provider Dashboard</h1>
          <p className="text-body text-muted-foreground">Welcome, {providerData?.businessName || userProfile?.name}.</p>
        </div>
        {providerData?.verificationStatus === 'Pending' && (
          <div className="px-[12px] py-[6px] rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[12px] font-[800] uppercase">
            Account Pending Verification
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] mb-[32px]">
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Pending Requests</h3>
          <p className="text-metric text-amber-500">{pendingCount}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Active Jobs</h3>
          <p className="text-metric text-primary">{activeCount}</p>
        </div>
        <div className="stat-card">
          <h3 className="text-label text-muted-foreground mb-[8px]">Completed Jobs</h3>
          <p className="text-metric text-emerald-500">{completedCount}</p>
        </div>
      </div>

      <div className="dense-card">
        <h2 className="text-h3 mb-[24px]">Recent Bookings</h2>
        {bookings.length === 0 ? (
          <div className="text-center py-[32px] text-muted-foreground text-body">
            No bookings found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] text-muted-foreground uppercase bg-muted/20 border-b">
                <tr>
                  <th className="px-[16px] py-[12px] font-[600]">Date/Time</th>
                  <th className="px-[16px] py-[12px] font-[600]">Description</th>
                  <th className="px-[16px] py-[12px] font-[600]">Urgency</th>
                  <th className="px-[16px] py-[12px] font-[600]">Status</th>
                  <th className="px-[16px] py-[12px] font-[600] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="px-[16px] py-[16px] whitespace-nowrap">
                      <div className="flex items-center gap-[6px]">
                        <Calendar className="w-[12px] h-[12px] text-muted-foreground" />
                        <span className="font-[600]">{b.date}</span>
                      </div>
                      <div className="flex items-center gap-[6px] mt-[4px] text-muted-foreground text-secondary">
                        <Clock className="w-[12px] h-[12px]" />
                        <span>{b.time}</span>
                      </div>
                    </td>
                    <td className="px-[16px] py-[16px]">
                      <p className="line-clamp-2 max-w-xs">{b.description}</p>
                    </td>
                    <td className="px-[16px] py-[16px]">
                      <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[600] ${b.urgency === 'Emergency' ? 'bg-rose-500/10 text-rose-500' : 'bg-muted text-muted-foreground'}`}>
                        {b.urgency}
                      </span>
                    </td>
                    <td className="px-[16px] py-[16px]">
                      <span className={`px-[8px] py-[4px] rounded-[6px] text-[11px] font-[600] uppercase tracking-wide
                        ${b.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' :
                          b.status === 'Pending' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-primary/10 text-primary'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-[16px] py-[16px] text-right">
                      {b.status === 'Pending' && (
                        <div className="flex justify-end gap-[8px]">
                          <button onClick={() => updateStatus(b.id!, 'Accepted')} className="px-[12px] py-[6px] bg-primary text-primary-foreground text-[12px] font-[600] rounded-[8px]">Accept</button>
                        </div>
                      )}
                      {b.status === 'Accepted' && (
                        <div className="flex justify-end gap-[8px]">
                          <button onClick={() => updateStatus(b.id!, 'In Progress')} className="px-[12px] py-[6px] bg-primary text-primary-foreground text-[12px] font-[600] rounded-[8px]">Start Job</button>
                        </div>
                      )}
                      {b.status === 'In Progress' && (
                        <div className="flex justify-end gap-[8px]">
                          <button onClick={() => updateStatus(b.id!, 'Completed')} className="px-[12px] py-[6px] bg-emerald-500 text-white text-[12px] font-[600] rounded-[8px]">Complete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
