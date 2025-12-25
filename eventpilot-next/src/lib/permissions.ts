/**
 * Admin Permissions Helper
 *
 * Defines the permission system for admin users.
 * SUPER_ADMIN has all permissions by default.
 * Regular ADMIN needs explicit permission flags set to true.
 */

export const ADMIN_PERMISSIONS = {
  dashboard: 'canAccessDashboard',
  sessions: 'canAccessSessions',
  users: 'canAccessUsers',
  hosts: 'canAccessHosts',
  analytics: 'canAccessAnalytics',
  checkin: 'canAccessCheckin',
  settings: 'canAccessSettings',
  suggestions: 'canAccessSuggestions',
  emailCampaigns: 'canAccessEmailCampaigns',
} as const;

export type PermissionKey = keyof typeof ADMIN_PERMISSIONS;
export type PermissionField = typeof ADMIN_PERMISSIONS[PermissionKey];

// Arabic labels for permissions
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  dashboard: 'لوحة التحكم',
  sessions: 'إدارة الأحداث',
  users: 'إدارة المستخدمين',
  hosts: 'إدارة الرعاة',
  analytics: 'الإحصائيات',
  checkin: 'تسجيل الحضور',
  settings: 'الإعدادات',
  suggestions: 'الاقتراحات',
  emailCampaigns: 'حملات البريد',
};

// User type that includes permission fields
export interface AdminUser {
  id: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  canAccessDashboard: boolean;
  canAccessSessions: boolean;
  canAccessUsers: boolean;
  canAccessHosts: boolean;
  canAccessAnalytics: boolean;
  canAccessCheckin: boolean;
  canAccessSettings: boolean;
  canAccessSuggestions: boolean;
  canAccessEmailCampaigns: boolean;
}

/**
 * Check if a user has a specific permission
 * SUPER_ADMIN always returns true
 * Regular ADMIN checks the specific permission flag
 * USER always returns false
 */
export function hasPermission(
  user: AdminUser | null | undefined,
  permission: PermissionKey
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.role !== 'ADMIN') return false;

  const field = ADMIN_PERMISSIONS[permission];
  return user[field] === true;
}

/**
 * Check if user has any admin access at all
 */
export function isAdmin(user: AdminUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(user: AdminUser | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN';
}

/**
 * Get all permissions a user has
 */
export function getUserPermissions(user: AdminUser | null | undefined): PermissionKey[] {
  if (!user) return [];
  if (user.role === 'SUPER_ADMIN') {
    return Object.keys(ADMIN_PERMISSIONS) as PermissionKey[];
  }
  if (user.role !== 'ADMIN') return [];

  return (Object.keys(ADMIN_PERMISSIONS) as PermissionKey[]).filter(
    (key) => user[ADMIN_PERMISSIONS[key]] === true
  );
}

/**
 * Create a permissions object from an array of permission keys
 */
export function createPermissionsObject(
  permissions: PermissionKey[]
): Record<PermissionField, boolean> {
  const result: Record<string, boolean> = {};

  for (const field of Object.values(ADMIN_PERMISSIONS)) {
    result[field] = false;
  }

  for (const key of permissions) {
    result[ADMIN_PERMISSIONS[key]] = true;
  }

  return result as Record<PermissionField, boolean>;
}
