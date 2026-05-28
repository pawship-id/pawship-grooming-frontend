"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
}

// Helper function to highlight matching text
function highlightText(text: string, search: string) {
  if (!search.trim()) return text;

  const regex = new RegExp(
    `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-foreground font-medium">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Pilih opsi...",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada data.",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const selectedOption = options.find((option) => option.value === value);

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full min-w-0 justify-between font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          <span className="min-w-0 truncate text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-9 border-b"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-none">
            <div
              className="max-h-[200px] overflow-y-auto overflow-x-hidden overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                scrollbarWidth: "thin",
              }}
              onWheel={(e) => {
                e.stopPropagation();
              }}
            >
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup className="p-1">
                {filteredOptions.map((option) => {
                  const isSelected = value === option.value;
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      className={cn(
                        "data-[selected='true']:bg-transparent hover:data-[selected='true']:bg-accent",
                        isSelected && "bg-primary/10 text-primary",
                      )}
                      onSelect={(currentValue) => {
                        onValueChange?.(
                          currentValue === value ? "" : currentValue,
                        );
                        setOpen(false);
                        setSearch("");
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span>{highlightText(option.label, search)}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
