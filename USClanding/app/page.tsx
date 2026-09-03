"use client"

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useScrollProgress } from "@/hooks/use-scroll-progress"
import { LandingNav } from "@/components/landing/landing-nav"
import { LandingHero } from "@/components/landing/landing-hero"
import { LandingBenefits } from "@/components/landing/landing-benefits"
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works"
import { LandingFaq } from "@/components/landing/landing-faq"
import { LandingFooter } from "@/components/landing/landing-footer"
import { SceneErrorBoundary } from "@/components/three/SceneErrorBoundary"

// Dynamic import to avoid SSR for WebGL
const Scene3D = dynamic(
  () => import("@/components/three/Scene").then((mod) => ({ default: mod.Scene3D })),
  { ssr: false }
)

export default function LandingPage() {
  const { progressRef } = useScrollProgress()
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div className="min-h-screen bg-background">
      {/* 3D Background Layer */}
      <SceneErrorBoundary>
        <Scene3D scrollProgress={progressRef} isDark={isDark} />
      </SceneErrorBoundary>

      {/* HTML Content Layer */}
      <div className="relative z-10">
        <LandingNav />
        <main>
          <LandingHero />
          <LandingBenefits />
          <LandingHowItWorks />
          <LandingFaq />
        </main>
        <LandingFooter />
      </div>
    </div>
  )
}
