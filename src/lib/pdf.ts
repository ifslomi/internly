import { DailyLog } from './types';
import { format } from 'date-fns';

interface JsPDFDoc {
    setFontSize(size: number): void;
    setTextColor(r: number, g: number, b: number): void;
    setFont(fontName: string, fontStyle?: string): void;
    text(text: string, x: number, y: number, options?: Record<string, unknown>): void;
    setDrawColor(r: number, g: number, b: number): void;
    setFillColor(r: number, g: number, b: number): void;
    rect(x: number, y: number, w: number, h: number, style?: string): void;
    line(x1: number, y1: number, x2: number, y2: number): void;
    addPage(): void;
    save(filename: string): void;
    internal: { pageSize: { getWidth(): number; getHeight(): number } };
    getTextWidth(text: string): number;
    splitTextToSize(text: string, maxWidth: number): string[];
}

type JsPDFCtor = new (options?: Record<string, unknown>) => JsPDFDoc;

export async function generatePDF(
    logs: DailyLog[],
    weekLabel: string,
    reflection: string,
    userName: string
): Promise<void> {
    const { default: jsPDFLib } = await import('jspdf');
    const doc = new (jsPDFLib as unknown as JsPDFCtor)({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header background
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Accent line
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 45, pageWidth, 2, 'F');

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('INTERNLY', margin, 20);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Weekly Internship Report', margin, 28);

    // Meta info
    doc.setFontSize(9);
    doc.text(`Intern: ${userName}`, margin, 37);
    doc.text(`Period: ${weekLabel}`, pageWidth - margin - doc.getTextWidth(`Period: ${weekLabel}`), 37);

    y = 55;

    // Subtitle
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Daily Activity Log', margin, y);
    y += 8;

    // Table header
    const colWidths = [25, 30, contentWidth - 25 - 30 - 25 - 20, 25, 20];
    const headers = ['Date', 'Activity', 'Description', 'Supervisor', 'Hours'];

    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 5, contentWidth, 8, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);

    let xPos = margin + 2;
    headers.forEach((header, i) => {
        doc.text(header, xPos, y);
        xPos += colWidths[i];
    });

    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, margin + contentWidth, y);
    y += 4;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );

    let totalHours = 0;

    sortedLogs.forEach((log, index) => {
        if (y > 260) {
            doc.addPage();
            y = margin;
        }

        if (index % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y - 4, contentWidth, 7, 'F');
        }

        xPos = margin + 2;
        const dateStr = format(new Date(log.entryDate), 'MMM dd, yyyy');
        doc.text(dateStr, xPos, y);
        xPos += colWidths[0];

        doc.text(log.activityType.join(', ').substring(0, 20), xPos, y);
        xPos += colWidths[1];

        const descLines = doc.splitTextToSize(log.taskDescription.replace(/<[^>]*>/g, '').substring(0, 200), colWidths[2] - 4);
        doc.text(descLines[0] || '', xPos, y);
        xPos += colWidths[2];

        doc.text(log.supervisor.substring(0, 18), xPos, y);
        xPos += colWidths[3];

        doc.text(log.dailyHours.toString(), xPos, y);
        totalHours += log.dailyHours;

        y += descLines.length > 1 ? 5 * descLines.length : 7;

        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y - 2, margin + contentWidth, y - 2);
    });

    // Total row
    y += 2;
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, y - 4, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Total Hours:', margin + 2, y);
    doc.text(totalHours.toString(), margin + contentWidth - 20, y);

    y += 14;

    // Reflection section
    if (y > 220) {
        doc.addPage();
        y = margin;
    }

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Weekly Learning & Reflections', margin, y);
    y += 8;

    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y - 4, contentWidth, 2, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(margin, y - 4, 40, 2, 'F');
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const reflectionText = reflection || 'No reflection was provided for this week.';
    const reflectionLines = doc.splitTextToSize(reflectionText, contentWidth - 4);
    reflectionLines.forEach((line: string) => {
        if (y > 275) {
            doc.addPage();
            y = margin;
        }
        doc.text(line, margin + 2, y);
        y += 5;
    });

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 15, margin + contentWidth, pageHeight - 15);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
        `Generated by Internly • ${format(new Date(), 'MMMM dd, yyyy')}`,
        margin,
        pageHeight - 10
    );

    doc.save(`Internly_WeeklyReport_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

type UbReportUser = {
    name: string;
    course?: string;
    department?: string;
    companyName?: string;
};

type UbWeeklyReportArgs = {
    logs: DailyLog[];
    weekLabel: string;
    reflection: string;
    user: UbReportUser;
    totalRequiredHours: number;
};

function sanitizeText(text: string): string {
    return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function formatHours(value: number): string {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/\.00$/, '');
}

export async function generateUBWeeklyReportPDF({
    logs,
    weekLabel,
    reflection,
    user,
    totalRequiredHours,
}: UbWeeklyReportArgs): Promise<void> {
    const { default: jsPDFLib } = await import('jspdf');
    const doc = new (jsPDFLib as unknown as JsPDFCtor)({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const marginX = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginX * 2;
    let y = 14;

    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
    const weekHours = sortedLogs.reduce((sum, log) => sum + log.dailyHours, 0);
    const hoursRemaining = Math.max(0, totalRequiredHours - weekHours);

    const drawHeader = () => {
        doc.setTextColor(25, 25, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('F-CICT-05', marginX, y);
        doc.setFontSize(17);
        doc.setFont('times', 'bold');
        doc.text('University of Batangas', marginX + contentWidth, y + 1, { align: 'right' });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('COLLEGE OF INFORMATION', marginX + contentWidth, y + 5, { align: 'right' });
        doc.text('& COMMUNICATIONS TECHNOLOGY', marginX + contentWidth, y + 8, { align: 'right' });
        y += 15;
    };

    const drawFooter = () => {
        const footerY = pageHeight - 8;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Revision No: 0', marginX, footerY);
        doc.text('Issued Date: August 17, 2017', marginX + contentWidth / 2, footerY, { align: 'center' });
        doc.text('Revision Date: NA', marginX + contentWidth, footerY, { align: 'right' });
    };

    const drawWeeklyMetaHeader = () => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('On-the-Job Training Weekly Report', marginX + contentWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Student Name : ${user.name || '-'}`, marginX, y);
        doc.text(`Course : ${user.course || '-'}`, marginX + contentWidth * 0.62, y);
        y += 6;
        doc.text(`Company      : ${user.companyName || '-'}`, marginX, y);
        doc.text(`Dept. : ${user.department || '-'}`, marginX + contentWidth * 0.62, y);
        y += 6;
        doc.text(`Week         : ${weekLabel}`, marginX, y);
        y += 8;

        doc.setFont('helvetica', 'bold');
        doc.rect(marginX, y, contentWidth, 9);
        doc.line(marginX + contentWidth / 3, y, marginX + contentWidth / 3, y + 9);
        doc.line(marginX + (contentWidth * 2) / 3, y, marginX + (contentWidth * 2) / 3, y + 9);
        doc.setFontSize(8);
        doc.text('Practicum Hours Served', marginX + contentWidth / 6, y + 4, { align: 'center' });
        doc.text('Hours Served This Week', marginX + contentWidth / 2, y + 4, { align: 'center' });
        doc.text('Hours to Complete Practicum', marginX + (contentWidth * 5) / 6, y + 4, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.text(formatHours(totalRequiredHours), marginX + contentWidth / 6, y + 8, { align: 'center' });
        doc.text(formatHours(weekHours), marginX + contentWidth / 2, y + 8, { align: 'center' });
        doc.text(formatHours(hoursRemaining), marginX + (contentWidth * 5) / 6, y + 8, { align: 'center' });
        y += 14;
    };

    const startPage = (newPage: boolean, includeMeta: boolean) => {
        if (newPage) doc.addPage();
        y = 14;
        drawHeader();
        if (includeMeta) drawWeeklyMetaHeader();
    };

    const drawRuledLines = (startY: number, endY: number, spacing = 4.6) => {
        doc.setDrawColor(70, 70, 70);
        for (let lineY = startY; lineY <= endY; lineY += spacing) {
            doc.line(marginX, lineY, marginX + contentWidth, lineY);
        }
    };

    if (sortedLogs.length === 0) {
        startPage(false, true);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('A.  Accomplished Activities', marginX, y);
        y += 7;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text('No logs found for this week.', marginX, y);
        drawFooter();
    } else {
        sortedLogs.forEach((log, index) => {
            startPage(index > 0, true);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('A.  Accomplished Activities', marginX, y);
            y += 7;

            const activity = log.activityType?.join(', ') || 'General';
            const dateLabel = format(new Date(log.entryDate), 'MMMM dd, yyyy');
            const description = sanitizeText(log.taskDescription) || 'No description provided.';
            const descLines = doc.splitTextToSize(description, contentWidth - 2);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Date : ${dateLabel}`, marginX, y);
            y += 5.4;
            doc.text(`Nature of Activity : ${activity}`, marginX, y);
            y += 5.4;

            const descriptionStartY = y;
            const bodyBottomY = pageHeight - 44;
            drawRuledLines(descriptionStartY, bodyBottomY);
            y += 3.7;
            descLines.forEach((line: string) => {
                if (y > bodyBottomY) return;
                doc.text(line, marginX + 1, y);
                y += 4.6;
            });

            const signatureTopY = pageHeight - 38;
            doc.setDrawColor(40, 40, 40);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Task / Assignment Received From: ${log.supervisor || '-'}`, marginX, signatureTopY);
            doc.text('Remarks / Signature', marginX, signatureTopY + 8);
            doc.line(marginX + 30, signatureTopY + 8.5, marginX + contentWidth, signatureTopY + 8.5);

            drawFooter();
        });
    }

    startPage(sortedLogs.length > 0, false);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('B.  Knowledge / skills gained and or Difficulties Encountered for the Period:', marginX, y);
    y += 7;

    const reflectionStartY = y;
    const reflectionBottomY = pageHeight - 56;
    drawRuledLines(reflectionStartY, reflectionBottomY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const reflectionText = sanitizeText(reflection) || 'No reflection submitted for this week.';
    const reflectionLines = doc.splitTextToSize(reflectionText, contentWidth - 2);
    let reflectionY = reflectionStartY + 3.7;
    reflectionLines.forEach((line: string) => {
        if (reflectionY > reflectionBottomY) return;
        doc.text(line, marginX + 1, reflectionY);
        reflectionY += 4.6;
    });

    const signatureLineY = pageHeight - 31;
    doc.setFont('helvetica', 'normal');
    doc.text('Noted by:', marginX + 4, signatureLineY - 9);
    doc.line(marginX + 4, signatureLineY, marginX + 72, signatureLineY);
    doc.line(marginX + 88, signatureLineY, marginX + 156, signatureLineY);
    doc.setFont('helvetica', 'bold');
    doc.text('Officer-In-Charge', marginX + 38, signatureLineY + 5, { align: 'center' });
    doc.text('Adviser', marginX + 122, signatureLineY + 5, { align: 'center' });

    drawFooter();
    doc.save(`Internly_WeeklyReport_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}_UB_Style.pdf`);
}

