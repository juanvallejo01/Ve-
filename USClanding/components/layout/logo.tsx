import { Caveat } from "next/font/google"

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] })

const sizeMap = {
  sm: "text-3xl",
  md: "text-[42px]",
  lg: "text-6xl",
}

export function Logo({ size = "md", className = "" }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span
      className={`${caveat.className} ${sizeMap[size]} leading-none tracking-normal select-none inline-block ${className}`}
    >
      Ve!
    </span>
  )
}
