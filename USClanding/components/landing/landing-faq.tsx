"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Reveal } from "./reveal"

const questions = [
  { key: "who", question: "¿Quién puede registrarse?", answer: "Solo estudiantes universitarios." },
  {
    key: "privacy",
    question: "¿Mis datos son privados?",
    answer: "Sí, protegemos tu información y solo compartimos lo necesario para el funcionamiento de la plataforma.",
  },
  {
    key: "otherUniversities",
    question: "¿Puedo conocer estudiantes de otras universidades?",
    answer: "Sí, siempre que pertenezcan a universidades participantes en Cali.",
  },
] as const

export function LandingFaq() {
  return (
    <section className="px-6 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <Reveal className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dudas</p>
          <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">Preguntas frecuentes</h2>
        </Reveal>

        <Reveal delay={100} className="mt-10">
          <Accordion type="single" collapsible className="rounded-3xl border border-border/40 bg-card/50 px-6 backdrop-blur-xl">
            {questions.map(({ key, question, answer }) => (
              <AccordionItem key={key} value={key} className="border-border/40">
                <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                  {question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}
