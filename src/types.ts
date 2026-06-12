export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  displayName?: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  avatar?: string;
  nationality?: string;
  currency?: string;
  landlordId?: string;
  propertyId?: string | null;

  tenantId?: string;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string;
  requirePasswordReset?: boolean;
  
  accountStatus?: 'Active' | 'Inactive' | 'Suspended';
  verificationStatus?: 'Pending' | 'Approved' | 'Rejected';
  profileCompleted?: boolean;
  permissions?: string[];
}

export type UserRole = 'Admin' | 'Landlord' | 'Property Manager' | 'Security Staff' | 'Tenant' | 'Service Provider' | 'Property Seeker' | 'Agency' | 'Developer';

export type PropertyStatus = 'Vacant' | 'Occupied' | 'Reserved' | 'Under Maintenance' | 'Coming Soon' | 'Inactive';

export interface Property {
  id?: string;
  PropertyID: string;
  PropertyName: string;
  Address?: string;
  propertyType?: string;
  numberOfBedrooms?: number;
  numberOfFlats?: number;
  LandlordID: string;
  PropertyManagerID?: string | null;
  imageUrls?: string[];
  documents?: {id: string, name: string, url: string}[];
  monthlyRent?: number;
  currency?: string;
  status?: PropertyStatus;
  squareFootage?: number;
  amenities?: string[];
  bathrooms?: number;
  toilets?: number;
  parkingSpaces?: number;
  floorNumber?: number;
  description?: string;
}

export type ListingStatus = 'Draft' | 'Published' | 'Featured' | 'Reserved' | 'Rented' | 'Expired' | 'Archived';

export interface Listing {
  id?: string;
  PropertyID: string;
  LandlordID: string;
  PostedByName?: string;
  PostedByRole?: string;
  VendorID?: string; // Links to Vendor profile
  VendorType?: 'Landlord' | 'Property Manager' | 'Estate Agency' | 'Developer';
  Title: string;
  Description: string;
  Status: ListingStatus;
  RentAmount: number;
  ServiceCharge?: number;
  DepositRequired?: number;
  AvailableDate: string;
  LeaseDuration: string;
  Furnished: boolean;
  CoverImage?: string;
  Images: string[];
  Videos?: string[];
  VirtualTourUrl?: string;
  Views: number;
  ApplicationsCount: number;
  CreatedAt: string;
  UpdatedAt: string;

  // Additional Market properties
  State?: string;
  City?: string;
  Area?: string;
  PropertyType?: string;
  Bedrooms?: number;
  Bathrooms?: number;
  Amenities?: string[];
}

export interface MarketplaceVendor {
  id?: string;
  UserID: string; // Links to user table
  Type: 'Landlord' | 'Property Manager' | 'Estate Agency' | 'Developer';
  CompanyName?: string;
  CompanyLogo?: string;
  CompanyDescription?: string;
  OfficeAddress?: string;
  Phone?: string;
  Email?: string;
  Website?: string;
  VerifiedBadge: boolean;
  Ratings: number;
  ReviewCount: number;
  ActiveListingsCount: number;
  CreatedAt: string;
}

export interface PropertyReview {
  id?: string;
  PropertyID?: string;
  VendorID?: string;
  TenantID: string;
  Rating: number;
  ReviewText: string;
  Photos?: string[];
  CreatedAt: string;
}

export interface SavedSearch {
  id?: string;
  UserID: string;
  Title: string;
  Criteria: any; // e.g. { location: 'Lagos', maxPrice: 2000000, type: 'Apartment' }
  NotifyEmail: boolean;
  CreatedAt: string;
}

export interface FavoriteListing {
  id?: string;
  UserID: string;
  ListingID: string;
  CreatedAt: string;
}

export interface Lead {
  id?: string;
  ListingID: string;
  VendorID: string;
  ApplicantName: string;
  ApplicantEmail: string;
  ApplicantPhone: string;
  Source: string; // e.g. 'Marketplace', 'Direct'
  Status: 'New' | 'Contacted' | 'Inspection Scheduled' | 'Application Submitted' | 'Converted' | 'Lost';
  LeadValue: number;
  CreatedAt: string;
}

export interface ListingApplication {
  id?: string;
  ListingID: string;
  PropertyID: string;
  ApplicantName: string;
  ApplicantEmail: string;
  ApplicantPhone: string;
  EmploymentDetails?: string;
  IncomeDetails?: string;
  PreviousAddress?: string;
  GuarantorInfo?: string;
  ApplicationNotes?: string;
  Status: 'Submitted' | 'Under Review' | 'Interview Scheduled' | 'Approved' | 'Rejected' | 'Waiting List' | 'Converted To Tenant' | 'Pending Review' | 'Approved for Payment' | 'More Info Required';
  LandlordID: string;
  CreatedAt: string;

