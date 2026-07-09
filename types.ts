
export type TaskStatus = 'Proses' | 'Selesai' | 'Ulang' | 'Belum Mulai';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export interface TaskLog {
  status: TaskStatus;
  progress: number;
  date: string; // ISO String
  description: string;
}

export interface Task {
  id: string;
  title: string;
  priority: TaskPriority;
  companyName: string;
  jobType: string;
  employeeName: string;
  category: string;
  color?: string;
  startDate: string; // ISO String
  endDate: string;   // ISO String
  status: TaskStatus;
  progress: number;
  logs: TaskLog[]; 
  owner?: string;
  collaborators?: string[]; // Array of usernames
  pendingCollaborators?: string[]; // Array of usernames waiting for approval
}

export type CalendarViewType = 'day' | 'week' | 'month' | 'list';

export interface DriveAttachment {
  name: string;
  url: string;
  fileType: string;
  fileId: string;
  size?: number;
}

export interface DrivePost {
  id: string;
  title: string;
  content: string;
  attachments: DriveAttachment[];
  owner_username: string;
  owner_name?: string;
  share_token?: string;
  share_expires_at?: string;
  created_at?: string;
}

