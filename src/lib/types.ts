export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  password: string;
  address?: string;
  phoneNumber?: string;
  contact?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  guardian?: {
    email?: string;
    phone?: string;
  };
  course?: string;
  department?: string;
  companyName?: string;
  companyAddress?: string;
  companyContactNumber?: string;
  companyEmail?: string;
  company?: {
    name?: string;
    address?: string;
    contactNumber?: string;
    email?: string;
    details?: string;
  };
  totalRequiredHours: number;
  startDate: string;
  endDate?: string;
  createdAt: string;
  supervisors: string[];
  reminderEnabled: boolean;
  profileImage?: string;
}

export interface DailyLog {
  id: string;
  userId: string;
  entryDate: string;
  activityType: ActivityType[];
  taskDescription: string;
  supervisor: string;
  dailyHours: number;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Competency {
  id: string;
  userId: string;
  date: string;
  activity: string;
  areaCovered: string;
  outcome: string;
  evidenceType: '' | 'link' | 'image' | 'video' | 'document';
  evidenceUrl: string;
  evidenceLabel: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  reflection: string;
  logs: DailyLog[];
  importedPdfUrl?: string;
  importedPdfName?: string;
  importedPdfUploadedAt?: string;
  importedPdfPublicId?: string;
  importedPdfResourceType?: 'raw' | 'image' | 'video';
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
}

export type ActivityType =
  | 'Technical'
  | 'Administrative'
  | 'Meeting'
  | 'Field Work'
  | 'Coding'
  | 'Documentation'
  | 'Research'
  | 'Training'
  | 'Presentation'
  | 'Other';

export const ACTIVITY_TYPES: ActivityType[] = [
  'Technical',
  'Administrative',
  'Meeting',
  'Field Work',
  'Coding',
  'Documentation',
  'Research',
  'Training',
  'Presentation',
  'Other',
];

export interface HourStats {
  totalRequired: number;
  totalRendered: number;
  hoursThisWeek: number;
  remaining: number;
  progressPercentage: number;
  weeklyAverage: number;
  daysLogged: number;
}

export type NotificationType = 'reminder' | 'system' | 'achievement' | 'report_due';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface Supervisor {
  id: string;
  name: string;
  email?: string;
  department?: string;
  addedBy: string;
  createdAt: string;
}
