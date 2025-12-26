# Modelos Tryton de Usuario (res.*)

Este documento describe los modelos de usuario y configuración que se utilizan en el proyecto.

## Tabla de Contenidos

1. [res.user - Usuarios](#resuser)
2. [Modelos Genéricos](#modelos-genericos)

---

## res.user - Usuarios

### Descripción
Modelo para gestionar usuarios del sistema y sus preferencias.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getUserPreferences()`**
- **Propósito**: Obtener preferencias del usuario actual
- **Retorna**: Objeto con preferencias del usuario:
```javascript
{
  language: "es", // Idioma del usuario
  pyson_menu: {...}, // Configuración PYSON del menú (si existe)
  // ... otras preferencias
}
```
- **Ejemplo**:
```javascript
const preferences = await trytonService.getUserPreferences();
```

**2. `changeUserLanguage(newLanguage)`**
- **Propósito**: Cambiar el idioma del usuario sin necesidad de re-login
- **Parámetros**:
  - `newLanguage`: Código de idioma (ej: "es_HN", "en", "es")
- **Retorna**: Objeto con `{ success: true, language: newLanguage }`
- **Nota**: Convierte automáticamente el idioma para Tryton (ej: "es_HN" → "es")
- **Ejemplo**:
```javascript
await trytonService.changeUserLanguage("es_HN");
// El contexto se actualiza automáticamente
```

**3. `loadUserContext()`**
- **Propósito**: Cargar el contexto del usuario (método interno)
- **Retorna**: No retorna valor, actualiza `this.context`
- **Uso**: Se llama automáticamente después del login y cuando se cambia el idioma
- **Ejemplo**:
```javascript
await trytonService.loadUserContext();
// this.context ahora contiene el contexto del usuario
```

**4. `set_preferences` (método interno)**
- **Propósito**: Actualizar preferencias del usuario en el backend
- **Uso**: Se llama internamente por `changeUserLanguage()`
- **Formato**:
```javascript
await this.makeRpcCall("model.res.user.set_preferences", [
  { language: "es" }, // Valores a actualizar
]);
```

### Flujo de Uso Típico

1. **Obtener preferencias al cargar la aplicación**:
```javascript
const preferences = await trytonService.getUserPreferences();
// Usar preferences.language para configurar i18n
```

2. **Cambiar idioma del usuario**:
```javascript
await trytonService.changeUserLanguage("es_HN");
// Recargar menú y componentes para aplicar nuevo idioma
const menuData = await trytonService.getSidebarMenu();
```

3. **Verificar contexto del usuario**:
```javascript
// El contexto se carga automáticamente después del login
// Contiene información como:
// - language: Idioma del usuario
// - company: Compañía activa
// - active_id, active_ids, active_model: Registro activo
```

### Contexto del Usuario

El contexto (`this.context`) es un objeto que se pasa automáticamente en todas las llamadas RPC. Contiene:

- **language**: Idioma del usuario
- **company**: ID de la compañía activa
- **active_id**: ID del registro activo
- **active_ids**: Array de IDs de registros activos
- **active_model**: Modelo del registro activo
- **user**: ID del usuario actual
- **timestamp**: Timestamp para control de concurrencia

El contexto se actualiza automáticamente cuando:
- El usuario inicia sesión
- Se cambia el idioma
- Se navega a diferentes vistas

---

## Modelos Genéricos

### Descripción
El servicio Tryton permite trabajar con cualquier modelo del sistema de forma dinámica.

### Métodos Genéricos Disponibles

**1. `getFieldsView(model, viewId, viewType)`**
- **Propósito**: Obtener la definición de campos de una vista
- **Parámetros**:
  - `model`: Nombre del modelo (ej: "gnuhealth.patient")
  - `viewId`: ID de la vista (null para vista por defecto)
  - `viewType`: Tipo de vista ("tree", "form", "graph", etc.)
- **Retorna**: Objeto con definición de la vista:
```javascript
{
  type: "tree", // Tipo de vista
  view_id: 123, // ID de la vista
  fields: {
    name: {
      type: "char",
      string: "Nombre",
      required: true,
      // ... más propiedades
    },
    // ... más campos
  },
  arch: "<tree>...</tree>", // XML de la vista
  // ... más propiedades
}
```
- **Ejemplo**:
```javascript
const fieldsView = await trytonService.getFieldsView(
  "gnuhealth.patient",
  null,
  "tree"
);
```

**2. `getModelData(model, domain, fields, limit, offset)`**
- **Propósito**: Obtener datos de un modelo con filtros
- **Parámetros**:
  - `model`: Nombre del modelo
  - `domain`: Array de filtros (ej: `[["active", "=", true]]`)
  - `fields`: Array de campos a obtener
  - `limit`: Límite de registros (default: 100)
  - `offset`: Offset de registros (default: 0)
- **Retorna**: Array de objetos con los datos
- **Ejemplo**:
```javascript
const patients = await trytonService.getModelData(
  "gnuhealth.patient",
  [["active", "=", true]],
  ["name", "lastname", "party.rec_name"],
  50,
  0
);
```

**3. `getTableInfo(model, viewId, viewType, domain, limit, offset)`**
- **Propósito**: Obtener información completa de una tabla (vista + datos)
- **Parámetros**:
  - `model`: Nombre del modelo
  - `viewId`: ID de la vista
  - `viewType`: Tipo de vista (default: "tree")
  - `domain`: Array de filtros
  - `limit`: Límite de registros (default: 100)
  - `offset`: Offset de registros (default: 0)
- **Retorna**: Objeto con:
```javascript
{
  fieldsView: {...}, // Definición de la vista
  data: [...], // Datos de los registros
  model: "gnuhealth.patient",
  viewId: 123,
  viewType: "tree",
  fields: ["name", "lastname", ...] // Campos expandidos
}
```
- **Ejemplo**:
```javascript
const tableInfo = await trytonService.getTableInfo(
  "gnuhealth.patient",
  null,
  "tree",
  [],
  100,
  0
);
```

**4. `getFormInfo(model, viewId, viewType, recordId)`**
- **Propósito**: Obtener información completa de un formulario (vista + datos de registro)
- **Parámetros**:
  - `model`: Nombre del modelo
  - `viewId`: ID de la vista
  - `viewType`: Tipo de vista (default: "form")
  - `recordId`: ID del registro (null para formulario vacío)
- **Retorna**: Objeto con:
```javascript
{
  fieldsView: {...}, // Definición de la vista
  data: {...}, // Datos del registro (null si es nuevo)
  model: "gnuhealth.patient",
  viewId: 123,
  viewType: "form",
  fields: ["name", "lastname", ...],
  recordId: 123
}
```
- **Ejemplo**:
```javascript
// Formulario nuevo
const formInfo = await trytonService.getFormInfo(
  "gnuhealth.patient",
  null,
  "form",
  null
);

// Formulario existente
const formInfo = await trytonService.getFormInfo(
  "gnuhealth.patient",
  null,
  "form",
  123
);
```

**5. `getFormRecordData(model, recordId, fields)`**
- **Propósito**: Obtener datos de un registro específico para formularios
- **Parámetros**:
  - `model`: Nombre del modelo
  - `recordId`: ID del registro
  - `fields`: Array de campos a obtener
- **Retorna**: Objeto con los datos del registro
- **Ejemplo**:
```javascript
const recordData = await trytonService.getFormRecordData(
  "gnuhealth.patient",
  123,
  ["name", "lastname", "party.rec_name"]
);
```

**6. `getDefaultValues(model, fieldsView)`**
- **Propósito**: Obtener valores por defecto para crear un nuevo registro
- **Parámetros**:
  - `model`: Nombre del modelo
  - `fieldsView`: Vista de campos (opcional, se obtiene si no se proporciona)
- **Retorna**: Objeto con valores por defecto
- **Ejemplo**:
```javascript
const defaults = await trytonService.getDefaultValues("gnuhealth.patient");
// Usar defaults para inicializar formulario nuevo
```

**7. `createRecord(model, values)`**
- **Propósito**: Crear un nuevo registro
- **Parámetros**:
  - `model`: Nombre del modelo
  - `values`: Objeto con los valores del registro
- **Retorna**: Array con el ID del registro creado
- **Ejemplo**:
```javascript
const newId = await trytonService.createRecord("gnuhealth.patient", {
  name: "Juan",
  lastname: "Pérez",
  party: 456
});
// newId = [123] (array con el ID)
```

**8. `updateRecord(model, recordId, values)`**
- **Propósito**: Actualizar un registro existente
- **Parámetros**:
  - `model`: Nombre del modelo
  - `recordId`: ID del registro
  - `values`: Objeto con los valores a actualizar
- **Retorna**: Boolean indicando éxito
- **Ejemplo**:
```javascript
await trytonService.updateRecord("gnuhealth.patient", 123, {
  name: "Juan Carlos"
});
```

**9. `deleteRecord(model, recordId)`**
- **Propósito**: Eliminar un registro
- **Parámetros**:
  - `model`: Nombre del modelo
  - `recordId`: ID del registro
- **Retorna**: Boolean indicando éxito
- **Ejemplo**:
```javascript
await trytonService.deleteRecord("gnuhealth.patient", 123);
```

**10. `autocomplete(model, searchText, domain, limit)`**
- **Propósito**: Autocompletar para campos many2one
- **Parámetros**:
  - `model`: Nombre del modelo
  - `searchText`: Texto de búsqueda
  - `domain`: Array de filtros adicionales
  - `limit`: Límite de resultados (default: 1000)
- **Retorna**: Array de resultados:
```javascript
[
  [id, "Nombre a mostrar"],
  [id2, "Otro nombre"],
  // ...
]
```
- **Ejemplo**:
```javascript
const results = await trytonService.autocomplete(
  "party.party",
  "Juan",
  [],
  10
);
```

**11. `getSelectionOptions(model, methodName, context)`**
- **Propósito**: Obtener opciones de un campo selection que tiene un método
- **Parámetros**:
  - `model`: Nombre del modelo
  - `methodName`: Nombre del método que devuelve las opciones
  - `context`: Contexto adicional
- **Retorna**: Array de opciones:
```javascript
[
  ["value1", "Etiqueta 1"],
  ["value2", "Etiqueta 2"],
  // ...
]
```
- **Ejemplo**:
```javascript
const options = await trytonService.getSelectionOptions(
  "gnuhealth.patient",
  "get_gender_selection",
  {}
);
```

**12. `view_toolbar_get` (método interno)**
- **Propósito**: Obtener información del toolbar de un modelo
- **Uso**: Se llama internamente para obtener acciones disponibles
- **Formato**:
```javascript
const toolbarInfo = await this.makeRpcCall(
  `model.${model}.view_toolbar_get`,
  [{}]
);
```
- **Retorna**: Objeto con información del toolbar:
```javascript
{
  actions: {
    create: {...},
    open: {...},
    delete: {...},
    // ... más acciones
  },
  relates: [
    {
      name: "Relación",
      res_model: "gnuhealth.appointment",
      // ... más propiedades
    }
  ],
  // ... más información
}
```

### Expansión de Campos Relacionados

El servicio expande automáticamente campos many2one para incluir información relacionada:

**Método: `expandFieldsForRelations(fields, model)`**
- Agrega automáticamente `campo.rec_name` para campos many2one
- Agrega campos básicos: `rec_name`, `_timestamp`, `_write`, `_delete`

**Ejemplo**:
```javascript
// Campos solicitados
const fields = ["name", "party"];

// Campos expandidos automáticamente
const expandedFields = [
  "name",
  "party",
  "party.rec_name", // Agregado automáticamente
  "rec_name", // Agregado automáticamente
  "_timestamp",
  "_write",
  "_delete"
];
```

**Método: `expandFieldsForRelationsFromFieldsView(fields, fieldsView)`**
- Similar al anterior pero basado en la definición de la vista
- Solo expande campos que son realmente many2one según fieldsView

### Flujo de Uso Típico

1. **Cargar tabla de datos**:
```javascript
const tableInfo = await trytonService.getTableInfo(
  "gnuhealth.patient",
  null,
  "tree",
  [["active", "=", true]],
  100
);
// Renderizar tabla con tableInfo.data
```

2. **Abrir formulario nuevo**:
```javascript
const formInfo = await trytonService.getFormInfo(
  "gnuhealth.patient",
  null,
  "form",
  null
);
const defaults = await trytonService.getDefaultValues("gnuhealth.patient");
// Inicializar formulario con defaults
```

3. **Abrir formulario existente**:
```javascript
const formInfo = await trytonService.getFormInfo(
  "gnuhealth.patient",
  null,
  "form",
  123
);
// Renderizar formulario con formInfo.data
```

4. **Crear nuevo registro**:
```javascript
const newId = await trytonService.createRecord("gnuhealth.patient", {
  name: "Juan",
  lastname: "Pérez"
});
// Recargar tabla o navegar al nuevo registro
```

5. **Actualizar registro**:
```javascript
await trytonService.updateRecord("gnuhealth.patient", 123, {
  name: "Juan Carlos"
});
// Recargar datos del formulario
```

6. **Autocompletar campo many2one**:
```javascript
const results = await trytonService.autocomplete(
  "party.party",
  searchText,
  [],
  10
);
// Mostrar resultados en dropdown
```

---

## Notas Importantes

### Control de Concurrencia
Los registros incluyen `_timestamp` para control de concurrencia. Siempre incluir este campo al actualizar.

### Permisos
Verificar permisos antes de crear/actualizar/eliminar usando `getModelAccess()`.

### Campos Expandidos
Los campos many2one se expanden automáticamente. Los datos incluyen objetos con punto (ej: `party.`) que contienen información relacionada.

### Dominios PYSON
Los dominios pueden contener expresiones PYSON que se evalúan automáticamente usando `evaluatePysonDomain()`.