  // Added missing fields for Phase 8A
  applicantId?: string;
  vacancyId?: string;
  propertyName?: string;
  unitId?: string;
  unitName?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  maritalStatus?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorAddress?: string;
  
  documents?: {
    idCard?: string;
    utilityBill?: string;
    bankStatement?: string;
    passportPhoto?: string;
  };

  inspectionDate?: string;
  inspectionCompleted?: boolean;
  rejectionReason?: string;
  infoRequestMessage?: string;
  paymentRequired?: boolean;
  paymentRequestId?: string;
  updatedAt?: string;
}

export interface PaymentRequest {
  id?: string;

  applicationId: string;
  applicantId: string;
  landlordId: string;
  vacancyId: string;
  propertyId: string;
  unitId: string;

  breakdown: {
    firstRent: number;
    cautionFee: number;
    agencyFee: number;
    legalFee: number;
    serviceCharge: number;
    otherFee: number;
  };

  totalAmount: number;

  paymentMethod?: 'Stripe' | 'Flutterwave' | 'Paystack' | 'Offline';
  gatewayReference?: string;
  proofOfPayment?: string;

  paymentStatus: 'Awaiting Payment' | 'Processing' | 'Payment Submitted' | 'Paid' | 'Failed';

  paidAt?: string;
  createdAt: string;
}

export interface InspectionRequest {
  id?: string;
  ListingID: string;
  PropertyID: string;
  ApplicantName: string;
  ApplicantEmail: string;
  ApplicantPhone: string;
  RequestedDate: string;
  RequestedTime: string;
  Status: 'Pending' | 'Approved' | 'Rescheduled' | 'Rejected';
  LandlordID: string;
  CreatedAt: string;
}

export interface Tenant {
  id?: string;
  TenantID: string;
  TenantName: string;
  Email: string;
  LoginEmail: string;
  PropertyID: string | null;
  UnitIdentifier?: string;
  LeaseStartDate?: string;
  LeaseEndDate?: string;
  RentAmount?: number;
  RentFrequency?: 'Monthly' | 'Quarterly' | 'Annually';
  LandlordID: string;
  AssociatedAuthUid?: string;
  phoneNumber?: string;
  moveInDate?: string;
  moveOutDate?: string;
  status?: 'Active' | 'Moving Out' | 'Past';
  documents?: {id: string, name: string, url: string}[];
}

export type PaymentStatus = 'Pending' | 'Processing' | 'Paid' | 'Failed' | 'Cancelled' | 'Refunded' | 'Awaiting Verification';
export type PaymentMethod = 'Paystack' | 'Flutterwave' | 'Stripe' | 'Cash' | 'POS' | 'Bank Transfer';

export interface Payment {
  id?: string;
  PaymentID: string;
  TenantID: string;
  LandlordID: string;
  AmountPaid: number;
  PaymentDate: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  referenceNumber?: string;
  notes?: string;
  proofOfPaymentUrl?: string;
  createdBy?: string;
  verifiedBy?: string;
  dateCreated?: string;
  dateVerified?: string;
  gatewayReference?: string;
  transactionId?: string;
}

export type RepairPriority = 'Low' | 'Medium' | 'High' | 'Emergency';
export type RepairStatus = 'Submitted' | 'Under Review' | 'Assigned' | 'In Progress' | 'Waiting For Parts' | 'Waiting For Tenant' | 'Inspection' | 'Completed' | 'Closed' | 'Cancelled' | 'Rejected';
export type RepairCategory = 'Plumbing' | 'Electrical' | 'Roofing' | 'HVAC' | 'Security' | 'Painting' | 'Flooring' | 'Water Supply' | 'Generator' | 'Solar System' | 'CCTV' | 'Internet' | 'Doors & Windows' | 'Pest Control' | 'Cleaning' | 'Landscaping' | 'Other';

export interface Repair {
  id?: string;
  RepairID: string;
  TenantID: string;
  PropertyID: string;
  UnitNumber?: string;
  IssueTitle: string;
  Description: string;
  Category: RepairCategory;
  Priority: RepairPriority;
  Status: RepairStatus;
  ReportDate: string;
  
  // Media
  Photos: string[];
  Videos?: string[];
  VoiceNote?: string;
  
  // Assignment
  AssignedProviderID?: string;
  InvoiceID?: string;
  
  // Timestamps for timelines
  DateCreated: string;
  DateReviewed?: string;
  DateAssigned?: string;
  DateWorkStarted?: string;
  DateCompleted?: string;
  DateClosed?: string;
  
  // Cost tracking
  EstimatedCost?: number;
  ApprovedBudget?: number;
  ActualCost?: number;
  MaterialsCost?: number;
  LabourCost?: number;
  AdditionalCharges?: number;
  TotalCost?: number;
  