type SimpleWeeklyReportArgs = {
    logs: DailyLog[];
    weekLabel: string;
    reflection: string;
    userName: string;
};

export async function generateSimpleWeeklyReportPDF({
    logs,
    weekLabel,
    reflection,
    userName,
}: SimpleWeeklyReportArgs): Promise<void> {
    const { default: jsPDFLib } = await import('jspdf');
    const doc = new (jsPDFLib as unknown as JsPDFCtor)({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime()
    );
    const totalHours = sortedLogs.reduce((sum, log) => sum + log.dailyHours, 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Weekly Report (Simple)', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Student: ${userName || '-'}`, margin, y);
    y += 5;
    doc.text(`Week: ${weekLabel}`, margin, y);
    y += 5;
    doc.text(`Total Hours: ${formatHours(totalHours)}`, margin, y);
    y += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const colWidths = [28, 20, contentWidth - 28 - 20 - 32, 32];
    const headers = ['Date', 'Hours', 'Content', 'Supervisor'];
    doc.rect(margin, y, contentWidth, 8);
    doc.line(margin + colWidths[0], y, margin + colWidths[0], y + 8);
    doc.line(margin + colWidths[0] + colWidths[1], y, margin + colWidths[0] + colWidths[1], y + 8);
    doc.line(margin + colWidths[0] + colWidths[1] + colWidths[2], y, margin + colWidths[0] + colWidths[1] + colWidths[2], y + 8);

    let x = margin + 2;
    headers.forEach((header, idx) => {
        doc.text(header, x, y + 5);
        x += colWidths[idx];
    });
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    if (sortedLogs.length === 0) {
        doc.rect(margin, y, contentWidth, 10);
        doc.text('No logs found for this week.', margin + 2, y + 6);
        y += 12;
    } else {
        sortedLogs.forEach((log) => {
            const dateStr = format(new Date(log.entryDate), 'MMM dd, yyyy');
            const content = sanitizeText(log.taskDescription) || 'No description provided.';
            const contentLines = doc.splitTextToSize(content, colWidths[2] - 4) as string[];
            const rowLineCount = Math.max(1, Math.min(6, contentLines.length));
            const rowHeight = Math.max(8, rowLineCount * 4.2 + 2);

            if (y + rowHeight > pageHeight - 30) {
                doc.addPage();
                y = margin;
            }

            doc.rect(margin, y, contentWidth, rowHeight);
            doc.line(margin + colWidths[0], y, margin + colWidths[0], y + rowHeight);
            doc.line(margin + colWidths[0] + colWidths[1], y, margin + colWidths[0] + colWidths[1], y + rowHeight);
            doc.line(margin + colWidths[0] + colWidths[1] + colWidths[2], y, margin + colWidths[0] + colWidths[1] + colWidths[2], y + rowHeight);

            doc.text(dateStr, margin + 2, y + 5);
            doc.text(formatHours(log.dailyHours), margin + colWidths[0] + 2, y + 5);
            contentLines.slice(0, rowLineCount).forEach((line, idx) => {
                doc.text(line, margin + colWidths[0] + colWidths[1] + 2, y + 5 + idx * 4.2);
            });
            doc.text(log.supervisor || '-', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, y + 5);

            y += rowHeight;
        });
    }

    y += 10;
    if (y > pageHeight - 55) {
        doc.addPage();
        y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Weekly Reflection', margin, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const reflectionText = sanitizeText(reflection) || 'No reflection provided for this week.';
    const reflectionLines = doc.splitTextToSize(reflectionText, contentWidth - 4) as string[];
    const reflectionBoxHeight = Math.max(24, Math.min(120, reflectionLines.length * 4.5 + 6));
    doc.rect(margin, y, contentWidth, reflectionBoxHeight);
    reflectionLines.slice(0, Math.floor((reflectionBoxHeight - 6) / 4.5)).forEach((line, idx) => {
        doc.text(line, margin + 2, y + 5 + idx * 4.5);
    });

    doc.save(`Internly_WeeklyReport_${weekLabel.replace(/[^a-zA-Z0-9]/g, '_')}_Simple.pdf`);
}
