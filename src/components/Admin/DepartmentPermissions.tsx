import { useState, useEffect } from 'react';
import { Building2, Users, X, Check, Shield, Clock, Calendar, DollarSign, FileText, TrendingUp, AlertCircle, UserCog } from 'lucide-react';
import { EmployeePermissions } from './EmployeePermissions';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';

interface DepartmentPermissionsProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSave: () => void;
}

interface Department {
  id: string;
  name: string;
}

interface DepartmentPermission {
  department_id: string;
  can_view_employees: boolean;
  can_edit_employees: boolean;
  can_view_attendance: boolean;
  can_manage_attendance: boolean;
  can_view_leaves: boolean;
  can_approve_leaves: boolean;
  can_view_payroll: boolean;
  can_manage_payroll: boolean;
  can_view_expenses: boolean;
  can_approve_expenses: boolean;
  can_view_performance: boolean;
  can_manage_performance: boolean;
}

interface PermissionSection {
  title: string;
  icon: any;
  color: string;
  permissions: {
    key: keyof DepartmentPermission;
    label: string;
    description: string;
  }[];
}

export function DepartmentPermissions({ userId, userName, onClose, onSave }: DepartmentPermissionsProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Map<string, DepartmentPermission>>(new Map());
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [showEmployeePerms, setShowEmployeePerms] = useState(false);
  const [selectedDeptForEmpPerms, setSelectedDeptForEmpPerms] = useState<{id: string; name: string} | null>(null);

  const permissionSections: PermissionSection[] = [
    {
      title: 'Employee Management',
      icon: Users,
      color: 'blue',
      permissions: [
        {
          key: 'can_view_employees',
          label: 'View Employees',
          description: 'View employee details and profiles',
        },
        {
          key: 'can_edit_employees',
          label: 'Edit Employees',
          description: 'Modify employee information and records',
        },
      ],
    },
    {
      title: 'Attendance',
      icon: Clock,
      color: 'green',
      permissions: [
        {
          key: 'can_view_attendance',
          label: 'View Attendance',
          description: 'View attendance records and reports',
        },
        {
          key: 'can_manage_attendance',
          label: 'Manage Attendance',
          description: 'Mark and edit attendance records',
        },
      ],
    },
    {
      title: 'Leave Management',
      icon: Calendar,
      color: 'purple',
      permissions: [
        {
          key: 'can_view_leaves',
          label: 'View Leave Requests',
          description: 'View all leave requests and history',
        },
        {
          key: 'can_approve_leaves',
          label: 'Approve Leaves',
          description: 'Approve or reject leave requests',
        },
      ],
    },
    {
      title: 'Payroll',
      icon: DollarSign,
      color: 'yellow',
      permissions: [
        {
          key: 'can_view_payroll',
          label: 'View Payroll',
          description: 'View payslips and salary information',
        },
        {
          key: 'can_manage_payroll',
          label: 'Manage Payroll',
          description: 'Process payroll and generate payslips',
        },
      ],
    },
    {
      title: 'Expenses',
      icon: FileText,
      color: 'orange',
      permissions: [
        {
          key: 'can_view_expenses',
          label: 'View Expenses',
          description: 'View expense claims and reports',
        },
        {
          key: 'can_approve_expenses',
          label: 'Approve Expenses',
          description: 'Approve or reject expense claims',
        },
      ],
    },
    {
      title: 'Performance',
      icon: TrendingUp,
      color: 'pink',
      permissions: [
        {
          key: 'can_view_performance',
          label: 'View Performance',
          description: 'View performance reviews and ratings',
        },
        {
          key: 'can_manage_performance',
          label: 'Manage Performance',
          description: 'Create and edit performance reviews',
        },
      ],
    },
  ];

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (deptError) throw deptError;
      setDepartments(deptData || []);

      const { data: permData, error: permError } = await supabase
        .from('user_department_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permError) throw permError;

      const permMap = new Map<string, DepartmentPermission>();
      const selectedSet = new Set<string>();

      (permData || []).forEach((perm) => {
        permMap.set(perm.department_id, {
          department_id: perm.department_id,
          can_view_employees: perm.can_view_employees,
          can_edit_employees: perm.can_edit_employees,
          can_view_attendance: perm.can_view_attendance,
          can_manage_attendance: perm.can_manage_attendance,
          can_view_leaves: perm.can_view_leaves,
          can_approve_leaves: perm.can_approve_leaves,
          can_view_payroll: perm.can_view_payroll,
          can_manage_payroll: perm.can_manage_payroll,
          can_view_expenses: perm.can_view_expenses,
          can_approve_expenses: perm.can_approve_expenses,
          can_view_performance: perm.can_view_performance,
          can_manage_performance: perm.can_manage_performance,
        });
        selectedSet.add(perm.department_id);
      });

      setPermissions(permMap);
      setSelectedDepartments(selectedSet);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (deptId: string) => {
    const newSelected = new Set(selectedDepartments);
    if (newSelected.has(deptId)) {
      newSelected.delete(deptId);
      const newPerms = new Map(permissions);
      newPerms.delete(deptId);
      setPermissions(newPerms);
    } else {
      newSelected.add(deptId);
      const newPerms = new Map(permissions);
      newPerms.set(deptId, {
        department_id: deptId,
        can_view_employees: false,
        can_edit_employees: false,
        can_view_attendance: false,
        can_manage_attendance: false,
        can_view_leaves: false,
        can_approve_leaves: false,
        can_view_payroll: false,
        can_manage_payroll: false,
        can_view_expenses: false,
        can_approve_expenses: false,
        can_view_performance: false,
        can_manage_performance: false,
      });
      setPermissions(newPerms);
    }
    setSelectedDepartments(newSelected);
  };

  const togglePermission = (deptId: string, permKey: keyof DepartmentPermission) => {
    if (permKey === 'department_id') return;

    const newPerms = new Map(permissions);
    const deptPerm = newPerms.get(deptId);
    if (deptPerm) {
      deptPerm[permKey] = !deptPerm[permKey];
      newPerms.set(deptId, deptPerm);
      setPermissions(newPerms);
    }
  };

  const selectAllForDepartment = (deptId: string) => {
    const newPerms = new Map(permissions);
    const deptPerm = newPerms.get(deptId);
    if (deptPerm) {
      Object.keys(deptPerm).forEach((key) => {
        if (key !== 'department_id') {
          (deptPerm as any)[key] = true;
        }
      });
      newPerms.set(deptId, deptPerm);
      setPermissions(newPerms);
    }
  };

  const clearAllForDepartment = (deptId: string) => {
    const newPerms = new Map(permissions);
    const deptPerm = newPerms.get(deptId);
    if (deptPerm) {
      Object.keys(deptPerm).forEach((key) => {
        if (key !== 'department_id') {
          (deptPerm as any)[key] = false;
        }
      });
      newPerms.set(deptId, deptPerm);
      setPermissions(newPerms);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await supabase
        .from('user_department_permissions')
        .delete()
        .eq('user_id', userId);

      const recordsToInsert = Array.from(permissions.entries())
        .filter(([deptId]) => selectedDepartments.has(deptId))
        .map(([deptId, perms]) => ({
          user_id: userId,
          department_id: deptId,
          ...perms,
          assigned_by: profile?.id,
        }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_department_permissions')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'user_department_permissions',
        p_resource_id: userId,
        p_changes: {
          departments: Array.from(selectedDepartments),
          permission_count: recordsToInsert.length,
        },
      });

      showToast('Department permissions updated successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      showToast(error.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
      pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200' },
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Department Permissions</h2>
            <p className="text-blue-100 mt-1">{userName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Department-Scoped Permissions</p>
              <p>
                Select departments and assign specific permissions for each.
                Users will only be able to access and manage data for employees within their assigned departments.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Select Departments</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => toggleDepartment(dept.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                    selectedDepartments.has(dept.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedDepartments.has(dept.id) ? 'bg-blue-500' : 'bg-gray-200'
                  }`}>
                    {selectedDepartments.has(dept.id) ? (
                      <Check className="w-6 h-6 text-white" />
                    ) : (
                      <Building2 className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedDepartments.has(dept.id) ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {dept.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {selectedDepartments.size > 0 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800">Configure Permissions by Department</h3>

              {Array.from(selectedDepartments).map((deptId) => {
                const dept = departments.find((d) => d.id === deptId);
                if (!dept) return null;

                const deptPerms = permissions.get(deptId);
                if (!deptPerms) return null;

                const grantedCount = Object.entries(deptPerms).filter(
                  ([key, value]) => key !== 'department_id' && value === true
                ).length;

                return (
                  <div key={deptId} className="bg-white border-2 border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-gray-800">{dept.name}</h4>
                            <p className="text-sm text-gray-600">{grantedCount} permissions granted</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedDeptForEmpPerms({ id: deptId, name: dept.name });
                              setShowEmployeePerms(true);
                            }}
                            className="px-3 py-1.5 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition flex items-center gap-1"
                          >
                            <UserCog className="w-4 h-4" />
                            Select Employees
                          </button>
                          <button
                            onClick={() => selectAllForDepartment(deptId)}
                            className="px-3 py-1.5 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => clearAllForDepartment(deptId)}
                            className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                          >
                            Clear All
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {permissionSections.map((section) => {
                        const colors = getColorClasses(section.color);
                        const Icon = section.icon;

                        return (
                          <div key={section.title} className={`border-2 ${colors.border} rounded-lg overflow-hidden`}>
                            <div className={`${colors.bg} px-4 py-3 border-b ${colors.border}`}>
                              <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 ${colors.text}`} />
                                <h5 className={`font-bold ${colors.text}`}>{section.title}</h5>
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              {section.permissions.map((perm) => {
                                const isGranted = deptPerms[perm.key] as boolean;

                                return (
                                  <div key={perm.key} className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-800 text-sm">{perm.label}</p>
                                      <p className="text-xs text-gray-500">{perm.description}</p>
                                    </div>
                                    <button
                                      onClick={() => togglePermission(deptId, perm.key)}
                                      className="relative inline-flex items-center flex-shrink-0"
                                    >
                                      <div
                                        className={`w-11 h-6 rounded-full transition-colors ${
                                          isGranted ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                      >
                                        <div
                                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                            isGranted ? 'translate-x-5' : 'translate-x-0'
                                          }`}
                                        />
                                      </div>
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save Permissions
              </>
            )}
          </button>
        </div>
      </div>

      {showEmployeePerms && selectedDeptForEmpPerms && (
        <EmployeePermissions
          userId={userId}
          userName={userName}
          departmentId={selectedDeptForEmpPerms.id}
          departmentName={selectedDeptForEmpPerms.name}
          onClose={() => {
            setShowEmployeePerms(false);
            setSelectedDeptForEmpPerms(null);
          }}
          onSave={() => {
            setShowEmployeePerms(false);
            setSelectedDeptForEmpPerms(null);
          }}
        />
      )}
    </div>
  );
}
