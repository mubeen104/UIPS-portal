import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../../types';
import { Plus, Search, Edit, Trash2, Mail, Phone, Upload } from 'lucide-react';
import { EmployeeForm } from './EmployeeForm';
import { BulkImport } from './BulkImport';
import { useAuth } from '../../contexts/AuthContext';
import { getUserAccessibleEmployeeIds, isAdmin } from '../../lib/permissions';

export function EmployeesView() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    if (profile) {
      fetchEmployees();
    }
  }, [profile]);

  const fetchEmployees = async () => {
    try {
      if (!profile) return;

      let query = supabase
        .from('employees')
        .select(`
          *,
          users (full_name, email, phone),
          departments (name)
        `);

      if (isAdmin(profile.role)) {
        query = query.order('created_at', { ascending: false });
      } else {
        const accessibleEmployeeIds = await getUserAccessibleEmployeeIds(profile.id);
        if (accessibleEmployeeIds.length === 0) {
          setEmployees([]);
          setLoading(false);
          return;
        }
        query = query.in('id', accessibleEmployeeIds).order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this employee?')) return;

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.users?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (showForm) {
    return (
      <EmployeeForm
        employee={selectedEmployee}
        onClose={() => {
          setShowForm(false);
          setSelectedEmployee(null);
        }}
        onSave={() => {
          setShowForm(false);
          setSelectedEmployee(null);
          fetchEmployees();
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Employees</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage your organization's workforce</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-3 sm:px-4 py-2.5 rounded-lg transition touch-manipulation min-h-[44px] flex-1 sm:flex-initial justify-center"
          >
            <Upload className="w-5 h-5" />
            <span className="text-sm sm:text-base">Bulk Import</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-3 sm:px-4 py-2.5 rounded-lg transition touch-manipulation min-h-[44px] flex-1 sm:flex-initial justify-center"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm sm:text-base">Add Employee</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 sm:p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.users?.full_name}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center space-x-3">
                        <span className="flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {employee.users?.email}
                        </span>
                        {employee.users?.phone && (
                          <span className="flex items-center">
                            <Phone className="w-3 h-3 mr-1" />
                            {employee.users.phone}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">#{employee.employee_number}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.position}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{employee.departments?.name || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 capitalize">
                      {employee.employment_type.replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedEmployee(employee);
                          setShowForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No employees found</p>
            </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-gray-500">No employees found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <div key={employee.id} className="p-4 hover:bg-gray-50 active:bg-gray-100 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate text-base">
                        {employee.users?.full_name}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{employee.position}</p>
                      <p className="text-xs text-gray-400 mt-0.5">#{employee.employee_number}</p>
                    </div>
                    <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full flex-shrink-0 ml-2 ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{employee.users?.email}</span>
                    </div>
                    {employee.users?.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>{employee.users.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Department:</span>
                      <span>{employee.departments?.name || 'N/A'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium mr-2">Type:</span>
                      <span className="capitalize">{employee.employment_type.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedEmployee(employee);
                        setShowForm(true);
                      }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition touch-manipulation min-h-[44px]"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm font-medium">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(employee.id)}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 rounded-lg transition touch-manipulation min-h-[44px]"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showBulkImport && (
        <BulkImport
          onClose={() => setShowBulkImport(false)}
          onImportComplete={() => {
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
}
