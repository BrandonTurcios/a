// Mapeo de traducciones de inglés a español
const ENGLISH_TO_SPANISH = {
  "Person genetic information": "Información genética de la persona",
  Genetics: "Genética",
  "Gene Variants": "Variantes genéticas",
  "Gene Variant Phenotypes": "Genotipos de variantes genéticas",
  "Protein related diseases": "Enfermedades relacionadas con proteínas",
  Genes: "Genes",
  "Created invoices": "Facturas creadas",
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
};

// Traducciones específicas para español de Honduras
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
  //Fallecido: "Muertado",
  //"Hospitalizado":"Brandon",
  Adjunto: "Archivo adjunto",
  adjunto: "archivo adjunto",
  Adjuntos: "Archivos adjuntos",
  adjuntos: "archivos adjuntos",
  Fichero: "Archivo",
  fichero: "archivo",
  Pestaña: "Pestaña",
  pestañas: "pestañas",
  Médico: "Doctor",
  médico: "doctor",
  Enfermera: "Enfermera",
  enfermera: "enfermera",
  Cita: "Cita médica",
  cita: "cita médica",
  Rellenar: "Llenar",
  rellenar: "llenar",
};

function applyEnglishToSpanish(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;

  for (const [english, spanish] of Object.entries(ENGLISH_TO_SPANISH)) {
    // Buscar palabra completa (\\b) sin distinción mayúsculas/minúsculas
    const regex = new RegExp(`\\b${escapeRegex(english)}\\b`, "gi");
    result = result.replace(regex, spanish);
  }

  return result;
}

export function applyHondurasOverrides(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = text;

  for (const [original, replacement] of Object.entries(HONDURAS_OVERRIDES)) {
    const regex = new RegExp(`\\b${escapeRegex(original)}\\b`, "g");
    result = result.replace(regex, replacement);
  }

  return result;
}

function applyAllTranslations(text) {
  if (!text || typeof text !== "string") {
    return text;
  }

  let result = applyEnglishToSpanish(text);
  result = applyHondurasOverrides(result);

  return result;
}

// Campos de UI que deben traducirse
const UI_FIELDS = [
  "name",
  "string",
  "help",
  "description",
  "placeholder",
  "label",
  "title",
  "tooltip",
  "error",
  "warning",
  "info",
  "message",
  "rec_name",
];

// Identificadores internos que nunca se traducen
const NEVER_TRANSLATE_FIELDS = [
  "id",
  "model",
  "type",
  "icon",
  "icon:string",
  "iconName",
  "action",
  "res_model",
  "view_id",
  "domain",
  "context",
  "field_name",
  "relation",
];

export function applyHondurasOverridesToObject(obj, parentKey = null) {
  if (!obj) {
    return obj;
  }

  if (typeof obj === "string") {
    if (parentKey && NEVER_TRANSLATE_FIELDS.includes(parentKey)) {
      return obj;
    }

    // Proteger nombres de iconos y sistemas de Tryton
    if (
      obj.startsWith("tryton-") ||
      obj.startsWith("gnuhealth-") ||
      obj.startsWith("gnuhealth_") ||
      obj.startsWith("gnuhealth.") ||
      obj.startsWith("health-") ||
      obj.startsWith("icon-") ||
      obj === "orthanc" ||
      obj === "execute" ||
      obj.match(/^[a-z]+[-_.][a-z0-9]+([-_.][a-z0-9]+)*$/i) // Patrón de nombres técnicos
    ) {
      return obj;
    }

    if (parentKey && UI_FIELDS.includes(parentKey)) {
      return applyAllTranslations(obj);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => applyHondurasOverridesToObject(item, parentKey));
  }

  if (typeof obj === "object" && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = applyHondurasOverridesToObject(value, key);
    }
    return result;
  }

  return obj;
}

// Convierte es_HN a "es" para el backend de Tryton
export function getLanguageForTryton(language) {
  if (language === "es_HN") {
    return "es";
  }
  return language;
}

export function shouldApplyHondurasOverrides(language) {
  return language === "es_HN";
}

export function addHondurasOverride(original, replacement) {
  HONDURAS_OVERRIDES[original] = replacement;
}

export function getHondurasOverrides() {
  return { ...HONDURAS_OVERRIDES };
}

// Escapa caracteres especiales de regex para búsqueda literal
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default {
  applyHondurasOverrides,
  applyHondurasOverridesToObject,
  getLanguageForTryton,
  shouldApplyHondurasOverrides,
  addHondurasOverride,
  getHondurasOverrides,
};
