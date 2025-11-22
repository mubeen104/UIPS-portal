import { supabase } from './supabase';

export interface ActivityLogParams {
  userId: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export' | 'import';
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
}

export interface NotificationParams {
  userId: string;
  type: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  title: string;
  message?: string;
}

export async function logActivity(params: ActivityLogParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_activity', {
      p_user_id: params.userId,
      p_action: params.action,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId || null,
      p_changes: params.changes || null,
    });

    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function createNotification(params: NotificationParams): Promise<void> {
  try {
    const { error } = await supabase.rpc('create_notification', {
      p_user_id: params.userId,
      p_type: params.type,
      p_category: params.category || null,
      p_title: params.title,
      p_message: params.message || null,
    });

    if (error) {
      console.error('Failed to create notification:', error);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function getUserNotifications(userId: string, unreadOnly: boolean = false) {
  try {
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

export async function trackSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        ip_address: ipAddress || null,
        user_agent: userAgent || navigator.userAgent,
        last_activity: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error tracking session:', error);
    return null;
  }
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
}
