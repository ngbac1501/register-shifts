import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

// Merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format date
export function formatDate(date: Date | Timestamp | string, formatStr: string = 'dd/MM/yyyy'): string {
  try {
    let dateObj: Date;

    if (date instanceof Timestamp) {
      dateObj = date.toDate();
    } else if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }

    if (!isValid(dateObj)) {
      return 'Invalid date';
    }

    return format(dateObj, formatStr, { locale: vi });
  } catch (error) {
    return 'Invalid date';
  }
}

// Format time (HH:mm)
export function formatTime(time: string): string {
  return time;
}

// Calculate duration between two times
export function calculateDuration(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  let duration = (endHour - startHour) + (endMinute - startMinute) / 60;

  // Handle overnight shifts
  if (duration < 0) {
    duration += 24;
  }

  return Math.round(duration * 10) / 10; // Round to 1 decimal place
}

// Calculate night shift hours (22:30 - 06:30)
export function calculateNightShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  let startTotalMinutes = startHour * 60 + startMinute;
  let endTotalMinutes = endHour * 60 + endMinute;

  // Handle overnight shift by adding 24 hours to end time if it's less than start time
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  // Night shift window: 22:30 (previous day) to 06:30 (next day)
  // We need to check overlap with two possible windows relative to the shift:
  // 1. 22:30 (same day) - 30:30 (next day 06:30)
  // 2. -01:30 (previous day 22:30) - 06:30 (same day) -> This case is tricky if we normalize to 0-48h.

  // Simplification: Define Night Window as [1350, 1830] (22:30 to 06:30+24h)
  // But wait, what if shift is 04:00 - 08:00? It overlaps 04:00-06:30.
  // 04:00 is 240 min. 08:00 is 480 min.
  // Window 1: 00:00 - 06:30 (0 - 390).
  // Window 2: 22:30 - 24:00 (1350 - 1440).

  // Actually, easiest way is to iterate or use ranges.
  // Let's use the normalized minutes logic where 0 = 00:00 start day.

  let nightMinutes = 0;
  const NIGHT_START = 22 * 60 + 30; // 1350
  const NIGHT_END = 6 * 60 + 30;   // 390

  // We check minute by minute or segments? Segments is better.
  // Range 1: 00:00 - 06:30
  // Range 2: 22:30 - 24:00
  // Range 3: 24:00 - 30:30 (Next day 00:00 - 06:30)

  const ranges = [
    { start: 0, end: NIGHT_END },           // 00:00 - 06:30
    { start: NIGHT_START, end: 24 * 60 },   // 22:30 - 24:00
    { start: 24 * 60, end: 24 * 60 + NIGHT_END } // 24:00 - 30:30 (06:30 next day)
  ];

  for (const range of ranges) {
    const overlapStart = Math.max(startTotalMinutes, range.start);
    const overlapEnd = Math.min(endTotalMinutes, range.end);

    if (overlapEnd > overlapStart) {
      nightMinutes += overlapEnd - overlapStart;
    }
  }

  return Math.round((nightMinutes / 60) * 10) / 10;
}

export type ShiftCategory = 'morning' | 'afternoon' | 'night';

export function getShiftCategory(startTime: string): ShiftCategory {
  const [hour] = startTime.split(':').map(Number);

  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'night';
}

// Format currency (VND)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  };

  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

// Get status label
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Chờ duyệt',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    completed: 'Hoàn thành',
  };

  return labels[status] || status;
}

// Get role label
export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Quản trị viên',
    manager: 'Quản lý',
    employee: 'Nhân viên',
  };

  return labels[role] || role;
}

// Get shift type label
export function getShiftTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fulltime: 'Full-time',
    parttime: 'Part-time',
  };

  return labels[type] || type;
}

// Get employee type label
export function getEmployeeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    fulltime: 'Toàn thời gian',
    parttime: 'Bán thời gian',
  };

  return labels[type] || type;
}

// Truncate text
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

// Generate random color for avatar
export function getAvatarColor(name: string): string {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}
