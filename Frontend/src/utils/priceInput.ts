import type React from 'react';
import { sanitizePastedPriceText } from './storefrontLogic';

const BLOCKED_PRICE_KEYS = new Set(['e', 'E', '+', '-']);

export interface HardenedPriceHandlerOptions {
  allowWheel?: boolean;
}

export function getHardenedPriceHandlers(
  onValidValue: (rawString: string) => void,
  options?: HardenedPriceHandlerOptions
): {
  onWheel?: React.WheelEventHandler<HTMLInputElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onPaste: React.ClipboardEventHandler<HTMLInputElement>;
  onDrop: React.DragEventHandler<HTMLInputElement>;
} {
  const allowWheel = options?.allowWheel ?? false;
  return {
    ...(allowWheel
      ? {}
      : {
          onWheel: (e) => {
            e.currentTarget.blur();
          },
        }),
    onKeyDown: (e) => {
      if (BLOCKED_PRICE_KEYS.has(e.key)) {
        e.preventDefault();
      }
    },
    onPaste: (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text');
      const cleaned = sanitizePastedPriceText(pasted);
      if (cleaned !== '') {
        onValidValue(cleaned);
      }
    },
    onDrop: (e) => {
      e.preventDefault();
    },
  };
}

export function clampCatalogPrice(value: number, min: number, max: number): number {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, max) : safeMin;
  if (!Number.isFinite(value)) return safeMin;
  return Math.max(safeMin, Math.min(safeMax, value));
}

export function stepCatalogPriceByWheel(
  currentValue: number,
  deltaY: number,
  deltaX: number,
  min: number,
  max: number,
  step = 1
): number {
  let direction = 0;
  if (Math.abs(deltaY) >= Math.abs(deltaX) && deltaY !== 0) {
    direction = deltaY < 0 ? 1 : -1;
  } else if (deltaX !== 0) {
    direction = deltaX > 0 ? 1 : -1;
  }
  const base = Number.isFinite(currentValue) ? Math.round(currentValue) : min;
  if (direction === 0) return clampCatalogPrice(base, min, max);
  return clampCatalogPrice(base + direction * step, min, max);
}

export function normalizePriceInputChange(
  raw: string,
  min: number,
  max: number,
  clampLowerImmediately: boolean
): { valid: boolean; draft: string; committed?: number } {
  if (raw === '') {
    return { valid: true, draft: '', committed: undefined };
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return { valid: false, draft: raw };
  }
  if (parsed > max) {
    const clamped = clampCatalogPrice(parsed, min, max);
    return { valid: true, draft: String(clamped), committed: clamped };
  }
  if (parsed < min) {
    if (clampLowerImmediately) {
      const clamped = clampCatalogPrice(parsed, min, max);
      return { valid: true, draft: String(clamped), committed: clamped };
    }
    return { valid: true, draft: raw };
  }
  const normalized = /^0\d/.test(raw) ? String(parsed) : raw;
  return { valid: true, draft: normalized, committed: parsed };
}

