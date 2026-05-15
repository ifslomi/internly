import { DailyLog } from './types';
import { format } from 'date-fns';

declare class jsPDF {
    constructor(options?: Record<string, unknown>);
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

export async function generatePDF(
    logs: DailyLog[],
    weekLabel: string,
    reflection: string,
    userName: string
): Promise<void> {
    const { default: jsPDFLib } = await import('jspdf');
    const doc = new (jsPDFLib as unknown as typeof jsPDF)({ orientation: 'portrait', unit: 'mm', format: 'a4' });

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
