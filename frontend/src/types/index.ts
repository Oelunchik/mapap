export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'head' | 'analyst';
  direction_code: string;
  direction_name: string;
}

export interface Direction {
  id: number;
  code: string;
  name_ru: string;
}

export interface TaskType {
  id: number;
  code: string;
  name_ru: string;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 1 | 2 | 3;
  status: 'new' | 'in_progress' | 'review' | 'done' | 'blocked';
  due_date?: string;
  is_urgent: boolean;
  parent_task_id?: number;
  created_at: string;
  updated_at: string;
  assignee_id: number;
  assignee_name: string;
  direction_id: number;
  direction_code: string;
  direction_name: string;
  task_type_id: number;
  task_type_code: string;
  task_type_name: string;
  history?: TaskHistory[];
  subtasks?: Task[];
  attachments?: Attachment[];
}

export interface TaskHistory {
  id: number;
  task_id: number;
  changed_by: number;
  changed_by_name: string;
  old_status: string;
  new_status: string;
  comment?: string;
  changed_at: string;
}

export interface Attachment {
  id: number;
  file_name: string;
  file_url: string;
  uploaded_by_name: string;
  uploaded_at: string;
}

export interface InternationalTrack {
  id: number;
  partner_name: string;
  status: string;
  notes?: string;
  direction_code: string;
  direction_name: string;
  responsible_name: string;
}

export interface SummaryRow {
  id: number;
  full_name: string;
  total: number;
  high_priority: number;
  medium_priority: number;
  in_progress: number;
  done: number;
}

export interface TaskFilters {
  assignee?: number;
  direction?: string;
  status?: string;
  priority?: number;
  parent_only?: boolean;
}
