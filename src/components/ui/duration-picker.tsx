"use client";

import React from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";

const DURATION_OPTIONS = [
  { label: "Auto (by priority)", value: "" },
  { label: "15 min", value: "15" },
  { label: "30 min", value: "30" },
  { label: "45 min", value: "45" },
  { label: "1 hour", value: "60" },
  { label: "1.5 hours", value: "90" },
  { label: "2 hours", value: "120" },
  { label: "3 hours", value: "180" },
  { label: "4 hours", value: "240" },
];

interface DurationPickerProps {
  value?: number;
  onChange: (value: number | undefined) => void;
}

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <Select
      value={value != null ? String(value) : ""}
      onValueChange={(v) => onChange(v === "" ? undefined : Number(v))}
    >
      <SelectTrigger className="gap-2">
        <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Auto (by priority)" />
      </SelectTrigger>
      <SelectContent>
        {DURATION_OPTIONS.map((opt) => (
          <SelectItem key={opt.label} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
