// Facultades y sus carreras — usado en el registro para que el usuario
// elija primero la facultad y luego solo vea las carreras que pertenecen a ella.
//
// Ported verbatim from the web app's `utils/faculties.ts`.
export const FACULTIES: Record<string, string[]> = {
  "Facultad de Ingeniería": [
    "Ingeniería de Sistemas",
    "Ingeniería en Energías",
    "Ingeniería Industrial",
    "Ingeniería Civil",
    "Ingeniería Electrónica",
    "Ingeniería Biomédica",
    "Ingeniería Mecatrónica",
  ],
  "Facultad de Ciencias de la Salud": [
    "Medicina",
    "Odontología",
    "Enfermería",
    "Fisioterapia",
    "Instrumentación Quirúrgica",
    "Fonoaudiología",
    "Bacteriología",
  ],
  "Facultad de Ciencias Económicas y Administrativas": [
    "Administración de Empresas",
    "Contaduría Pública",
    "Economía",
    "Negocios Internacionales",
    "Finanzas",
    "Mercadeo",
  ],
  "Facultad de Derecho y Ciencias Sociales": [
    "Derecho",
    "Trabajo Social",
    "Sociología",
    "Comunicación Social",
    "Antropología",
  ],
  "Facultad de Arquitectura, Artes y Diseño": [
    "Arquitectura",
    "Diseño Gráfico",
    "Diseño Industrial",
    "Diseño de Medios Interactivos",
    "Artes Visuales",
  ],
  "Facultad de Ciencias Exactas y Naturales": [
    "Biología",
    "Química",
    "Física",
    "Matemáticas",
    "Estadística",
  ],
  "Facultad de Humanidades": [
    "Filosofía",
    "Historia",
    "Literatura",
    "Lenguas Extranjeras",
    "Geografía",
  ],
  "Facultad de Ciencias de la Educación": [
    "Licenciatura en Educación Infantil",
    "Licenciatura en Lenguas Extranjeras",
    "Licenciatura en Matemáticas",
    "Licenciatura en Ciencias Sociales",
    "Licenciatura en Educación Física",
  ],
  "Facultad de Artes Integradas": [
    "Música",
    "Arte Dramático",
    "Artes Plásticas",
    "Danza",
  ],
  "Facultad de Ciencias Agropecuarias": [
    "Medicina Veterinaria",
    "Zootecnia",
    "Ingeniería Agronómica",
    "Administración Ambiental",
  ],
  "Facultad de Psicología": [
    "Psicología",
    "Psicología Clínica (Especialización)",
    "Psicología Organizacional (Especialización)",
  ],
  "Facultad de Ciencias Políticas": [
    "Ciencia Política",
    "Relaciones Internacionales",
    "Gobierno y Políticas Públicas",
  ],
  "Facultad de Estudios Tecnológicos": [
    "Tecnología en Desarrollo de Software",
    "Tecnología en Gestión de Redes y Sistemas",
    "Tecnología en Automatización Industrial",
    "Tecnología en Electrónica",
    "Tecnología en Gestión Logística",
    "Tecnología en Regencia de Farmacia",
    "Tecnología en Producción Multimedia",
    "Tecnología en Gestión Financiera",
  ],
}

export const FACULTY_NAMES = Object.keys(FACULTIES)
