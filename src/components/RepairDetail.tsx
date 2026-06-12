import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, collection, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { useFirebase } from './FirebaseProvider';
import { Repair, RepairTimeline, RepairMessage, RepairDocument } from '../types';
import { Wrench, ArrowLeft, Loader2, Clock, Calendar, Shield, MapPin, MessageSquare, Paperclip, Send, CheckCircle2, User, Home } from 'lucide-react';

export default function RepairDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, userProfile, userRole } = useFirebase();
  const [repair, setRepair] = useState<Repair | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const docRef = doc(db, 'repairs', id);
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setRepair({ id: snap.id, ...snap.data() } as Repair);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="flex-1 p-8">
        <button onClick={() => navigate('/repairs')} className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Repairs
        </button>
        <div className="dense-card text-center py-12">
          <Wrench className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Repair Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-[24px] lg:p-[48px] animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
      <button 
        onClick={() => navigate('/repairs')} 
        className="text-muted-foreground hover:text-foreground inline-flex items-center text-sm font-medium mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Repairs
      </button>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-[32px] gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-muted-foreground font-medium px-3 py-1 bg-muted rounded-full">
              {repair.RepairID}
            </span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              {repair.Status}
            </span>
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border bg-rose-500/10 text-rose-600 border-rose-500/20">
              {repair.Priority}
            </span>
          </div>
          <h1 className="text-h1 mb-[4px]">{repair.IssueTitle}</h1>
          <p className="text-body text-muted-foreground">Category: {repair.Category}</p>
        </div>
        
        {/* Actions for Admin / Landlord / PM */}
        {(userRole === 'Landlord' || userRole === 'Property Manager' || userRole === 'Admin') && (
          <div className="flex gap-2 shrink-0">
             <button className="btn-secondary">Update Status</button>
             <button className="btn-primary">Assign Provider</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="dense-card">
            <h3 className="text-h3 mb-4">Description</h3>
            <p className="text-body text-muted-foreground whitespace-pre-wrap">{repair.Description}</p>
          </div>

          <div className="dense-card">
            <h3 className="text-h3 mb-4">Photos & Media</h3>
            {repair.Photos && repair.Photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {repair.Photos.map((photo, idx) => (
                  <div key={idx} className="aspect-square bg-muted rounded-xl bg-cover bg-center" style={{ backgroundImage: `url(${photo})` }} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No photos attached.</p>
            )}
          </div>
          
          <div className="dense-card">
             <h3 className="text-h3 mb-4">Discussion</h3>
             <div className="p-12 text-center text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-4 opacity-20" />
                <p>Chat module not loaded yet.</p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dense-card">
            <h3 className="text-h3 mb-4">Details</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Reported Date</p>
                  <p className="text-sm text-muted-foreground">{new Date(repair.ReportDate).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Home className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">Unit {repair.UnitNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dense-card">
            <h3 className="text-h3 mb-4">Timeline</h3>
            <div className="p-8 text-center text-muted-foreground">
               <Clock className="w-8 h-8 mx-auto mb-4 opacity-20" />
               <p>Timeline module not loaded yet.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
