/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import type { KeyboardEvent } from "react";

/**
 * Handles WAI-ARIA horizontal tablist keyboard navigation (ArrowLeft, ArrowRight, Home, End),
 * respecting RTL direction so visual arrow movement matches screen layout.
 */
export function handleTabListKeyDown<T extends string | number>(
  e: KeyboardEvent<HTMLElement>,
  tabs: readonly T[],
  current: T,
  onSelect: (next: T) => void,
  isRtl: boolean
): void {
  if (tabs.length === 0) return;

  const currentIdx = tabs.indexOf(current);
  const baseIdx = currentIdx === -1 ? 0 : currentIdx;
  let nextIdx: number | null = null;

  switch (e.key) {
    case "ArrowRight": {
      const delta = isRtl ? -1 : 1;
      nextIdx = (baseIdx + delta + tabs.length) % tabs.length;
      break;
    }
    case "ArrowLeft": {
      const delta = isRtl ? 1 : -1;
      nextIdx = (baseIdx + delta + tabs.length) % tabs.length;
      break;
    }
    case "Home":
      nextIdx = 0;
      break;
    case "End":
      nextIdx = tabs.length - 1;
      break;
    default:
      return;
  }

  e.preventDefault();
  onSelect(tabs[nextIdx]);
  const tabButtons = e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]');
  tabButtons[nextIdx]?.focus();
}
