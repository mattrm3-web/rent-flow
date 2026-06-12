import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useFirebase } from '../FirebaseProvider';
import { ListingApplication, PaymentRequest } from '../../types';
import { Clock, CheckCircle2, AlertCircle, FileText, Banknote, MapPin } from 'lucide-react';
import { Button } from '../ui/button';

export default function ApplicantDashboard() {
   const { userProfile } = useFirebase();
   const [applications, setApplications] = useState<ListingApplication[]>([]);
   const [paymentRequests, setPaymentRequests] = useState<Record<string, PaymentRequest>>({});
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      if (!userProfile) {
         setLoading(false);
         return;
      }
      fetchData();
   }, [userProfile]);

   const fetchData = async () => {
      setLoading(true);
      try {
         const q = query(collection(db, 'listingApplications'), where('applicantId', '==', userProfile?.uid));
         const snap = await getDocs(q);
         const apps = snap.docs.map(d => ({ id: d.id, ...d.data() } as ListingApplication));
         
         // Fetch payment request docs for approved apps
         const prs: Record<string, PaymentRequest> = {};
         for (const a of apps) {
            if (a.paymentRequestId) {
                const prQ = query(collection(db, 'paymentRequests'), where('applicationId', '==', a.id));
                const prSnap = await getDocs(prQ);
                if (!prSnap.empty) {
                   prs[a.id!] = { id: prSnap.docs[0].id, ...prSnap.docs[0].data() } as PaymentRequest;
                }
            }
         }
         
         setApplications(apps.sort((a,b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime()));
         setPaymentRequests(prs);
      } catch (e) {
         console.error(e);
      }
      setLoading(false);
   };

   if (loading) return <div className="flex justify-center p-20 text-muted-foreground">Loading dashboard...</div>;
   
   if (!userProfile) return <div className="flex justify-center p-20 text-muted-foreground">Please sign in to view your applications.</div>;

   const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
   };

   return (
      <div className="max-w-5xl mx-auto px-6 py-12 animate-in fade-in zoom-in-95 mt-20">
         <h1 className="text-3xl font-bold mb-2">My Applications</h1>
         <p className="text-muted-foreground mb-8">Track the status of your property rental applications.</p>

         {applications.length === 0 ? (
            <div className="bg-card border border-dashed rounded-[2rem] p-12 text-center text-muted-foreground">
               <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
               <h3 className="text-lg font-bold text-foreground mb-2">No Applications Yet</h3>
               <p>You haven't applied for any properties. Browse the marketplace to find your next home.</p>
            </div>
         ) : (
            <div className="grid gap-6">
               {applications.map(app => {
                  return (
                     <div key={app.id} className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row justify-between gap-6">
                           <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                 {app.Status === 'Submitted' || app.Status === 'Pending Review' || app.Status === 'Under Review' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                       <Clock className="w-3.5 h-3.5"/> Under Review
                                    </span>
                                 ) : app.Status === 'More Info Required' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                       <AlertCircle className="w-3.5 h-3.5"/> Action Required
                                    </span>
                                 ) : app.Status === 'Rejected' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                       <XCircle className="w-3.5 h-3.5"/> Unsuccessful
                                    </span>
                                 ) : app.Status === 'Approved for Payment' || app.Status === 'Approved' ? (
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                       <CheckCircle2 className="w-3.5 h-3.5"/> Approved
                                    </span>
                                 ) : null}
                                 <span className="text-xs text-muted-foreground font-medium">{new Date(app.CreatedAt).toLocaleDateString()}</span>
                              </div>
                              
                              <h2 className="text-xl font-bold mb-1">{app.propertyName || 'Property Application'} {app.unitName ? `- ${app.unitName}` : ''}</h2>
                              <p className="text-sm font-medium text-emerald-600 mb-4 flex items-center gap-1">
                                 <MapPin className="w-4 h-4"/> ID: {app.ListingID.slice(0,8).toUpperCase()}
                              </p>

                              {/* Content based on status */}
                              {app.Status === 'Submitted' && (
                                 <div className="bg-muted/50 rounded-2xl p-4 border border-dashed">
                                    <p className="text-sm font-medium text-foreground">Application Submitted</p>
                                    <p className="text-sm text-muted-foreground mt-1">Your application has been received and is currently under review by the landlord or property manager.</p>
                                 </div>
                              )}

                              {app.Status === 'More Info Required' && (
                                 <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                                    <p className="text-sm font-bold text-amber-900 mb-2">Message from Landlord:</p>
                                    <p className="text-sm text-amber-800 italic bg-white/50 p-3 rounded-xl mb-4">"{app.infoRequestMessage || 'Please update your application.'}"</p>
                                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">Upload Missing Documents</Button>
                                 </div>
                              )}

                              {app.Status === 'Rejected' && (
                                 <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200">
                                    <p className="text-sm font-medium text-rose-900">Application unsuccessful.</p>
                                    {app.rejectionReason && <p className="text-sm text-rose-800 mt-1">Reason: {app.rejectionReason}</p>}
                                 </div>
                              )}

                              {(app.Status === 'Approved for Payment' || app.Status === 'Approved') && (
                                 <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-200">
                                    <div className="mb-6">
                                       <p className="text-lg font-bold text-emerald-900 leading-tight">Congratulations!</p>
                                       <p className="text-sm text-emerald-800 mt-1">Your application has been approved. Complete payment to secure this unit.</p>
                                    </div>

                                    {app.paymentRequestId && paymentRequests[app.id!] && (
                                       <div className="bg-white rounded-xl p-5 shadow-sm border border-emerald-100">
                                          <div className="flex justify-between items-end mb-4 border-b border-emerald-50 pb-4">
                                             <div>
                                                <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider mb-1">Total Due</p>
                                                <p className="text-3xl font-bold font-mono text-emerald-900">
                                                   {formatCurrency(paymentRequests[app.id!].totalAmount)}
                                                </p>
                                             </div>
                                          </div>
                                          
                                          <div className="space-y-2 mb-6">
                                             {Object.entries(paymentRequests[app.id!].breakdown).map(([k, v]) => {
                                                if (v === 0) return null;
                                                const labels: Record<string,string> = {
                                                   firstRent: 'First Rent', cautionFee: 'Caution Fee', agencyFee: 'Agency Fee',
                                                   legalFee: 'Legal Fee', serviceCharge: 'Service Charge', otherFee: 'Other Charges'
                                                };
                                                return (
                                                   <div key={k} className="flex justify-between text-xs">
                                                      <span className="text-muted-foreground">{labels[k]}</span>
                                                      <span className="font-semibold">{formatCurrency(v as number)}</span>
                                                   </div>
                                                )
                                             })}
                                          </div>

                                          {paymentRequests[app.id!].paymentStatus === 'Awaiting Payment' ? (
                                             <div className="flex flex-col sm:flex-row gap-3">
                                                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm" onClick={() => alert("Gateway integration coming soon!")}>
                                                   Pay Now (Online)
                                                </Button>
                                                <Button variant="outline" className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-xl" onClick={async () => {
                                                   await updateDoc(doc(db, 'paymentRequests', paymentRequests[app.id!].id!), {
                                                       paymentStatus: 'Payment Submitted',
                                                       paymentMethod: 'Offline'
                                                   });
                                                   fetchData();
                                                }}>
                                                   Pay Offline
                                                </Button>
                                             </div>
                                          ) : paymentRequests[app.id!].paymentStatus === 'Payment Submitted' ? (
                                             <p className="text-sm font-semibold text-amber-700">Payment submitted. Waiting for verification.</p>
                                          ) : (
                                             <p className="text-sm font-semibold text-emerald-700">Payment confirmed.</p>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                  )
               })}
            </div>
         )}
      </div>
   );
}
