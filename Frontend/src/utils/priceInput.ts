import type React from 'react';
import { sanitizePastedPriceText } from './storefrontLogic';

const BLOCKED_PRICE_KEYS = new Set(['e', 'E', '+', '-']);

export function getHardenedPriceHandlers(
  onValidValue: (rawString: string) => void
): {
  onWheel: React.WheelEventHandler<HTMLInputElement>;
  onKeyDown: React.KeyboardEventHandler<HTMLInputElement>;
  onPaste: React.ClipboardEventHandler<HTMLInputElement>;
  onDrop: React.DragEventHandler<HTMLInputElement>;
} {
  return {
    onWheel: (e) => {
      e.currentTarget.blur();
    },
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
