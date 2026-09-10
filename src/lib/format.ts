import { roundPercent } from "@/utils/investmentCalculations";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "symbol",
  maximumFractionDigits: 0,
});

const currencyPrecise = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  currencyDisplay: "symbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFmt = new Intl.DateTimeFormat("en-NG", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-NG", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatCurrency(value: number, precise = false): string {
  return (precise ? currencyPrecise : currency).format(value);
}

export function formatPercent(value: number, signed = true): string {
  const rounded = roundPercent(value);
  const body = `${Math.abs(rounded).toFixed(2)}%`;
  if (!signed) return body;
  if (rounded > 0) return `+${body}`;
  if (rounded < 0) return `−${body}`;
  return body;
}

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function formatUuid(uuid: string): string {
  return uuid;
}

export function shortUuid(uuid: string): string {
  return `${uuid.slice(0, 8)}…${uuid.slice(-4)}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
