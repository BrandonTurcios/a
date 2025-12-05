
/*
 * Script para extraer traducciones del archivo .po de Tryton
 * Genera dos diccionarios:
 * 1. ENGLISH_TO_SPANISH: Inglés → Español
 * 2. SPANISH_SPAIN_TO_SPANISH_HONDURAS: Español España → Español Honduras
 */

const fs = require('fs');

// Archivo de entrada (traducción español de Tryton)
const PO_FILE = '/home/gnuhealth/Downloads/package/locale/es.po';

// Diccionario de conversión: Español España → Español Honduras
// Basado en análisis completo de diferencias regionales (30+ conversiones)
// Nivel de formalidad: Formal (usted/ustedes)
const SPAIN_TO_HONDURAS = {
  // ===== TECNOLOGÍA =====
  'Ordenador': 'Computadora',
  'ordenador': 'computadora',
  'Móvil': 'Celular',
  'móvil': 'celular',
  'Teléfono móvil': 'Teléfono celular',
  'teléfono móvil': 'teléfono celular',
  'Ordenador portátil': 'Computadora portátil',
  'ordenador portátil': 'computadora portátil',

  // ===== VERBOS - Acciones Principales =====
  'Gestionar': 'Administrar',
  'gestionar': 'administrar',
  'Acceder': 'Ingresar',
  'acceder': 'ingresar',
  'Añadir': 'Agregar',
  'añadir': 'agregar',
  'Rellenar': 'Llenar',
  'rellenar': 'llenar',
  'Coger': 'Tomar',
  'coger': 'tomar',
  'Vacíar': 'Limpiar',
  'vacíar': 'limpiar',

  // ===== FORMALIDAD - Vosotros → Ustedes (Formal) =====
  'Queréis': 'Quieren',
  'queréis': 'quieren',
  'Inténtelo': 'Intente',
  'inténtelo': 'intente',

  // ===== SUSTANTIVOS - Archivos y Objetos =====
  'Fichero': 'Archivo',
  'fichero': 'archivo',
  'Ficheros': 'Archivos',
  'ficheros': 'archivos',
  'Adjunto': 'Archivo adjunto',
  'adjunto': 'archivo adjunto',
  'Adjuntos': 'Archivos adjuntos',
  'adjuntos': 'archivos adjuntos',
  'Gafas': 'Lentes',
  'gafas': 'lentes',

  // ===== TRANSPORTE =====
  'Coche': 'Carro',
  'coche': 'carro',
  'Conducir': 'Manejar',
  'conducir': 'manejar',
  'Autobús': 'Bus',
  'autobús': 'bus',
  'Billete': 'Boleto',
  'billete': 'boleto',
  'Aparcamiento': 'Estacionamiento',
  'aparcamiento': 'estacionamiento',
  'Aparcar': 'Estacionar',
  'aparcar': 'estacionar',
  'Carné': 'Licencia',
  'carné': 'licencia',

  // ===== ALIMENTOS =====
  'Zumo': 'Jugo',
  'zumo': 'jugo',
  'Patata': 'Papa',
  'patata': 'papa',
  'Patatas': 'Papas',
  'patatas': 'papas',

  // ===== EXPRESIONES DE FECHA/HORA =====
  'Creado el': 'Fecha de creación',
  'creado el': 'fecha de creación',
  'Modificado el': 'Fecha de modificación',
  'modificado el': 'fecha de modificación',
  'Creado el:': 'Fecha de creación:',
  'creado el:': 'fecha de creación:',

  // ===== TÉRMINOS TÉCNICOS =====
  'Dudoso': 'Revisión',
  'dudoso': 'revisión',

  // ===== PREPOSICIONES Y ARTÍCULOS (Contexto específico) =====
  'del texto': 'de texto',
  'las pestañas': 'pestañas',
  'el registro': 'registro',

  // ===== EXPRESIONES COLOQUIALES =====
  'Vale': 'Está bien',
  'vale': 'está bien',
  'Tío': 'Tipo',
  'tío': 'tipo',
  'Tía': 'Persona',
  'tía': 'persona',

  // ===== MEDICINA (Contexto específico) =====
  'Médico': 'Doctor',
  'médico': 'doctor',

  // ===== VIVIENDA =====
  'Piso': 'Apartamento',
  'piso': 'apartamento',
};

