import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Attendance } from '../../types';
import { Clock, Calendar, Fingerprint, Activity, Settings, CalendarClock, Plus, Edit2, User, BarChart, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DeviceManagement } from '../Biometric/DeviceManagement';
import { BiometricEnrollment } from '../Biometric/BiometricEnrollment';
import { AttendanceLogs } from '../Biometric/AttendanceLogs';
import { ScheduleManagement } from './ScheduleManagement';
import { ManualAttendanceEntry } from './ManualAttendanceEntry';
import { AttendanceDashboard } from './AttendanceDashboard';
import { AbsenceManagement } from './AbsenceManagement';
import { canEditAttendance } from '../../lib/permissions';

export function AttendanceView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    checkEditPermission();
  }, [profile]);

  useEffect(() => {
    fetchAttendance();
    fetchTodayAttendance();
  }, [selectedDate]);

  const checkEditPermission = async () => {
    if (!profile?.id) return;
    const hasPermission = await canEditAttendance(profile.id);
    setCanEdit(hasPermission);
  };

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(
            id,
            users(full_name, email)
          ),
          entered_by_user:users!attendance_entered_by_fkey(full_name)
        `)
        .eq('date', selectedDate)
        .order('check_in', { ascending: false });

      if (error) throw error;
      setAttendance(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!empData) return;

      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('employee_id', empData.id)
        .eq('date', today)
        .maybeSingle();

      setTodayAttendance(data);
    } catch (error) {
      console.error('Error fetching today attendance:', error);
    }
  };

  const handleCheckIn = async () => {
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

      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('attendance')
        .insert({
          employee_id: empData.id,
          date: today,
          check_in: new Date().toISOString(),
          status: 'present',
          entry_source: 'fingerprint',
        });

      if (error) throw error;
      fetchTodayAttendance();
      alert('Checked in successfully!');
    } catch (error: any) {
      console.error('Error checking in:', error);
      alert(error.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async () => {
    try {
      if (!todayAttendance) return;

      const { error } = await supabase
        .from('attendance')
        .update({ check_out: new Date().toISOString() })
        .eq('id', todayAttendance.id);

      if (error) throw error;
      fetchTodayAttendance();
      alert('Checked out successfully!');
    } catch (error: any) {
      console.error('Error checking out:', error);
      alert(error.message || 'Failed to check out');
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setShowManualEntry(true);
  };

  const handleCloseModal = () => {
    setShowManualEntry(false);
    setEditingRecord(null);
  };

  const handleSuccess = () => {
    fetchAttendance();
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart },
    { id: 'overview', label: 'Daily View', icon: Clock },
    { id: 'logs', label: 'Live Logs', icon: Activity },
    ...(isAdmin ? [
      { id: 'absences', label: 'Absences', icon: AlertTriangle },
      { id: 'schedules', label: 'Schedules', icon: CalendarClock },
      { id: 'devices', label: 'Devices', icon: Settings },
      { id: 'enrollment', label: 'Enrollment', icon: Fingerprint },
    ] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Attendance Management</h1>
          <p className="text-gray-600">Biometric attendance tracking with fingerprint devices</p>
        </div>
        {canEdit && activeTab === 'overview' && (
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Manual Entry</span>
          </button>
        )}
      </div>

      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'dashboard' && <AttendanceDashboard />}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">Today's Status</h3>
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              {todayAttendance ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Check In</p>
                    <p className="text-lg font-semibold text-gray-800">{formatTime(todayAttendance.check_in)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Check Out</p>
                    <p className="text-lg font-semibold text-gray-800">{formatTime(todayAttendance.check_out)}</p>
                  </div>
                  {!todayAttendance.check_out && (
                    <button
                      onClick={handleCheckOut}
                      className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition"
                    >
                      Check Out
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleCheckIn}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition"
                >
                  Check In
                </button>
              )}
            </div>

            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">View Attendance</h3>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Attendance Records - {selectedDate}</h3>
                {!canEdit && profile?.role === 'super_user' && (
                  <p className="text-xs text-gray-500 italic">
                    View only - Contact admin for edit permissions
                  </p>
                )}
              </div>
              {isAdmin && (
                <p className="text-xs text-gray-600 mt-2">
                  Note: Super users can only edit attendance if granted "Manage Attendance" permission in User Management
                </p>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                    {canEdit && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendance.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {record.employees?.users?.full_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.check_in)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.check_out)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          record.status === 'present' ? 'bg-green-100 text-green-800' :
                          record.status === 'absent' ? 'bg-red-100 text-red-800' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          {record.entry_source === 'fingerprint' ? (
                            <>
                              <Fingerprint className="w-4 h-4 text-green-600" />
                              <span className="text-green-600 font-medium">Auto</span>
                            </>
                          ) : (
                            <>
                              <Edit2 className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-600 font-medium">Manual</span>
                              {record.entered_by_user && (
                                <span className="text-xs text-gray-500">
                                  by {record.entered_by_user.full_name}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEdit(record)}
                            className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendance.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No attendance records for this date</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'logs' && <AttendanceLogs />}
      {activeTab === 'absences' && <AbsenceManagement />}
      {activeTab === 'schedules' && <ScheduleManagement />}
      {activeTab === 'devices' && <DeviceManagement />}
      {activeTab === 'enrollment' && <BiometricEnrollment />}

      {showManualEntry && (
        <ManualAttendanceEntry
          onClose={handleCloseModal}
          onSuccess={handleSuccess}
          editingRecord={editingRecord}
        />
      )}
    </div>
  );
}
