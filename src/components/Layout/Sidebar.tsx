import {
  Users,
  Calendar,
  Briefcase,
  DollarSign,
  FileText,
  TrendingUp,
  UserPlus,
  LayoutDashboard,
  Clock,
  LogOut,
  Shield,
  Activity,
  Bell,
  Settings,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  mobileMenuOpen: boolean;
  onMobileMenuToggle: (open: boolean) => void;
}

export function Sidebar({ currentView, onViewChange, mobileMenuOpen, onMobileMenuToggle }: SidebarProps) {
  const { profile, signOut } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'employees', label: 'Employees', icon: Users, roles: ['admin', 'super_user'] },
    { id: 'attendance', label: 'My Attendance', icon: Clock, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'leaves', label: 'My Leaves', icon: Calendar, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'expenses', label: 'My Expenses', icon: FileText, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'performance', label: 'My Performance', icon: TrendingUp, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'payroll', label: 'Payroll', icon: DollarSign, roles: ['admin', 'super_user'] },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus, roles: ['admin', 'super_user'] },
    { id: 'departments', label: 'Departments', icon: Briefcase, roles: ['admin'] },
    { id: 'users', label: 'User Management', icon: Shield, roles: ['admin'] },
    { id: 'activity', label: 'Activity Logs', icon: Activity, roles: ['admin'] },
    { id: 'notifications', label: 'Notifications', icon: Bell, roles: ['admin', 'super_user', 'simple_user'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin', 'super_user', 'simple_user'] },
  ];

  const visibleMenuItems = profile
    ? menuItems.filter(item => item.roles.includes(profile.role))
    : [];

  return (
    <>
      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">HR Portal</h1>
              <p className="text-xs text-gray-500">{profile?.full_name}</p>
            </div>
          </div>
          <button
            onClick={() => onMobileMenuToggle(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 mt-14"
          onClick={() => onMobileMenuToggle(false)}
        />
      )}

      {/* Sidebar - Desktop always visible, Mobile slide-in */}
      <aside
        className={`
          fixed lg:relative
          top-14 lg:top-0
          left-0
          h-[calc(100vh-3.5rem)] lg:h-screen
          w-72 sm:w-80 lg:w-64
          bg-white border-r border-gray-200
          flex flex-col
          z-50
          transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Desktop Header */}
        <div className="hidden lg:block p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">HR Portal</h1>
              <p className="text-xs text-gray-500">{profile?.role.replace('_', ' ').toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto" aria-label="Primary navigation">
          {!profile ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : visibleMenuItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No menu items available</p>
              <p className="text-xs mt-1">Role: {profile?.role}</p>
            </div>
          ) : (
            visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-lg transition-all touch-manipulation min-h-[44px] ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 shadow-sm font-semibold'
                      : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-base">{item.label}</span>
                </button>
              );
            })
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          {profile && (
            <div className="bg-gray-50 rounded-lg p-3 mb-2">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 text-sm truncate">{profile.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 active:bg-red-200 transition font-medium touch-manipulation min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-14"></div>
    </>
  );
}
