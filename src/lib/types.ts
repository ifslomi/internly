export type UserRole = 'intern' | 'dean';

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  password: string;
  role?: UserRole;
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
  weekNumber: number;
  weekStart: string;
  weekEnd: string;
  deadline: string;
  hoursRendered: number;
  fileUrl: string;
  fileName: string;
  filePublicId?: string;
  submittedAt: string;
  status: 'submitted';
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

export interface Sanction {
  id: string;
  userId: string;
  userEmail?: string;
  deanId: string;
  days: number;
  reason: string;
  description: string;
  issuedDate: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface DutySlot {
  id: string;
  deanId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location?: string;
  capacity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SanctionRender {
  id: string;
  sanctionId: string;
  userId: string;
  dutySlotId: string;
  status: 'available' | 'availed' | 'completed' | 'missed';
  attendanceDate?: string;
  hoursCompleted?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeanNotification {
  id: string;
  userId: string;
  type: 'duty_slot_available' | 'sanction_issued' | 'report_submitted' | 'system';
  title: string;
  message: string;
  dutySlotId?: string;
  sanctionId?: string;
  read: boolean;
  createdAt: string;
}
