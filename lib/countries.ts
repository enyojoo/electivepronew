// Countries data with flags (using emoji flags)
// ISO 3166-1 alpha-2 country codes

export interface Country {
  code: string
  flag: string
  nameEn: string
  nameRu: string
}

export const countries: Country[] = [
  { code: "US", flag: "🇺🇸", nameEn: "United States", nameRu: "Соединенные Штаты" },
  { code: "GB", flag: "🇬🇧", nameEn: "United Kingdom", nameRu: "Великобритания" },
  { code: "CA", flag: "🇨🇦", nameEn: "Canada", nameRu: "Канада" },
  { code: "AU", flag: "🇦🇺", nameEn: "Australia", nameRu: "Австралия" },
  { code: "DE", flag: "🇩🇪", nameEn: "Germany", nameRu: "Германия" },
  { code: "FR", flag: "🇫🇷", nameEn: "France", nameRu: "Франция" },
  { code: "IT", flag: "🇮🇹", nameEn: "Italy", nameRu: "Италия" },
  { code: "ES", flag: "🇪🇸", nameEn: "Spain", nameRu: "Испания" },
  { code: "NL", flag: "🇳🇱", nameEn: "Netherlands", nameRu: "Нидерланды" },
  { code: "BE", flag: "🇧🇪", nameEn: "Belgium", nameRu: "Бельгия" },
  { code: "CH", flag: "🇨🇭", nameEn: "Switzerland", nameRu: "Швейцария" },
  { code: "AT", flag: "🇦🇹", nameEn: "Austria", nameRu: "Австрия" },
  { code: "SE", flag: "🇸🇪", nameEn: "Sweden", nameRu: "Швеция" },
  { code: "NO", flag: "🇳🇴", nameEn: "Norway", nameRu: "Норвегия" },
  { code: "DK", flag: "🇩🇰", nameEn: "Denmark", nameRu: "Дания" },
  { code: "FI", flag: "🇫🇮", nameEn: "Finland", nameRu: "Финляндия" },
  { code: "PL", flag: "🇵🇱", nameEn: "Poland", nameRu: "Польша" },
  { code: "CZ", flag: "🇨🇿", nameEn: "Czech Republic", nameRu: "Чехия" },
  { code: "PT", flag: "🇵🇹", nameEn: "Portugal", nameRu: "Португалия" },
  { code: "IE", flag: "🇮🇪", nameEn: "Ireland", nameRu: "Ирландия" },
  { code: "GR", flag: "🇬🇷", nameEn: "Greece", nameRu: "Греция" },
  { code: "TR", flag: "🇹🇷", nameEn: "Turkey", nameRu: "Турция" },
  { code: "RU", flag: "🇷🇺", nameEn: "Russia", nameRu: "Россия" },
  { code: "CN", flag: "🇨🇳", nameEn: "China", nameRu: "Китай" },
  { code: "JP", flag: "🇯🇵", nameEn: "Japan", nameRu: "Япония" },
  { code: "KR", flag: "🇰🇷", nameEn: "South Korea", nameRu: "Южная Корея" },
  { code: "SG", flag: "🇸🇬", nameEn: "Singapore", nameRu: "Сингапур" },
  { code: "MY", flag: "🇲🇾", nameEn: "Malaysia", nameRu: "Малайзия" },
  { code: "TH", flag: "🇹🇭", nameEn: "Thailand", nameRu: "Таиланд" },
  { code: "IN", flag: "🇮🇳", nameEn: "India", nameRu: "Индия" },
  { code: "ID", flag: "🇮🇩", nameEn: "Indonesia", nameRu: "Индонезия" },
  { code: "PH", flag: "🇵🇭", nameEn: "Philippines", nameRu: "Филиппины" },
  { code: "VN", flag: "🇻🇳", nameEn: "Vietnam", nameRu: "Вьетнам" },
  { code: "NZ", flag: "🇳🇿", nameEn: "New Zealand", nameRu: "Новая Зеландия" },
  { code: "BR", flag: "🇧🇷", nameEn: "Brazil", nameRu: "Бразилия" },
  { code: "MX", flag: "🇲🇽", nameEn: "Mexico", nameRu: "Мексика" },
  { code: "AR", flag: "🇦🇷", nameEn: "Argentina", nameRu: "Аргентина" },
  { code: "CL", flag: "🇨🇱", nameEn: "Chile", nameRu: "Чили" },
  { code: "CO", flag: "🇨🇴", nameEn: "Colombia", nameRu: "Колумбия" },
  { code: "PE", flag: "🇵🇪", nameEn: "Peru", nameRu: "Перу" },
  { code: "ZA", flag: "🇿🇦", nameEn: "South Africa", nameRu: "Южная Африка" },
  { code: "EG", flag: "🇪🇬", nameEn: "Egypt", nameRu: "Египет" },
  { code: "AE", flag: "🇦🇪", nameEn: "United Arab Emirates", nameRu: "ОАЭ" },
  { code: "SA", flag: "🇸🇦", nameEn: "Saudi Arabia", nameRu: "Саудовская Аравия" },
  { code: "IL", flag: "🇮🇱", nameEn: "Israel", nameRu: "Израиль" },
  { code: "HU", flag: "🇭🇺", nameEn: "Hungary", nameRu: "Венгрия" },
  { code: "RO", flag: "🇷🇴", nameEn: "Romania", nameRu: "Румыния" },
  { code: "BG", flag: "🇧🇬", nameEn: "Bulgaria", nameRu: "Болгария" },
  { code: "HR", flag: "🇭🇷", nameEn: "Croatia", nameRu: "Хорватия" },
  { code: "SI", flag: "🇸🇮", nameEn: "Slovenia", nameRu: "Словения" },
  { code: "SK", flag: "🇸🇰", nameEn: "Slovakia", nameRu: "Словакия" },
  { code: "LT", flag: "🇱🇹", nameEn: "Lithuania", nameRu: "Литва" },
  { code: "LV", flag: "🇱🇻", nameEn: "Latvia", nameRu: "Латвия" },
  { code: "EE", flag: "🇪🇪", nameEn: "Estonia", nameRu: "Эстония" },
  { code: "IS", flag: "🇮🇸", nameEn: "Iceland", nameRu: "Исландия" },
  { code: "LU", flag: "🇱🇺", nameEn: "Luxembourg", nameRu: "Люксембург" },
  { code: "MT", flag: "🇲🇹", nameEn: "Malta", nameRu: "Мальта" },
  { code: "CY", flag: "🇨🇾", nameEn: "Cyprus", nameRu: "Кипр" },
]

// Helper function to get country by code
export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code === code)
}

// Helper function to get country name based on language
export function getCountryName(country: Country, language: "en" | "ru"): string {
  return language === "ru" ? country.nameRu : country.nameEn
}

// Helper function to get sorted countries (by name in current language)
export function getSortedCountries(language: "en" | "ru"): Country[] {
  return [...countries].sort((a, b) => {
    const nameA = getCountryName(a, language).toLowerCase()
    const nameB = getCountryName(b, language).toLowerCase()
    return nameA.localeCompare(nameB)
  })
}
