
import { createClient } from '@supabase/supabase-js';
import { Task, TaskLog, TaskStatus, TaskPriority, DrivePost, DriveAttachment } from '../types';

// Menggunakan kredensial yang diberikan oleh user
const supabaseUrl = 'https://ujoiqrmcszrkvbebacvm.supabase.co';
const supabaseAnonKey = 'sb_publishable_-MHpR3GpYei3rdlIi-x9qA_IlQqj_3h';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper untuk mapping data dari database (snake_case) ke interface aplikasi (camelCase)
const mapTaskFromDB = (dbTask: any, dbLogs: any[] = []): Task => ({
  id: dbTask.id,
  title: dbTask.title,
  priority: dbTask.priority as TaskPriority,
  companyName: dbTask.company_name,
  jobType: dbTask.job_type,
  employeeName: dbTask.employee_name,
  category: dbTask.category,
  color: dbTask.color,
  startDate: dbTask.start_date,
  endDate: dbTask.end_date,
  status: dbTask.status as TaskStatus,
  progress: dbTask.progress,
  owner: dbTask.owner_username,
  collaborators: dbTask.collaborators || [],
  pendingCollaborators: dbTask.pending_collaborators || [],
  logs: (dbLogs || []).map(l => ({
    status: l.status as TaskStatus,
    progress: l.progress,
    date: l.date,
    description: l.description
  }))
});

export const supabaseService = {
  // --- Autentikasi Profiles ---
  async authenticate(username, password) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();
    
    if (error || !data) return { success: false, message: 'Username atau password salah' };
    return { success: true, user: data };
  },

  async getUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('username, role, name')
      .order('name', { ascending: true });
    return data || [];
  },

  async addUser(userData) {
    return await supabase.from('profiles').insert([userData]);
  },

  async deleteUser(username) {
    return await supabase.from('profiles').delete().eq('username', username);
  },

  // --- Manajemen Tugas ---
  async getTasks(currentUser: { username: string; role: string }, isTrackingView: boolean = false) {
    // Join dengan task_logs untuk mendapatkan history lengkap
    let query = supabase.from('tasks').select('*, task_logs(*)');
    
    // Jika BUKAN tampilan tracking (artinya tampilan Kalender/Dashboard/List Pribadi)
    if (!isTrackingView) {
      // Semua user (termasuk superadmin) hanya melihat tugas di mana mereka adalah OWNER atau COLLABORATOR
      // Ini memastikan kalender superadmin tidak kotor oleh tugas yang ia tugaskan ke orang lain
      query = query.or(`owner_username.eq.${currentUser.username},collaborators.cs.{${currentUser.username}}`);
    } else {
      // Jika INI ADALAH tampilan tracking dan dia superadmin, biarkan ambil semua (atau filter per target user di App.tsx)
      if (currentUser.role !== 'superadmin') {
        query = query.or(`owner_username.eq.${currentUser.username},collaborators.cs.{${currentUser.username}}`);
      }
      // Jika superadmin di view tracking, query tidak difilter di sini karena App.tsx akan memfilter berdasarkan targetUser
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
    
    return data.map(t => mapTaskFromDB(t, t.task_logs));
  },

  async saveTask(task: Task, ownerUsername: string) {
    const isNew = task.id.startsWith('task_');
    
    const dbTask = {
      title: task.title,
      priority: task.priority,
      company_name: task.companyName,
      job_type: task.jobType,
      employee_name: task.employeeName,
      category: task.category,
      color: task.color,
      start_date: task.startDate,
      end_date: task.endDate,
      status: task.status,
      progress: task.progress,
      owner_username: ownerUsername,
      collaborators: task.collaborators,
      pending_collaborators: task.pendingCollaborators
    };

    let taskId = task.id;
    
    if (isNew) {
      // Insert Task Baru
      const { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();
      if (error) throw error;
      taskId = data.id;
    } else {
      // Update Task Lama
      const { error } = await supabase.from('tasks').update(dbTask).eq('id', task.id);
      if (error) throw error;
    }

    // Sinkronisasi Logs: Hapus log lama dan masukkan versi terbaru
    await supabase.from('task_logs').delete().eq('task_id', taskId);
    
    if (task.logs && task.logs.length > 0) {
      const dbLogs = task.logs.map(l => ({
        task_id: taskId,
        status: l.status,
        progress: l.progress,
        date: l.date,
        description: l.description
      }));
      const { error: logError } = await supabase.from('task_logs').insert(dbLogs);
      if (logError) throw logError;
    }

    return { success: true, id: taskId };
  },

  async deleteTask(taskId: string) {
    await supabase.from('task_logs').delete().eq('task_id', taskId);
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
    return { success: true };
  },

  // --- Stickynote Pribadi ---
  async getStickyNote(username: string) {
    const { data, error } = await supabase
      .from('sticky_notes')
      .select('content')
      .eq('username', username)
      .single();
    if (error && error.code !== 'PGRST116') console.error('Error getting note:', error);
    return data?.content || '';
  },

  async saveStickyNote(username: string, content: string) {
    return await supabase.from('sticky_notes').upsert({ 
      username, 
      content, 
      updated_at: new Date().toISOString() 
    });
  },

  // --- Notifikasi & Pesan ---
  async getNotifications(username: string) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_username', username)
      .order('date', { ascending: false });
    return (data || []).map(n => ({ 
      id: n.id,
      type: n.type,
      taskId: n.task_id,
      title: n.title,
      message: n.message,
      priority: n.priority,
      date: n.date,
      read: n.is_read 
    }));
  },

  async sendNotification(notif: any) {
    return await supabase.from('notifications').insert([{
      recipient_username: notif.recipient_username,
      type: notif.type || 'info',
      task_id: notif.taskId,
      title: notif.title,
      message: notif.message,
      priority: notif.priority,
      is_read: false
    }]);
  },

  async markNotifRead(username: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_username', username);
    return !error;
  },

  // --- Drive Postingan ---
  async getDrivePosts() {
    const { data, error } = await supabase
      .from('drive_posts')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching drive posts:', error);
      return [];
    }
    
    return (data || []).map(p => ({
      id: p.id,
      title: p.title,
      content: p.content,
      attachments: p.attachments || [],
      owner_username: p.owner_username,
      owner_name: p.profiles?.name || p.owner_username,
      share_token: p.share_token,
      share_expires_at: p.share_expires_at,
      created_at: p.created_at
    }));
  },

  async createDrivePost(post: { title: string; content: string; attachments: DriveAttachment[]; owner_username: string }) {
    const { data, error } = await supabase
      .from('drive_posts')
      .insert([post])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateDrivePost(id: string, updates: Partial<DrivePost>) {
    const { data, error } = await supabase
      .from('drive_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteDrivePost(id: string) {
    const { error } = await supabase
      .from('drive_posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async getSharedDrivePost(shareToken: string) {
    const { data, error } = await supabase
      .from('drive_posts')
      .select('*')
      .eq('share_token', shareToken)
      .single();
      
    if (error || !data) return null;
    
    if (data.share_expires_at && new Date() > new Date(data.share_expires_at)) {
      return null;
    }
    
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('name')
      .eq('username', data.owner_username)
      .single();
      
    return {
      id: data.id,
      title: data.title,
      content: data.content,
      attachments: data.attachments || [],
      owner_username: data.owner_username,
      owner_name: ownerProfile?.name || data.owner_username,
      share_token: data.share_token,
      share_expires_at: data.share_expires_at,
      created_at: data.created_at
    };
  }
};
