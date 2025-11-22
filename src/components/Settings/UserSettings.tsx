import { useState, useEffect } from 'react';
import { Settings, User, Bell, Globe, Moon, Sun, Save, Lock, Shield, Download, Trash2, Eye, EyeOff, Smartphone, Mail, Key, LogOut, Monitor, AlertTriangle, Activity, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useToast } from '../../hooks/useToast';

interface UserPreferences {
  theme: string;
  language: string;
  timezone: string;
  currency: string;
  notification_email: boolean;
  notification_push: boolean;
  notification_sms: boolean;
  date_format: string;
  time_format: string;
}

interface Session {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  last_activity: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  changes: any;
  created_at: string;
}

export function UserSettings() {
  const { profile, signOut } = useAuth();
  const { refreshPreferences } = usePreferences();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'light',
    language: 'en',
    timezone: 'UTC',
    currency: 'USD',
    notification_email: true,
    notification_push: true,
    notification_sms: false,
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
  });

  const [emailSettings, setEmailSettings] = useState({
    leave_requests: true,
    expense_approvals: true,
    performance_reviews: true,
    payroll_updates: true,
    system_announcements: true,
    weekly_digest: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    login_notifications: true,
    session_timeout: '24',
  });

  useEffect(() => {
    if (profile?.id) {
      loadUserData();
      loadPreferences();
      loadSessions();
      loadActivityLogs();
    }
  }, [profile?.id]);

  const loadUserData = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('full_name, email, phone')
        .eq('id', profile?.id)
        .single();

      if (error) throw error;
      if (data) {
        setProfileData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setPreferences({
          theme: data.theme || 'light',
          language: data.language || 'en',
          timezone: data.timezone || 'UTC',
          currency: data.currency || 'USD',
          notification_email: data.notification_email ?? true,
          notification_push: data.notification_push ?? true,
          notification_sms: data.notification_sms ?? false,
          date_format: data.date_format || 'MM/DD/YYYY',
          time_format: data.time_format || '12h',
        });

        setEmailSettings({
          leave_requests: data.email_leave_requests ?? true,
          expense_approvals: data.email_expense_approvals ?? true,
          performance_reviews: data.email_performance_reviews ?? true,
          payroll_updates: data.email_payroll_updates ?? true,
          system_announcements: data.email_system_announcements ?? true,
          weekly_digest: data.email_weekly_digest ?? true,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', profile?.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadActivityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error loading activity logs:', error);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
        })
        .eq('id', profile?.id);

      if (error) throw error;
      showToast('Profile updated successfully', 'success');

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'users',
        p_resource_id: profile?.id,
        p_changes: { full_name: profileData.full_name, phone: profileData.phone }
      });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      showToast(error.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (passwordData.new.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new
      });

      if (error) throw error;

      showToast('Password changed successfully', 'success');
      setPasswordData({ current: '', new: '', confirm: '' });

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'security',
        p_resource_id: profile?.id,
        p_changes: { action: 'password_change' }
      });

      await supabase.rpc('create_notification', {
        p_user_id: profile?.id,
        p_type: 'info',
        p_category: 'security',
        p_title: 'Password Changed',
        p_message: 'Your password was successfully changed. If this was not you, please contact support immediately.'
      });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showToast(error.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: profile?.id,
          ...preferences,
          email_leave_requests: emailSettings.leave_requests,
          email_expense_approvals: emailSettings.expense_approvals,
          email_performance_reviews: emailSettings.performance_reviews,
          email_payroll_updates: emailSettings.payroll_updates,
          email_system_announcements: emailSettings.system_announcements,
          email_weekly_digest: emailSettings.weekly_digest,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      await refreshPreferences();

      showToast('Preferences saved successfully', 'success');

      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'update',
        p_resource_type: 'user_preferences',
        p_resource_id: profile?.id,
        p_changes: { preferences: 'updated' }
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      showToast(error.message || 'Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
      showToast('Session terminated', 'success');
      loadSessions();
    } catch (error: any) {
      console.error('Error terminating session:', error);
      showToast(error.message || 'Failed to terminate session', 'error');
    }
  };

  const terminateAllSessions = async () => {
    if (!confirm('Are you sure you want to terminate all other sessions? You will remain logged in on this device.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', profile?.id);

      if (error) throw error;
      showToast('All sessions terminated', 'success');
      loadSessions();
    } catch (error: any) {
      console.error('Error terminating sessions:', error);
      showToast(error.message || 'Failed to terminate sessions', 'error');
    }
  };

  const exportData = async () => {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile?.id)
        .single();

      const { data: prefsData } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile?.id)
        .maybeSingle();

      const exportData = {
        user: userData,
        preferences: prefsData,
        exported_at: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();

      showToast('Data exported successfully', 'success');
    } catch (error: any) {
      console.error('Error exporting data:', error);
      showToast(error.message || 'Failed to export data', 'error');
    }
  };

  const deleteAccount = async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion. This action cannot be undone.');

    if (confirmation !== 'DELETE') {
      if (confirmation !== null) {
        showToast('Account deletion cancelled', 'info');
      }
      return;
    }

    try {
      await supabase.rpc('log_activity', {
        p_user_id: profile?.id,
        p_action: 'delete',
        p_resource_type: 'users',
        p_resource_id: profile?.id,
        p_changes: { action: 'account_deletion_requested' }
      });

      showToast('Account deletion request submitted. Please contact support to complete the process.', 'info');
    } catch (error: any) {
      console.error('Error deleting account:', error);
      showToast(error.message || 'Failed to process deletion request', 'error');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'sessions', label: 'Sessions', icon: Monitor },
    { id: 'activity', label: 'Activity Logs', icon: Activity },
    { id: 'privacy', label: 'Privacy & Data', icon: Lock },
  ];

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return 'text-green-600 bg-green-50';
      case 'update': return 'text-blue-600 bg-blue-50';
      case 'delete': return 'text-red-600 bg-red-50';
      case 'login': return 'text-purple-600 bg-purple-50';
      case 'logout': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatResourceType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        <p className="text-gray-600 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-medium transition border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed for security reasons</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.current}
                        onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.new}
                        onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirm}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={changePassword}
                    disabled={saving || !passwordData.current || !passwordData.new || !passwordData.confirm}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    <Lock className="w-5 h-5" />
                    {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-gray-600" />
                      <div>
                        <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-600">Add an extra layer of security</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                      Enable
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-800">Login Notifications</p>
                      <p className="text-sm text-gray-600">Get notified of new login attempts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={securitySettings.login_notifications}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, login_notifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Appearance</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                      ].map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          onClick={() => setPreferences({ ...preferences, theme: value })}
                          className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition ${
                            preferences.theme === value
                              ? 'border-blue-600 bg-blue-50 text-blue-600'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Regional Settings</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="ja">Japanese</option>
                      <option value="zh">Chinese</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Karachi">Pakistan Time (PKT)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      value={preferences.currency}
                      onChange={(e) => setPreferences({ ...preferences, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">US Dollar (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="GBP">British Pound (GBP)</option>
                      <option value="PKR">Pakistani Rupee (PKR)</option>
                      <option value="AED">UAE Dirham (AED)</option>
                      <option value="SAR">Saudi Riyal (SAR)</option>
                      <option value="INR">Indian Rupee (INR)</option>
                      <option value="JPY">Japanese Yen (JPY)</option>
                      <option value="CNY">Chinese Yuan (CNY)</option>
                      <option value="CAD">Canadian Dollar (CAD)</option>
                      <option value="AUD">Australian Dollar (AUD)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
                      <select
                        value={preferences.date_format}
                        onChange={(e) => setPreferences({ ...preferences, date_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
                      <select
                        value={preferences.time_format}
                        onChange={(e) => setPreferences({ ...preferences, time_format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="12h">12 Hour</option>
                        <option value="24h">24 Hour</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Notification Channels</h3>
                <div className="space-y-3">
                  {[
                    { key: 'notification_email', label: 'Email Notifications', description: 'Receive notifications via email', icon: Mail },
                    { key: 'notification_push', label: 'Push Notifications', description: 'Receive browser push notifications', icon: Bell },
                    { key: 'notification_sms', label: 'SMS Notifications', description: 'Receive notifications via SMS', icon: Smartphone },
                  ].map(({ key, label, description, icon: Icon }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-800">{label}</p>
                          <p className="text-sm text-gray-600">{description}</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences[key as keyof UserPreferences] as boolean}
                          onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Email Preferences</h3>
                <div className="space-y-2">
                  {[
                    { key: 'leave_requests', label: 'Leave Requests', description: 'Notifications about leave requests and approvals' },
                    { key: 'expense_approvals', label: 'Expense Approvals', description: 'Updates on expense claim status' },
                    { key: 'performance_reviews', label: 'Performance Reviews', description: 'Reminders and updates about reviews' },
                    { key: 'payroll_updates', label: 'Payroll Updates', description: 'Payroll processing and payslip notifications' },
                    { key: 'system_announcements', label: 'System Announcements', description: 'Important system updates and announcements' },
                    { key: 'weekly_digest', label: 'Weekly Digest', description: 'Weekly summary of your activities' },
                  ].map(({ key, label, description }) => (
                    <div key={key} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{label}</p>
                        <p className="text-xs text-gray-600">{description}</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailSettings[key as keyof typeof emailSettings]}
                        onChange={(e) => setEmailSettings({ ...emailSettings, [key]: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={savePreferences}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
              >
                <Save className="w-5 h-5" />
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </button>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Active Sessions</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage your active login sessions</p>
                </div>
                {sessions.length > 0 && (
                  <button
                    onClick={terminateAllSessions}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    Terminate All
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {sessions.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No active sessions found</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Monitor className="w-5 h-5 text-gray-600 mt-1" />
                        <div>
                          <p className="font-medium text-gray-800">{session.user_agent || 'Unknown Device'}</p>
                          <div className="text-sm text-gray-600 space-y-1 mt-1">
                            <p>IP: {session.ip_address || 'Unknown'}</p>
                            <p>Last active: {new Date(session.last_activity).toLocaleString()}</p>
                            <p>Started: {new Date(session.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => terminateSession(session.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        Terminate
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Activity Logs</h3>
                <p className="text-sm text-gray-600 mb-4">View your recent account activities and actions</p>
              </div>

              <div className="space-y-2">
                {activityLogs.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Activity className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No activity logs found</p>
                  </div>
                ) : (
                  activityLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                      <div className="flex-shrink-0">
                        <div className={`p-2 rounded-lg ${getActionColor(log.action)}`}>
                          <Activity className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              <span className="capitalize">{log.action}</span> {formatResourceType(log.resource_type)}
                            </p>
                            {log.resource_id && (
                              <p className="text-sm text-gray-600 mt-1">
                                ID: {log.resource_id.substring(0, 8)}...
                              </p>
                            )}
                            {log.changes && (
                              <div className="text-xs text-gray-500 mt-2 p-2 bg-white rounded border border-gray-200 font-mono overflow-x-auto">
                                {JSON.stringify(log.changes, null, 2)}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-gray-500 whitespace-nowrap">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {activityLogs.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  Showing the last 50 activities
                </p>
              )}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-6 max-w-2xl">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Management</h3>
                <div className="space-y-3">
                  <button
                    onClick={exportData}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-blue-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-800">Export Your Data</p>
                        <p className="text-sm text-gray-600">Download a copy of your personal data</p>
                      </div>
                    </div>
                    <span className="text-sm text-blue-600">Export</span>
                  </button>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Danger Zone
                </h3>
                <div className="space-y-3">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-red-800">Delete Account</p>
                        <p className="text-sm text-red-700 mt-1">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                      </div>
                      <button
                        onClick={deleteAccount}
                        className="ml-4 flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition whitespace-nowrap"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
