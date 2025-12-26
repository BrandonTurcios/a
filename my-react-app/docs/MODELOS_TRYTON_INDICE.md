# Índice de Modelos Tryton

Este documento es un índice general de toda la documentación de modelos Tryton utilizados en el proyecto.

## Documentación Disponible

1. **[Modelos del Sistema (ir.*)](./MODELOS_TRYTON_SISTEMA.md)**
   - ir.attachment - Archivos adjuntos
   - ir.note - Notas
   - ir.ui.menu - Menús
   - ir.ui.icon - Iconos
   - ir.lang - Idiomas
   - ir.model.access - Control de acceso
   - ir.action.keyword - Acciones
   - ir.module - Módulos
   - ir.email - Correos electrónicos

2. **[Modelos de Usuario (res.*)](./MODELOS_TRYTON_USUARIO.md)**
   - res.user - Usuarios y preferencias
   - Modelos genéricos y métodos dinámicos

3. **[Modelos GNU Health (gnuhealth.*)](./MODELOS_TRYTON_GNUHEALTH.md)**
   - gnuhealth.patient - Pacientes
   - Modelos relacionados
   - Wizards

## Guía Rápida de Uso

### Autenticación y Sesión

```javascript
// Login
await trytonService.login(database, username, password, language);

// Verificar sesión
const isValid = await trytonService.validateSession();

// Logout
await trytonService.logout();
```

### Trabajar con Modelos Genéricos

```javascript
// Obtener vista de campos
const fieldsView = await trytonService.getFieldsView(model, viewId, viewType);

// Obtener datos
const data = await trytonService.getModelData(model, domain, fields, limit, offset);

// Crear registro
const newId = await trytonService.createRecord(model, values);

// Actualizar registro
await trytonService.updateRecord(model, recordId, values);

// Eliminar registro
await trytonService.deleteRecord(model, recordId);
```

### Trabajar con Archivos Adjuntos

```javascript
// Buscar archivos
const ids = await trytonService.searchAttachments("modelo,id");

// Leer información
const attachments = await trytonService.readAttachments(ids);

// Crear archivo
await trytonService.createAttachment({ name, resource, dataBase64 });
```

### Trabajar con Notas

```javascript
// Buscar notas
const ids = await trytonService.searchNotes("modelo,id");

// Leer notas
const notes = await trytonService.readNotes(ids);

// Crear nota
await trytonService.createNote({ message, resource, unread });
```

### Trabajar con Menús

```javascript
// Obtener menú completo
const menuData = await trytonService.getSidebarMenu();

// Cargar hijos bajo demanda
const children = await trytonService.loadMenuChildren(menuId);

// Obtener acción del menú
const actionInfo = await trytonService.getMenuActionInfo(menuId);
```

### Trabajar con Wizards

```javascript
// Crear wizard
const wizard = await trytonService.createWizard("wizard.name");

// Obtener formulario
const form = await trytonService.getWizardForm("wizard.name", wizard.wizardId);

// Ejecutar acción
const result = await trytonService.executeWizardAction(
  "wizard.name",
  wizard.wizardId,
  values,
  "next"
);
```

## Patrones Comunes

### Patrón: Cargar Tabla

```javascript
const tableInfo = await trytonService.getTableInfo(
  model,
  viewId,
  "tree",
  domain,
  limit,
  offset
);
// Renderizar tabla con tableInfo.data
```

### Patrón: Abrir Formulario

```javascript
// Formulario nuevo
const formInfo = await trytonService.getFormInfo(model, null, "form", null);
const defaults = await trytonService.getDefaultValues(model);

// Formulario existente
const formInfo = await trytonService.getFormInfo(model, null, "form", recordId);
```

### Patrón: Autocompletar Campo Many2one

```javascript
const results = await trytonService.autocomplete(
  model,
  searchText,
  domain,
  limit
);
// Mostrar resultados en dropdown
```

### Patrón: Trabajar con Relaciones

```javascript
// Obtener toolbar para ver relaciones disponibles
const toolbarInfo = await trytonService.makeRpcCall(
  `model.${model}.view_toolbar_get`,
  [{}]
);

// Manejar relación
const result = await trytonService.handleRelateAction(
  relateItem,
  contextModel,
  contextId
);
```

## Convenciones

### Nombres de Modelos
- Formato: `modulo.modelo` (ej: `gnuhealth.patient`)
- Los modelos del sistema usan prefijo `ir.`
- Los modelos de usuario usan prefijo `res.`
- Los modelos de GNU Health usan prefijo `gnuhealth.`

### Recursos (resource)
- Formato: `"modelo,id"` (ej: `"gnuhealth.patient,123"`)
- Usado en: `ir.attachment`, `ir.note`

### Campos Expandidos
- Los campos many2one se expanden automáticamente
- Formato expandido: `campo.rec_name` → objeto `campo.` con información relacionada

### Control de Concurrencia
- Siempre incluir `_timestamp` al actualizar
- Formato: `{ id: timestamp }` para múltiples registros

### Dominios
- Array de filtros: `[["campo", "operador", valor]]`
- Operadores comunes: `"="`, `"!="`, `"ilike"`, `"in"`, `"not in"`
- Pueden contener PYSON que se evalúa automáticamente

## Referencias

- [Documentación Tryton](https://docs.tryton.org/)
- [Documentación GNU Health](https://en.wikibooks.org/wiki/GNU_Health)
- [API RPC Tryton](https://docs.tryton.org/projects/server/en/latest/topics/rpc.html)

