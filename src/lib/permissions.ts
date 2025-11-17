import { supabase } from './supabase';

export type UserRole = 'admin' | 'super_user' | 'simple_user';

export interface PermissionCheck {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove?: boolean;
}

export async function getUserAccessibleEmployeeIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_accessible_employees', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting accessible employees:', error);
      return [];
    }

    return data?.map((row: { employee_id: string }) => row.employee_id) || [];
  } catch (error) {
    console.error('Error in getUserAccessibleEmployeeIds:', error);
    return [];
  }
}

export async function canUserAccessEmployee(
  userId: string,
  employeeId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_can_access_employee', {
      p_user_id: userId,
      p_employee_id: employeeId
    });

    if (error) {
      console.error('Error checking employee access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in canUserAccessEmployee:', error);
    return false;
  }
}

export async function canUserEditEmployee(
  userId: string,
  employeeId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_can_edit_employee', {
      p_user_id: userId,
      p_employee_id: employeeId
    });

    if (error) {
      console.error('Error checking employee edit access:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in canUserEditEmployee:', error);
    return false;
  }
}

export async function getUserDepartmentPermissions(
  userId: string
): Promise<Map<string, any>> {
  try {
    const { data, error } = await supabase
      .from('user_department_permissions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting department permissions:', error);
      return new Map();
    }

    const permMap = new Map();
    (data || []).forEach((perm) => {
      permMap.set(perm.department_id, perm);
    });

    return permMap;
  } catch (error) {
    console.error('Error in getUserDepartmentPermissions:', error);
    return new Map();
  }
}

export async function getUserEmployeePermissions(
  userId: string
): Promise<Map<string, { canView: boolean; canEdit: boolean }>> {
  try {
    const { data, error } = await supabase
      .from('user_employee_permissions')
      .select('employee_id, can_view, can_edit')
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting employee permissions:', error);
      return new Map();
    }

    const permMap = new Map();
    (data || []).forEach((perm) => {
      permMap.set(perm.employee_id, {
        canView: perm.can_view,
        canEdit: perm.can_edit
      });
    });

    return permMap;
  } catch (error) {
    console.error('Error in getUserEmployeePermissions:', error);
    return new Map();
  }
}

export function isAdmin(role?: UserRole | string): boolean {
  return role === 'admin';
}

export function isSuperUser(role?: UserRole | string): boolean {
  return role === 'super_user';
}

export function isSimpleUser(role?: UserRole | string): boolean {
  return role === 'simple_user';
}

export function canManageUsers(role?: UserRole | string): boolean {
  return isAdmin(role);
}

export function canManageDepartments(role?: UserRole | string): boolean {
  return isAdmin(role);
}

export function canViewAllData(role?: UserRole | string): boolean {
  return isAdmin(role);
}

export function canConfigurePermissions(role?: UserRole | string): boolean {
  return isAdmin(role);
}

export function hasRestrictedAccess(role?: UserRole | string): boolean {
  return isSimpleUser(role);
}

export async function checkDepartmentPermission(
  userId: string,
  departmentId: string,
  permissionKey: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_has_department_permission', {
      p_user_id: userId,
      p_department_id: departmentId,
      p_permission_name: permissionKey
    });

    if (error) {
      console.error('Error checking department permission:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('Error in checkDepartmentPermission:', error);
    return false;
  }
}

export async function getUserAccessibleDepartments(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_accessible_departments', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error getting accessible departments:', error);
      return [];
    }

    return data?.map((row: { department_id: string }) => row.department_id) || [];
  } catch (error) {
    console.error('Error in getUserAccessibleDepartments:', error);
    return [];
  }
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  super_user: 'Super User',
  simple_user: 'Employee'
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full system access with complete control over all features and users',
  super_user: 'Configurable access to assigned departments and employees with specific permissions',
  simple_user: 'Basic access to view and manage own personal information only'
};

export async function hasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_permissions')
      .select('permission_id, permissions(name)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error checking user permission:', error);
      return false;
    }

    return data?.some((up: any) => up.permissions?.name === permissionName) || false;
  } catch (error) {
    console.error('Error in hasPermission:', error);
    return false;
  }
}

export async function canEditAttendance(
  userId: string,
  role?: UserRole | string
): Promise<boolean> {
  if (isAdmin(role)) {
    return true;
  }

  if (isSuperUser(role)) {
    return await hasPermission(userId, 'manage_attendance');
  }

  return false;
}

export async function canManageAttendance(
  userId: string,
  role?: UserRole | string
): Promise<boolean> {
  return await canEditAttendance(userId, role);
}
