import { db } from "../firebase";
import { doc, getDoc, updateDoc, addDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore";

export async function completeTenantOnboarding(applicationId: string) {
  // 1. Get Application
  const appRef = doc(db, 'listingApplications', applicationId);
  const appSnap = await getDoc(appRef);
  if (!appSnap.exists()) throw new Error("Application not found");
  const appData = appSnap.data();

  // Error Protection
  if (appData.convertedToTenant) return;

  // Load Vacancy & Payment Request
  const vacancyRef = doc(db, 'listings', appData.ListingID);
  const vacancySnap = await getDoc(vacancyRef);
  if (!vacancySnap.exists()) throw new Error("Vacancy not found");
  const vacancyData = vacancySnap.data();

  const prQ = query(collection(db, 'paymentRequests'), where('applicationId', '==', applicationId));
  const prSnap = await getDocs(prQ);
  if (prSnap.empty) throw new Error("Payment request not found");
  const prDoc = prSnap.docs[0];
  const prData = prDoc.data();

  // 2. Create Tenant Record
  const newTenantId = `TN-${Date.now()}`;
  const tenantRef = await addDoc(collection(db, 'tenants'), {
    TenantID: newTenantId,
    FullName: appData.ApplicantName,
    Email: appData.ApplicantEmail,
    Phone: appData.ApplicantPhone,
    PropertyID: appData.PropertyID,
    UnitID: appData.unitId || '',
    LeaseStartDate: new Date().toISOString().split('T')[0],
    LeaseEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    RentAmount: prData.breakdown.firstRent,
    SecurityDeposit: prData.breakdown.cautionFee,
    PaymentStatus: "Paid",
    PasswordResetRequired: true,
    CreatedAt: new Date().toISOString(),
    status: 'Active'
  });

  // 3. Enable Tenant Role
  // Assume userprofile is in 'users' collection
  const userRef = doc(db, 'users', appData.applicantId);
  await updateDoc(userRef, {
      role: 'Tenant',
      tenantId: newTenantId
  });

  // 4. Create Lease Record
  await addDoc(collection(db, 'leases'), {
    tenantId: newTenantId,
    propertyId: appData.PropertyID,
    unitId: appData.unitId || '',
    leaseStartDate: new Date().toISOString().split('T')[0],
    leaseEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    annualRent: prData.totalAmount,
    status: "Active",
    createdAt: new Date().toISOString()
  });

  // 5. Mark Unit Occupied
  const unitRef = doc(db, 'properties', appData.PropertyID); 
  // Assuming properties has rooms/units collection implicitly or field in properties. Based on schema, might be tricky. 
  // Will do update to property status for now.
  await updateDoc(unitRef, {
    status: 'Occupied'
  });

  // 6. Close Vacancy
  await updateDoc(vacancyRef, {
    Status: "Closed",
    isPublished: false,
    filledBy: newTenantId,
    filledAt: new Date().toISOString()
  });

  // 7. Remove Marketplace Listing
  // listing and vacancy are often the same in this architecture, 
  // but if different, must remove listing too. The App uses Listing for both.
  await updateDoc(vacancyRef, {
    Status: "Leased",
    visible: false
  });

  // 8. Update Application Status
  await updateDoc(appRef, {
    convertedToTenant: true,
    convertedAt: new Date().toISOString(),
    Status: 'Converted To Tenant'
  });

  // 9. Notifications (simplified)
  await addDoc(collection(db, 'notifications'), {
     userId: appData.applicantId,
     title: 'Tenancy Active',
     message: 'Congratulations! Your tenancy is now active.',
     type: 'success',
     isRead: false,
     createdAt: new Date().toISOString()
  });
}
