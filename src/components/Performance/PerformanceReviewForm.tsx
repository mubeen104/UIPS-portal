import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Employee } from '../../types';
import { X, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PerformanceReviewFormProps {
  onClose: () => void;
  onSave: () => void;
}

export function PerformanceReviewForm({ onClose, onSave }: PerformanceReviewFormProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    cycle_id: '',
    review_date: new Date().toISOString().split('T')[0],
    overall_rating: 3,
    strengths: '',
    areas_for_improvement: '',
    goals: '',
    comments: '',
    status: 'draft' as 'draft' | 'submitted' | 'acknowledged',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [employeesData, cyclesData] = await Promise.all([
      supabase
        .from('employees')
        .select('*, users(full_name)')
        .eq('status', 'active')
        .order('created_at'),
      supabase.from('performance_cycles').select('*').order('name'),
    ]);

    setEmployees(employeesData.data || []);
    setCycles(cyclesData.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('performance_reviews').insert({
        employee_id: formData.employee_id,
        reviewer_id: profile?.id,
        cycle_id: formData.cycle_id || null,
        review_date: formData.review_date,
        overall_rating: formData.overall_rating,
        strengths: formData.strengths || null,
        areas_for_improvement: formData.areas_for_improvement || null,
        goals: formData.goals || null,
        comments: formData.comments || null,
        status: formData.status,
      });

      if (error) throw error;
      onSave();
    } catch (error: any) {
      console.error('Error saving review:', error);
      alert(error.message || 'Failed to save performance review');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            Create Performance Review
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition focus-ring rounded-lg"
            aria-label="Close dialog"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="employee" className="block text-sm font-medium text-gray-700 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                id="employee"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
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
              <label htmlFor="cycle" className="block text-sm font-medium text-gray-700 mb-1">
                Review Cycle
              </label>
              <select
                id="cycle"
                value={formData.cycle_id}
                onChange={(e) => setFormData({ ...formData, cycle_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="">Select Cycle</option>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>
                    {cycle.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="review_date" className="block text-sm font-medium text-gray-700 mb-1">
                Review Date <span className="text-red-500">*</span>
              </label>
              <input
                id="review_date"
                type="date"
                required
                value={formData.review_date}
                onChange={(e) => setFormData({ ...formData, review_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="acknowledged">Acknowledged</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, overall_rating: rating })}
                    className="focus-ring rounded p-1"
                    aria-label={`Rate ${rating} out of 5`}
                  >
                    <Star
                      className={`w-8 h-8 ${
                        rating <= formData.overall_rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-4 text-lg font-semibold text-gray-700">
                  {formData.overall_rating} / 5
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="strengths" className="block text-sm font-medium text-gray-700 mb-1">
                Strengths
              </label>
              <textarea
                id="strengths"
                value={formData.strengths}
                onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="What does this employee do well?"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="areas_for_improvement" className="block text-sm font-medium text-gray-700 mb-1">
                Areas for Improvement
              </label>
              <textarea
                id="areas_for_improvement"
                value={formData.areas_for_improvement}
                onChange={(e) => setFormData({ ...formData, areas_for_improvement: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="What areas could be developed further?"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="goals" className="block text-sm font-medium text-gray-700 mb-1">
                Goals for Next Period
              </label>
              <textarea
                id="goals"
                value={formData.goals}
                onChange={(e) => setFormData({ ...formData, goals: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="What are the goals for the next review period?"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">
                Additional Comments
              </label>
              <textarea
                id="comments"
                value={formData.comments}
                onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="Any additional feedback or notes..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
            >
              {loading ? 'Saving...' : 'Save Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
