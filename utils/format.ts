import { StorageZone, zoneLabels } from '@/data/inventory';

const fullDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'numeric',
});

const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function formatShortDate(value: string | null | undefined, fallback = '—') {
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  return shortDateFormatter.format(date);
}

export function formatFullDate(value: string | null | undefined, fallback = '—') {
  const date = toValidDate(value);
  if (!date) {
    return fallback;
  }

  return fullDateFormatter.format(date);
}

export function zoneLabel(zone: StorageZone) {
  return zoneLabels[zone];
}

export function daysUntil(value: string | null | undefined) {
  const target = toValidDate(value);
  if (!target) {
    return Number.POSITIVE_INFINITY;
  }

  const today = new Date();

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diff = startOfTarget.getTime() - startOfToday.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isValidDateString(value: string | null | undefined) {
  return toValidDate(value) !== null;
}

function toValidDate(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = ISO_DATE_ONLY_REGEX.test(trimmed) ? `${trimmed}T00:00:00` : trimmed;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