// Función para aplicar conversiones de España a Honduras
function applyHondurasConversions(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let result = text;
  const replacements = [];

  // Primero, encontrar todas las coincidencias y sus posiciones
  for (const [spain, honduras] of Object.entries(SPAIN_TO_HONDURAS)) {
    const regex = new RegExp(`\\b${escapeRegex(spain)}\\b`, 'g');
    let match;

    while ((match = regex.exec(text)) !== null) {
      replacements.push({
        start: match.index,
        end: match.index + match[0].length,
        original: match[0],
        replacement: honduras
      });
    }
  }

  // Ordenar por posición (de mayor a menor para reemplazar de atrás hacia adelante)
  replacements.sort((a, b) => b.start - a.start);

  // Eliminar reemplazos superpuestos (mantener el primero encontrado)
  const filteredReplacements = [];
  for (const replacement of replacements) {
    const overlaps = filteredReplacements.some(r =>
      (replacement.start >= r.start && replacement.start < r.end) ||
      (replacement.end > r.start && replacement.end <= r.end)
    );

    if (!overlaps) {
      filteredReplacements.push(replacement);
    }
  }

  // Aplicar reemplazos de atrás hacia adelante
  for (const {start, end, replacement} of filteredReplacements) {
    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

// Escapar caracteres especiales de regex
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Leer archivo .po
const content = fs.readFileSync(PO_FILE, 'utf-8');

// Extraer traducciones (msgid -> msgstr)
const englishToSpanish = {};
const spanishSpainToHonduras = {};
const lines = content.split('\n');

let currentMsgid = null;
let currentMsgstr = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // msgid "English text"
  if (line.startsWith('msgid "')) {
    const match = line.match(/^msgid "(.*)"/);
    if (match) {
      currentMsgid = match[1];
    }
  }

  // msgstr "Texto español"
  else if (line.startsWith('msgstr "')) {
    const match = line.match(/^msgstr "(.*)"/);
    if (match) {
      currentMsgstr = match[1];

      // Guardar traducción (solo si ambos tienen contenido)
      if (currentMsgid && currentMsgstr && currentMsgid.length > 0 && currentMsgstr.length > 0) {
        // 1. Inglés → Español España
        englishToSpanish[currentMsgid] = currentMsgstr;

        // 2. Español España → Español Honduras (si hay cambios)
        const hondurasVersion = applyHondurasConversions(currentMsgstr);
        if (hondurasVersion !== currentMsgstr) {
          spanishSpainToHonduras[currentMsgstr] = hondurasVersion;
        }
      }

      // Reset
      currentMsgid = null;
      currentMsgstr = null;
    }
  }
}

// ============================================
// GENERAR CÓDIGO JAVASCRIPT
// ============================================

console.log('// ============================================');
console.log('// 1. ENGLISH_TO_SPANISH');
console.log('// ============================================');
console.log('const ENGLISH_TO_SPANISH = {');

const englishEntries = Object.entries(englishToSpanish);
for (let i = 0; i < englishEntries.length; i++) {
  const [english, spanish] = englishEntries[i];

  // Escapar comillas
  const escapedEnglish = english.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const escapedSpanish = spanish.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  console.log(`  "${escapedEnglish}": "${escapedSpanish}",`);
}

console.log('};');
console.log('');

// ============================================
// GENERAR SPANISH_SPAIN_TO_SPANISH_HONDURAS
// ============================================

console.log('// ============================================');
console.log('// 2. SPANISH_SPAIN_TO_SPANISH_HONDURAS');
console.log('// Conversiones de términos específicos de España a Honduras');
console.log('// ============================================');
console.log('const SPANISH_SPAIN_TO_SPANISH_HONDURAS = {');

const hondurasEntries = Object.entries(spanishSpainToHonduras);
for (let i = 0; i < hondurasEntries.length; i++) {
  const [spain, honduras] = hondurasEntries[i];

  // Escapar comillas
  const escapedSpain = spain.replace(/"/g, '\\"').replace(/\n/g, '\\n');
  const escapedHonduras = honduras.replace(/"/g, '\\"').replace(/\n/g, '\\n');

  console.log(`  "${escapedSpain}": "${escapedHonduras}",`);
}

console.log('};');

// ============================================
// RESUMEN
// ============================================

console.error('');
console.error('✅ TRADUCCIONES EXTRAÍDAS:');
console.error(`   • English → Spanish: ${englishEntries.length} traducciones`);
console.error(`   • Spanish Spain → Spanish Honduras: ${hondurasEntries.length} conversiones`);
console.error('');
console.error('📝 INSTRUCCIONES:');
console.error('   1. Copia ENGLISH_TO_SPANISH y reemplaza en translationOverrides.js');
console.error('   2. Copia SPANISH_SPAIN_TO_SPANISH_HONDURAS para usar como HONDURAS_OVERRIDES');
console.error('');
