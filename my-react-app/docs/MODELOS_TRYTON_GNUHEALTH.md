# Modelos Tryton de GNU Health (gnuhealth.*)

Este documento describe los modelos específicos de GNU Health utilizados en el proyecto.

## Tabla de Contenidos

1. [gnuhealth.patient - Pacientes](#gnuhealthpatient)
2. [Modelos Relacionados](#modelos-relacionados)
3. [Wizards](#wizards)

---

## gnuhealth.patient - Pacientes

### Descripción
Modelo principal para gestionar pacientes en GNU Health.

### Uso en el Proyecto

Este modelo se utiliza con los métodos genéricos del servicio Tryton. Ver [Modelos de Usuario](./MODELOS_TRYTON_USUARIO.md) para más detalles sobre métodos genéricos.

### Campos Comunes

- **id**: ID del paciente
- **active**: Boolean indicando si está activo
- **name**: Nombre
- **lastname**: Apellido
- **party**: Relación many2one con `party.party`
- **party.rec_name**: Nombre completo del party (expandido)
- **gender**: Género
- **gender:string**: Género como string
- **age**: Edad calculada
- **deceased**: Boolean indicando si falleció
- **patient_status**: Estado del paciente
- **puid**: Patient Unique Identifier
- **rec_name**: Nombre completo calculado
- **_timestamp**: Timestamp para control de concurrencia
- **_write**: Permiso de escritura
- **_delete**: Permiso de eliminación

### Flujo de Uso Típico

1. **Listar pacientes**:
```javascript
const patients = await trytonService.getModelData(
  "gnuhealth.patient",
  [["active", "=", true]],
  ["name", "lastname", "party.rec_name", "gender", "patient_status"],
  100
);
```

2. **Buscar paciente específico**:
```javascript
const patients = await trytonService.getModelData(
  "gnuhealth.patient",
  [
    ["active", "=", true],
    ["name", "ilike", "Juan"]
  ],
  ["name", "lastname", "party.rec_name"],
  10
);
```

3. **Obtener información completa de un paciente**:
```javascript
const patientData = await trytonService.getFormRecordData(
  "gnuhealth.patient",
  123,
  [
    "name",
    "lastname",
    "party.rec_name",
    "gender",
    "age",
    "patient_status"
  ]
);
```

4. **Crear nuevo paciente**:
```javascript
const newPatientId = await trytonService.createRecord("gnuhealth.patient", {
  name: "Juan",
  lastname: "Pérez",
  party: 456, // ID del party
  gender: "m",
  active: true
});
```

---

## Modelos Relacionados

### gnuhealth.appointment - Citas

#### Descripción
Modelo para gestionar citas médicas.

#### Uso Genérico
Se utiliza con los métodos genéricos del servicio:

```javascript
// Obtener citas de un paciente
const appointments = await trytonService.getModelData(
  "gnuhealth.appointment",
  [["patient", "=", patientId]],
  ["name", "appointment_date", "patient.rec_name"],
  100
);
```

### gnuhealth.disease - Enfermedades

#### Descripción
Modelo para gestionar enfermedades.

#### Uso Genérico
```javascript
// Buscar enfermedades
const diseases = await trytonService.autocomplete(
  "gnuhealth.disease",
  "diabetes",
  [],
  10
);
```

### Otros Modelos GNU Health

El proyecto puede trabajar con cualquier modelo de GNU Health usando los métodos genéricos:

- **gnuhealth.physician**: Médicos
- **gnuhealth.healthcenter**: Centros de salud
- **gnuhealth.medication**: Medicamentos
- **gnuhealth.lab**: Laboratorios
- **gnuhealth.imaging**: Imágenes médicas
- **gnuhealth.surgery**: Cirugías
- Y cualquier otro modelo instalado en GNU Health

---

## Wizards

### Descripción
Los wizards son flujos de trabajo multi-paso en Tryton/GNU Health.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `createWizard(wizardName)`**
- **Propósito**: Crear una nueva instancia de wizard
- **Parámetros**:
  - `wizardName`: Nombre del wizard (ej: "gnuhealth.patient.disease.add")
- **Retorna**: Objeto con:
```javascript
{
  wizardId: 123, // ID de la instancia del wizard
  state: "start", // Estado inicial del wizard
  createResult: [...] // Resultado completo del create
}
```
- **Ejemplo**:
```javascript
const wizard = await trytonService.createWizard("gnuhealth.patient.disease.add");
```

**2. `getWizardForm(wizardName, wizardId)`**
- **Propósito**: Obtener el formulario del wizard para el estado actual
- **Parámetros**:
  - `wizardName`: Nombre del wizard
  - `wizardId`: ID de la instancia del wizard
- **Retorna**: Objeto con:
```javascript
{
  wizardId: 123,
  state: "start", // Estado actual
  fieldsView: {...}, // Definición de campos del formulario
  defaults: {...}, // Valores por defecto
  values: {...}, // Valores actuales
  buttons: [ // Botones disponibles
    {
      name: "Siguiente",
      state: "next",
      default: true
    },
    {
      name: "Cancelar",
      state: "end",
      default: false
    }
  ],
  model: "wizard.gnuhealth.patient.disease.add" // Modelo del wizard
}
```
- **Ejemplo**:
```javascript
const form = await trytonService.getWizardForm(
  "gnuhealth.patient.disease.add",
  123
);
```

**3. `executeWizardAction(wizardName, wizardId, values, buttonState)`**
- **Propósito**: Ejecutar una acción del wizard (submit)
- **Parámetros**:
  - `wizardName`: Nombre del wizard
  - `wizardId`: ID de la instancia
  - `values`: Objeto con valores del formulario
  - `buttonState`: Estado del botón presionado (ej: "next", "end")
- **Retorna**: Resultado de la ejecución:
```javascript
{
  state: "next", // Nuevo estado
  view: {...}, // Nueva vista si hay más pasos
  // O si terminó:
  state: "end",
  // ... resultado final
}
```
- **Ejemplo**:
```javascript
const result = await trytonService.executeWizardAction(
  "gnuhealth.patient.disease.add",
  123,
  {
    disease: 456,
    diagnosed_date: "2024-01-01"
  },
  "next"
);
```

**4. `deleteWizard(wizardName, wizardId)`**
- **Propósito**: Eliminar una instancia de wizard
- **Parámetros**:
  - `wizardName`: Nombre del wizard
  - `wizardId`: ID de la instancia
- **Retorna**: Resultado de la eliminación
- **Ejemplo**:
```javascript
await trytonService.deleteWizard("gnuhealth.patient.disease.add", 123);
```

**5. `getCurrentWizardState(wizardName, wizardId)`**
- **Propósito**: Obtener el estado actual del wizard (método interno)
- **Parámetros**:
  - `wizardName`: Nombre del wizard
  - `wizardId`: ID de la instancia
- **Retorna**: String con el estado actual (ej: "start", "next", "end")
- **Nota**: Este método se usa internamente, pero puede ser útil para debugging

### Flujo de Uso Típico

1. **Crear wizard**:
```javascript
const wizard = await trytonService.createWizard("gnuhealth.patient.disease.add");
```

2. **Obtener formulario inicial**:
```javascript
const form = await trytonService.getWizardForm(
  "gnuhealth.patient.disease.add",
  wizard.wizardId
);
// Renderizar formulario con form.fieldsView, form.defaults, form.buttons
```

3. **Ejecutar acción (siguiente paso)**:
```javascript
const result = await trytonService.executeWizardAction(
  "gnuhealth.patient.disease.add",
  wizard.wizardId,
  formValues,
  "next" // Estado del botón
);

// Si hay más pasos, obtener nuevo formulario
if (result.state !== "end") {
  const nextForm = await trytonService.getWizardForm(
    "gnuhealth.patient.disease.add",
    wizard.wizardId
  );
}
```

4. **Finalizar wizard**:
```javascript
// Cuando el usuario presiona "Finalizar" o "Cancelar"
await trytonService.executeWizardAction(
  "gnuhealth.patient.disease.add",
  wizard.wizardId,
  {},
  "end"
);

// Limpiar wizard
await trytonService.deleteWizard("gnuhealth.patient.disease.add", wizard.wizardId);
```

### Wizards Comunes en GNU Health

- **gnuhealth.patient.disease.add**: Agregar enfermedad a paciente
- **gnuhealth.patient.medication.add**: Agregar medicamento a paciente
- **gnuhealth.appointment.create**: Crear cita
- **gnuhealth.lab.request**: Solicitar análisis de laboratorio
- Y otros wizards personalizados instalados

---

## Relaciones entre Modelos

### Detección Automática de Relaciones

El servicio detecta automáticamente relaciones entre modelos:

**Método: `detectRelationType(relatedModel, contextModel)`**
- Detecta el tipo de relación entre dos modelos
- Retorna:
  - `"email"`, `"attachment"`, `"note"`: Tipos especiales
  - `"generic"`: Relación genérica
  - Objeto con `{ type: "dynamic", field: "campo" }`: Relación dinámica

**Método: `detectRelationField(relatedModel, contextModel)`**
- Detecta el campo de relación entre dos modelos
- Estrategias:
  1. Campo directo por nombre del modelo contexto
  2. Campo por nombre del modelo relacionado
  3. Análisis de palabras clave compartidas
  4. Inferencia del contexto
  5. Análisis de jerarquía de modelos

**Método: `createDefaultDomain(relatedModel, contextModel, contextId, relationType)`**
- Crea un dominio por defecto para filtrar registros relacionados
- Ejemplo:
```javascript
// Para gnuhealth.appointment relacionado con gnuhealth.patient
const domain = trytonService.createDefaultDomain(
  "gnuhealth.appointment",
  "gnuhealth.patient",
  123,
  "dynamic"
);
// Resultado: [["patient", "=", 123]]
```

### Flujo de Uso de Relaciones

1. **Abrir vista relacionada desde toolbar**:
```javascript
// Obtener toolbar info
const toolbarInfo = await trytonService.makeRpcCall(
  "model.gnuhealth.patient.view_toolbar_get",
  [{}]
);

// Encontrar relación en toolbarInfo.relates
const relateItem = toolbarInfo.relates.find(r => r.name === "Citas");

// Manejar relación
const result = await trytonService.handleRelateAction(
  relateItem,
  "gnuhealth.patient", // Context model
  123 // Context ID
);
```

2. **Filtrar registros relacionados**:
```javascript
// El servicio detecta automáticamente el campo de relación
// y crea el dominio apropiado
const appointments = await trytonService.getModelData(
  "gnuhealth.appointment",
  [["patient", "=", 123]], // Dominio creado automáticamente
  ["name", "appointment_date"],
  100
);
```

---

## Notas Importantes

### Campos Expandidos
Los modelos GNU Health suelen tener muchas relaciones many2one. El servicio expande automáticamente estos campos para incluir `rec_name`.

### Control de Concurrencia
Siempre incluir `_timestamp` al actualizar registros para evitar conflictos de concurrencia.

### Wizards Multi-paso
Los wizards pueden tener múltiples pasos. Siempre verificar el estado después de cada acción para determinar si hay más pasos o si terminó.

### Contexto en Wizards
Los wizards pueden recibir contexto (active_id, active_model) que se pasa automáticamente desde el contexto del usuario.

### Dominios PYSON
Muchos modelos GNU Health usan dominios PYSON complejos. El servicio evalúa estos dominios automáticamente usando `evaluatePysonDomain()`.

