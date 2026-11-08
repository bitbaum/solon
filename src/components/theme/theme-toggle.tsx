"use client";

import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import {
  readThemeChoice,
  setThemeChoice,
  subscribeTheme,
  THEME_CHOICES,
  type ThemeChoice,
} from "./theme";

export interface ThemeToggleLabels {
  /** The button's accessible name, e.g. "Colour theme". */
  button: string;
  light: string;
  dark: string;
  system: string;
}

const ICONS: Record<ThemeChoice, LucideIcon> = { light: Sun, dark: Moon, system: Monitor };

/**
 * One icon button in the header; it opens three choices — Light, Dark,
 * Device. The icon shows the choice in force. The words come from the app
 * (`labels`), so this file carries no language and no brand and can move into
 * the token package as it is.
 *
 * Menu-button pattern: the button has aria-haspopup and aria-expanded, the
 * choices are menuitemradio with aria-checked. Escape, a click outside, or a
 * choice closes it; focus returns to the button.
 */
export default function ThemeToggle({
  labels,
  className = "",
}: {
  labels: ThemeToggleLabels;
  className?: string;
}) {
  // The server cannot know the stored choice; until hydration it renders the
  // "system" icon, then the real one. The page itself is already right: the
  // head script painted it.
  const choice = useSyncExternalStore(subscribeTheme, readThemeChoice, () => "system" as const);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    // Focus the choice in force, so arrow keys and Enter work at once.
    box.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const choose = (next: ThemeChoice) => {
    setThemeChoice(next);
    setOpen(false);
    button.current?.focus();
  };

  // Up and down move between the three choices, wrapping.
  const onMenuKey = (e: React.KeyboardEvent<HTMLUListElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]')];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(at + step + items.length) % items.length]?.focus();
  };

  const Icon = ICONS[choice];
  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        ref={button}
        type="button"
        aria-label={labels.button}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center text-fg-primary transition-opacity hover:opacity-70"
      >
        <Icon className="h-5 w-5" aria-hidden="true" />
      </button>
      {open && (
        <ul
          id={menuId}
          role="menu"
          aria-label={labels.button}
          onKeyDown={onMenuKey}
          className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-surface border border-default bg-surface-overlay py-1"
        >
          {THEME_CHOICES.map((c) => {
            const ItemIcon = ICONS[c];
            return (
              <li key={c} role="none">
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={c === choice}
                  onClick={() => choose(c)}
                  className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm text-fg-primary hover:bg-surface-hover focus:bg-surface-hover focus:outline-none"
                >
                  <ItemIcon className="h-4 w-4 shrink-0 text-fg-secondary" aria-hidden="true" />
                  <span className="flex-1">{labels[c]}</span>
                  {c === choice && <Check className="h-4 w-4 text-fg-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
