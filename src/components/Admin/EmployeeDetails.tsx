import { useState, useEffect } from 'react';
import { X, Calendar, Clock, DollarSign, Briefcase, User, TrendingUp, FileText, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePreferences } from '../../contexts/PreferencesContext';

interface EmployeeDetailsProps {
  userId: string;
  onClose: () => void;
}

interface Employee {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  position: string;
  department: { name: string } | null;
  salary: number;
  hire_date: string;
  status: string;
  employment_type: string;
}

interface AttendanceRecord {
  id: string;
  check_in: string;
  check_out: string | null;
  status: string;
  notes: string | null;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  reason: string;
}

interface PayslipRecord {
  id: string;
  period_start: string;
  period_end: string;
  net_pay: number;
  status: string;
}

export function EmployeeDetails({ userId, onClose }: EmployeeDetailsProps) {
  const { formatCurrency: formatCurrencyPref } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [payslips, setPayslips] = useState<PayslipRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'leaves' | 'payroll'>('overview');

  useEffect(() => {
    fetchEmployeeData();
  }, [userId]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);

      console.log('Fetching employee data for user ID:', userId);

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          employee_number,
          position,
          employment_type,
          hire_date,
          status,
          salary,
          department_id,
          departments(name),
          users(full_name, email, phone)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      console.log('Employee query result:', { empData, empError });

      if (empError) {
        console.error('Error fetching employee:', empError);
        alert('Error loading employee data: ' + empError.message);
        setLoading(false);
        return;
      }

      if (!empData) {
        console.error('No employee record found for user:', userId);
        setLoading(false);
        return;
      }

      const userData = Array.isArray(empData.users) ? empData.users[0] : empData.users;
      const deptData = Array.isArray(empData.departments) ? empData.departments[0] : empData.departments;

      console.log('Parsed data:', { userData, deptData });

      setEmployee({
        id: empData.id,
        employee_id: empData.employee_number,
        full_name: userData?.full_name || 'Unknown',
        email: userData?.email || 'No email',
        phone: userData?.phone || null,
        position: empData.position,
        department: deptData ? { name: deptData.name } : null,
        salary: parseFloat(empData.salary) || 0,
        hire_date: empData.hire_date,
        status: empData.status,
        employment_type: empData.employment_type,
      });

      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empData.id)
        .order('check_in', { ascending: false })
        .limit(10);

      setAttendance(attData || []);

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select(`
          *,
          leave_types(name)
        `)
        .eq('employee_id', empData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setLeaves(leaveData || []);

      const { data: payslipData } = await supabase
        .from('payslips')
        .select(`
          *,
          payroll_periods(start_date, end_date, month, year)
        `)
        .eq('employee_id', empData.id)
        .order('created_at', { ascending: false })
        .limit(6);

      setPayslips(payslipData || []);

    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeaveStatus = async (leaveId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: newStatus })
        .eq('id', leaveId);

      if (error) throw error;

      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: newStatus === 'approved' ? 'success' : 'warning',
        p_category: 'leave',
        p_title: `Leave Request ${newStatus}`,
        p_message: `Your leave request has been ${newStatus}.`
      });

      fetchEmployeeData();
    } catch (error) {
      console.error('Error updating leave status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      on_leave: 'bg-yellow-100 text-yellow-800',
      terminated: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800',
      late: 'bg-orange-100 text-orange-800',
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = formatCurrencyPref;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <div className="text-center">
            <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Employee Record</h3>
            <p className="text-gray-600 mb-4">
              This user does not have an employee record yet. Employee records are created automatically when a user is assigned to a department.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{employee.full_name}</h2>
              <p className="text-blue-100">{employee.position} • {employee.department?.name || 'No Department'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6 bg-gray-50">
          {['overview', 'attendance', 'leaves', 'payroll'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-3 font-medium capitalize transition ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    <h3 className="font-semibold text-gray-700">Monthly Salary</h3>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(employee.salary)}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-6 h-6 text-green-600" />
                    <h3 className="font-semibold text-gray-700">Hire Date</h3>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {new Date(employee.hire_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {Math.floor((Date.now() - new Date(employee.hire_date).getTime()) / (1000 * 60 * 60 * 24 * 365))} years
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Briefcase className="w-6 h-6 text-purple-600" />
                    <h3 className="font-semibold text-gray-700">Employment Type</h3>
                  </div>
                  <p className="text-xl font-bold text-purple-600 capitalize">{employee.employment_type.replace('_', ' ')}</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${getStatusBadge(employee.status)}`}>
                    {employee.status}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-800">{employee.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-800">{employee.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Employee ID</p>
                    <p className="font-medium text-gray-800">{employee.employee_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Department</p>
                    <p className="font-medium text-gray-800">{employee.department?.name || 'No Department'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{attendance.length}</p>
                  <p className="text-sm text-gray-600">Recent Check-ins</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <Calendar className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{leaves.filter(l => l.status === 'approved').length}</p>
                  <p className="text-sm text-gray-600">Approved Leaves</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                  <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{payslips.length}</p>
                  <p className="text-sm text-gray-600">Payslips Generated</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Recent Attendance Records</h3>
              {attendance.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No attendance records found</p>
              ) : (
                <div className="space-y-3">
                  {attendance.map((record) => (
                    <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {new Date(record.check_in).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              Check-in: {new Date(record.check_in).toLocaleTimeString()}
                              {record.check_out && ` • Check-out: ${new Date(record.check_out).toLocaleTimeString()}`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                      {record.notes && (
                        <p className="text-sm text-gray-600 mt-2 ml-9">{record.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaves' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Leave Requests</h3>
              {leaves.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No leave requests found</p>
              ) : (
                <div className="space-y-3">
                  {leaves.map((leave) => (
                    <div key={leave.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-4">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-800 capitalize">{leave.leave_types?.name || 'Leave'}</p>
                            <p className="text-sm text-gray-600">
                              {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                              {leave.days_count && ` (${leave.days_count} days)`}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(leave.status)}`}>
                          {leave.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{leave.reason}</p>
                      {leave.status === 'pending' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateLeaveStatus(leave.id, 'approved')}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateLeaveStatus(leave.id, 'rejected')}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Payslip History</h3>
              {payslips.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No payslips found</p>
              ) : (
                <div className="space-y-3">
                  {payslips.map((payslip) => (
                    <div key={payslip.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-800">
                              {payslip.payroll_periods ?
                                `${new Date(payslip.payroll_periods.start_date).toLocaleDateString()} - ${new Date(payslip.payroll_periods.end_date).toLocaleDateString()}`
                                : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Net Pay: <span className="font-semibold text-green-600">{formatCurrency(parseFloat(payslip.net_pay) || 0)}</span>
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(payslip.status)}`}>
                          {payslip.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
