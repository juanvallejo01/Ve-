"use client"

import { PhoneMockup } from "./phone-mockup"

export function LandingHero() {
  return (
    <section className="relative overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
      {/* Subtle radial gradient overlay for depth — works in both modes */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08)_0%,_transparent_70%)]" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-10">
        <div className="animate-fadeIn text-center lg:text-left">
          <span className="landing-glass-badge inline-flex items-center rounded-full border border-border/50 bg-card/40 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur-xl">
            🎓 Exclusivo para universitarios de Cali
          </span>

          <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
            La red social exclusiva para universitarios de Cali.
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base text-muted-foreground sm:text-lg lg:mx-0">
            Conecta, descubre y comparte con estudiantes de tu universidad en un entorno seguro y verificado.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            {/* TODO: point to the real app URL once it's deployed */}
            <a
              href="#"
              className="landing-glow-btn w-full rounded-full bg-primary px-7 py-3.5 text-center text-sm font-semibold text-primary-foreground transition-all duration-300 hover:scale-[1.03] active:scale-95 sm:w-auto"
            >
              Crear cuenta
            </a>
            {/* TODO: point to the real app URL once it's deployed */}
            <a
              href="#"
              className="landing-glow-btn-outline w-full rounded-full border border-border/60 bg-card/30 px-7 py-3.5 text-center text-sm font-semibold text-foreground backdrop-blur-xl transition-all duration-300 hover:bg-card/50 hover:border-blue-500/30 sm:w-auto"
            >
              Iniciar sesión
            </a>
          </div>
        </div>

        <div className="animate-scaleIn">
          <PhoneMockup />
        </div>
      </div>
    </section>
  )
}
