import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Building2, Shield, Calendar, Clock, Check, Key, Lock, UserCog, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { DepartmentPermissions } from './DepartmentPermissions';

interface UserDetailsModalProps {
  userId: string;
  onClose: () => void;
  onUpdate: () => void;
}

interface UserDetails {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  department_id: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  department?: {
    name: string;
  };
}

type ActiveTab = 'overview' | 'credentials' | 'permissions';

export function UserDetailsModal({ userId, onClose, onUpdate }: UserDetailsModalProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [showDepartmentPermissions, setShowDepartmentPermissions] = useState(false);

  // Edit mode states
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(false);
  const [newDepartment, setNewDepartment] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);

  // Credential states
  const [credentialAction, setCredentialAction] = useState<'email' | 'password' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingCredential, setUpdatingCredential] = useState(false);
  const [savingChanges, setSavingChanges] = useState(false);

  useEffect(() => {
    fetchUserDetails();
    fetchDepartments();
  }, [userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          department:departments!users_department_id_fkey(name)
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;
      setUser(data);
      setNewRole(data.role);
      setNewDepartment(data.department_id);
      setNewEmail(data.email);
    } catch (error) {
      console.error('Error fetching user details:', error);
      showToast('Failed to load user details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleUpdateRole = async () => {
    if (!user || newRole === user.role) return;

    try {
      setSavingChanges(true);
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'users',
        p_resource_id: userId,
        p_changes: { role: newRole }
      });

      showToast('Role updated successfully', 'success');
      setEditingRole(false);
      fetchUserDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating role:', error);
      showToast(error.message || 'Failed to update role', 'error');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleUpdateDepartment = async () => {
    if (!user) return;

    try {
      setSavingChanges(true);
      const { error } = await supabase
        .from('users')
        .update({ department_id: newDepartment })
        .eq('id', userId);

      if (error) throw error;

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'users',
        p_resource_id: userId,
        p_changes: { department_id: newDepartment }
      });

      showToast('Department updated successfully', 'success');
      setEditingDepartment(false);
      fetchUserDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating department:', error);
      showToast(error.message || 'Failed to update department', 'error');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!user || !newEmail) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      showToast('Invalid email format', 'error');
      return;
    }

    if (newEmail === user.email) {
      showToast('New email is the same as current email', 'error');
      return;
    }

    try {
      setUpdatingCredential(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user-email`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newEmail: newEmail,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update email');
      }

      showToast('Email updated successfully', 'success');
      setCredentialAction(null);
      fetchUserDetails();
      onUpdate();
    } catch (error: any) {
      console.error('Error updating email:', error);
      showToast(error.message || 'Failed to update email', 'error');
    } finally {
      setUpdatingCredential(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    try {
      setUpdatingCredential(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showToast('Session expired. Please log in again.', 'error');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-user-password`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          newPassword: newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password');
      }

      showToast('Password reset successfully', 'success');
      setCredentialAction(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      showToast(error.message || 'Failed to reset password', 'error');
    } finally {
      setUpdatingCredential(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-700 border-red-200';
      case 'super_user': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'super_user': return 'Super User';
      case 'simple_user': return 'Employee';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-white rounded-none sm:rounded-lg shadow-2xl w-full sm:max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3.5 sm:py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 sm:gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white truncate">{user.full_name}</h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5 sm:mt-1 truncate">{user.email}</p>
                  <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                    {user.department && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                        {user.department.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 sm:p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition flex-shrink-0"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex gap-1 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('credentials')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === 'credentials'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Credentials
                </div>
              </button>
              {(user.role === 'super_user' || user.role === 'admin') && (
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                    activeTab === 'permissions'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Permissions
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm font-medium">Email</span>
                      </div>
                      <p className="text-gray-900 font-medium">{user.email}</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Phone className="w-4 h-4" />
                        <span className="text-sm font-medium">Phone</span>
                      </div>
                      <p className="text-gray-900 font-medium">{user.phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Role & Department */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Role & Department</h3>
                  <div className="space-y-4">
                    {/* Role */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm font-medium">Role</span>
                        </div>
                        {!editingRole && (
                          <button
                            onClick={() => setEditingRole(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Change
                          </button>
                        )}
                      </div>
                      {editingRole ? (
                        <div className="space-y-3">
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="simple_user">Employee</option>
                            <option value="super_user">Super User</option>
                            <option value="admin">Administrator</option>
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateRole}
                              disabled={savingChanges || newRole === user.role}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingRole(false);
                                setNewRole(user.role);
                              }}
                              className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold border ${getRoleBadgeColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </div>

                    {/* Department */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm font-medium">Department</span>
                        </div>
                        {!editingDepartment && (
                          <button
                            onClick={() => setEditingDepartment(true)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Change
                          </button>
                        )}
                      </div>
                      {editingDepartment ? (
                        <div className="space-y-3">
                          <select
                            value={newDepartment || ''}
                            onChange={(e) => setNewDepartment(e.target.value || null)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">None</option>
                            {departments.map(dept => (
                              <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                          </select>
                          <div className="flex gap-2">
                            <button
                              onClick={handleUpdateDepartment}
                              disabled={savingChanges}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
                            >
                              <Check className="w-4 h-4" />
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingDepartment(false);
                                setNewDepartment(user.department_id);
                              }}
                              className="px-3 py-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-900 font-medium">
                          {user.department?.name || 'Not assigned'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm font-medium">Created</span>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Last Sign In</span>
                      </div>
                      <p className="text-gray-900 font-medium">
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'credentials' && (
              <div className="space-y-6">
                {!credentialAction ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Credential Management</p>
                          <p>You can update the user's email address or reset their password. All changes are logged for security.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => setCredentialAction('email')}
                        className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                            <Mail className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">Update Email Address</p>
                            <p className="text-sm text-gray-600">Change the user's login email</p>
                          </div>
                        </div>
                        <Key className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                      </button>

                      <button
                        onClick={() => setCredentialAction('password')}
                        className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition">
                            <Lock className="w-5 h-5 text-red-600" />
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-gray-900">Reset Password</p>
                            <p className="text-sm text-gray-600">Generate new password for the user</p>
                          </div>
                        </div>
                        <Key className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition" />
                      </button>
                    </div>
                  </>
                ) : credentialAction === 'email' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Update Email Address</h3>
                      <button
                        onClick={() => {
                          setCredentialAction(null);
                          setNewEmail(user.email);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Back
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Current Email
                      </label>
                      <input
                        type="email"
                        value={user.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        The user will need to use this new email address to log in. They will remain logged in on existing sessions.
                      </p>
                    </div>

                    <button
                      onClick={handleUpdateEmail}
                      disabled={updatingCredential || newEmail === user.email}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                    >
                      {updatingCredential ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Update Email
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">Reset Password</h3>
                      <button
                        onClick={() => {
                          setCredentialAction(null);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Back
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        The user will be able to log in immediately with this new password. Consider sharing it securely.
                      </p>
                    </div>

                    <button
                      onClick={handleResetPassword}
                      disabled={updatingCredential || !newPassword || !confirmPassword}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                    >
                      {updatingCredential ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          Resetting...
                        </>
                      ) : (
                        <>
                          <Check className="w-5 h-5" />
                          Reset Password
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <UserCog className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Department & Employee Permissions</p>
                      <p>Configure which departments and employees this user can access and manage.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowDepartmentPermissions(true)}
                  className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Manage Permissions</p>
                      <p className="text-sm text-gray-600">Configure department and employee access</p>
                    </div>
                  </div>
                  <UserCog className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Department Permissions Modal */}
      {showDepartmentPermissions && (
        <DepartmentPermissions
          userId={user.id}
          userName={user.full_name}
          onClose={() => setShowDepartmentPermissions(false)}
          onSave={() => {
            fetchUserDetails();
            onUpdate();
          }}
        />
      )}
    </>
  );
}
