import Link from "next/link"

import { Logo } from "@/components/layout/logo"
import { LEGAL } from "@/lib/legal"

/** Contenedor común de /privacidad y /terminos: legible, sin animaciones. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <article className="mx-auto max-w-2xl">
        <Link href="/" aria-label="Volver al inicio">
          <Logo size="sm" />
        </Link>
        <h1 className="mt-8 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {LEGAL.lastUpdated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/85 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:underline [&_a]:underline-offset-2">
          {children}
        </div>
        <p className="mt-16 border-t border-border/40 pt-6 text-xs text-muted-foreground">
          ¿Preguntas? Escríbenos a <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </article>
    </main>
  )
}
