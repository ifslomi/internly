import { DailyLog, HourStats } from './types';
import {
    startOfWeek,
    endOfWeek,
    isWithinInterval,
    parseISO,
    differenceInWeeks,
} from 'date-fns';

export function calculateHourStats(logs: DailyLog[], totalRequired: number): HourStats {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const totalRendered = logs.reduce((sum, log) => sum + log.dailyHours, 0);

    const hoursThisWeek = logs
        .filter((log) =>
            isWithinInterval(parseISO(log.entryDate), { start: weekStart, end: weekEnd })
        )
        .reduce((sum, log) => sum + log.dailyHours, 0);

    const remaining = Math.max(0, totalRequired - totalRendered);
    const progressPercentage = totalRequired > 0 ? Math.min(100, (totalRendered / totalRequired) * 100) : 0;

    // Calculate weekly average
    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
    let weeklyAverage = 0;
    if (sortedLogs.length > 0) {
        const firstDate = parseISO(sortedLogs[0].entryDate);
        const weeksActive = Math.max(1, differenceInWeeks(now, firstDate) + 1);
        weeklyAverage = totalRendered / weeksActive;
    }

    const uniqueDays = new Set(logs.map((l) => l.entryDate)).size;

    return {
        totalRequired,
        totalRendered: Math.round(totalRendered * 100) / 100,
        hoursThisWeek: Math.round(hoursThisWeek * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        progressPercentage: Math.round(progressPercentage * 10) / 10,
        weeklyAverage: Math.round(weeklyAverage * 10) / 10,
        daysLogged: uniqueDays,
    };
}

export function getWeeksForLogs(logs: DailyLog[]): { start: Date; end: Date; label: string }[] {
    if (logs.length === 0) return [];

    const sorted = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    const weekMap = new Map<string, { start: Date; end: Date }>();
    sorted.forEach((log) => {
        const date = parseISO(log.entryDate);
        const ws = startOfWeek(date, { weekStartsOn: 1 });
        const we = endOfWeek(date, { weekStartsOn: 1 });
        const key = ws.toISOString();
        if (!weekMap.has(key)) {
            weekMap.set(key, { start: ws, end: we });
        }
    });

    return Array.from(weekMap.values())
        .sort((a, b) => b.start.getTime() - a.start.getTime())
        .map((w, i) => ({
            ...w,
            label: `Week ${Array.from(weekMap.values()).length - i}: ${w.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${w.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        }));
}

export function getLogsForWeek(logs: DailyLog[], weekStart: Date, weekEnd: Date): DailyLog[] {
    return logs
        .filter((log) =>
            isWithinInterval(parseISO(log.entryDate), { start: weekStart, end: weekEnd })
        )
        .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());
}

export function getBurndownData(
    logs: DailyLog[],
    totalRequired: number,
    startDate: string,
    endDate?: string
): { week: string; remaining: number; ideal: number }[] {
    const sorted = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    if (sorted.length === 0) return [];

    const start = parseISO(startDate);
    const end = endDate ? parseISO(endDate) : new Date();
    const totalWeeks = Math.max(1, differenceInWeeks(end, start) + 1);

    const data: { week: string; remaining: number; ideal: number }[] = [];
    let cumulative = 0;

    for (let i = 0; i <= totalWeeks; i++) {
        const weekStart = new Date(start);
        weekStart.setDate(weekStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekLogs = sorted.filter((l) => {
            const d = parseISO(l.entryDate);
            return d >= weekStart && d <= weekEnd;
        });

        cumulative += weekLogs.reduce((sum, l) => sum + l.dailyHours, 0);

        data.push({
            week: `Wk ${i + 1}`,
            remaining: Math.max(0, Math.round((totalRequired - cumulative) * 100) / 100),
            ideal: Math.max(0, Math.round((totalRequired - (totalRequired / totalWeeks) * (i + 1)) * 100) / 100),
        });
    }

    return data;
}
