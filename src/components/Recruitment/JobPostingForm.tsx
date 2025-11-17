import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Department, JobPosting } from '../../types';
import { X } from 'lucide-react';

interface JobPostingFormProps {
  job: JobPosting | null;
  onClose: () => void;
  onSave: () => void;
}

export function JobPostingForm({ job, onClose, onSave }: JobPostingFormProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    department_id: '',
    description: '',
    requirements: '',
    employment_type: 'full_time',
    salary_range_min: '',
    salary_range_max: '',
    status: 'draft' as 'draft' | 'open' | 'closed' | 'filled',
    closing_date: '',
  });

  useEffect(() => {
    fetchDepartments();
    if (job) {
      setFormData({
        title: job.title,
        department_id: job.department_id || '',
        description: job.description,
        requirements: job.requirements || '',
        employment_type: job.employment_type,
        salary_range_min: job.salary_range_min?.toString() || '',
        salary_range_max: job.salary_range_max?.toString() || '',
        status: job.status,
        closing_date: job.closing_date || '',
      });
    }
  }, [job]);

  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*').order('name');
    setDepartments(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jobData = {
        title: formData.title,
        department_id: formData.department_id || null,
        description: formData.description,
        requirements: formData.requirements || null,
        employment_type: formData.employment_type,
        salary_range_min: formData.salary_range_min ? parseFloat(formData.salary_range_min) : null,
        salary_range_max: formData.salary_range_max ? parseFloat(formData.salary_range_max) : null,
        status: formData.status,
        closing_date: formData.closing_date || null,
        posted_date: formData.status === 'open' ? new Date().toISOString() : null,
      };

      if (job) {
        const { error } = await supabase
          .from('job_postings')
          .update({ ...jobData, updated_at: new Date().toISOString() })
          .eq('id', job.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('job_postings').insert(jobData);
        if (error) throw error;
      }

      onSave();
    } catch (error: any) {
      console.error('Error saving job posting:', error);
      alert(error.message || 'Failed to save job posting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-800">
            {job ? 'Edit Job Posting' : 'Create New Job Posting'}
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
            <div className="md:col-span-2">
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="e.g., Senior Software Engineer"
              />
            </div>

            <div>
              <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                id="department"
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="employment_type" className="block text-sm font-medium text-gray-700 mb-1">
                Employment Type <span className="text-red-500">*</span>
              </label>
              <select
                id="employment_type"
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>

            <div>
              <label htmlFor="salary_min" className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Monthly Salary
              </label>
              <input
                id="salary_min"
                type="number"
                step="1000"
                value={formData.salary_range_min}
                onChange={(e) => setFormData({ ...formData, salary_range_min: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="5000"
              />
            </div>

            <div>
              <label htmlFor="salary_max" className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Monthly Salary
              </label>
              <input
                id="salary_max"
                type="number"
                step="1000"
                value={formData.salary_range_max}
                onChange={(e) => setFormData({ ...formData, salary_range_max: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="8000"
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
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="filled">Filled</option>
              </select>
            </div>

            <div>
              <label htmlFor="closing_date" className="block text-sm font-medium text-gray-700 mb-1">
                Closing Date
              </label>
              <input
                id="closing_date"
                type="date"
                value={formData.closing_date}
                onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="Describe the role, responsibilities, and what makes this position exciting..."
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus-ring"
                placeholder="List the qualifications, skills, and experience required..."
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
              {loading ? 'Saving...' : job ? 'Update Job Posting' : 'Create Job Posting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
