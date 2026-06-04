export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phoneNumber?: string;
  avatarUrl?: string;
  nationality?: string;
  currency?: string;
  landlordId?: string;
  propertyId?: string | null;

  tenantId?: string;
  createdAt: string;
  requirePasswordReset?: boolean;
}

export type UserRole = 'Admin' | 'Landlord' | 'Property Manager' | 'Security Staff' | 'Tenant' | 'Service Provider';

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

export interface Payment {
  id?: string;
  PaymentID: string;
  TenantID: string;
  LandlordID: string;
  AmountPaid: number;
  PaymentDate: string;
}

export interface Repair {
  id?: string;
  RepairID: string;
  TenantID: string;
  PropertyID: string;
  IssueTitle: string;
  Description: string;
  Status: 'Pending' | 'In Progress' | 'Fixed';
  ReportDate: string;
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