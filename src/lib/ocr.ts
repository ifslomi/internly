import { format, isValid, parse } from 'date-fns';
import { createWorker, setLogging } from 'tesseract.js';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { ActivityType } from './types';

export type OCRImportedLog = {
  entryDate: string;
  activityType: ActivityType[];
  taskDescription: string;
  supervisor: string;
  dailyHours: number;
  source: 'ocr';
};

export type OCRImportResult = {
  logs: OCRImportedLog[];
  reflection: string;
  pageTexts: string[];
};

const MONTHS =
  '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
}

function cleanupForSignature(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function toActivityType(raw: string): ActivityType[] {
  const text = raw.toLowerCase();
  if (text.includes('code') || text.includes('develop') || text.includes('debug')) return ['Coding'];
  if (text.includes('document')) return ['Documentation'];
  if (text.includes('research')) return ['Research'];
  if (text.includes('meeting')) return ['Meeting'];
  if (text.includes('field')) return ['Field Work'];
  if (text.includes('train')) return ['Training'];
  if (text.includes('present')) return ['Presentation'];
  if (text.includes('admin')) return ['Administrative'];
  if (text.includes('tech')) return ['Technical'];
  return ['Other'];
}

function tryParseDate(raw: string): string | null {
  const compact = normalizeWhitespace(raw)
    .replace(/(\d)(st|nd|rd|th)\b/gi, '$1')
    .replace(/\bto\b.*$/i, '');

  const candidates: string[] = [];
  const monthRegex = new RegExp(`${MONTHS}\\.?\\s+\\d{1,2}(?:,?\\s*\\d{2,4})?`, 'i');
  const monthMatch = compact.match(monthRegex);
  if (monthMatch) candidates.push(monthMatch[0]);

  const numericMatch = compact.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/);
  if (numericMatch) candidates.push(numericMatch[0]);

  const formats = [
    'MMMM d, yyyy',
    'MMMM d yyyy',
    'MMM d, yyyy',
    'MMM d yyyy',
    'MMMM d, yy',
    'MMM d, yy',
    'M/d/yyyy',
    'MM/dd/yyyy',
    'M/d/yy',
    'MM/dd/yy',
    'M-d-yyyy',
    'MM-dd-yyyy',
    'M-d-yy',
    'MM-dd-yy',
  ];

  for (const candidate of candidates) {
    for (const fmt of formats) {
      const parsed = parse(candidate, fmt, new Date());
      if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
}

function parseReflection(pageTexts: string[]): string {
  const fullText = pageTexts.join('\n');
  const sectionMatch = fullText.match(/B\.\s*Knowledge[\s\S]*?(?:Period:)?([\s\S]*)/i);
  if (!sectionMatch) return '';
  let body = sectionMatch[1] || '';
  body = body.replace(/Noted by:[\s\S]*$/i, '');
  body = body.replace(/Revision No:[\s\S]*$/i, '');
  body = body.replace(/Issued Date:[\s\S]*$/i, '');
  body = body.replace(/Revision Date:[\s\S]*$/i, '');
  return normalizeWhitespace(body).replace(/\s{2,}/g, ' ');
}

function extractFromSegment(lines: string[], fallbackYear: number): OCRImportedLog | null {
  const dateLine = lines.find((line) => /^(date|dote|dat[e0o])\b/i.test(line)) || lines[0];
  const parsedDate = tryParseDate(dateLine || '');
  if (!parsedDate) return null;

  let activity = '';
  const activityLine = lines.find((line) => /nature\s*of\s*activity/i.test(line));
  if (activityLine) {
    activity = activityLine.split(':').slice(1).join(':').trim() || activityLine.replace(/.*activity[:\-]?\s*/i, '').trim();
  }

  let supervisor = '';
  const supIndex = lines.findIndex((line) => /task\s*\/?\s*assignment\s*received\s*from/i.test(line));
  if (supIndex >= 0) {
    const currentLine = lines[supIndex];
    const inline = currentLine.split(':').slice(1).join(':').trim();
    supervisor = inline || (lines[supIndex + 1] || '').trim();
    supervisor = supervisor.replace(/^mr\.?\s*/i, '').trim();
  }

  const descriptionLines: string[] = [];
  const startIndex = lines.findIndex((line) => /nature\s*of\s*activity/i.test(line));
  const from = startIndex >= 0 ? startIndex + 1 : 1;
  const to = supIndex >= 0 ? supIndex : lines.length;
  for (let i = from; i < to; i += 1) {
    const line = lines[i];
    if (/^date\b/i.test(line)) continue;
    if (/nature\s*of\s*activity/i.test(line)) continue;
    if (/remarks?\s*\/?\s*signature/i.test(line)) continue;
    if (!line.trim()) continue;
    descriptionLines.push(line.trim());
  }

  const description = normalizeWhitespace(descriptionLines.join(' '));
  if (!description) return null;

  const year = Number(parsedDate.slice(0, 4));
  const safeDate = Number.isNaN(year) ? `${fallbackYear}${parsedDate.slice(4)}` : parsedDate;

  return {
    entryDate: safeDate,
    activityType: toActivityType(activity),
    taskDescription: description,
    supervisor: supervisor || 'Supervisor',
    dailyHours: 8,
    source: 'ocr',
  };
}

function parseLogsFromPages(pageTexts: string[]): OCRImportedLog[] {
  const logs: OCRImportedLog[] = [];
  const seen = new Set<string>();
  const thisYear = new Date().getFullYear();

  for (const rawText of pageTexts) {
    const lines = rawText
      .split('\n')
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean)
      .filter((line) => !/^(F-CICT-05|University of Batangas|COLLEGE OF INFORMATION)/i.test(line));

    const dateIndices: number[] = [];
    lines.forEach((line, idx) => {
      if (/^(date|dote|dat[e0o])\b/i.test(line)) dateIndices.push(idx);
    });

    if (dateIndices.length === 0) continue;

    for (let i = 0; i < dateIndices.length; i += 1) {
      const start = dateIndices[i];
      const end = i + 1 < dateIndices.length ? dateIndices[i + 1] : lines.length;
      const segment = lines.slice(start, end);
      const parsed = extractFromSegment(segment, thisYear);
      if (!parsed) continue;
      const sig = cleanupForSignature(`${parsed.entryDate}|${parsed.activityType.join(',')}|${parsed.taskDescription}|${parsed.supervisor}`);
      if (seen.has(sig)) continue;
      seen.add(sig);
      logs.push(parsed);
    }
  }

  return logs;
}

export async function extractUbWeeklyReportFromPdf(file: File): Promise<OCRImportResult> {
  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
      import.meta.url,
    ).toString();
  }

  // Suppress verbose engine logs in browser console during OCR.
  setLogging(false);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const worker = await createWorker('eng');
  const pageTexts: string[] = [];

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      try {
        const textContent = await page.getTextContent();
        const directText = (textContent.items as Array<{ str?: string }>)
          .map((item) => item?.str || '')
          .join(' ')
          .trim();

        // Prefer embedded PDF text when available; avoids noisy OCR on digital PDFs.
        if (directText.length > 40) {
          pageTexts.push(directText);
          continue;
        }
      } catch {
        // Fall back to OCR render path.
      }

      const viewport = page.getViewport({ scale: 3 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(96, Math.floor(viewport.width));
      canvas.height = Math.max(96, Math.floor(viewport.height));

      const context = canvas.getContext('2d');
      if (!context) {
        pageTexts.push('');
        continue;
      }

      try {
        await page.render({ canvasContext: context, viewport, canvas }).promise;
        const {
          data: { text },
        } = await worker.recognize(canvas, {
          rotateAuto: false,
        });
        pageTexts.push(text || '');
      } catch (error) {
        // Corrupt image chunks and tiny fragments are common in scanned PDFs; skip page-level OCR failure.
        console.warn(`[OCR] Page ${pageNum} skipped:`, error);
        pageTexts.push('');
      }
    }
  } finally {
    try {
      await worker.terminate();
    } catch {
      // Ignore worker shutdown errors.
    }
    await loadingTask.destroy();
  }

  const logs = parseLogsFromPages(pageTexts);
  const reflection = parseReflection(pageTexts);
  return { logs, reflection, pageTexts };
}
