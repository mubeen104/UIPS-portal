import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/useToast';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Calendar, User } from 'lucide-react';

interface AbsenceRecord {
  id: string;
  employee_id: string;
  date: string;
  absence_type: string;
  leave_deducted: boolean;
  leave_type_id: string | null;
  days_deducted: number;
  notes: string | null;
  processed_at: string;
  employees: {
    employee_number: string;
    users: {
      full_name: string;
    };
  };
  leave_types: {
    name: string;
  } | null;
}

export function AbsenceManagement() {
  const { profile } = useAuth();
  const { formatDate } = usePreferences();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [stats, setStats] = useState({
    total: 0,
    deducted: 0,
    pending: 0,
    totalDaysDeducted: 0,
  });

  useEffect(() => {
    fetchAbsences();
  }, [selectedMonth]);

  const fetchAbsences = async () => {
    try {
      setLoading(true);
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(
        new Date(startDate).getFullYear(),
        new Date(startDate).getMonth() + 1,
        0
      ).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('absence_records')
        .select(`
          *,
          employees!inner(
            employee_number,
            users(full_name)
          ),
          leave_types(name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      setAbsences(data || []);

      const totalAbsences = data?.length || 0;
      const deducted = data?.filter((a) => a.leave_deducted).length || 0;
      const totalDays = data?.reduce((acc, a) => acc + parseFloat(a.days_deducted), 0) || 0;

      setStats({
        total: totalAbsences,
        deducted,
        pending: totalAbsences - deducted,
        totalDaysDeducted: totalDays,
      });
    } catch (error: any) {
      console.error('Error fetching absences:', error);
      showToast(error.message || 'Failed to fetch absences', 'error');
    } finally {
      setLoading(false);
    }
  };

  const processAbsences = async () => {
    try {
      setProcessing(true);
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-daily-attendance`;

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to process absences');
      }

      showToast('Absences processed successfully', 'success');
      fetchAbsences();
    } catch (error: any) {
      console.error('Error processing absences:', error);
      showToast(error.message || 'Failed to process absences', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const removeAbsence = async (id: string) => {
    if (!confirm('Are you sure you want to remove this absence record?')) return;

    try {
      const { error } = await supabase
        .from('absence_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast('Absence record removed', 'success');
      fetchAbsences();
    } catch (error: any) {
      console.error('Error removing absence:', error);
      showToast(error.message || 'Failed to remove absence', 'error');
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
          <h2 className="text-2xl font-bold text-gray-800">Absence Management</h2>
          <p className="text-gray-600 mt-1">Track and manage employee absences</p>
        </div>
        <div className="flex gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={processAbsences}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            <RefreshCw className={`w-5 h-5 ${processing ? 'animate-spin' : ''}`} />
            Process Yesterday
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Absences</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-blue-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Leave Deducted</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.deducted}</p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.pending}</p>
            </div>
            <XCircle className="w-10 h-10 text-yellow-500 opacity-20" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Days Deducted</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{stats.totalDaysDeducted}</p>
            </div>
            <Calendar className="w-10 h-10 text-red-500 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Absence Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Deducted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {absences.map((absence) => (
                <tr key={absence.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {absence.employees?.users?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {absence.employees?.employee_number}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(absence.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      {absence.absence_type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {absence.leave_types?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {absence.days_deducted}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {absence.leave_deducted ? (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Deducted
                      </span>
                    ) : (
                      <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(absence.processed_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => removeAbsence(absence.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {absences.length === 0 && (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No absences recorded for this month</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">How Absence Processing Works</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>System automatically detects employees who were scheduled but didn't check in</li>
              <li>One day of leave is automatically deducted from their annual/casual leave balance</li>
              <li>Absence records are created for tracking and reporting purposes</li>
              <li>Employees with approved leaves are excluded from absence detection</li>
              <li>Click "Process Yesterday" to manually trigger absence processing for yesterday's date</li>
              <li>Automatic processing runs daily at midnight for the previous day</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
