export function getTimeValue(value: any): number {
  if (!value) return 0;

  try {
    if (typeof value.toMillis === 'function') {
      return value.toMillis();
    }

    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
    }

    if (typeof value.seconds === 'number') {
      return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1000000);
    }

    if (typeof value._seconds === 'number') {
      return (value._seconds * 1000) + Math.floor((value._nanoseconds || 0) / 1000000);
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  } catch {
    return 0;
  }
}

export function sortByCreatedAtDesc<T extends { createdAt?: any }>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index, time: getTimeValue(item.createdAt) }))
    .sort((a, b) => {
      if (b.time !== a.time) return b.time - a.time;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
