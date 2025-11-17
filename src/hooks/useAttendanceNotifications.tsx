import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from './useToast';
import { useAuth } from '../contexts/AuthContext';

interface NotificationEvent {
  id: string;
  type: 'check_in' | 'check_out' | 'late' | 'absent' | 'device_offline';
  employeeName: string;
  timestamp: string;
  details?: string;
}

export function useAttendanceNotifications() {
  const { showToast } = useToast();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;

    const isAdmin = profile.role === 'admin';

    const channel = supabase
      .channel('attendance_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
        },
        async (payload) => {
          console.log('Attendance log notification:', payload);
          const log = payload.new;

          const { data: employee } = await supabase
            .from('employees')
            .select('users(full_name)')
            .eq('id', log.employee_id)
            .single();

          if (!employee) return;

          const employeeName = employee.users?.full_name || 'Unknown Employee';
          const notification: NotificationEvent = {
            id: log.id,
            type: log.log_type,
            employeeName,
            timestamp: log.log_time,
            details: `${log.verification_method} verification`,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);

          if (isAdmin) {
            const message = `${employeeName} ${log.log_type.replace('_', ' ')}`;
            showToast(message, 'info');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_anomalies',
        },
        async (payload) => {
          console.log('Attendance anomaly notification:', payload);
          const anomaly = payload.new;

          if (!isAdmin) return;

          const { data: employee } = await supabase
            .from('employees')
            .select('users(full_name)')
            .eq('id', anomaly.employee_id)
            .single();

          if (!employee) return;

          const employeeName = employee.users?.full_name || 'Unknown Employee';
          const notification: NotificationEvent = {
            id: anomaly.id,
            type: 'absent',
            employeeName,
            timestamp: anomaly.detected_at,
            details: anomaly.description,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);

          showToast(`Anomaly: ${employeeName} - ${anomaly.anomaly_type}`, 'error');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'biometric_devices',
          filter: 'is_online=eq.false',
        },
        (payload) => {
          console.log('Device offline notification:', payload);

          if (!isAdmin) return;

          const device = payload.new;
          const notification: NotificationEvent = {
            id: device.id,
            type: 'device_offline',
            employeeName: device.device_name,
            timestamp: new Date().toISOString(),
            details: 'Device went offline',
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);

          showToast(`Device offline: ${device.device_name}`, 'error');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    clearNotifications,
  };
}
