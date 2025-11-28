### Flujo: del menú a la tabla

Este documento resume, a alto nivel, qué sucede desde que se carga el menú lateral hasta que, al hacer clic en una opción, se muestra una tabla con datos provenientes de Tryton.

## 1) Carga del menú lateral (Sidebar)

- **Componente**: `src/components/Dashboard.jsx`
- **Cuándo**: al montar el componente (`useEffect` → `loadSidebarMenu`).

Pasos clave dentro de `loadSidebarMenu`:

1. Restaurar la sesión en el servicio:
   - `trytonService.restoreSession(sessionData)` conserva `database`, `username`, `userId`, `sessionId` en memoria.
   - Opcionalmente valida sesión con `trytonService.validateSession()`.

2. Obtener menú y contexto desde Tryton mediante `trytonService.getSidebarMenu()`:
   - Verifica autenticación con una llamada simple.
   - Recarga contexto de usuario: `loadUserContext()` (`model.res.user.get_preferences`).
   - Obtiene preferencias: `getUserPreferences()`.
   - Carga accesos a modelos: `getModelAccess()`.
   - Lista iconos disponibles: `model.ir.ui.icon.list_icons`.
   - Obtiene los menús raíz usando `model.ir.ui.menu.search_read` (IDs) y luego `model.ir.ui.menu.read` (detalles: `name`, `icon`, `childs`, etc.).
   - Para cada menú, resuelve submenús recursivamente con `getSubmenus()` (que vuelve a llamar a `model.ir.ui.menu.read` sobre `childs`).

3. Convierte los menús de Tryton a `menuItems` de React y los guarda en estado para el sidebar.

## 2) Clic en un elemento del menú

- **Componente**: `Dashboard.jsx`
- **Manejador**: `handleMenuClick(item)`.

Pasos al hacer clic:

1. Si es el dashboard, solo cambia la pestaña activa.
2. Para un menú normal, consulta la acción asociada con:
   - `trytonService.getMenuActionInfo(item.id)`
   - Internamente llama a `model.ir.action.keyword.get_keyword('tree_open', ['ir.ui.menu', menuId])` para obtener la acción y el `res_model`.
   - Con el `res_model`, obtiene la barra de herramientas mediante `model.<res_model>.view_toolbar_get` (metadatos de vistas/acciones).
3. Si la acción incluye vistas, localiza una vista tipo `tree` y obtiene su `viewId`.

## 3) Obtención de metadatos de la vista (fields_view)

- **Servicio**: `src/services/trytonService.js`
- **Método**: `getFieldsView(model, viewId, 'tree')`

Hace una llamada RPC a `model.<model>.fields_view_get(viewId, 'tree', {})` para obtener:
- `fields`: definición de campos y tipos
- `type`: tipo de vista (`tree` esperado)
- otras propiedades de la vista

En `Dashboard`, si el `type` es `tree`, se continúa para cargar datos de tabla.

## 4) Carga de datos para la tabla

- **Servicio**: `trytonService.getTableInfo(model, viewId, 'tree', domain, limit, offset)`.

Internamente realiza:

1. `getFieldsView(...)` para confirmar campos y metadatos.
2. Deriva la lista de campos: `Object.keys(fieldsView.fields)`.
3. `getModelData(model, domain, fields, limit, offset)` para traer filas:
   - `model.<model>.search(domain, offset, limit)` devuelve IDs.
   - Expande campos relacionados con `expandFieldsForRelations(fields, model)` (incluye `*.rec_name`, básicos como `rec_name`, `_timestamp`, etc.).
   - `model.<model>.read(ids, expandedFields, {})` devuelve los registros completos.

El resultado (`fieldsView`, `data`, `fields`) se devuelve a `Dashboard` como `tableInfo`.

## 5) Renderizado de la tabla

- **Componente**: `TrytonTable` (`src/components/TrytonTable.jsx`).
- **Desde**: `Dashboard` pasa `model`, `viewId`, `viewType='tree'`, `domain`, `limit`, `title`.

`TrytonTable` utiliza `trytonService` para presentar las columnas (según `fieldsView`) y las filas obtenidas, renderizando una tabla tipo lista (tree) con los datos.

## Esquema resumido de llamadas

1. Dashboard `loadSidebarMenu()` → trytonService `getSidebarMenu()`
2. Usuario hace clic en menú → Dashboard `handleMenuClick()`
3. trytonService `getMenuActionInfo(menuId)` → obtiene `res_model` y vistas
4. Dashboard valida `tree` → trytonService `getFieldsView(model, viewId, 'tree')`
5. trytonService `getTableInfo()` → `search` → `read`
6. Dashboard renderiza `<TrytonTable ... />`

## Archivos implicados

- `src/components/Dashboard.jsx`: orquestación UI/UX, manejo de clics y estado.
- `src/services/trytonService.js`: capa RPC con Tryton (login, contexto, menús, vistas, datos).
- `src/components/TrytonTable.jsx`: renderizado de la tabla basada en metadatos y datos.

Con esto se cubre el flujo completo: carga del menú → selección → resolución de acción/modelo → metadatos de vista → carga de datos → render de tabla.


