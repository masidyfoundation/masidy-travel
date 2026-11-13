import type { CurrencyCode } from './types.ts';

export const CURRENCY_RATES_FROM_EUR: Record<CurrencyCode, number> = {
  EUR: 1,
  USD: 1.08,
  EGP: 53.5,
};

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  EGP: 'EGP ',
};

export function convertAmount(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode
): number {
  if (fromCurrency === toCurrency) return Number(amount.toFixed(2));
  const amountInEur = amount / CURRENCY_RATES_FROM_EUR[fromCurrency];
  const converted = amountInEur * CURRENCY_RATES_FROM_EUR[toCurrency];
  return Number(converted.toFixed(2));
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'EGP' ? 0 : 2,
    maximumFractionDigits: currency === 'EGP' ? 0 : 2,
  }).format(amount);

  if (currency === 'EGP') return `${formatted} EGP`;
  return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
}
