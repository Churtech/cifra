import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return '---';
  
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercent(value: number | string | null | undefined) {
  const num = typeof value === 'string' ? parseFloat(value) : (value as number);
  if (num === null || num === undefined || isNaN(num) || !isFinite(num)) return '---';

  return new Intl.NumberFormat('es-CO', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num / 100);
}

export function isValidNumber(value: any): value is number {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num !== null && num !== undefined && !isNaN(num) && isFinite(num);
}

/**
 * Calculates the net return of a CDT according to the technical guide.
 * Includes 15% withholding tax (retención en la fuente) on interests.
 */
export function calculateCDTNetReturn(amount: number, tasaEA: number, days: number) {
  // Convert EA (Effective Annual) to period rate
  // Formula: (1 + i_ea)^(days/365) - 1
  const tasaPeriodo = Math.pow(1 + tasaEA / 100, days / 365) - 1;
  const intereses = amount * tasaPeriodo;
  const retencion = intereses * 0.15; // 15% Withholding in Colombia
  const neto = intereses - retencion;

  return {
    montoInicial: amount,
    intereses,
    retencion,
    neto,
    tasaNetaEA: tasaEA * 0.85,
    montoFinal: amount + neto,
  };
}

/**
 * General return calculation for non-taxed assets (like some ETFs or Stocks with simplified logic)
 */
export function calculateSimpleReturn(amount: number, expectedReturnEA: number, days: number) {
  const tasaPeriodo = Math.pow(1 + expectedReturnEA / 100, days / 365) - 1;
  const neto = amount * tasaPeriodo;

  return {
    montoInicial: amount,
    intereses: neto,
    retencion: 0,
    neto,
    tasaNetaEA: expectedReturnEA,
    montoFinal: amount + neto,
  };
}
