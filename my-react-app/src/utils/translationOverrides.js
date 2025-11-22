/**
 * Sistema de override de traducciones para Español Hondureño
 *
 * Este sistema modifica traducciones que vienen del backend de Tryton
 * (en español estándar) para adaptarlas a términos usados en Honduras.
 *
 * Estrategia:
 * 1. El backend de Tryton usa idioma "es" (español estándar)
 * 2. El frontend intercepta las respuestas y aplica estos overrides
 * 3. El usuario ve terminología hondureña sin modificar el servidor
 */
const ENGLISH_TO_SPANISH = {
  "Person genetic information": "Información genética de la persona",
  Genetics: "Genética",
  "Gene Variants": "Variantes genéticas",
  "Gene Variant Phenotypes": "Genotipos de variantes genéticas",
  "Protein related diseases": "Enfermedades relacionadas con proteínas",
  Genes: "Genes",

  "Created invoices": "Facturas creadas",

  // Módulos de Federación
  "Federation Queue Manager": "Gestor de cola de federación",
  Federation: "Federación",
  "Federation Objects": "Objetos de federación",
  "Node configuration": "Configuración de nodo",
  "Node configuración": "Configuración de nodo",

  "Epidemiological Surveillance": "Vigilancia epidemiológica",
  Surveillance: "Vigilancia",

  "Belief Diets": "Dietas por creencias",
  Diets: "Dietas",

  Orthanc: "Orthanc",
  "Remote Modality": "Modalidad remota",
  Query: "Consulta",
  Studies: "Estudios",

  Servers: "Servidores",
  "Add New Server": "Agregar nuevo servidor",

  Configuration: "Configuración",
  Settings: "Ajustes",

  // Campos comunes en inglés
  Queue: "Cola",
  Manager: "Gestor",
  Information: "Información",
  Person: "Persona",
  Remote: "Remoto",
  Modality: "Modalidad",
  Study: "Estudio",
  Patient: "Paciente",
  Patients: "Pacientes",
  Report: "Reporte",
  Image: "Imagen",
  ImaGenes: "Imágenes",
  Record: "Registro",
  Phenotype: "Fenotipo",
  Zygosity: "Zigosidad",

  // 'English term': 'Spanish translation',
};

/**
 * Basado en las traducciones de Tryton y adaptado para Honduras
 */
const HONDURAS_OVERRIDES = {
  Ordenador: "Computadora",
  ordenador: "computadora",
  Móvil: "Celular",
  móvil: "celular",
  "Teléfono móvil": "Teléfono celular",
  "teléfono móvil": "teléfono celular",
  Gestionar: "Administrar",
  gestionar: "administrar",
  "Cerrar sesión": "Cerrar sesión",
  Desconectar: "Cerrar sesión",
  desconectar: "cerrar sesión",
  Acceder: "Ingresar",
  acceder: "ingresar",
  Adjunto: "Archivo adjunto",
  adjunto: "archivo adjunto",
  Fichero: "Archivo",
  fichero: "archivo",
  Pestaña: "Pestaña",
  pestañas: "pestañas",
  Médico: "Doctor",
  médico: "doctor",
  Enfermera: "Enfermera",
  enfermera: "enfermera",
  Paciente: "Paciente",
  paciente: "paciente",
  Cita: "Cita médica",
  cita: "cita médica",
  Consulta: "Consulta",
  consulta: "consulta",
  Receta: "Receta",
  receta: "receta",
  Medicamento: "Medicamento",
  medicamento: "medicamento",
  Tratamiento: "Tratamiento",
  tratamiento: "tratamiento",
  Diagnóstico: "Diagnóstico",
  diagnóstico: "diagnóstico",
  Rellenar: "Llenar",
  rellenar: "llenar",
  Búsqueda: "Búsqueda",
  búsqueda: "búsqueda",
  // 'Término español': 'Término hondureño',
};

/**
 * Detecta si un texto contiene palabras en inglés comunes
 */
function detectEnglish(text) {
  if (!text || typeof text !== "string") return false;

  // Lista de palabras comunes en inglés que suelen aparecer en módulos sin traducir
  const englishWords =
    /\b(Manager|Queue|Information|Genetics|Federation|Configuration|Settings|Remote|Modality|Query|Studies|Record|Report|Image|Surveillance|Belief|Person)\b/i;

  return englishWords.test(text);
}

/**
 * Aplica traducciones de inglés a español
 */
function applyEnglishToSpanish(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;

  // Aplicar traducciones inglés → español
  for (const [english, spanish] of Object.entries(ENGLISH_TO_SPANISH)) {
    const regex = new RegExp(`\\b${escapeRegex(english)}\\b`, "gi");
    result = result.replace(regex, spanish);
  }

  // Detectar y registrar texto en inglés que no fue traducido
  if (detectEnglish(result)) {
    console.log(
      "🔍 Texto en inglés detectado (agregar a ENGLISH_TO_SPANISH):",
      result
    );
  }

  return result;
}

