/**
 * @license
 * SPDX-License-Identifier: MIT
 */

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  size?: "sm" | "md";
}

/** Accessible binary switch control with a 44px touch target and RTL/LTR thumb motion. */
export default function ToggleSwitch({
  id,
  checked,
  onChange,
  ariaLabel,
  size = "md",
}: ToggleSwitchProps) {
  const trackClass = size === "sm" ? "w-10 h-5" : "w-11 h-6";
  const thumbSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const thumbMove = checked
    ? size === "sm"
      ? "translate-x-5 rtl:-translate-x-5 bg-slate-950"
      : "translate-x-5 rtl:-translate-x-5 bg-slate-950"
    : "translate-x-0 bg-slate-200";

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl flex-shrink-0"
    >
      <span
        aria-hidden="true"
        className={`${trackClass} relative inline-flex items-center rounded-full border transition-colors ${
          checked
            ? "bg-emerald-500 border-emerald-400"
            : "bg-slate-800 border-slate-700"
        }`}
      >
        <span
          className={`${thumbSize} ${thumbMove} pointer-events-none absolute top-[1px] start-[1px] rounded-full shadow transition-transform duration-150`}
        />
      </span>
    </button>
  );
}
