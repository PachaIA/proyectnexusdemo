export const DAILY_INTRO_STORAGE_KEY = 'nexus-intro-date-v2';

export function localCalendarDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shouldShowDailyIntro(storedDate: string | null, today = localCalendarDate()) {
  return storedDate !== today;
}