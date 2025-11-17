import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Department } from '../../types';
import { Plus, Edit, Trash2, Briefcase } from 'lucide-react';

export function DepartmentsView() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDept) {
      setFormData({
        name: selectedDept.name,
        description: selectedDept.description || '',
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [selectedDept]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedDept) {
        const { error } = await supabase
          .from('departments')
          .update(formData)
          .eq('id', selectedDept.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('departments')
          .insert(formData);

        if (error) throw error;
      }
      setShowForm(false);
      setSelectedDept(null);
      setFormData({ name: '', description: '' });
      fetchDepartments();
    } catch (error: any) {
      alert(error.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { count } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', id);

      const employeeCount = count || 0;

      let confirmMessage = 'Are you sure you want to delete this department?';
      if (employeeCount > 0) {
        confirmMessage = `This department has ${employeeCount} employee(s). Deleting it will remove the department assignment from these employees. Are you sure you want to continue?`;
      }

      if (!confirm(confirmMessage)) return;

      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchDepartments();
    } catch (error: any) {
      alert(error.message || 'Failed to delete department');
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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Departments</h1>
          <p className="text-gray-600">Manage organizational departments</p>
        </div>
        <button
          onClick={() => {
            setSelectedDept(null);
            setShowForm(true);
          }}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition focus-ring"
        >
          <Plus className="w-5 h-5" />
          <span>Add Department</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Briefcase className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setSelectedDept(dept);
                    setShowForm(true);
                  }}
                  className="text-blue-600 hover:text-blue-900 focus-ring rounded p-1"
                  aria-label="Edit department"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{dept.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-3">{dept.description || 'No description'}</p>
          </div>
        ))}
      </div>

      {departments.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No departments yet</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {selectedDept ? 'Edit Department' : 'Add Department'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Engineering"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the department..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSelectedDept(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus-ring"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg focus-ring"
                  >
                    {selectedDept ? 'Update Department' : 'Add Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
