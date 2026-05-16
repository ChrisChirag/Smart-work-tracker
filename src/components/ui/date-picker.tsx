"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string;          // "yyyy-MM-dd" or ""
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  const handleSelect = (day: Date | undefined) => {
    onChange(day ? format(day, "yyyy-MM-dd") : "");
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
            <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
            {value ? format(parseISO(value), "MMM d, yyyy") : placeholder}
          </span>
          {value && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => e.key === "Enter" && (e.stopPropagation(), onChange(""))}
              className="rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
              aria-label="Clear date"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          showOutsideDays
          classNames={{
            root: "p-3",
            months: "flex flex-col",
            month: "space-y-3",
            month_caption: "flex items-center justify-between px-1",
            caption_label: "text-sm font-semibold",
            nav: "flex items-center gap-1",
            button_previous: cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
            ),
            button_next: cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background",
              "hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
            ),
            weeks: "space-y-1",
            weekdays: "grid grid-cols-7",
            weekday: "h-8 w-9 flex items-center justify-center text-[0.75rem] font-medium text-muted-foreground",
            week: "grid grid-cols-7",
            day: "h-9 w-9 p-0",
            day_button: cn(
              "h-9 w-9 rounded-md text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            ),
            selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-md",
            today: "bg-accent text-accent-foreground font-semibold",
            outside: "text-muted-foreground/40",
            disabled: "text-muted-foreground opacity-50",
          }}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left"
                ? <ChevronLeft className="h-4 w-4" />
                : <ChevronRight className="h-4 w-4" />,
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
