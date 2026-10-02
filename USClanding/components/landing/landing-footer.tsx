"use client"

import { Logo } from "@/components/layout/logo"
import { LEGAL } from "@/lib/legal"

export function LandingFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border/40 bg-background/60 px-6 py-10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <Logo size="sm" className="text-foreground" />
          <p className="mt-1.5 text-xs text-muted-foreground">La comunidad universitaria de Cali.</p>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <a href="/terminos" className="hover:text-foreground transition-all duration-300 hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]">Términos y condiciones</a>
          <a href="/privacidad" className="hover:text-foreground transition-all duration-300 hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]">Política de privacidad</a>
          <a href={`mailto:${LEGAL.contactEmail}`} className="hover:text-foreground transition-all duration-300 hover:drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]">Contacto</a>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-center text-[11px] text-muted-foreground/70 sm:text-left">
        © {year} Ve! Todos los derechos reservados.
      </p>
    </footer>
  )
}
