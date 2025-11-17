import { useState, useEffect } from 'react';
import { Clock, User, MapPin, Search, Download, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

interface AttendanceLog {
  id: string;
  log_time: string;
  log_type: string;
  verification_method: string;
  match_score: number | null;
  temperature: number | null;
  processed: boolean;
  employees: {
    employee_number: string;
    users: {
      full_name: string;
    };
  };
  biometric_devices: {
    device_name: string;
    location: string;
  };
}

export function AttendanceLogs() {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [typeFilter, setTypeFilter] = useState('all');
  const { showToast } = useToast();

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel('attendance_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        (payload) => {
          console.log('New attendance log received:', payload);
          const newLog = payload.new;
          const logDate = new Date(newLog.log_time).toISOString().split('T')[0];

          if (logDate === dateFilter && (typeFilter === 'all' || newLog.log_type === typeFilter)) {
            fetchLogs();
            showToast('New attendance log recorded', 'success');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'attendance_logs',
        },
        (payload) => {
          console.log('Attendance log updated:', payload);
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter, typeFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('attendance_logs')
        .select(`
          id,
          log_time,
          log_type,
          verification_method,
          match_score,
          temperature,
          processed,
          employees (
            employee_number,
            users (
              full_name
            )
          ),
          biometric_devices (
            device_name,
            location
          )
        `)
        .gte('log_time', `${dateFilter}T00:00:00`)
        .lte('log_time', `${dateFilter}T23:59:59`)
        .order('log_time', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('log_type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      showToast('Failed to load attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Time', 'Employee', 'Type', 'Method', 'Device', 'Location', 'Score', 'Temperature', 'Status'],
      ...filteredLogs.map(log => [
        new Date(log.log_time).toLocaleString(),
        log.employees.users.full_name,
        log.log_type,
        log.verification_method,
        log.biometric_devices?.device_name || 'N/A',
        log.biometric_devices?.location || 'N/A',
        log.match_score || 'N/A',
        log.temperature || 'N/A',
        log.processed ? 'Processed' : 'Pending',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-logs-${dateFilter}.csv`;
    a.click();
    showToast('Logs exported successfully', 'success');
  };

  const filteredLogs = logs.filter(log =>
    log.employees.users.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.employees.employee_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'check_in': return 'bg-green-100 text-green-800';
      case 'check_out': return 'bg-blue-100 text-blue-800';
      case 'break_start': return 'bg-yellow-100 text-yellow-800';
      case 'break_end': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationColor = (method: string) => {
    switch (method) {
      case 'fingerprint': return 'text-blue-600';
      case 'face': return 'text-purple-600';
      case 'card': return 'text-green-600';
      case 'manual': return 'text-orange-600';
      default: return 'text-gray-600';
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
          <h2 className="text-2xl font-bold text-gray-800">Attendance Logs</h2>
          <p className="text-gray-600 mt-1">
            Real-time attendance tracking from biometric devices
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></span>
              Live
            </span>
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Employee
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or employee number..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="check_in">Check In</option>
              <option value="check_out">Check Out</option>
              <option value="break_start">Break Start</option>
              <option value="break_end">Break End</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Time</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Employee</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Method</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Device</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-gray-500">
                    No attendance logs found for selected date
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-800">
                          {new Date(log.log_time).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            {log.employees.users.full_name}
                          </p>
                          <p className="text-xs text-gray-500">{log.employees.employee_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getLogTypeColor(log.log_type)}`}
                      >
                        {log.log_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-sm font-medium capitalize ${getVerificationColor(log.verification_method)}`}>
                        {log.verification_method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.biometric_devices ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-800">{log.biometric_devices.device_name}</p>
                            <p className="text-xs text-gray-500">{log.biometric_devices.location}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Manual</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.match_score ? (
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                log.match_score >= 90 ? 'bg-green-600' :
                                log.match_score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${log.match_score}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{log.match_score}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">N/A</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.processed ? (
                        <span className="text-sm text-green-600 font-medium">Processed</span>
                      ) : (
                        <span className="text-sm text-orange-600 font-medium">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredLogs.length} logs for {new Date(dateFilter).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
