import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee, LeaveType, EmployeeLeaveAllocation } from '../../types';
import { Calendar, Save, Plus, Edit2 } from 'lucide-react';

export function LeaveAllocationManagement() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [allocations, setAllocations] = useState<EmployeeLeaveAllocation[]>([]);
  const [currentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchAllocations(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchData = async () => {
    try {
      const [employeesData, leaveTypesData] = await Promise.all([
        supabase
          .from('employees')
          .select('*, users(full_name, email)')
          .eq('status', 'active')
          .order('created_at', { ascending: false }),
        supabase
          .from('leave_types')
          .select('*')
          .order('name'),
      ]);

      if (employeesData.error) throw employeesData.error;
      if (leaveTypesData.error) throw leaveTypesData.error;

      setEmployees(employeesData.data || []);
      setLeaveTypes(leaveTypesData.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllocations = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('employee_leave_allocations')
        .select('*, leave_types(name, color)')
        .eq('employee_id', employeeId)
        .eq('year', currentYear);

      if (error) throw error;

      const existingAllocations = data || [];
      const allAllocations = leaveTypes.map(leaveType => {
        const existing = existingAllocations.find(a => a.leave_type_id === leaveType.id);
        if (existing) {
          return existing;
        }
        return {
          id: '',
          employee_id: employeeId,
          leave_type_id: leaveType.id,
          year: currentYear,
          allocated_days: leaveType.annual_quota,
          used_days: 0,
          remaining_days: leaveType.annual_quota,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          leave_types: {
            name: leaveType.name,
            color: '#3B82F6',
          },
        } as EmployeeLeaveAllocation;
      });

      setAllocations(allAllocations);
    } catch (error) {
      console.error('Error fetching allocations:', error);
    }
  };

  const handleAllocationChange = (leaveTypeId: string, allocatedDays: number) => {
    setAllocations(prev => prev.map(allocation =>
      allocation.leave_type_id === leaveTypeId
        ? {
            ...allocation,
            allocated_days: allocatedDays,
            remaining_days: allocatedDays - allocation.used_days,
          }
        : allocation
    ));
  };

  const handleSaveAllocations = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      for (const allocation of allocations) {
        if (allocation.id) {
          const { error } = await supabase
            .from('employee_leave_allocations')
            .update({
              allocated_days: allocation.allocated_days,
              updated_at: new Date().toISOString(),
            })
            .eq('id', allocation.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('employee_leave_allocations')
            .insert({
              employee_id: selectedEmployee,
              leave_type_id: allocation.leave_type_id,
              year: currentYear,
              allocated_days: allocation.allocated_days,
              used_days: 0,
            });

          if (error) throw error;
        }
      }

      alert('Leave allocations saved successfully!');
      fetchAllocations(selectedEmployee);
    } catch (error: any) {
      console.error('Error saving allocations:', error);
      alert(error.message || 'Failed to save allocations');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Leave Allocation Management</h2>
        <p className="text-gray-600">Assign and manage leave quotas for employees</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Employee
        </label>
        <select
          value={selectedEmployee}
          onChange={(e) => setSelectedEmployee(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Choose an employee...</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>
              {emp.users?.full_name} - {emp.position}
            </option>
          ))}
        </select>
      </div>

      {selectedEmployee && allocations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Leave Allocations for {currentYear}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Allocated Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Used Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remaining Days</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocations.map((allocation) => (
                  <tr key={allocation.leave_type_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: allocation.leave_types?.color || '#3B82F6' }}
                        ></div>
                        <span className="font-medium text-gray-900">{allocation.leave_types?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        min="0"
                        value={allocation.allocated_days}
                        onChange={(e) => handleAllocationChange(allocation.leave_type_id, parseInt(e.target.value) || 0)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-gray-900">{allocation.used_days}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${
                        allocation.remaining_days > 5 ? 'text-green-600' :
                        allocation.remaining_days > 0 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {allocation.remaining_days}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleSaveAllocations}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Allocations'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
