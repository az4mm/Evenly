import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function CalendarDropdown({
  className,
  classNames,
  components,
  options,
  ...selectProps
}) {
  const SelectComp = components?.Select ?? "select"
  const OptionComp = components?.Option ?? "option"
  const ChevronComp = components?.Chevron

  return (
    <span
      data-disabled={selectProps.disabled}
      className={cn("relative shrink-0", classNames?.dropdown_root)}>
      <SelectComp
        className={cn(classNames?.dropdown, className)}
        {...selectProps}>
        {options?.map(({ value, label, disabled }) => (
          <OptionComp key={value} value={value} disabled={disabled}>
            {label}
          </OptionComp>
        ))}
      </SelectComp>
      {ChevronComp ? (
        <ChevronComp
          orientation="down"
          className={cn(classNames?.chevron)}
          size={18} />
      ) : (
        <ChevronDown className={cn("h-4 w-4", classNames?.chevron)} />
      )}
    </span>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) {
  const captionLayout = props.captionLayout ?? "dropdown"
  const navLayout = props.navLayout ?? "around"

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      navLayout={navLayout}
      className={cn("p-3", className)}
      classNames={{
        root: "neu-raised-lg rounded-2xl p-3",
        months: "relative flex flex-col gap-4 sm:flex-row sm:gap-6",
        month: "relative flex w-full flex-col gap-4",
        month_caption: "relative flex h-9 w-full items-center justify-center px-10",
        caption_label: captionLayout.startsWith("dropdown") ? "sr-only" : "text-sm font-semibold",
        dropdowns: "flex h-9 items-center justify-center gap-2",
        dropdown_root: "relative shrink-0",
        dropdown:
          "neu-button h-9 cursor-pointer appearance-none rounded-lg px-3 pr-8 text-sm font-medium text-foreground outline-none",
        months_dropdown: "w-[7.75rem]",
        years_dropdown: "w-[5.5rem]",
        chevron: "absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none",
        nav: "absolute inset-x-0 top-0 flex h-9 items-center justify-between",
        button_previous:
          "neu-button absolute left-1 top-0.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg p-0 text-foreground aria-disabled:opacity-40",
        button_next:
          "neu-button absolute right-1 top-0.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg p-0 text-foreground aria-disabled:opacity-40",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        weeks: "flex flex-col gap-1",
        week: "mt-1 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm",
        day_button:
          "neu-button h-9 w-9 rounded-lg p-0 font-normal transition-all aria-selected:opacity-100",
        selected: "[&>button]:neu-inset [&>button]:font-semibold [&>button]:text-primary",
        today: "[&>button]:ring-1 [&>button]:ring-primary/35 [&>button]:text-primary",
        outside: "text-muted-foreground/50 opacity-60",
        disabled: "text-muted-foreground/40 opacity-40",
        range_middle: "bg-primary/10 text-foreground",
        range_start: "[&>button]:neu-button [&>button]:font-semibold [&>button]:text-primary",
        range_end: "[&>button]:neu-button [&>button]:font-semibold [&>button]:text-primary",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Dropdown: CalendarDropdown,
        Chevron: ({ className: iconClassName, orientation, ...chevronProps }) => {
          if (orientation === "up") {
            return <ChevronDown className={cn("h-4 w-4 rotate-180", iconClassName)} {...chevronProps} />
          }
          if (orientation === "down") {
            return <ChevronDown className={cn("h-4 w-4", iconClassName)} {...chevronProps} />
          }
          if (orientation === "left") {
            return <ChevronLeft className={cn("h-4 w-4", iconClassName)} {...chevronProps} />
          }
          return <ChevronRight className={cn("h-4 w-4", iconClassName)} {...chevronProps} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
