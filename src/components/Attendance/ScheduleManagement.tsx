import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { AttendanceSchedule, Employee } from '../../types';
import { Clock, Save, X, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function ScheduleManagement() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [schedules, setSchedules] = useState<AttendanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployee) {
      fetchSchedules(selectedEmployee);
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*, users(full_name, email)')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedules = async (employeeId: string) => {
    try {
      const { data, error } = await supabase
        .from('attendance_schedules')
        .select('*')
        .eq('employee_id', employeeId)
        .order('day_of_week');

      if (error) throw error;

      if (data && data.length > 0) {
        setSchedules(data);
      } else {
        const defaultSchedules = DAYS_OF_WEEK.map(day => ({
          id: '',
          employee_id: employeeId,
          day_of_week: day.value,
          check_in_time: '09:00',
          check_out_time: '17:00',
          is_working_day: day.value !== 0 && day.value !== 6,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        setSchedules(defaultSchedules);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  const handleScheduleChange = (dayOfWeek: number, field: string, value: any) => {
    setSchedules(prev => prev.map(schedule =>
      schedule.day_of_week === dayOfWeek
        ? { ...schedule, [field]: value }
        : schedule
    ));
  };

  const handleSaveSchedules = async () => {
    if (!selectedEmployee) return;

    setSaving(true);
    try {
      for (const schedule of schedules) {
        if (schedule.id) {
          const { error } = await supabase
            .from('attendance_schedules')
            .update({
              check_in_time: schedule.check_in_time,
              check_out_time: schedule.check_out_time,
              is_working_day: schedule.is_working_day,
              updated_at: new Date().toISOString(),
            })
            .eq('id', schedule.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('attendance_schedules')
            .insert({
              employee_id: selectedEmployee,
              day_of_week: schedule.day_of_week,
              check_in_time: schedule.check_in_time,
              check_out_time: schedule.check_out_time,
              is_working_day: schedule.is_working_day,
            });

          if (error) throw error;
        }
      }

      alert('Schedules saved successfully!');
      fetchSchedules(selectedEmployee);
    } catch (error: any) {
      console.error('Error saving schedules:', error);
      alert(error.message || 'Failed to save schedules');
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
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Schedule Management</h2>
        <p className="text-gray-600">Set check-in and check-out times for each employee</p>
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

      {selectedEmployee && schedules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Weekly Schedule
            </h3>
          </div>

          <div className="p-4 space-y-4">
            {schedules.map((schedule) => {
              const day = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week);
              return (
                <div key={schedule.day_of_week} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-full sm:w-32">
                    <span className="font-medium text-gray-800">{day?.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={schedule.is_working_day}
                      onChange={(e) => handleScheduleChange(schedule.day_of_week, 'is_working_day', e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label className="text-sm text-gray-600">Working Day</label>
                  </div>

                  {schedule.is_working_day && (
                    <>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Check In</label>
                        <input
                          type="time"
                          value={schedule.check_in_time}
                          onChange={(e) => handleScheduleChange(schedule.day_of_week, 'check_in_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-xs text-gray-600 mb-1">Check Out</label>
                        <input
                          type="time"
                          value={schedule.check_out_time}
                          onChange={(e) => handleScheduleChange(schedule.day_of_week, 'check_out_time', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={handleSaveSchedules}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
