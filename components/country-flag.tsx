"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface CountryFlagProps {
  code: string
  className?: string
  size?: number
}

export function CountryFlag({ code, className, size = 20 }: CountryFlagProps) {
  const flagPath = `/flags/4x3/${code.toLowerCase()}.svg`
  
  return (
    <span className={cn("inline-flex items-center justify-center shrink-0", className)}>
      <Image
        src={flagPath}
        alt={`${code} flag`}
        width={size}
        height={Math.round(size * 0.75)} // 4:3 aspect ratio
        className="rounded-sm object-cover"
        unoptimized // SVG files don't need optimization
      />
    </span>
  )
}
