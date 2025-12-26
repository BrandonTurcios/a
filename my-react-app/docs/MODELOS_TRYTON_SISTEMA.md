# Modelos Tryton del Sistema (ir.*)

Este documento describe los modelos del sistema Tryton que se utilizan en el proyecto y cómo se implementan.

## Tabla de Contenidos

1. [ir.attachment - Archivos Adjuntos](#irattachment)
2. [ir.note - Notas](#irnote)
3. [ir.ui.menu - Menús](#iruimenu)
4. [ir.ui.icon - Iconos](#iruiicon)
5. [ir.lang - Idiomas](#irlang)
6. [ir.model.access - Control de Acceso](#irmodelaccess)
7. [ir.action.keyword - Acciones](#iractionkeyword)
8. [ir.module - Módulos](#irmodule)
9. [ir.email - Correos Electrónicos](#iremail)

---

## ir.attachment - Archivos Adjuntos

### Descripción
Modelo para gestionar archivos adjuntos asociados a cualquier recurso del sistema.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `searchAttachments(resourceKey, offset, limit)`**
- **Propósito**: Buscar archivos adjuntos de un recurso específico
- **Parámetros**:
  - `resourceKey`: String en formato `"modelo,id"` (ej: `"gnuhealth.patient,2"`)
  - `offset`: Número de registros a saltar (default: 0)
  - `limit`: Número máximo de registros (default: 1000)
- **Retorna**: Array de IDs de archivos adjuntos
- **Ejemplo**:
```javascript
const attachmentIds = await trytonService.searchAttachments("gnuhealth.patient,123");
```

**2. `readAttachments(ids)`**
- **Propósito**: Leer información de archivos adjuntos (sin los bytes del archivo)
- **Parámetros**:
  - `ids`: Array de IDs de archivos adjuntos
- **Retorna**: Array de objetos con información de los archivos
- **Campos retornados**:
  - `name`: Nombre del archivo
  - `description`: Descripción
  - `type`: Tipo de archivo
  - `link`: URL si es un enlace externo
  - `last_modification`: Fecha de última modificación
  - `last_user`: Usuario que modificó
  - `resource`: Recurso asociado
  - `summary`: Resumen
  - `_timestamp`: Timestamp para control de concurrencia
  - `_write`, `_delete`: Permisos
- **Ejemplo**:
```javascript
const attachments = await trytonService.readAttachments([1, 2, 3]);
```

**3. `readAttachmentData(ids, { preview })`**
- **Propósito**: Leer los datos reales del archivo (bytes en base64)
- **Parámetros**:
  - `ids`: Array de IDs
  - `preview`: Boolean para obtener versión optimizada (default: false)
- **Retorna**: Array con los datos del archivo
- **Ejemplo**:
```javascript
const attachmentData = await trytonService.readAttachmentData([1], { preview: true });
```

**4. `createAttachment({ name, resource, dataBase64, description, type, link })`**
- **Propósito**: Crear un nuevo archivo adjunto
- **Parámetros**:
  - `name`: Nombre del archivo
  - `resource`: String en formato `"modelo,id"`
  - `dataBase64`: Datos del archivo en base64
  - `description`: Descripción opcional
  - `type`: Tipo de archivo (default: "data")
  - `link`: URL si es enlace externo
- **Retorna**: Array con el ID del archivo creado
- **Ejemplo**:
```javascript
const newAttachment = await trytonService.createAttachment({
  name: "documento.pdf",
  resource: "gnuhealth.patient,123",
  dataBase64: "JVBERi0xLjQKJeLjz9MK...",
  description: "Historial médico"
});
```

**5. `deleteAttachment(ids, timestampMap)`**
- **Propósito**: Eliminar archivos adjuntos
- **Parámetros**:
  - `ids`: ID único o array de IDs
  - `timestampMap`: Objeto con timestamps para control de concurrencia
- **Retorna**: Resultado de la eliminación
- **Ejemplo**:
```javascript
await trytonService.deleteAttachment([1, 2], { 1: "2024-01-01T00:00:00", 2: "2024-01-01T00:00:00" });
```

**6. `getAttachmentDefaults()`**
- **Propósito**: Obtener valores por defecto para crear archivos adjuntos
- **Retorna**: Objeto con valores por defecto
- **Ejemplo**:
```javascript
const defaults = await trytonService.getAttachmentDefaults();
```

### Flujo de Uso Típico

1. **Buscar archivos de un recurso**:
```javascript
const ids = await trytonService.searchAttachments("gnuhealth.patient,123");
```

2. **Leer información de los archivos**:
```javascript
const attachments = await trytonService.readAttachments(ids);
```

3. **Descargar un archivo específico**:
```javascript
const [fileData] = await trytonService.readAttachmentData([attachmentId]);
const blob = base64ToBlob(fileData.data);
```

4. **Subir un nuevo archivo**:
```javascript
const file = event.target.files[0];
const base64 = await fileToBase64(file);
await trytonService.createAttachment({
  name: file.name,
  resource: "gnuhealth.patient,123",
  dataBase64: base64
});
```

---

## ir.note - Notas

### Descripción
Modelo para gestionar notas/comentarios asociados a recursos del sistema.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `searchNotes(resourceKey, offset, limit)`**
- **Propósito**: Buscar notas de un recurso específico
- **Parámetros**:
  - `resourceKey`: String en formato `"modelo,id"`
  - `offset`: Número de registros a saltar (default: 0)
  - `limit`: Número máximo de registros (default: 1000)
- **Retorna**: Array de IDs de notas
- **Ejemplo**:
```javascript
const noteIds = await trytonService.searchNotes("gnuhealth.patient,123");
```

**2. `readNotes(ids)`**
- **Propósito**: Leer información de notas
- **Parámetros**:
  - `ids`: Array de IDs de notas
- **Retorna**: Array de objetos con información de las notas
- **Campos retornados**:
  - `message_wrapped`: Contenido de la nota
  - `last_modification`: Fecha de última modificación
  - `last_user`: Usuario que modificó
  - `unread`: Boolean indicando si está sin leer
  - `resource`: Recurso asociado
  - `_timestamp`: Timestamp para control de concurrencia
  - `_write`, `_delete`: Permisos
- **Ejemplo**:
```javascript
const notes = await trytonService.readNotes([1, 2, 3]);
```

**3. `createNote({ message, resource, unread })`**
- **Propósito**: Crear una nueva nota
- **Parámetros**:
  - `message`: Contenido de la nota
  - `resource`: String en formato `"modelo,id"`
  - `unread`: Boolean indicando si debe marcarse como no leída
- **Retorna**: Array con el ID de la nota creada
- **Ejemplo**:
```javascript
const newNote = await trytonService.createNote({
  message: "Paciente requiere seguimiento",
  resource: "gnuhealth.patient,123",
  unread: true
});
```

**4. `deleteNote(ids, timestampMap)`**
- **Propósito**: Eliminar notas
- **Parámetros**:
  - `ids`: ID único o array de IDs
  - `timestampMap`: Objeto con timestamps para control de concurrencia
- **Retorna**: Resultado de la eliminación
- **Ejemplo**:
```javascript
await trytonService.deleteNote([1], { 1: "2024-01-01T00:00:00" });
```

**5. `getNoteFieldsView()`**
- **Propósito**: Obtener la vista de campos del modelo de notas
- **Retorna**: Objeto con la definición de campos
- **Ejemplo**:
```javascript
const fieldsView = await trytonService.getNoteFieldsView();
```

**6. `getNoteModels()`**
- **Propósito**: Obtener lista de modelos que pueden tener notas
- **Retorna**: Array de nombres de modelos
- **Ejemplo**:
```javascript
const models = await trytonService.getNoteModels();
```

### Flujo de Uso Típico

1. **Buscar notas de un recurso**:
```javascript
const noteIds = await trytonService.searchNotes("gnuhealth.patient,123");
const notes = await trytonService.readNotes(noteIds);
```

2. **Crear una nueva nota**:
```javascript
await trytonService.createNote({
  message: "Nota importante",
  resource: "gnuhealth.patient,123",
  unread: false
});
```

3. **Marcar nota como leída**:
```javascript
// Actualizar la nota para cambiar unread a false
await trytonService.updateRecord("ir.note", noteId, { unread: false });
```

---

## ir.ui.menu - Menús

### Descripción
Modelo para gestionar la estructura de menús del sistema.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getSidebarMenu()`**
- **Propósito**: Obtener la estructura completa del menú del sidebar
- **Retorna**: Objeto con:
  - `preferences`: Preferencias del usuario
  - `menuItems`: Array de elementos del menú principal
  - `icons`: Lista de iconos disponibles
  - `modelAccess`: Permisos de acceso a modelos
  - `pysonMenu`: Configuración PYSON del menú
- **Estructura de menuItems**:
```javascript
{
  id: 1,
  name: "Nombre del menú",
  icon: "📋",
  iconName: "tryton-list",
  iconUrl: "blob:...",
  model: "gnuhealth.patient",
  description: "Descripción",
  sequence: 0,
  childs: null, // null para lazy loading
  childIds: [2, 3], // IDs de hijos
  hasChildren: true,
  childrenLoaded: false
}
```
- **Ejemplo**:
```javascript
const menuData = await trytonService.getSidebarMenu();
```

**2. `getMenuItemById(menuId)`**
- **Propósito**: Obtener información de un menú específico por ID
- **Parámetros**:
  - `menuId`: ID del menú
- **Retorna**: Objeto con información del menú o null
- **Ejemplo**:
```javascript
const menuItem = await trytonService.getMenuItemById(59);
```

**3. `loadMenuChildren(menuId)`**
- **Propósito**: Cargar los hijos de un menú bajo demanda (lazy loading)
- **Parámetros**:
  - `menuId`: ID del menú padre
- **Retorna**: Array de elementos hijos
- **Ejemplo**:
```javascript
const children = await trytonService.loadMenuChildren(59);
```

**4. `getSubmenus(childIds, level, maxDepth)`**
- **Propósito**: Obtener submenús recursivamente (método interno)
- **Parámetros**:
  - `childIds`: Array de IDs de hijos
  - `level`: Nivel actual de profundidad
  - `maxDepth`: Profundidad máxima (default: 5)
- **Retorna**: Array de submenús procesados
- **Nota**: Este método es usado internamente por `getSidebarMenu()`

**5. `getMenuActionInfo(menuId, selectedActionIndex)`**
- **Propósito**: Obtener información de la acción asociada a un menú
- **Parámetros**:
  - `menuId`: ID del menú
  - `selectedActionIndex`: Índice de la acción si hay múltiples (default: 0)
- **Retorna**: Objeto con información de la acción:
```javascript
{
  actionInfo: [...], // Array de acciones disponibles
  toolbarInfo: {...}, // Información del toolbar
  resModel: "gnuhealth.patient", // Modelo de la acción
  actionName: "Pacientes",
  hasMultipleOptions: false, // Si hay múltiples opciones
  isWizard: false, // Si es un wizard
  fieldsView: {...}, // Vista de campos
  viewType: "tree", // Tipo de vista
  viewId: 123, // ID de la vista
  selectedOption: {...} // Opción seleccionada
}
```
- **Ejemplo**:
```javascript
const actionInfo = await trytonService.getMenuActionInfo(59);
```

### Flujo de Uso Típico

1. **Cargar menú principal**:
```javascript
const menuData = await trytonService.getSidebarMenu();
// Renderizar menuItems en el sidebar
```

2. **Cargar hijos bajo demanda**:
```javascript
// Cuando el usuario expande un menú
const children = await trytonService.loadMenuChildren(menuId);
// Actualizar el menú con los hijos cargados
```

3. **Obtener acción al hacer clic**:
```javascript
const actionInfo = await trytonService.getMenuActionInfo(menuId);
if (actionInfo.isWizard) {
  // Manejar wizard
} else if (actionInfo.resModel) {
  // Abrir tabla o formulario
}
```

---

## ir.ui.icon - Iconos

### Descripción
Modelo para gestionar iconos SVG del sistema.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `listIcons()`**
- **Propósito**: Obtener lista de todos los iconos disponibles
- **Retorna**: Array de arrays `[[id, nombre], ...]`
- **Ejemplo**:
```javascript
const icons = await trytonService.listIcons();
// Resultado: [[1, 'tryton-list'], [2, 'tryton-star'], ...]
```

**2. `getIconData(iconIds)`**
- **Propósito**: Obtener datos SVG de iconos específicos
- **Parámetros**:
  - `iconIds`: Array de IDs de iconos
- **Retorna**: Array de objetos con `name` e `icon` (SVG)
- **Ejemplo**:
```javascript
const iconData = await trytonService.getIconData([1, 2]);
```

**3. `getIconUrl(iconName, color)`**
- **Propósito**: Obtener URL de blob para un icono (con caché)
- **Parámetros**:
  - `iconName`: Nombre del icono (ej: "tryton-list")
  - `color`: Color para el SVG (default: "#267f82")
- **Retorna**: URL de blob o string vacío si no existe
- **Ejemplo**:
```javascript
const iconUrl = await trytonService.getIconUrl("tryton-list", "#267f82");
// Usar en: <img src={iconUrl} />
```

**4. `preloadIcons(iconNames, color)`**
- **Propósito**: Precargar múltiples iconos en batch
- **Parámetros**:
  - `iconNames`: Array de nombres de iconos
  - `color`: Color para los SVGs (default: "#267f82")
- **Retorna**: Objeto con mapeo `{ iconName: url }`
- **Ejemplo**:
```javascript
const iconUrls = await trytonService.preloadIcons(
  ["tryton-list", "tryton-star"],
  "#267f82"
);
```

**5. `convertSvgToUrl(svgData, color)`**
- **Propósito**: Convertir SVG string a URL de blob con color aplicado
- **Parámetros**:
  - `svgData`: String con el SVG
  - `color`: Color para aplicar (default: "#267f82")
- **Retorna**: URL de blob
- **Ejemplo**:
```javascript
const url = trytonService.convertSvgToUrl("<svg>...</svg>", "#267f82");
```

**6. `clearIconCache()`**
- **Propósito**: Limpiar la caché de iconos (útil para cambios de tema)
- **Ejemplo**:
```javascript
trytonService.clearIconCache();
```

### Flujo de Uso Típico

1. **Precargar iconos del menú**:
```javascript
const iconNames = menuItems.map(item => item.iconName).filter(Boolean);
const iconUrls = await trytonService.preloadIcons(iconNames);
// Asignar iconUrls a los items del menú
```

2. **Obtener icono individual**:
```javascript
const iconUrl = await trytonService.getIconUrl("tryton-list");
// Usar en componente
<img src={iconUrl} alt="Icon" />
```

3. **Cargar iconos desde archivos locales**:
```javascript
// Si el icono no está en el backend, se intenta cargar desde /images/{iconName}.svg
// Esto se hace automáticamente en getIconUrl()
```

---

## ir.lang - Idiomas

### Descripción
Modelo para gestionar idiomas disponibles en el sistema.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getAvailableLanguages()`**
- **Propósito**: Obtener todos los idiomas disponibles en Tryton
- **Retorna**: Array de IDs de idiomas
- **Ejemplo**:
```javascript
const languageIds = await trytonService.getAvailableLanguages();
// Luego usar read para obtener detalles: model.ir.lang.read([...], ["code", "name"])
```

### Flujo de Uso Típico

1. **Obtener idiomas disponibles**:
```javascript
const languageIds = await trytonService.getAvailableLanguages();
const languages = await trytonService.makeRpcCall("model.ir.lang.read", [
  languageIds,
  ["code", "name", "translatable"]
]);
```

---

## ir.model.access - Control de Acceso

### Descripción
Modelo para gestionar permisos de acceso a modelos.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getModelAccess()`**
- **Propósito**: Obtener permisos de acceso a modelos para el usuario actual
- **Retorna**: Array de objetos con:
  - `model`: Nombre del modelo
  - `perm_read`: Permiso de lectura
  - `perm_write`: Permiso de escritura
  - `perm_create`: Permiso de creación
  - `perm_delete`: Permiso de eliminación
- **Ejemplo**:
```javascript
const access = await trytonService.getModelAccess();
// Verificar permisos antes de mostrar/ocultar acciones
```

### Flujo de Uso Típico

1. **Verificar permisos antes de acciones**:
```javascript
const access = await trytonService.getModelAccess();
const modelAccess = access.find(a => a.model === "gnuhealth.patient");
if (modelAccess && modelAccess.perm_create) {
  // Mostrar botón de crear
}
```

---

## ir.action.keyword - Acciones

### Descripción
Modelo para gestionar acciones asociadas a menús y botones.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getMenuActionInfo(menuId, selectedActionIndex)`**
- **Propósito**: Obtener información de acción de un menú
- **Detalles**: Ver sección [ir.ui.menu](#iruimenu)

**2. `getActionOptions(menuId)`**
- **Propósito**: Obtener opciones de acción cuando hay múltiples disponibles
- **Parámetros**:
  - `menuId`: ID del menú
- **Retorna**: Objeto con:
```javascript
{
  hasOptions: true,
  options: [
    {
      index: 0,
      id: 123,
      name: "Opción 1",
      resModel: "gnuhealth.patient",
      contextModel: "gnuhealth.appointment",
      type: "ir.action.act_window",
      views: [[1, "tree"], [2, "form"]]
    }
  ],
  defaultIndex: 0
}
```
- **Ejemplo**:
```javascript
const options = await trytonService.getActionOptions(menuId);
// Mostrar modal para que el usuario seleccione
```

**3. `executeSelectedAction(menuId, selectedActionIndex)`**
- **Propósito**: Ejecutar una acción seleccionada después de mostrar modal
- **Parámetros**:
  - `menuId`: ID del menú
  - `selectedActionIndex`: Índice de la acción seleccionada
- **Retorna**: Objeto con información para abrir la vista
- **Ejemplo**:
```javascript
const result = await trytonService.executeSelectedAction(menuId, 0);
if (result.requiresContext) {
  // Mostrar modal para seleccionar contexto
}
```

---

## ir.module - Módulos

### Descripción
Modelo para gestionar módulos instalados en el sistema.

### Uso en el Proyecto

#### Uso Interno

Se utiliza internamente en `getSidebarMenu()` para verificar autenticación:

```javascript
const testResult = await this.makeRpcCall(
  "model.ir.module.search_read",
  [[["state", "=", "installed"]], ["name"]]
);
```

---

## ir.email - Correos Electrónicos

### Descripción
Modelo para gestionar envío de correos electrónicos.

### Uso en el Proyecto

#### Métodos Disponibles

**1. `getRecordData(model, recordId, fields)`**
- **Propósito**: Obtener datos de un registro para usar en email
- **Parámetros**:
  - `model`: Nombre del modelo
  - `recordId`: ID del registro
  - `fields`: Campos a obtener (default: ["id", "rec_name"])
- **Retorna**: Objeto con datos del registro
- **Ejemplo**:
```javascript
const recordData = await trytonService.getRecordData("gnuhealth.patient", 123);
```

**2. `getEmailTemplateDefault(model, recordId)`**
- **Propósito**: Obtener plantilla de email por defecto para un modelo
- **Parámetros**:
  - `model`: Nombre del modelo
  - `recordId`: ID del registro
- **Retorna**: Datos de la plantilla
- **Ejemplo**:
```javascript
const template = await trytonService.getEmailTemplateDefault("gnuhealth.patient", 123);
```

**3. `getEmailComplete(query, limit)`**
- **Propósito**: Obtener sugerencias de autocompletado para direcciones de email
- **Parámetros**:
  - `query`: Texto de búsqueda
  - `limit`: Límite de resultados (default: 1000)
- **Retorna**: Array de sugerencias
- **Ejemplo**:
```javascript
const suggestions = await trytonService.getEmailComplete("john", 10);
```

### Flujo de Uso Típico

1. **Abrir modal de email**:
```javascript
const recordData = await trytonService.getRecordData("gnuhealth.patient", 123);
const template = await trytonService.getEmailTemplateDefault("gnuhealth.patient", 123);
// Mostrar modal con datos precargados
```

2. **Autocompletar destinatarios**:
```javascript
const suggestions = await trytonService.getEmailComplete("john");
// Mostrar sugerencias en dropdown
```

---

## Notas Importantes

### Control de Concurrencia
Los modelos `ir.attachment` e `ir.note` utilizan timestamps (`_timestamp`) para control de concurrencia. Siempre incluir estos timestamps al actualizar o eliminar.

### Lazy Loading de Menús
Los menús utilizan lazy loading para mejorar el rendimiento. Los hijos se cargan solo cuando el usuario expande un menú.

### Caché de Iconos
Los iconos se cachean en memoria para evitar múltiples llamadas al servidor. Usar `clearIconCache()` cuando cambie el tema.

### Recursos (resource)
Los modelos `ir.attachment` e `ir.note` usan el campo `resource` en formato `"modelo,id"` para asociar archivos y notas a cualquier recurso del sistema.

