import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { JobPosting, Applicant } from '../../types';
import { Plus, UserPlus, Briefcase, Edit, Trash2 } from 'lucide-react';
import { JobPostingForm } from './JobPostingForm';

export function RecruitmentView() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'jobs' | 'applicants'>('jobs');
  const [showJobForm, setShowJobForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [jobsData, applicantsData] = await Promise.all([
        supabase
          .from('job_postings')
          .select('*, departments (name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('applicants')
          .select('*, job_postings (title)')
          .order('created_at', { ascending: false }),
      ]);

      setJobs(jobsData.data || []);
      setApplicants(applicantsData.data || []);
    } catch (error) {
      console.error('Error fetching recruitment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJob = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;

    try {
      const { error } = await supabase.from('job_postings').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete job posting');
    }
  };

  const handleUpdateApplicantStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to update applicant status');
    }
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      case 'filled': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getApplicantStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'interview': return 'bg-blue-100 text-blue-800';
      case 'offer': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-yellow-100 text-yellow-800';
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Recruitment</h1>
          <p className="text-gray-600">Manage job postings and applicants</p>
        </div>
        <button
          onClick={() => {
            setSelectedJob(null);
            setShowJobForm(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition focus-ring"
        >
          <Plus className="w-5 h-5" />
          <span>New Job Posting</span>
        </button>
      </div>

      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setView('jobs')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'jobs'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Job Postings ({jobs.length})
        </button>
        <button
          onClick={() => setView('applicants')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            view === 'applicants'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Applicants ({applicants.length})
        </button>
      </div>

      {view === 'jobs' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      setShowJobForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 focus-ring rounded p-1"
                    aria-label="Edit job posting"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="text-red-600 hover:text-red-900 focus-ring rounded p-1"
                    aria-label="Delete job posting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getJobStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{job.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{job.departments?.name || 'No department'}</p>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{job.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 capitalize">{job.employment_type.replace('_', ' ')}</span>
                {job.salary_range_min && job.salary_range_max && (
                  <span className="font-semibold text-gray-800">
                    ${job.salary_range_min.toLocaleString()} - ${job.salary_range_max.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
          {jobs.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No job postings yet</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applicants.map((applicant) => (
                  <tr key={applicant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {applicant.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {applicant.job_postings?.title || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {applicant.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {applicant.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(applicant.applied_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getApplicantStatusColor(applicant.status)}`}>
                        {applicant.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={applicant.status}
                        onChange={(e) => handleUpdateApplicantStatus(applicant.id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus-ring"
                        aria-label="Update applicant status"
                      >
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="interview">Interview</option>
                        <option value="offer">Offer</option>
                        <option value="hired">Hired</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applicants.length === 0 && (
              <div className="text-center py-12">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No applicants yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showJobForm && (
        <JobPostingForm
          job={selectedJob}
          onClose={() => {
            setShowJobForm(false);
            setSelectedJob(null);
          }}
          onSave={() => {
            setShowJobForm(false);
            setSelectedJob(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
