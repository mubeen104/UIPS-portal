import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Calendar, DollarSign, TrendingUp, Clock, FileText } from 'lucide-react';
import { isAdmin, isSimpleUser, getUserAccessibleEmployeeIds } from '../../lib/permissions';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  pendingLeaves: number;
  pendingExpenses: number;
  todayAttendance: number;
  openPositions: number;
  myLeaveBalance?: number;
  myAttendanceThisMonth?: number;
  myPendingExpenses?: number;
}

interface DashboardViewProps {
  onNavigate?: (view: string) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps = {}) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    pendingLeaves: 0,
    pendingExpenses: 0,
    todayAttendance: 0,
    openPositions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchDashboardStats();
    }
  }, [profile]);

  const fetchDashboardStats = async () => {
    try {
      if (!profile) return;

      const today = new Date().toISOString().split('T')[0];
      const thisMonth = new Date().toISOString().slice(0, 7);

      if (isSimpleUser(profile.role)) {
        const { data: employeeData } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (!employeeData) {
          setLoading(false);
          return;
        }

        const [
          leaveBalanceData,
          attendanceData,
          expensesData
        ] = await Promise.all([
          supabase.from('leave_balances').select('remaining_days').eq('employee_id', employeeData.id),
          supabase.from('attendance').select('id', { count: 'exact', head: true })
            .eq('employee_id', employeeData.id)
            .gte('date', `${thisMonth}-01`),
          supabase.from('expenses').select('id', { count: 'exact', head: true })
            .eq('employee_id', employeeData.id)
            .eq('status', 'pending')
        ]);

        const totalLeaveBalance = leaveBalanceData.data?.reduce((sum, bal) => sum + (bal.remaining_days || 0), 0) || 0;

        setStats({
          totalEmployees: 0,
          activeEmployees: 0,
          pendingLeaves: 0,
          pendingExpenses: 0,
          todayAttendance: 0,
          openPositions: 0,
          myLeaveBalance: totalLeaveBalance,
          myAttendanceThisMonth: attendanceData.count || 0,
          myPendingExpenses: expensesData.count || 0,
        });
      } else {
        let employeeFilter = null;
        let accessibleEmployeeIds: string[] = [];

        if (!isAdmin(profile.role)) {
          accessibleEmployeeIds = await getUserAccessibleEmployeeIds(profile.id);
          if (accessibleEmployeeIds.length === 0) {
            setLoading(false);
            return;
          }
        }

        const queries = [
          isAdmin(profile.role)
            ? supabase.from('employees').select('id', { count: 'exact', head: true })
            : supabase.from('employees').select('id', { count: 'exact', head: true }).in('id', accessibleEmployeeIds),
          isAdmin(profile.role)
            ? supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active')
            : supabase.from('employees').select('id', { count: 'exact', head: true }).eq('status', 'active').in('id', accessibleEmployeeIds),
          isAdmin(profile.role)
            ? supabase.from('leave_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending')
            : supabase.from('leave_requests').select('id, employee_id', { count: 'exact' }).eq('status', 'pending'),
          isAdmin(profile.role)
            ? supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('status', 'pending')
            : supabase.from('expenses').select('id, employee_id', { count: 'exact' }).eq('status', 'pending'),
          isAdmin(profile.role)
            ? supabase.from('attendance').select('id', { count: 'exact', head: true }).eq('date', today)
            : supabase.from('attendance').select('id, employee_id', { count: 'exact' }).eq('date', today),
          isAdmin(profile.role)
            ? supabase.from('job_postings').select('id', { count: 'exact', head: true }).eq('status', 'open')
            : Promise.resolve({ count: 0, data: [] })
        ];

        const [
          employeesData,
          activeEmployeesData,
          leavesData,
          expensesData,
          attendanceData,
          jobsData
        ] = await Promise.all(queries);

        let pendingLeavesCount = leavesData.count || 0;
        let pendingExpensesCount = expensesData.count || 0;
        let todayAttendanceCount = attendanceData.count || 0;

        if (!isAdmin(profile.role) && leavesData.data) {
          pendingLeavesCount = leavesData.data.filter((item: any) => accessibleEmployeeIds.includes(item.employee_id)).length;
        }
        if (!isAdmin(profile.role) && expensesData.data) {
          pendingExpensesCount = expensesData.data.filter((item: any) => accessibleEmployeeIds.includes(item.employee_id)).length;
        }
        if (!isAdmin(profile.role) && attendanceData.data) {
          todayAttendanceCount = attendanceData.data.filter((item: any) => accessibleEmployeeIds.includes(item.employee_id)).length;
        }

        setStats({
          totalEmployees: employeesData.count || 0,
          activeEmployees: activeEmployeesData.count || 0,
          pendingLeaves: pendingLeavesCount,
          pendingExpenses: pendingExpensesCount,
          todayAttendance: todayAttendanceCount,
          openPositions: jobsData.count || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUserAdmin = isAdmin(profile?.role);
  const isUserSimple = isSimpleUser(profile?.role);

  const statCards = isUserSimple ? [
    {
      title: 'Leave Balance',
      value: stats.myLeaveBalance || 0,
      icon: Calendar,
      color: 'bg-blue-500',
      show: true,
      unit: 'days'
    },
    {
      title: 'Attendance This Month',
      value: stats.myAttendanceThisMonth || 0,
      icon: Clock,
      color: 'bg-green-500',
      show: true,
      unit: 'days'
    },
    {
      title: 'Pending Expenses',
      value: stats.myPendingExpenses || 0,
      icon: FileText,
      color: 'bg-orange-500',
      show: true,
      unit: ''
    },
  ] : [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      color: 'bg-blue-500',
      show: true,
      unit: ''
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      icon: Users,
      color: 'bg-green-500',
      show: true,
      unit: ''
    },
    {
      title: 'Pending Leaves',
      value: stats.pendingLeaves,
      icon: Calendar,
      color: 'bg-yellow-500',
      show: true,
      unit: ''
    },
    {
      title: 'Pending Expenses',
      value: stats.pendingExpenses,
      icon: FileText,
      color: 'bg-orange-500',
      show: true,
      unit: ''
    },
    {
      title: 'Today Attendance',
      value: stats.todayAttendance,
      icon: Clock,
      color: 'bg-teal-500',
      show: true,
      unit: ''
    },
    {
      title: 'Open Positions',
      value: stats.openPositions,
      icon: TrendingUp,
      color: 'bg-cyan-500',
      show: isUserAdmin,
      unit: ''
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-500">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.filter(card => card.show).map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 mb-2 truncate">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {card.value} {card.unit && <span className="text-lg text-gray-500">{card.unit}</span>}
                  </p>
                </div>
                <div className={`${card.color} p-3 rounded-xl flex-shrink-0 ml-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('attendance')}
              className="w-full text-left px-4 py-4 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg transition touch-manipulation min-h-[72px]"
            >
              <p className="font-semibold text-base text-blue-900">Mark Attendance</p>
              <p className="text-sm text-blue-600 mt-1">Clock in/out for today</p>
            </button>
            <button
              onClick={() => onNavigate?.('leaves')}
              className="w-full text-left px-4 py-4 bg-green-50 hover:bg-green-100 active:bg-green-200 rounded-lg transition touch-manipulation min-h-[72px]"
            >
              <p className="font-semibold text-base text-green-900">Request Leave</p>
              <p className="text-sm text-green-600 mt-1">Submit a new leave request</p>
            </button>
            <button
              onClick={() => onNavigate?.('expenses')}
              className="w-full text-left px-4 py-4 bg-orange-50 hover:bg-orange-100 active:bg-orange-200 rounded-lg transition touch-manipulation min-h-[72px]"
            >
              <p className="font-semibold text-base text-orange-900">Submit Expense</p>
              <p className="text-sm text-orange-600 mt-1">File an expense claim</p>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-500 text-center py-8">No recent activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}
