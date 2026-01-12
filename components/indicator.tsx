"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"

const POWERED_BY_LOGO_URL = "https://cldup.com/igpmfiGzaU.svg"
const PLATFORM_WEBSITE = "https://www.electivepro.net/"

export default function Indicator() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="flex items-center justify-center pt-4 mt-2 opacity-60 hover:opacity-80 transition-opacity">
      <Link
        href={PLATFORM_WEBSITE}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center"
      >
        <Image
          src={POWERED_BY_LOGO_URL}
          alt="Powered by ElectivePRO"
          width={72}
          height={12}
          className="h-3 w-auto object-contain"
        />
      </Link>
    </div>
  )
}
