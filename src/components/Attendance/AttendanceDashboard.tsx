import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import {
  Clock, Calendar, TrendingUp, AlertCircle, CheckCircle,
  XCircle, Coffee, User, Users, BarChart3, PieChart
} from 'lucide-react';

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  leave: number;
  halfDay: number;
  onTime: number;
  avgHours: number;
  totalEmployees: number;
}

interface MonthlyStats {
  month: string;
  present: number;
  absent: number;
  leaves: number;
}

export function AttendanceDashboard() {
  const { profile } = useAuth();
  const { formatDate, formatTime } = usePreferences();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<AttendanceStats>({
    present: 0,
    absent: 0,
    late: 0,
    leave: 0,
    halfDay: 0,
    onTime: 0,
    avgHours: 0,
    totalEmployees: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel('attendance_dashboard_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          console.log('New attendance record:', payload);
          const today = new Date().toISOString().split('T')[0];
          const recordDate = payload.new.date;

          if (recordDate === today) {
            fetchTodayStats();
            fetchRecentAttendance();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance',
        },
        (payload) => {
          console.log('Attendance updated:', payload);
          fetchTodayStats();
          fetchRecentAttendance();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        (payload) => {
          console.log('New attendance log:', payload);
          fetchTodayStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMonth]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchTodayStats(),
        fetchMonthlyStats(),
        fetchRecentAttendance(),
        fetchEmployeeStats(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: summary, error } = await supabase
        .from('attendance_summary')
        .select('*')
        .eq('date', today);

      if (error) throw error;

      const { count: totalEmployees } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true });

      const stats: AttendanceStats = {
        present: summary?.filter(s => s.status === 'present').length || 0,
        absent: summary?.filter(s => s.status === 'absent').length || 0,
        late: summary?.filter(s => s.late_by_minutes > 5).length || 0,
        leave: summary?.filter(s => s.is_leave).length || 0,
        halfDay: summary?.filter(s => s.status === 'half_day').length || 0,
        onTime: summary?.filter(s => s.late_by_minutes <= 5 && s.status === 'present').length || 0,
        avgHours: summary?.reduce((acc, s) => acc + (parseFloat(s.total_hours) || 0), 0) / (summary?.length || 1),
        totalEmployees: totalEmployees || 0,
      };

      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching today stats:', error);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_summary')
        .select('date, status, is_leave')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const statsByDate: Record<string, { present: number; absent: number; leaves: number }> = {};

      data?.forEach((record) => {
        const month = record.date.slice(0, 7);
        if (!statsByDate[month]) {
          statsByDate[month] = { present: 0, absent: 0, leaves: 0 };
        }

        if (record.is_leave) {
          statsByDate[month].leaves++;
        } else if (record.status === 'present') {
          statsByDate[month].present++;
        } else if (record.status === 'absent') {
          statsByDate[month].absent++;
        }
      });

      const stats = Object.entries(statsByDate).map(([month, data]) => ({
        month,
        ...data,
      }));

      setMonthlyStats(stats);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    }
  };

  const fetchRecentAttendance = async () => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          employees!inner(
            id,
            employee_number,
            users(full_name)
          )
        `)
        .order('check_in', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentAttendance(data || []);
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
    }
  };

  const fetchEmployeeStats = async () => {
    try {
      const { data: empData } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (!empData) return;

      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(new Date(startOfMonth).getFullYear(), new Date(startOfMonth).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('attendance_summary')
        .select('*')
        .eq('employee_id', empData.id)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth);

      if (error) throw error;

      const stats = {
        totalDays: data?.length || 0,
        present: data?.filter(d => d.status === 'present').length || 0,
        absent: data?.filter(d => d.status === 'absent').length || 0,
        leaves: data?.filter(d => d.is_leave).length || 0,
        late: data?.filter(d => d.late_by_minutes > 5).length || 0,
        avgHours: data?.reduce((acc, d) => acc + (parseFloat(d.total_hours) || 0), 0) / (data?.length || 1),
        totalOvertime: data?.reduce((acc, d) => acc + (d.overtime_minutes || 0), 0) || 0,
      };

      setEmployeeStats(stats);
    } catch (error) {
      console.error('Error fetching employee stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'leave': return 'bg-blue-100 text-blue-800';
      case 'half_day': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Attendance Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Overview and analytics
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Live Updates
            </span>
          </p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present Today</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{todayStats.present}</p>
              <p className="text-xs text-gray-500 mt-1">Out of {todayStats.totalEmployees}</p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent Today</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{todayStats.absent}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((todayStats.absent / todayStats.totalEmployees) * 100).toFixed(1)}% of total
              </p>
            </div>
            <XCircle className="w-12 h-12 text-red-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Late Arrivals</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{todayStats.late}</p>
              <p className="text-xs text-gray-500 mt-1">More than 5 min late</p>
            </div>
            <AlertCircle className="w-12 h-12 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">On Leave</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{todayStats.leave}</p>
              <p className="text-xs text-gray-500 mt-1">Approved leaves</p>
            </div>
            <Coffee className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </div>
      </div>

      {employeeStats && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            My Attendance Summary - {new Date(selectedMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{employeeStats.present}</p>
              <p className="text-sm text-gray-600">Present Days</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{employeeStats.absent}</p>
              <p className="text-sm text-gray-600">Absent Days</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{employeeStats.leaves}</p>
              <p className="text-sm text-gray-600">Leaves Taken</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{employeeStats.late}</p>
              <p className="text-sm text-gray-600">Late Arrivals</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{employeeStats.avgHours.toFixed(1)}h</p>
              <p className="text-sm text-gray-600">Avg Hours/Day</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600">{Math.floor(employeeStats.totalOvertime / 60)}h</p>
              <p className="text-sm text-gray-600">Total Overtime</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">
                {((employeeStats.present / employeeStats.totalDays) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Attendance Rate</p>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <p className="text-2xl font-bold text-teal-600">{employeeStats.totalDays}</p>
              <p className="text-sm text-gray-600">Working Days</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Monthly Trends
          </h3>
          {monthlyStats.length > 0 ? (
            <div className="space-y-3">
              {monthlyStats.map((stat, index) => (
                <div key={index} className="border-b pb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {new Date(stat.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Present</span>
                        <span>{stat.present}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(stat.present / (stat.present + stat.absent + stat.leaves)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Absent</span>
                        <span>{stat.absent}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${(stat.absent / (stat.present + stat.absent + stat.leaves)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Leave</span>
                        <span>{stat.leaves}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${(stat.leaves / (stat.present + stat.absent + stat.leaves)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No data available</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentAttendance.map((record) => (
              <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getStatusColor(record.status)}`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{record.employees?.users?.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {record.check_in && formatTime(record.check_in)}
                      {record.check_out && ` - ${formatTime(record.check_out)}`}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
