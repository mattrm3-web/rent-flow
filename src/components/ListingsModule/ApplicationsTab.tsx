import React, { useState } from 'react';
import { db } from '../../firebase';
import { doc, updateDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { ListingApplication, PaymentRequest, Listing } from '../../types';
import { Button } from '../ui/button';
import { Search, Filter, Eye, CheckCircle2, XCircle, AlertCircle, FileText, Banknote } from 'lucide-react';

interface Props {
  applications: ListingApplication[];
  listings: Listing[];
  onUpdate: () => void;
}

export default function ApplicationsTab({ applications, listings, onUpdate }: Props) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedApp, setSelectedApp] = useState<ListingApplication | null>(null);
  const [selectedAppPaymentRequest, setSelectedAppPaymentRequest] = useState<PaymentRequest | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Fetch PR when app selected
  React.useEffect(() => {
     if (selectedApp && selectedApp.paymentRequestId) {
        const fetchPR = async () => {
           const prSnap = await getDocs(query(collection(db, 'paymentRequests'), where('applicationId', '==', selectedApp.id)));
           if (!prSnap.empty) {
              setSelectedAppPaymentRequest({ id: prSnap.docs[0].id, ...prSnap.docs[0].data() } as PaymentRequest);
           }
        };
        fetchPR();
     } else {
        setSelectedAppPaymentRequest(null);
     }
  }, [selectedApp]);
  const [rejectReason, setRejectReason] = useState('');

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBreakdown, setPaymentBreakdown] = useState({
    firstRent: 0,
    cautionFee: 0,
    agencyFee: 0,
    legalFee: 0,
    serviceCharge: 0,
    otherFee: 0
  });

  const filteredApps = applications.filter(a => {
    if (filter !== 'All' && a.Status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.ApplicantName.toLowerCase().includes(q) || 
             a.propertyName?.toLowerCase().includes(q) || 
             a.unitName?.toLowerCase().includes(q);
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted': return 'bg-gray-100 text-gray-700';
      case 'Pending Review': return 'bg-blue-100 text-blue-700';
      case 'Approved for Payment': return 'bg-emerald-100 text-emerald-700';
      case 'Approved': return 'bg-emerald-100 text-emerald-700'; // Legacy fallback
      case 'Rejected': return 'bg-rose-100 text-rose-700';
      case 'More Info Required': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleReject = async () => {
    if (!selectedApp || !selectedApp.id) return;
    try {
      await updateDoc(doc(db, 'listingApplications', selectedApp.id), {
        Status: 'Rejected',
        paymentRequired: false,
        rejectionReason: rejectReason,
        updatedAt: new Date().toISOString()
      });
      // In a real app we'd also send a notification to the applicant
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedApp(null);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Error updating application');
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedApp || !selectedApp.id) return;
    try {
      await updateDoc(doc(db, 'listingApplications', selectedApp.id), {
        Status: 'More Info Required',
        infoRequestMessage: infoMessage,
        updatedAt: new Date().toISOString()
      });
      setShowInfoModal(false);
      setInfoMessage('');
      setSelectedApp(null);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Error updating application');
    }
  };

  const handleApprovePayment = async () => {
    if (!selectedApp || !selectedApp.id) return;
    const total = Object.values(paymentBreakdown).reduce((acc, val) => acc + val, 0);

    try {
      // 1. Create Payment Request
      const prDoc = await addDoc(collection(db, 'paymentRequests'), {
        applicationId: selectedApp.id,
        applicantId: selectedApp.applicantId || '',
        landlordId: selectedApp.LandlordID,
        vacancyId: selectedApp.ListingID,
        propertyId: selectedApp.PropertyID,
        unitId: selectedApp.unitId || '',
        breakdown: paymentBreakdown,
        totalAmount: total,
        paymentStatus: 'Awaiting Payment',
        createdAt: new Date().toISOString()
      });

      // 2. Update Application Status
      await updateDoc(doc(db, 'listingApplications', selectedApp.id), {
        Status: 'Approved for Payment',
        paymentRequired: true,
        paymentRequestId: prDoc.id,
        updatedAt: new Date().toISOString()
      });

      setShowPaymentModal(false);
      setSelectedApp(null);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Error approving application');
    }
  };

  const handleVerifyPayment = async (appId: string, prId: string) => {
    try {
      // 1. Update Payment Request status
      await updateDoc(doc(db, 'paymentRequests', prId), {
        paymentStatus: 'Paid',
        paidAt: new Date().toISOString()
      });
      // 2. Trigger Onboarding
      const { completeTenantOnboarding } = await import('../../lib/onboarding');
      await completeTenantOnboarding(appId);
      
      onUpdate();
      alert('Payment verified and tenant onboarded successfully!');
    } catch (e) {
      console.error(e);
      alert('Error verifying payment');
    }
  };

  const handleRejectPayment = async (prId: string) => {
    try {
      await updateDoc(doc(db, 'paymentRequests', prId), {
        paymentStatus: 'Awaiting Payment'
      });
      onUpdate();
      alert('Payment rejected.');
    } catch (e) {
      console.error(e);
      alert('Error rejecting payment');
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '₦0';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card p-4 rounded-3xl border shadow-sm">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search applicant, property, or unit..." 
            className="w-full pl-9 pr-4 py-2 bg-background border rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {['All', 'Submitted', 'Pending Review', 'Approved for Payment', 'Rejected', 'More Info Required'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-semibold rounded-2xl whitespace-nowrap transition-colors ${filter === f ? 'bg-emerald-600 text-white' : 'bg-muted/50 text-muted-foreground hover:bg-muted'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!selectedApp ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredApps.map(a => {
            const listing = listings.find(l => l.id === a.ListingID);
            const propName = a.propertyName || listing?.Title || 'Unknown Property';
            const status = a.Status || 'Submitted';

            return (
              <div key={a.id} className="bg-card border rounded-[24px] p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer" onClick={() => setSelectedApp(a)}>
                <div className="flex justify-between items-start mb-4">
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(status)}`}>
                     {status}
                   </span>
                   <p className="text-xs text-muted-foreground font-medium">{new Date(a.CreatedAt).toLocaleDateString()}</p>
                </div>
                <h3 className="font-bold text-lg mb-1">{a.ApplicantName}</h3>
                <p className="text-sm font-medium text-emerald-600 mb-4">{propName} {a.unitName ? `- ${a.unitName}` : ''}</p>
                
                <div className="space-y-2 mt-auto pt-4 border-t border-dashed">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Income:</span>
                    <span className="font-semibold">{formatCurrency(a.monthlyIncome)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          {filteredApps.length === 0 && (
            <div className="col-span-full text-center p-12 bg-card rounded-3xl border border-dashed">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-muted-foreground mb-1">No Applications Found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-3xl p-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
          <button onClick={() => setSelectedApp(null)} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 mb-6 flex items-center gap-1 group">
             &larr; <span className="group-hover:underline">Back to List</span>
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold">{selectedApp.ApplicantName}'s Application</h2>
              <p className="text-muted-foreground font-medium mt-1">Applying for {selectedApp.propertyName || listings.find(l=>l.id===selectedApp.ListingID)?.Title} {selectedApp.unitName ? `- ${selectedApp.unitName}` : ''}</p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadge(selectedApp.Status)}`}>
               {selectedApp.Status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
             <div className="space-y-6">
                <div>
                   <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Applicant Info</h3>
                   <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                      <div><span className="text-sm text-muted-foreground">Full Name:</span> <span className="text-sm font-semibold ml-2">{selectedApp.ApplicantName}</span></div>
                      <div><span className="text-sm text-muted-foreground">Email:</span> <span className="text-sm font-semibold ml-2">{selectedApp.ApplicantEmail}</span></div>
                      <div><span className="text-sm text-muted-foreground">Phone:</span> <span className="text-sm font-semibold ml-2">{selectedApp.ApplicantPhone}</span></div>
                      <div><span className="text-sm text-muted-foreground">Marital Status:</span> <span className="text-sm font-semibold ml-2">{selectedApp.maritalStatus || 'Not Specified'}</span></div>
                   </div>
                </div>

                <div>
                   <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Employment</h3>
                   <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                      <div><span className="text-sm text-muted-foreground">Occupation:</span> <span className="text-sm font-semibold ml-2">{selectedApp.occupation || 'Not Specified'}</span></div>
                      <div><span className="text-sm text-muted-foreground">Employer:</span> <span className="text-sm font-semibold ml-2">{selectedApp.employer || 'Not Specified'}</span></div>
                      <div><span className="text-sm text-muted-foreground">Monthly Income:</span> <span className="text-sm font-semibold ml-2">{formatCurrency(selectedApp.monthlyIncome)}</span></div>
                   </div>
                </div>
             </div>
             
             <div className="space-y-6">
                <div>
                   <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Guarantor</h3>
                   <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                      <div><span className="text-sm text-muted-foreground">Name:</span> <span className="text-sm font-semibold ml-2">{selectedApp.guarantorName || 'Not Specified'}</span></div>
                      <div><span className="text-sm text-muted-foreground">Phone:</span> <span className="text-sm font-semibold ml-2">{selectedApp.guarantorPhone || 'Not Specified'}</span></div>
                      <div><span className="text-sm text-muted-foreground">Address:</span> <span className="text-sm font-semibold ml-2">{selectedApp.guarantorAddress || 'Not Specified'}</span></div>
                   </div>
                </div>
                
                <div>
                   <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Inspection History</h3>
                   <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                      <div><span className="text-sm text-muted-foreground">Inspection Date:</span> <span className="text-sm font-semibold ml-2">{selectedApp.inspectionDate ? new Date(selectedApp.inspectionDate).toLocaleDateString() : 'None Scheduled'}</span></div>
                      <div><span className="text-sm text-muted-foreground">Status:</span> <span className="text-sm font-semibold ml-2">{selectedApp.inspectionCompleted ? 'Completed' : 'Pending'}</span></div>
                   </div>
                </div>
             </div>
          </div>
          
          <div className="mb-8">
             <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Uploaded Documents</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['ID Card', 'Utility Bill', 'Bank Statement', 'Passport Photo'].map(doc => (
                   <div key={doc} className="border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 hover:bg-muted/30 transition-colors cursor-pointer group">
                      <FileText className="w-8 h-8 text-muted-foreground/50 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">{doc}</span>
                   </div>
                ))}
             </div>
          </div>

          {['Submitted', 'Pending Review', 'Under Review'].includes(selectedApp.Status) && (
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-dashed">
               <Button onClick={() => setShowRejectModal(true)} variant="outline" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                  Reject
               </Button>
               <Button onClick={() => setShowInfoModal(true)} variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200">
                  Request More Info
               </Button>
               <Button onClick={() => setShowPaymentModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white sm:ml-auto">
                  <Banknote className="w-4 h-4 mr-2" /> Approve for Payment
               </Button>
            </div>
          )}
          
          {selectedApp.Status === 'Approved for Payment' && selectedAppPaymentRequest && (
            <div className="pt-6 border-t border-dashed">
                <div className="bg-muted/30 rounded-2xl p-4 mb-4">
                    <p className="text-sm font-bold mb-2">Payment Status: {selectedAppPaymentRequest.paymentStatus}</p>
                    <p className="text-sm text-muted-foreground">Method: {selectedAppPaymentRequest.paymentMethod || 'N/A'}</p>
                </div>
                {selectedAppPaymentRequest.paymentStatus === 'Payment Submitted' && (
                    <div className="flex gap-3">
                        <Button onClick={() => handleVerifyPayment(selectedApp.id!, selectedAppPaymentRequest.id!)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Approve Payment</Button>
                        <Button onClick={() => handleRejectPayment(selectedAppPaymentRequest.id!)} variant="outline" className="text-rose-600 border-rose-200">Reject Payment</Button>
                    </div>
                )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl border shadow-xl p-6">
            <h3 className="text-lg font-bold text-rose-600 mb-2">Reject Application</h3>
            <p className="text-sm text-muted-foreground mb-4">Please provide a reason for rejecting this application.</p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Insufficient income, Invalid documents..."
              className="w-full bg-background border rounded-2xl p-3 text-sm min-h-[100px] mb-4 focus:ring-2 focus:ring-rose-500/20 outline-none"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
              <Button className="bg-rose-600 hover:bg-rose-700 text-white" disabled={!rejectReason} onClick={handleReject}>Confirm Rejection</Button>
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl border shadow-xl p-6">
            <h3 className="text-lg font-bold text-amber-600 mb-2">Request More Info</h3>
            <p className="text-sm text-muted-foreground mb-4">What additional information or documents do you need?</p>
            <textarea
              value={infoMessage}
              onChange={e => setInfoMessage(e.target.value)}
              placeholder="e.g. Please upload a clearer copy of your ID..."
              className="w-full bg-background border rounded-2xl p-3 text-sm min-h-[100px] mb-4 focus:ring-2 focus:ring-amber-500/20 outline-none"
            />
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowInfoModal(false)}>Cancel</Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!infoMessage} onClick={handleRequestInfo}>Send Request</Button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card w-full max-w-xl rounded-3xl border shadow-xl p-6 my-8">
            <h3 className="text-2xl font-bold mb-2">Payment Setup</h3>
            <p className="text-sm text-muted-foreground mb-6">Set the required fees to approve this application.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[
                { key: 'firstRent', label: 'First Rent' },
                { key: 'cautionFee', label: 'Caution Fee' },
                { key: 'agencyFee', label: 'Agency Fee' },
                { key: 'legalFee', label: 'Legal Fee' },
                { key: 'serviceCharge', label: 'Service Charge' },
                { key: 'otherFee', label: 'Other Charges' },
              ].map(f => (
                <div key={f.key} className="space-y-1.5">
                  <label className="text-sm font-semibold">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
                    <input 
                      type="number"
                      min="0"
                      value={paymentBreakdown[f.key as keyof typeof paymentBreakdown]}
                      onChange={e => setPaymentBreakdown({...paymentBreakdown, [f.key]: Number(e.target.value)})}
                      className="w-full pl-8 pr-4 py-2 bg-background border rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 mb-8 text-center">
               <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider mb-1">Total Amount Due</p>
               <p className="text-4xl font-bold text-emerald-900">{formatCurrency(Object.values(paymentBreakdown).reduce((a,b)=>a+b,0))}</p>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-dashed">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleApprovePayment}>Approve & Request Payment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
