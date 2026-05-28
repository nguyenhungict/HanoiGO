export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function dbTimeToMin(dbTime: any): number {
  if (!dbTime) return 0;
  if (dbTime instanceof Date) {
    return dbTime.getUTCHours() * 60 + dbTime.getUTCMinutes();
  }
  const parts = String(dbTime).split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

export function parseTimeString(timeStr?: string): Date | null {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Use UTC to ensure consistency between Backend and Frontend display
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}
