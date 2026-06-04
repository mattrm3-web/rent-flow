import { useState } from 'react';
import { X, Calendar, Clock, UploadCloud, AlertCircle } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { ServiceProvider } from '../types';
import { useFirebase } from './FirebaseProvider';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  provider: ServiceProvider;
}

export default function BookingModal({ isOpen, onClose, provider }: Props) {
  const { userProfile, userRole } = useFirebase();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High' | 'Emergency'>('Medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid) return;
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'serviceBookings'), {
        bookingId: Math.random().toString(36).substring(7),
        tenantId: userRole === 'Tenant' ? userProfile.uid : '',
        landlordId: userRole === 'Landlord' ? userProfile.uid : '',
        providerId: provider.uid,
        serviceCategory: provider.serviceCategory,
        date,
        time,
        description,
        urgency,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-[16px]">
      <div className="bg-card w-full max-w-lg rounded-[24px] shadow-float border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-[24px] border-b bg-muted/10">
          <div>
            <h2 className="text-h3">Book {provider.businessName || provider.ownerName}</h2>
            <p className="text-sm text-muted-foreground mt-[4px]">Request {provider.serviceCategory} services</p>
          </div>
          <button onClick={onClose} className="p-[8px] hover:bg-muted rounded-full transition-colors text-muted-foreground">
            <X className="w-[20px] h-[20px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-[24px] space-y-[20px]">
          {error && (
            <div className="p-[12px] bg-destructive/10 text-destructive rounded-[12px] text-[13px] flex items-start gap-[8px]">
              <AlertCircle className="w-[16px] h-[16px] shrink-0 mt-[2px]" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-[16px]">
            <div className="space-y-[8px]">
              <label className="text-label text-muted-foreground flex items-center gap-[6px]">
                <Calendar className="w-[14px] h-[14px]" /> Preferred Date
              </label>
              <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors" />
            </div>
            <div className="space-y-[8px]">
              <label className="text-label text-muted-foreground flex items-center gap-[6px]">
                <Clock className="w-[14px] h-[14px]" /> Preferred Time
              </label>
              <input required type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-background border rounded-[12px] px-[16px] py-[10px] text-[14px] outline-none focus:border-primary transition-colors" />
            </div>
          </div>

          <div className="space-y-[8px]">
            <label className="text-label text-muted-foreground">Urgency Level</label>
            <div className="flex bg-muted/50 p-[4px] rounded-[12px]">
              {['Low', 'Medium', 'High', 'Emergency'].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setUrgency(level as any)}
                  className={`flex-1 py-[8px] text-[12px] font-[600] rounded-[8px] transition-all ${urgency === level ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-[8px]">
            <label className="text-label text-muted-foreground">Job Description</label>
            <textarea 
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-background border rounded-[12px] px-[16px] py-[12px] text-[14px] outline-none focus:border-primary transition-colors resize-none"
              placeholder="Describe what needs to be done..."
            />
          </div>

          <div className="space-y-[8px]">
            <label className="text-label text-muted-foreground">Photos (Optional)</label>
            <div className="border-2 border-dashed rounded-[12px] p-[24px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors">
              <UploadCloud className="w-[24px] h-[24px] text-muted-foreground mb-[8px]" />
              <p className="text-[13px] font-[500]">Click to upload photos</p>
              <p className="text-[11px] text-muted-foreground mt-[4px]">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <div className="pt-[16px] border-t flex justify-end gap-[12px]">
            <button type="button" onClick={onClose} className="px-[16px] py-[10px] rounded-[12px] text-[14px] font-[600] text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button disabled={loading} type="submit" className="px-[24px] py-[10px] rounded-[12px] text-[14px] font-[600] bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-50 flex items-center justify-center">
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
