"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
}


import {
  addDays,
  endOfMonth,
  endOfToday,
  endOfYesterday,
  startOfMonth,
  startOfToday,
  startOfYesterday,
  subDays,
} from "date-fns"

export function DatePickerWithRange({
  className,
  date,
  setDate
}: DatePickerWithRangeProps) {
  const [numberOfMonths, setNumberOfMonths] = React.useState<number>(2);

  React.useEffect(() => {
    const handleResize = () => {
      setNumberOfMonths(window.innerWidth < 1024 ? 1 : 2);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const presets = [
    { name: "Today", from: startOfToday(), to: endOfToday() },
    { name: "Yesterday", from: startOfYesterday(), to: endOfYesterday() },
    { name: "Last 7 Days", from: subDays(startOfToday(), 6), to: endOfToday() },
    { name: "Last 30 Days", from: subDays(startOfToday(), 29), to: endOfToday() },
    { name: "This Month", from: startOfMonth(startOfToday()), to: endOfMonth(startOfToday()) },
    { name: "Last Month", from: startOfMonth(subDays(startOfMonth(startOfToday()), 1)), to: endOfMonth(subDays(startOfMonth(startOfToday()), 1)) },
  ];

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-11 rounded-xl border-border/50 shadow-sm hover:bg-accent/50 transition-all",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            <span className="truncate">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                "Pick a date range"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 rounded-2xl shadow-2xl border-border/50 overflow-hidden"
          align="center"
          sideOffset={10}
          collisionPadding={10}
        >
          <div className="flex flex-col md:flex-row min-w-[300px] md:min-w-[480px] max-w-[95vw] md:max-w-none">
            <div className="hidden md:flex flex-col w-40 border-r border-border/50 bg-accent/5 p-3 space-y-1">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Presets</div>
              {presets.map((preset) => (
                <Button
                  key={preset.name}
                  variant="ghost"
                  className="justify-start font-medium text-xs h-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                  onClick={() => setDate({ from: preset.from, to: preset.to })}
                >
                  {preset.name}
                </Button>
              ))}
            </div>
            <div className="p-1 flex flex-col items-center w-full overflow-hidden">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={numberOfMonths}
              />
            </div>
          </div>
          <div className="md:hidden grid grid-cols-3 gap-1 p-2 border-t border-border/50 bg-accent/5">
            {presets.slice(0, 6).map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="text-[9px] h-7 rounded-md px-1 flex-1"
                onClick={() => setDate({ from: preset.from, to: preset.to })}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
