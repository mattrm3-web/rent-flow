import { UserRole, UserProfile } from '../types';

export const ADMIN_ROLES: UserRole[] = ['Admin'];
export const LANDLORD_ROLES: UserRole[] = ['Admin', 'Landlord'];
export const MANAGEMENT_ROLES: UserRole[] = ['Admin', 'Landlord', 'Property Manager'];
export const TENANT_ROLES: UserRole[] = ['Tenant'];
export const SECURITY_ROLES: UserRole[] = ['Security Staff'];
export const PROVIDER_ROLES: UserRole[] = ['Service Provider'];
export const SEEKER_ROLES: UserRole[] = ['Property Seeker'];
export const AGENCY_ROLES: UserRole[] = ['Agency'];
export const DEVELOPER_ROLES: UserRole[] = ['Developer'];

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  'Admin': [
    'manage_users', 'approve_service_providers', 'approve_agencies', 'approve_developers',
    'manage_marketplace', 'manage_properties', 'view_global_analytics', 'manage_subscriptions',
    'manage_platform_settings'
  ],
  'Landlord': [
    'create_properties', 'manage_properties', 'create_tenants', 'manage_leases',
    'create_payments', 'receive_payments', 'manage_repairs', 'hire_service_providers',
    'publish_marketplace_listings', 'view_property_analytics'
  ],
  'Property Manager': [
    'manage_assigned_properties', 'manage_repairs', 'manage_leases', 'manage_tenants_assigned',
    'publish_marketplace_listings'
  ],
  'Tenant': [
    'view_lease', 'pay_rent', 'submit_repairs', 'view_notices', 'access_community',
    'track_payments', 'view_property_information'
  ],
  'Security Staff': [
    'view_visitor_records', 'approve_visitor_entry', 'verify_gate_passes',
    'view_assigned_properties', 'create_incident_reports'
  ],
  'Service Provider': [
    'manage_service_profile', 'receive_repair_jobs', 'update_job_status',
    'upload_progress_photos', 'submit_completion_reports', 'receive_ratings', 'receive_reviews'
  ],
  'Property Seeker': [
    'search_marketplace', 'save_properties', 'book_inspections', 'submit_applications',
    'contact_property_owners', 'manage_favorites'
  ],
  'Agency': [
    'create_listings', 'manage_agents', 'manage_leads', 'view_listing_analytics',
    'manage_agency_profile'
  ],
  'Developer': [
    'create_projects', 'publish_developments', 'manage_units', 'manage_sales_leads',
    'manage_project_gallery', 'manage_project_analytics'
  ]
};

export function hasPermission(user: UserProfile | null | undefined, permission: string): boolean {
  if (!user || user.accountStatus === 'Suspended') return false;
  if (user.role === 'Admin') return true;
  // If use has custom permissions assigned
  if (user.permissions?.includes(permission)) return true;
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission);
}

export function canAccessModule(user: UserProfile | null | undefined, module: 'admin' | 'dashboard' | 'manager' | 'tenant' | 'security' | 'provider' | 'marketplace' | 'agency' | 'developer'): boolean {
  if (!user || user.accountStatus === 'Suspended') return false;
  
  // Pending users can only hit their own dashboard but limited views (handled inside components)
  // Usually, portal/marketplace is public or seeker accessible
  if (module === 'marketplace') return true; 

  const map: Record<typeof module, UserRole[]> = {
    'admin': ['Admin'],
    'dashboard': ['Landlord'],
    'manager': ['Property Manager'],
    'tenant': ['Tenant'],
    'security': ['Security Staff'],
    'provider': ['Service Provider'],
    'marketplace': ['Admin', 'Landlord', 'Property Manager', 'Tenant', 'Service Provider', 'Security Staff', 'Property Seeker', 'Agency', 'Developer'],
    'agency': ['Agency'],
    'developer': ['Developer']
  };

  const allowedRoles = map[module] || [];
  return allowedRoles.includes(user.role);
}

export function canCreate(user: UserProfile | null | undefined, resource: string): boolean {
  if (!user || user.accountStatus === 'Suspended') return false;
  if (user.role === 'Admin') return true;
  if (resource === 'property' && ['Landlord'].includes(user.role)) return true;
  if (resource === 'tenant' && ['Landlord', 'Property Manager'].includes(user.role)) return true;
  if (resource === 'listing' && ['Landlord', 'Property Manager', 'Agency', 'Developer'].includes(user.role)) return true;
  if (resource === 'repair' && ['Tenant', 'Landlord', 'Property Manager'].includes(user.role)) return true;
  return false;
}

export function canEdit(user: UserProfile | null | undefined, resource: string): boolean {
   return canCreate(user, resource);
}

export function canDelete(user: UserProfile | null | undefined, resource: string): boolean {
  if (!user || user.accountStatus === 'Suspended') return false;
  if (user.role === 'Admin') return true;
  if (resource === 'tenant' && user.role === 'Landlord') return true;
  return false;
}

export function canApprove(user: UserProfile | null | undefined): boolean {
  return hasPermission(user, 'approve_service_providers') || hasPermission(user, 'approve_agencies') || hasPermission(user, 'approve_developers');
}

export function canPublish(user: UserProfile | null | undefined): boolean {
  return hasPermission(user, 'publish_marketplace_listings') || hasPermission(user, 'publish_developments');
}

export function canViewAnalytics(user: UserProfile | null | undefined): boolean {
  return hasPermission(user, 'view_global_analytics') || hasPermission(user, 'view_property_analytics') || hasPermission(user, 'view_listing_analytics') || hasPermission(user, 'manage_project_analytics');
}
