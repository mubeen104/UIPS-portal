import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../../types';
import { Clock, Save, X, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ManualAttendanceEntryProps {
  onClose: () => void;
  onSuccess: () => void;
  editingRecord?: {
    id: string;
    employee_id: string;
    date: string;
    check_in?: string;
    check_out?: string;
    status: string;
    notes?: string;
  };
}

export function ManualAttendanceEntry({ onClose, onSuccess, editingRecord }: ManualAttendanceEntryProps) {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: editingRecord?.employee_id || '',
    date: editingRecord?.date || new Date().toISOString().split('T')[0],
    check_in: editingRecord?.check_in?.substring(0, 5) || '',
    check_out: editingRecord?.check_out?.substring(0, 5) || '',
    status: editingRecord?.status || 'present',
    notes: editingRecord?.notes || '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const attendanceData = {
        employee_id: formData.employee_id,
        date: formData.date,
        check_in: formData.check_in ? `${formData.date}T${formData.check_in}:00` : null,
        check_out: formData.check_out ? `${formData.date}T${formData.check_out}:00` : null,
        status: formData.status,
        notes: formData.notes || null,
        entry_source: 'manual',
        entered_by: profile?.id,
        modified_at: new Date().toISOString(),
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('attendance')
          .update(attendanceData)
          .eq('id', editingRecord.id);

        if (error) throw error;
        alert('Attendance record updated successfully!');
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert(attendanceData);

        if (error) throw error;
        alert('Attendance record added successfully!');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving attendance:', error);
      alert(error.message || 'Failed to save attendance record');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Clock className="w-6 h-6 text-blue-600" />
              {editingRecord ? 'Edit Attendance' : 'Manual Attendance Entry'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Employee
              </label>
              <select
                required
                disabled={!!editingRecord}
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.users?.full_name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check In Time</label>
                <input
                  type="time"
                  value={formData.check_in}
                  onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check Out Time</label>
                <input
                  type="time"
                  value={formData.check_out}
                  onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Add any additional notes about this attendance record..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This record will be marked as manually entered and will include your admin details for audit purposes.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : editingRecord ? 'Update Record' : 'Add Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
