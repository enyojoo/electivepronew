"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Country, getCountryName } from "@/lib/countries"

interface CountrySelectProps {
  value?: string
  onValueChange: (value: string) => void
  countries: Country[]
  language: "en" | "ru"
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function CountrySelect({
  value,
  onValueChange,
  countries,
  language,
  placeholder = "Select country...",
  disabled = false,
  required = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCountry = countries.find((country) => country.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10"
          disabled={disabled}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <span>{selectedCountry.flag}</span>
              <span>{getCountryName(selectedCountry, language)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" sideOffset={4}>
        <Command>
          <CommandInput placeholder={language === "ru" ? "Поиск страны..." : "Search country..."} />
          <CommandList>
            <CommandEmpty>
              {language === "ru" ? "Страна не найдена." : "No country found."}
            </CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${getCountryName(country, language)} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code === value ? "" : country.code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex items-center gap-2">
                    <span>{country.flag}</span>
                    <span>{getCountryName(country, language)}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
