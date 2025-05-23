"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";

export function MyDatePicker({
  placeholder,
  style,
  label,
  onChange,
  value,
  minValue,
  maxValue,
}) {
  const [date, setDate] = React.useState(null);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          style={style}
          className={cn(
            " justify-start text-left font-normal min-h-10 h-auto",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon />
          {label} {value ? format(value, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
          fromDate={new Date("2021-12-30")}
          toDate={new Date(Date.now() - 86400000)}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}
