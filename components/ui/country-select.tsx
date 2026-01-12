"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [searchQuery, setSearchQuery] = React.useState("")

  const selectedCountry = countries.find((country) => country.code === value)

  // Filter countries based on search query
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery.trim()) return countries

    const query = searchQuery.toLowerCase().trim()
    return countries.filter((country) => {
      const countryName = getCountryName(country, language)
      return (
        countryName.toLowerCase().includes(query) ||
        country.code.toLowerCase().includes(query) ||
        country.nameEn.toLowerCase().includes(query) ||
        country.nameRu.toLowerCase().includes(query)
      )
    })
  }, [countries, searchQuery, language])

  const handleSelect = (countryCode: string) => {
    onValueChange(countryCode)
    setOpen(false)
    setSearchQuery("")
  }

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
        <div className="flex flex-col">
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder={language === "ru" ? "Поиск страны..." : "Search country..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11"
              autoFocus
            />
          </div>

          {/* Countries List */}
          <div className="max-h-[300px] overflow-y-auto p-1">
            {filteredCountries.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {language === "ru" ? "Страна не найдена." : "No country found."}
              </div>
            ) : (
              filteredCountries.map((country) => {
                const countryName = getCountryName(country, language)
                const isSelected = value === country.code
                return (
                  <div
                    key={country.code}
                    onClick={() => handleSelect(country.code)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-accent text-accent-foreground"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="flex items-center gap-2">
                      <span>{country.flag}</span>
                      <span>{countryName}</span>
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
