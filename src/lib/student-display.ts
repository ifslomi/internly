import type { User } from './types';

type StudentLike = Pick<User, 'name' | 'classNumber'>;

export function normalizeClassNumber(value?: string | number | null): string {
    if (value === null || value === undefined) return '';
    const digits = String(value).replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 1) return digits.padStart(2, '0');
    return digits;
}

export function formatNameSurnameFirst(name?: string | null): string {
    const normalized = (name || '').trim().replace(/\s+/g, ' ');
    if (!normalized) return '';

    const parts = normalized.split(' ');
    if (parts.length === 1) return parts[0];

    const surname = parts[parts.length - 1];
    const givenNames = parts.slice(0, -1).join(' ');
    return `${surname}, ${givenNames}`;
}

export function formatStudentNameForDean(student: StudentLike): string {
    const formattedName = formatNameSurnameFirst(student.name) || student.name || '';
    const classNumber = normalizeClassNumber(student.classNumber);
    return classNumber ? `${classNumber} ${formattedName}` : formattedName;
}

export function compareStudentsBySurnameFirst(a: Pick<User, 'name'>, b: Pick<User, 'name'>): number {
    const aKey = formatNameSurnameFirst(a.name).toLocaleLowerCase();
    const bKey = formatNameSurnameFirst(b.name).toLocaleLowerCase();
    return aKey.localeCompare(bKey);
}

export function buildStudentSearchText(student: Pick<User, 'name' | 'email' | 'course' | 'classNumber'>): string {
    const classNumber = normalizeClassNumber(student.classNumber);
    return [
        student.name || '',
        formatNameSurnameFirst(student.name),
        student.email || '',
        student.course || '',
        classNumber,
    ]
        .join(' ')
        .toLocaleLowerCase();
}
