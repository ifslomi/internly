import { addWeeks, format, isValid, nextWednesday, parseISO } from 'date-fns';
import type { WeeklyReport } from './types';

export const WEEKLY_REPORT_MIN_WEEK = 1;
export const WEEKLY_REPORT_MAX_WEEK = 15;
export const WEEKLY_REPORT_TOTAL_WEEKS = 15;

export type WeeklyReportSubmissionStatus = 'pending' | 'overdue' | 'submitted';

export type WeeklyReportScheduleEntry = {
  weekNumber: number;
  start: Date;
  end: Date;
  deadline: Date;
  label: string;
  status: WeeklyReportSubmissionStatus;
  report: WeeklyReport | null;
};

function resolveStartDate(startDate?: string | Date): Date | null {
  if (!startDate) return null;
  const parsed = typeof startDate === 'string' ? parseISO(startDate) : startDate;
  return isValid(parsed) ? parsed : null;
}

export function getWeeklyReportStartDate(startDate: string | Date, weekNumber: number): Date {
  const parsed = resolveStartDate(startDate);
  if (!parsed) {
    throw new Error('A valid internship start date is required to calculate report deadlines.');
  }

  return addWeeks(parsed, weekNumber - 1);
}

export function getWeeklyReportDeadline(startDate: string | Date, weekNumber: number): Date {
  const parsed = resolveStartDate(startDate);
  if (!parsed) {
    throw new Error('A valid internship start date is required to calculate report deadlines.');
  }

  const firstDeadline = nextWednesday(parsed);
  return addWeeks(firstDeadline, weekNumber - 1);
}

export function getWeeklyReportScheduleEntry(
  startDate: string | Date,
  weekNumber: number,
  reports: WeeklyReport[] = [],
  now: Date = new Date()
): WeeklyReportScheduleEntry {
  const report = reports.find((item) => item.weekNumber === weekNumber) || null;
  const start = getWeeklyReportStartDate(startDate, weekNumber);
  const deadline = getWeeklyReportDeadline(startDate, weekNumber);
  const end = deadline;

  return {
    weekNumber,
    start,
    end,
    deadline,
    label: `Week ${weekNumber}: ${format(start, 'MMM d, yyyy')} - ${format(deadline, 'MMM d, yyyy')}`,
    status: report ? 'submitted' : now.getTime() > deadline.getTime() ? 'overdue' : 'pending',
    report,
  };
}

export function buildWeeklyReportSchedule(
  startDate?: string | Date,
  reports: WeeklyReport[] = [],
  now: Date = new Date()
): WeeklyReportScheduleEntry[] {
  const parsed = resolveStartDate(startDate);
  if (!parsed) return [];

  return Array.from({ length: WEEKLY_REPORT_TOTAL_WEEKS }, (_, index) =>
    getWeeklyReportScheduleEntry(parsed, index + 1, reports, now)
  );
}

export function isPdfFile(file?: File | null): boolean {
  if (!file) return false;
  const nameMatches = file.name.toLowerCase().endsWith('.pdf');
  const mimeMatches = file.type === 'application/pdf';
  return nameMatches && mimeMatches;
}

export function validateWeeklyReportSubmission(input: {
  weekNumber?: number;
  hoursRendered?: string | number;
  file?: File | null;
  startDate?: string | Date;
  reports?: WeeklyReport[];
}): string | null {
  const { weekNumber, hoursRendered, file, startDate, reports = [] } = input;

  if (!weekNumber || weekNumber < WEEKLY_REPORT_MIN_WEEK || weekNumber > WEEKLY_REPORT_MAX_WEEK) {
    return 'Please select a week from Week 1 to Week 15.';
  }

  const parsedStartDate = resolveStartDate(startDate);
  if (!parsedStartDate) {
    return 'Please set a valid internship start date before submitting reports.';
  }

  const scheduleEntry = getWeeklyReportScheduleEntry(parsedStartDate, weekNumber, reports);
  if (scheduleEntry.report) {
    return `Week ${weekNumber} has already been submitted.`;
  }

  const parsedHours = typeof hoursRendered === 'number' ? hoursRendered : Number(hoursRendered);
  if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
    return 'Please enter the total hours rendered for the selected week.';
  }

  if (!file) {
    return 'Please upload your weekly report document.';
  }

  if (!isPdfFile(file)) {
    return 'Weekly report uploads must be PDF files only.';
  }

  return null;
}

export function normalizeWeeklyReport(report: WeeklyReport): WeeklyReport {
  return {
    ...report,
    importedPdfUrl: report.importedPdfUrl || report.fileUrl,
    importedPdfName: report.importedPdfName || report.fileName,
    importedPdfUploadedAt: report.importedPdfUploadedAt || report.submittedAt,
    importedPdfPublicId: report.importedPdfPublicId || report.filePublicId,
    importedPdfResourceType: report.importedPdfResourceType || 'raw',
  };
}
