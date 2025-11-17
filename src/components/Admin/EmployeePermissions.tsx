import { useState, useEffect } from 'react';
import { Users, X, Check, Search, Eye, EyeOff, Edit, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';

interface EmployeePermissionsProps {
  userId: string;
  userName: string;
  departmentId: string;
  departmentName: string;
  onClose: () => void;
  onSave: () => void;
}

interface Employee {
  id: string;
  employee_number: string;
  position: string;
  users: {
    full_name: string;
    email: string;
  };
}

interface EmployeePermission {
  employee_id: string;
  can_view: boolean;
  can_edit: boolean;
}

export function EmployeePermissions({
  userId,
  userName,
  departmentId,
  departmentName,
  onClose,
  onSave
}: EmployeePermissionsProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [permissions, setPermissions] = useState<Map<string, EmployeePermission>>(new Map());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, [userId, departmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          position,
          users!inner(full_name, email)
        `)
        .eq('department_id', departmentId)
        .eq('status', 'active')
        .order('users(full_name)');

      if (empError) throw empError;
      setEmployees(empData || []);

      const { data: permData, error: permError } = await supabase
        .from('user_employee_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permError) throw permError;

      const permMap = new Map<string, EmployeePermission>();
      (permData || []).forEach((perm) => {
        permMap.set(perm.employee_id, {
          employee_id: perm.employee_id,
          can_view: perm.can_view,
          can_edit: perm.can_edit,
        });
      });

      setPermissions(permMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Failed to load employee permissions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleEmployee = (employeeId: string) => {
    const newPerms = new Map(permissions);
    if (newPerms.has(employeeId)) {
      newPerms.delete(employeeId);
    } else {
      newPerms.set(employeeId, {
        employee_id: employeeId,
        can_view: true,
        can_edit: false,
      });
    }
    setPermissions(newPerms);
  };

  const toggleViewPermission = (employeeId: string) => {
    const newPerms = new Map(permissions);
    const perm = newPerms.get(employeeId);
    if (perm) {
      perm.can_view = !perm.can_view;
      if (!perm.can_view) {
        perm.can_edit = false;
      }
      newPerms.set(employeeId, perm);
      setPermissions(newPerms);
    }
  };

  const toggleEditPermission = (employeeId: string) => {
    const newPerms = new Map(permissions);
    const perm = newPerms.get(employeeId);
    if (perm) {
      perm.can_edit = !perm.can_edit;
      if (perm.can_edit && !perm.can_view) {
        perm.can_view = true;
      }
      newPerms.set(employeeId, perm);
      setPermissions(newPerms);
    }
  };

  const selectAll = () => {
    const newPerms = new Map(permissions);
    filteredEmployees.forEach((emp) => {
      if (!newPerms.has(emp.id)) {
        newPerms.set(emp.id, {
          employee_id: emp.id,
          can_view: true,
          can_edit: false,
        });
      }
    });
    setPermissions(newPerms);
  };

  const clearAll = () => {
    setPermissions(new Map());
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const employeeIdsInDept = employees.map(e => e.id);

      await supabase
        .from('user_employee_permissions')
        .delete()
        .eq('user_id', userId)
        .in('employee_id', employeeIdsInDept);

      const recordsToInsert = Array.from(permissions.entries())
        .filter(([empId]) => employeeIdsInDept.includes(empId))
        .map(([empId, perms]) => ({
          user_id: userId,
          employee_id: empId,
          can_view: perms.can_view,
          can_edit: perms.can_edit,
          assigned_by: profile?.id,
        }));

      if (recordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_employee_permissions')
          .insert(recordsToInsert);

        if (insertError) throw insertError;
      }

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'user_employee_permissions',
        p_resource_id: userId,
        p_changes: {
          department: departmentName,
          employee_count: recordsToInsert.length,
        },
      });

      showToast('Employee permissions updated successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving permissions:', error);
      showToast(error.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCount = Array.from(permissions.keys()).filter(empId =>
    employees.some(e => e.id === empId)
  ).length;

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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Employee-Level Permissions</h2>
            <p className="text-blue-100 mt-1">{userName} • {departmentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UserCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Granular Employee Access</p>
                <p>
                  Select specific employees from {departmentName} that this user can view or manage.
                  This provides fine-grained control beyond department-level permissions.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-4 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="mb-4 text-sm text-gray-600">
            {selectedCount} of {employees.length} employees selected
          </div>

          <div className="space-y-2">
            {filteredEmployees.map((emp) => {
              const perm = permissions.get(emp.id);
              const isSelected = !!perm;

              return (
                <div
                  key={emp.id}
                  className={`border-2 rounded-lg p-4 transition ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleEmployee(emp.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-semibold text-gray-800">{emp.users.full_name}</p>
                        <p className="text-sm text-gray-500">
                          {emp.employee_number} • {emp.position}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleViewPermission(emp.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition ${
                            perm?.can_view
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={perm?.can_view ? 'Can view' : 'Cannot view'}
                        >
                          {perm?.can_view ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          View
                        </button>
                        <button
                          onClick={() => toggleEditPermission(emp.id)}
                          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition ${
                            perm?.can_edit
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={perm?.can_edit ? 'Can edit' : 'Cannot edit'}
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No employees found matching your search</p>
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
    </div>
  );
}
