import { Timestamp } from 'firebase/firestore';

/**
 * Formats any date value (Firestore Timestamp, ISO string, Date, number) to a readable string.
 */
export function formatDate(value: any): string {
  if (!value) return '';

  let date: Date;

  if (value instanceof Timestamp) {
    date = value.toDate();
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (value?.seconds) {
    // Plain Firestore timestamp object (not class instance)
    date = new Date(value.seconds * 1000);
  } else {
    return '';
  }

  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
