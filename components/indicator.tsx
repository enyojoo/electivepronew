"use client"

import Image from "next/image"
import Link from "next/link"
import { useLanguage } from "@/lib/language-context"

const POWERED_BY_LOGO_URL_EN = "https://cldup.com/igpmfiGzaU.svg"
const POWERED_BY_LOGO_URL_RU = "https://cldup.com/8RX9GenGPk.png"
const PLATFORM_WEBSITE = "https://www.electivepro.net/"

export default function Indicator() {
  const { language } = useLanguage()
  const logoUrl = language === "ru" ? POWERED_BY_LOGO_URL_RU : POWERED_BY_LOGO_URL_EN

  return (
    <div className="flex items-center justify-center pt-4 pb-4 mt-2 opacity-60 hover:opacity-80 transition-opacity">
      <Link
        href={PLATFORM_WEBSITE}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center"
      >
        <Image
          src={logoUrl}
          alt="Powered by ElectivePRO"
          width={96}
          height={16}
          className="h-4 w-auto object-contain"
          priority
        />
      </Link>
    </div>
  )
}
