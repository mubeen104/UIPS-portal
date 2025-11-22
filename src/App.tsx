import { useState, createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { LoginForm } from './components/Auth/LoginForm';
import { Sidebar } from './components/Layout/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { EmployeesView } from './components/Employees/EmployeesView';
import { AttendanceView } from './components/Attendance/AttendanceView';
import { LeavesView } from './components/Leaves/LeavesView';
import { ExpensesView } from './components/Expenses/ExpensesView';
import { PerformanceView } from './components/Performance/PerformanceView';
import { PayrollView } from './components/Payroll/PayrollView';
import { RecruitmentView } from './components/Recruitment/RecruitmentView';
import { DepartmentsView } from './components/Departments/DepartmentsView';
import { UserManagement } from './components/Admin/UserManagement';
import { ActivityLogs } from './components/Admin/ActivityLogs';
import { NotificationCenter } from './components/Notifications/NotificationCenter';
import { UserSettings } from './components/Settings/UserSettings';
import { Toast } from './components/UI/Toast';
import { useToast } from './hooks/useToast';
import { isConfigured } from './lib/supabase-client';
import SetupPage from './pages/setup';
import { PWAInstallBanner } from './components/PWA/PWAInstallBanner';

interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within ToastProvider');
  }
  return context;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toasts, removeToast, success, error, info } = useToast();

  if (!isConfigured) {
    return <SetupPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentView} />;
      case 'employees':
        return <EmployeesView />;
      case 'attendance':
        return <AttendanceView />;
      case 'leaves':
        return <LeavesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'performance':
        return <PerformanceView />;
      case 'payroll':
        return <PayrollView />;
      case 'recruitment':
        return <RecruitmentView />;
      case 'departments':
        return <DepartmentsView />;
      case 'users':
        return <UserManagement />;
      case 'activity':
        return <ActivityLogs />;
      case 'notifications':
        return <NotificationCenter />;
      case 'settings':
        return <UserSettings />;
      default:
        return <DashboardView onNavigate={setCurrentView} />;
    }
  };

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar
          currentView={currentView}
          onViewChange={(view) => {
            setCurrentView(view);
            setMobileMenuOpen(false);
          }}
          mobileMenuOpen={mobileMenuOpen}
          onMobileMenuToggle={setMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto w-full lg:mt-0 mt-14 pb-20 sm:pb-0">
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 pb-safe">
            {renderView()}
          </div>
        </main>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
        <PWAInstallBanner />
      </div>
    </ToastContext.Provider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppContent />
      </PreferencesProvider>
    </AuthProvider>
  );
}
