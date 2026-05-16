"use client";

import * as React from "react";
import { Clock, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;         // "HH:MM" (24-h) or ""
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function fmt2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtDisplay(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${fmt2(m)} ${ampm}`;
}

export function TimePicker({ value, onChange, placeholder = "Pick a time", disabled }: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const selectedHour = value ? parseInt(value.split(":")[0]) : -1;
  const selectedMin = value ? parseInt(value.split(":")[1]) : -1;

  const hourRef = React.useRef<HTMLDivElement>(null);

  // Scroll selected hour into view when opening
  React.useEffect(() => {
    if (open && hourRef.current && selectedHour >= 0) {
      const el = hourRef.current.querySelector(`[data-hour="${selectedHour}"]`) as HTMLElement;
      el?.scrollIntoView({ block: "center" });
    }
  }, [open, selectedHour]);

  const select = (h: number, m: number) => {
    onChange(`${fmt2(h)}:${fmt2(m)}`);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
            !value && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? fmtDisplay(value) : placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange(""))}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label="Clear time"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Select time
        </p>

        {/* Minute tabs */}
        <div className="grid grid-cols-4 gap-1 mb-3">
          {MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (selectedHour >= 0) select(selectedHour, m);
                else select(9, m); // default to 9 AM if no hour picked yet
              }}
              className={cn(
                "rounded-md py-1 text-xs font-medium transition-colors border",
                selectedMin === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-transparent hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              :{fmt2(m)}
            </button>
          ))}
        </div>

        {/* Hour grid (scrollable) */}
        <div
          ref={hourRef}
          className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto pr-0.5"
        >
          {HOURS.map((h) => {
            const ampm = h < 12 ? "AM" : "PM";
            const h12 = h % 12 === 0 ? 12 : h % 12;
            const isSelected = selectedHour === h;
            return (
              <button
                key={h}
                type="button"
                data-hour={h}
                onClick={() => select(h, selectedMin >= 0 ? selectedMin : 0)}
                className={cn(
                  "flex flex-col items-center rounded-md py-1.5 text-[11px] font-medium transition-colors leading-tight",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="font-semibold">{h12}</span>
                <span className="opacity-70">{ampm}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
