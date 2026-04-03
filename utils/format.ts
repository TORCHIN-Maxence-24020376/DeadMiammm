import { StorageZone, zoneLabels } from '@/data/mock-data';

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'numeric',
});

export function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

export function formatFullDate(value: string) {
  return fullDateFormatter.format(new Date(value));
}

export function zoneLabel(zone: StorageZone) {
  return zoneLabels[zone];
}

export function daysUntil(value: string) {
  const today = new Date();
  const target = new Date(value);

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diff = startOfTarget.getTime() - startOfToday.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
