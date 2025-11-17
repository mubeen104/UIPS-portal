import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LeaveRequest, LeaveType, EmployeeLeaveAllocation } from '../../types';
import { Calendar, Plus, Check, X, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LeaveAllocationManagement } from './LeaveAllocationManagement';

export function LeavesView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [allocations, setAllocations] = useState<EmployeeLeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    fetchData();
  }, [profile]);

  const fetchData = async () => {
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      const currentYear = new Date().getFullYear();

      const queries = [
        supabase
          .from('leave_requests')
          .select(`
            *,
            leave_types (name, color),
            employees (users (full_name))
          `)
          .order('created_at', { ascending: false }),
        supabase.from('leave_types').select('*'),
      ];

      if (empData) {
        queries.push(
          supabase
            .from('employee_leave_allocations')
            .select('*, leave_types (name, color)')
            .eq('employee_id', empData.id)
            .eq('year', currentYear)
        );
      }

      const results = await Promise.all(queries);

      setLeaves(results[0].data || []);
      setLeaveTypes(results[1].data || []);
      if (results[2]) {
        setAllocations(results[2].data || []);
      }
    } catch (error) {
      console.error('Error fetching leave data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!empData) {
        alert('Employee record not found');
        return;
      }

      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from('leave_requests').insert({
        employee_id: empData.id,
        leave_type_id: formData.leave_type_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        days_count: days,
        reason: formData.reason,
        status: 'pending',
      });

      if (error) throw error;
      setShowForm(false);
      setFormData({ leave_type_id: '', start_date: '', end_date: '', reason: '' });
      fetchData();
      alert('Leave request submitted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to submit leave request');
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({
          status,
          approver_id: profile?.id,
          approval_date: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to update leave request');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const canApproveLeaves = profile?.role === 'admin' || profile?.role === 'super_user';
  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Leave Management</h1>
          <p className="text-gray-600">Manage employee leave requests and allocations</p>
        </div>
        {activeTab === 'requests' && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span>Request Leave</span>
          </button>
        )}
      </div>

      {isAdmin && (
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('requests')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'requests'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Leave Requests
            </button>
            <button
              onClick={() => setActiveTab('allocations')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                activeTab === 'allocations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-5 h-5" />
              Manage Allocations
            </button>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <>
          {allocations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {allocations.map((allocation) => (
                <div key={allocation.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: allocation.leave_types?.color || '#3B82F6' }}
                      ></div>
                      <h3 className="font-semibold text-gray-800">{allocation.leave_types?.name}</h3>
                    </div>
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">
                      Available: <span className="font-semibold text-green-600">{allocation.remaining_days} days</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Used: <span className="font-semibold text-red-600">{allocation.used_days} days</span>
                    </p>
                    <p className="text-sm text-gray-600">Total: {allocation.allocated_days} days</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Leave Requests</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canApproveLeaves && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.employees?.users?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.leave_types?.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(leave.start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(leave.end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {leave.days_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                      </td>
                      {canApproveLeaves && leave.status === 'pending' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleApproval(leave.id, 'approved')}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleApproval(leave.id, 'rejected')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaves.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No leave requests found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'allocations' && isAdmin && <LeaveAllocationManagement />}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Request Leave</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    required
                    value={formData.leave_type_id}
                    onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>{type.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Submit Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
