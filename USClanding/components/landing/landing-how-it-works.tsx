"use client"

import { UserPlus, ShieldCheck, Heart } from "lucide-react"
import { Reveal } from "./reveal"

const steps = [
  { key: "create", icon: UserPlus, label: "Crea tu cuenta" },
  { key: "verify", icon: ShieldCheck, label: "Verifica que perteneces a una universidad" },
  { key: "start", icon: Heart, label: "Comienza a conectar con otros estudiantes" },
] as const

export function LandingHowItWorks() {
  return (
    <section className="bg-card/30 px-6 py-20 backdrop-blur-lg sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proceso</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">¿Cómo funciona?</h2>
        </Reveal>

        <div className="relative mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-6">
          {/* Connecting line (desktop only) */}
          <div className="pointer-events-none absolute top-6 left-0 right-0 hidden h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent sm:block" />

          {steps.map(({ key, icon: Icon, label }, i) => (
            <Reveal key={key} delay={i * 120} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]">
                <Icon size={20} strokeWidth={2} />
              </div>
              <span className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                0{i + 1}
              </span>
              <p className="mt-1.5 max-w-[220px] text-sm font-semibold text-foreground">{label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