/**
 * Aplica traducciones de español estándar a español hondureño
 */
export function applyHondurasOverrides(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;

  // Aplicar cada override
  for (const [original, replacement] of Object.entries(HONDURAS_OVERRIDES)) {
    // Reemplazar coincidencias exactas como palabras completas
    const regex = new RegExp(`\\b${escapeRegex(original)}\\b`, "g");
    result = result.replace(regex, replacement);
  }

  return result;
}

/**
 * Aplica todas las traducciones a un string:
 * 1. Inglés → Español
 * 2. Español estándar → Español hondureño
 */
function applyAllTranslations(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  // Fase 1: Inglés → Español
  let result = applyEnglishToSpanish(text);

  // Fase 2: Español → Español Hondureño
  result = applyHondurasOverrides(result);

  return result;
}

/**
 * Lista de campos que contienen texto visible para el usuario
 * Solo estos campos deben ser traducidos
 */
const UI_FIELDS = [
  "name", // Nombre visible (menús, registros)
  "string", // Etiqueta de campo
  "help", // Texto de ayuda
  "description", // Descripción
  "placeholder", // Placeholder
  "label", // Etiqueta
  "title", // Título
  "tooltip", // Tooltip
  "error", // Mensajes de error
  "warning", // Advertencias
  "info", // Información
  "message", // Mensajes
  "rec_name", // Nombre de registro (visible)
];

/**
 * Lista de campos que NUNCA deben ser traducidos (identificadores internos)
 */
const NEVER_TRANSLATE_FIELDS = [
  "id",
  "model",
  "type",
  "icon",
  "icon:string", // Nombre del icono en Tryton
  "iconName", // Nombre del icono procesado
  "action",
  "res_model",
  "view_id",
  "domain",
  "context",
  "field_name",
  "relation",
];

/**
 * Aplica todas las traducciones a todas las cadenas en un objeto
 * SOLO traduce campos de UI, NO identificadores internos
 */
export function applyHondurasOverridesToObject(obj, parentKey = null) {
  if (!obj) {
    return obj;
  }

  // Si es string, aplicar traducciones SOLO si estamos en un campo de UI
  if (typeof obj === "string") {
    // NUNCA traducir campos de identificadores internos
    if (parentKey && NEVER_TRANSLATE_FIELDS.includes(parentKey)) {
      return obj;
    }

    // Proteger todos los patrones comunes de iconos de Tryton/GNU Health
    if (
      obj.startsWith("tryton-") ||
      obj.startsWith("gnuhealth-") ||
      obj.startsWith("gnuhealth_") ||
      obj.startsWith("gnuhealth.") ||
      obj.startsWith("health-") ||
      obj.startsWith("icon-") ||
      obj === "orthanc" || // Sistema Orthanc (DICOM viewer)
      obj === "execute" || // Acción/comando
      obj.match(/^[a-z]+[-_.][a-z0-9]+([-_.][a-z0-9]+)*$/i) // Patrón: palabra[-_.]palabra[-_.]palabra...
    ) {
      return obj;
    }

    // Si tenemos una clave padre y es un campo de UI, traducir
    if (parentKey && UI_FIELDS.includes(parentKey)) {
      return applyAllTranslations(obj);
    }
    // Si no sabemos la clave (ej: strings en arrays), NO traducir por seguridad
    return obj;
  }

  // Si es array, procesar cada elemento
  if (Array.isArray(obj)) {
    return obj.map((item) => applyHondurasOverridesToObject(item, parentKey));
  }

  // Si es objeto, procesar cada propiedad
  if (typeof obj === "object" && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // NO traducir las claves del objeto, mantenerlas originales
      result[key] = applyHondurasOverridesToObject(value, key);
    }
    return result;
  }

  // Para otros tipos (números, booleanos, etc.), retornar sin cambios
  return obj;
}

/**
 * Obtiene el idioma para comunicarse con el backend de Tryton
 **/
export function getLanguageForTryton(language) {
  // Si es español hondureño, usar español estándar en el backend
  if (language === "es_HN") {
    return "es";
  }

  // Para otros idiomas, enviar tal cual
  return language;
}

/**
 * Verifica si un idioma necesita aplicar overrides de Honduras
 */
export function shouldApplyHondurasOverrides(language) {
  return language === "es_HN";
}

/**
 * Agrega un nuevo override en runtime
 */
export function addHondurasOverride(original, replacement) {
  HONDURAS_OVERRIDES[original] = replacement;
}

/**
 * Exporta los overrides actuales (útil para debug)
 */
export function getHondurasOverrides() {
  return { ...HONDURAS_OVERRIDES };
}

/**
 * Escapa caracteres especiales de regex
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Exportar como default
export default {
  applyHondurasOverrides,
  applyHondurasOverridesToObject,
  getLanguageForTryton,
  shouldApplyHondurasOverrides,
  addHondurasOverride,
  getHondurasOverrides,
};