  // Approval
  CostApproved?: boolean;
  CostApprovedBy?: string; // admin/landlord uid
  
  // Metadata
  CreatedAt: string;
  UpdatedAt: string;
}

export interface RepairTimeline {
  id?: string;
  repairId: string;
  status: RepairStatus | string;
  description: string;
  timestamp: string;
  userId: string; // The user who triggered the timeline event
}

export interface RepairMessage {
  id?: string;
  repairId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  messageText: string;
  photoUrl?: string;
  documentUrl?: string;
  voiceNoteUrl?: string;
  timestamp: string;
  readBy: string[]; // UIDs
}

export interface RepairDocument {
  id?: string;
  repairId: string;
  uploadedBy: string;
  documentType: 'Before Photo' | 'Progress Photo' | 'After Photo' | 'Receipt' | 'Invoice' | 'Warranty Document' | 'Inspection Report' | 'Other';
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface RepairRating {
  id?: string;
  repairId: string;
  providerId: string;
  raterId: string; // Person who is rating (Tenant or Landlord)
  raterRole: string;
  rating: number; // 1 to 5
  reviewComment: string;
  createdAt: string;
}

export interface RepairNotification {
  id?: string;
  repairId: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface ServiceProvider {
  id?: string;
  providerId: string;
  uid: string;
  businessName: string;
  ownerName: string;
  phoneNumber: string;
  email: string;
  businessAddress: string;
  country: string;
  state: string;
  city: string;
  yearsOfExperience: number;
  serviceCategory: string;
  description: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  pricingInfo: string;
  workingHours: string;
  emergencyAvailability: boolean;
  businessLogoUrl?: string;
  portfolioImages?: string[];
  nationalIdUrl?: string;
  businessRegistrationUrl?: string;
  certificationUrl?: string;
  createdAt: string;
  averageRating?: number;
  completedJobs?: number;
}

export interface ServiceBooking {
  id?: string;
  bookingId: string;
  tenantId: string;
  landlordId?: string;
  providerId: string;
  serviceType: string;
  date: string;
  time: string;
  description: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Emergency';
  status: 'Pending' | 'Accepted' | 'In Progress' | 'Completed' | 'Cancelled';
  photos?: string[];
  createdAt: string;
}

export interface ProviderReview {
  id?: string;
  reviewId: string;
  providerId: string;
  reviewerId: string;
  reviewerRole: 'Tenant' | 'Landlord';
  bookingId: string;
  quality: number;
  timeliness: number;
  communication: number;
  professionalism: number;
  overallRating: number;
  writtenReview: string;
  createdAt: string;
}

export type LeaseStatus = 'Draft' | 'Pending Signature' | 'Active' | 'Expiring Soon' | 'Renewed' | 'Expired' | 'Terminated' | 'Eviction In Progress' | 'Closed';
export type LeaseType = 'Residential' | 'Commercial' | 'Short Stay' | 'Office' | 'Industrial' | 'Mixed Use';
export type PaymentFrequency = 'Monthly' | 'Quarterly' | 'Biannual' | 'Annual' | 'Custom';

export interface Lease {
  id?: string;
  LeaseNumber: string;
  PropertyID: string;
  Unit: string;
  TenantID: string;
  LandlordID: string;
  PropertyManagerID?: string | null;
  LeaseType: LeaseType;
  StartDate: string;
  EndDate: string;
  RentAmount: number;
  PaymentFrequency: PaymentFrequency;
  SecurityDeposit: number;
  LateFee?: number;
  GracePeriodDays?: number;
  UtilityResponsibility?: 'Tenant' | 'Landlord' | 'Shared';
  SpecialConditions?: string;
  Status: LeaseStatus;
  CustomClauses?: string;
  Jurisdiction?: string;
  AdditionalTerms?: string;
  LandlordNotes?: string;
  TenantObligations?: string;
  LandlordSignature?: string; 
  LandlordIP?: string;
  LandlordSignatureDate?: string;
  TenantSignature?: string;
  TenantIP?: string;
  TenantSignatureDate?: string;
  WitnessSignature?: string;
  WitnessName?: string;
  WitnessIP?: string;
  WitnessSignatureDate?: string;
  PdfUrl?: string; 
  CreatedAt: string;
  UpdatedAt: string;
}

export interface LeaseRenewal {
  id?: string;
  LeaseID: string;
  ProposedRent: number;
  ProposedStartDate: string;
  ProposedEndDate: string;
  Status: 'Proposed' | 'Accepted' | 'Declined' | 'Negotiating';
  CreatedAt: string;
}

export interface LeaseDocument {
  id?: string;
  LeaseID: string;
  FileName: string;
  FileType: string;
  FileUrl: string;
  UploadedBy: string;
  UploadedAt: string;
}

export interface LeaseInspection {
  id?: string;
  LeaseID: string;
  Type: 'Move-In' | 'Move-Out' | 'Periodic';
  InspectionDate: string;
  ConductedBy: string; 
  Rooms: {
    roomName: string;
    condition: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    notes: string;
    photos: string[];
  }[];
  TenantAcknowledgment?: boolean;
  TenantAcknowledgmentDate?: string;
  LandlordAcknowledgment?: boolean;
  LandlordAcknowledgmentDate?: string;
  DamageCostsCalculated?: number;
  PdfUrl?: string;
  CreatedAt: string;
}

export interface SecurityDeposit {
  id?: string;
  LeaseID: string;
  Amount: number;
  DateCollected: string;
  Status: 'Held' | 'Partially Refunded' | 'Fully Refunded' | 'Forfeited';
  Deductions: { reason: string; amount: number; date: string }[];
  RefundAmount?: number;
  RefundDate?: string;
  CreatedAt: string;
}

export interface LeaseAuditLog {
  id?: string;
  LeaseID: string;
  Action: string;
  PerformedBy: string;
  Role: string;
  Details: string;
  Timestamp: string;
}

export type ExpenseStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Paid' | 'Cancelled';
export type ExpenseCategory = 'Repairs & Maintenance' | 'Security' | 'Cleaning' | 'Electricity' | 'Water' | 'Waste Disposal' | 'Internet' | 'Insurance' | 'Legal' | 'Property Tax' | 'Generator Fuel' | 'Solar Maintenance' | 'CCTV Maintenance' | 'Staff Salaries' | 'Marketing' | 'Office Expenses' | 'Transportation' | 'Landscaping' | 'Miscellaneous';

export interface Expense {
  id?: string;
  Title: string;
  Category: ExpenseCategory;
  PropertyID: string;
  LandlordID: string;
  Unit?: string;
  VendorID?: string;
  InvoiceID?: string;
  Description?: string;
  Amount: number;
  Tax?: number;
  ReceiptUrl?: string;
  InvoiceUrl?: string;
  PaymentMethod?: string;
  DueDate?: string;
  ExpenseDate: string;
  Priority: 'Low' | 'Medium' | 'High';
  RequiresApproval: boolean;
  Status: ExpenseStatus;
  CreatedBy: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export type VendorType = 'Internal' | 'External';

export interface Vendor {
  id?: string;
  LandlordID?: string;
  uid?: string; // used if internal
  VendorName: string;
  BusinessName?: string;
  ServiceCategory: string;
  ContactNumber: string;
  Email?: string;
  Address?: string;
  TaxID?: string;
  BankDetails?: string;
  Rating: number;
  TotalJobsCompleted: number;
  TotalPaymentsReceived: number;
  CreatedAt: string;
  Type?: VendorType; 
}

export type InvoiceStatus = 'Pending' | 'Approved' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
  id?: string;
  InvoiceNumber: string;
  VendorID: string;
  PropertyID: string;
  RepairID?: string;
  Amount: number;
  DueDate: string;
  Status: InvoiceStatus;
  DocumentUrl?: string;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Payable {
  id?: string;
  ExpenseID?: string;
  InvoiceID?: string;
  VendorID: string;
  PropertyID: string;
  Amount: number;
  DueDate: string;
  Status: 'Pending' | 'Paid' | 'Overdue';
  CreatedAt: string;
}

export interface Receivable {
  id?: string;
  PropertyID: string;
  TenantID?: string;
  LeaseID?: string;
  Amount: number;
  Type: 'Rent' | 'Service Charge' | 'Utility' | 'Lease Fee';
  DueDate: string;
  Status: 'Pending' | 'Paid' | 'Overdue';
  CreatedAt: string;
}

export interface OwnerStatement {
  id?: string;
  LandlordID: string;
  PropertyID: string;
  StatementPeriod: 'Monthly' | 'Quarterly' | 'Yearly';
  PeriodStart: string;
  PeriodEnd: string;
  TotalIncome: number;
  TotalExpense: number;
  NetProfit: number;
  OutstandingBalance: number;
  CreatedAt: string;
}

export interface Budget {
  id?: string;
  LandlordID: string;
  Year: number;
  PropertyID: string;
  Category: ExpenseCategory | 'All';
  PlannedAmount: number;
  CreatedAt: string;
}

export interface IncomeTransaction {
  id?: string;
  TransactionID: string;
  PropertyID: string;
  UnitID?: string;
  TenantID?: string;
  Amount: number;
  PaymentMethod: string;
  PaymentDate: string;
  ReferenceNumber?: string;
  Description?: string;
  CreatedBy: string;
  CreatedAt: string;
  Status: 'Pending' | 'Completed' | 'Failed';
  Source: 'Rent' | 'Late Fee' | 'Service Charge' | 'Utility Reimbursement' | 'Other';
}
