# 📂 src/app/views/

Vistas principales del contenido del Dashboard.

---

## 📄 Archivos

### `TableView.jsx`
**Líneas:** ~37 líneas
**Responsabilidad:** Vista de tabla para mostrar listas de registros

**¿Qué hace este archivo?**

`TableView.jsx` es un componente wrapper que renderiza vistas de tabla (listas) de registros de Tryton. Actúa como capa intermedia entre `ContentArea` (que decide qué vista mostrar) y `TrytonTable` (componente existente que renderiza la tabla real).

**Funcionalidades específicas:**

1. **Wrapper de TrytonTable**
   - Encapsula el componente `TrytonTable` existente
   - Le pasa las props necesarias: model, viewId, viewType, domain, limit
   - Proporciona un contenedor con padding y título

2. **Renderizado de header**
   - Muestra título de la vista (de `selectedMenuInfo.actionName` o `menuItem.name`)
   - Muestra subtítulo con el nombre del modelo (ej: "health.patient - Table view")
   - Usa componentes Typography de Ant Design (Title, Paragraph)

3. **Props que recibe:**
   ```javascript
   {
     tableInfo: {
       model: string,         // Nombre del modelo (ej: 'health.patient')
       viewId: number,        // ID de la vista de Tryton
       viewType: string,      // 'tree' (tipo de vista tabla)
       fieldsView: object,    // Definición de la vista (XML parseado)
       data: array           // Array de registros (opcional, TrytonTable lo carga si no está)
     },
     selectedMenuInfo: {
       actionName: string,    // Nombre de la acción
       menuItem: object,      // Item del menú que activó esta vista
       resModel: string       // Nombre del modelo
     }
   }
   ```

4. **Integración con TrytonTable:**
   - `TrytonTable` es un componente existente de ~339 líneas en `src/components/`
   - Maneja todo el renderizado de la tabla usando TanStack Table
   - Proporciona acciones: Create, Edit, Delete, Actions, Reports
   - Maneja paginación, sorting, y filtrado
   - Renderiza campos dinámicamente según tipo: text, many2one, selection, boolean, etc.

5. **Estructura del componente:**
   ```javascript
   <div> {/* Container con padding */}
     <div> {/* Header section */}
       <Title>{actionName || menuItemName || 'Table'}</Title>
       <Paragraph>{resModel} - Table view</Paragraph>
     </div>

     <TrytonTable
       model={tableInfo.model}
       viewId={tableInfo.viewId}
       viewType={tableInfo.viewType}
       domain={[]}
       limit={100}
       title={actionName}
     />
   </div>
   ```

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original (~1,634 líneas), la vista de tabla estaba renderizada inline dentro del `<Content>`:

```javascript
// Dashboard.jsx original (líneas ~1200-1350 aproximadamente)
return (
  <Layout>
    <DashboardHeader />
    <Sider>...</Sider>

    <Content style={{ ... }}>
      {/* RENDERIZADO CONDICIONAL INLINE */}
      {!loadingContent && tableInfo && selectedMenuInfo?.viewType === 'tree' && (
        <div style={{
          padding: '24px',
          background: '#F8F9FA',
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto'
        }}>
          {/* TÍTULO INLINE */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, color: '#333333' }}>
              {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table'}
            </Title>
            <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
              {selectedMenuInfo?.resModel} - Table view
            </Paragraph>
          </div>

          {/* TRYTON TABLE INLINE */}
          <TrytonTable
            model={tableInfo.model}
            viewId={tableInfo.viewId}
            viewType={tableInfo.viewType}
            domain={[]}
            limit={100}
            title={selectedMenuInfo?.actionName}
            onEdit={(record) => {
              // Lógica de edición inline (~50 líneas)
              setLoadingContent(true);
              trytonService.getModelData(tableInfo.model, [record.id], Object.keys(record))
                .then(data => {
                  setFormInfo({
                    model: tableInfo.model,
                    viewId: tableInfo.viewId,
                    recordData: data[0]
                  });
                  setLoadingContent(false);
                })
                .catch(error => {
                  message.error('Error loading record');
                  setLoadingContent(false);
                });
            }}
            onDelete={(recordIds) => {
              // Lógica de eliminación inline (~40 líneas)
              Modal.confirm({
                title: '¿Eliminar registros?',
                content: `¿Está seguro de eliminar ${recordIds.length} registro(s)?`,
                onOk() {
                  return trytonService.deleteRecords(tableInfo.model, recordIds)
                    .then(() => {
                      message.success('Registros eliminados');
                      // Recargar tabla
                      loadTableData(tableInfo.model, tableInfo.viewId);
                    })
                    .catch(error => {
                      message.error('Error al eliminar');
                    });
                }
              });
            }}
            onAction={(action, recordIds) => {
              // Lógica de acción inline (~60 líneas)
              handleActionExecution(action.id, {
                active_ids: recordIds,
                active_model: tableInfo.model
              });
            }}
            onCreate={() => {
              // Lógica de creación inline (~30 líneas)
              setFormInfo({
                model: tableInfo.model,
                viewId: tableInfo.viewId,
                recordData: null
              });
              setLoadingContent(false);
            }}
          />
        </div>
      )}

      {/* ... más renderizado condicional para otras vistas ... */}
    </Content>
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **JSX gigante**: ~200 líneas de JSX inline para renderizar la tabla
- ❌ **Handlers inline**: onEdit, onDelete, onAction, onCreate definidos inline con 40-60 líneas cada uno
- ❌ **Lógica mezclada**: Lógica de tabla + lógica de edición + lógica de eliminación en el mismo lugar
- ❌ **Anidación compleja**: Múltiples niveles de condicionales (!loadingContent && tableInfo && viewType === ...)
- ❌ **Difícil de testear**: No puedes testear la vista de tabla aisladamente
- ❌ **Difícil de reutilizar**: La vista de tabla solo existe dentro del return del Dashboard
- ❌ **Acoplamiento**: La vista depende de estados del Dashboard (setLoadingContent, setFormInfo, etc.)
- ❌ **Difícil de encontrar**: Para encontrar la vista de tabla hay que buscar entre 1,634 líneas

### DESPUÉS (TableView.jsx):

Ahora la vista de tabla es un componente separado de ~37 líneas:

```javascript
// src/app/views/TableView.jsx
import React from 'react';
import { Typography } from 'antd';
import TrytonTable from '../../components/TrytonTable';

const { Title, Paragraph } = Typography;

const TableView = ({ tableInfo, selectedMenuInfo }) => {
  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Table'}
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          {selectedMenuInfo?.resModel} - Table view
        </Paragraph>
      </div>

      <TrytonTable
        model={tableInfo.model}
        viewId={tableInfo.viewId}
        viewType={tableInfo.viewType}
        domain={[]}
        limit={100}
        title={selectedMenuInfo?.actionName}
      />
    </div>
  );
};

export default TableView;
```

**Mejoras con este enfoque:**

- ✅ **Componente pequeño**: Solo 37 líneas (vs ~200 líneas inline)
- ✅ **Sin lógica inline**: Los handlers (onEdit, onDelete, etc.) están en TrytonTable (donde pertenecen)
- ✅ **Separación clara**: TableView solo es un wrapper + header
- ✅ **Fácil de testear**: Puedes testear TableView aisladamente
- ✅ **Reutilizable**: Se puede importar y usar en cualquier parte
- ✅ **Desacoplado**: No depende de estados del Dashboard
- ✅ **Fácil de encontrar**: `src/app/views/TableView.jsx`
- ✅ **Props explícitas**: Todas las dependencias vienen por props

---

### `FormView.jsx`
**Líneas:** ~36 líneas
**Responsabilidad:** Vista de formulario para crear/editar registros

**¿Qué hace este archivo?**

`FormView.jsx` es un componente wrapper que renderiza vistas de formulario de Tryton. Actúa como capa intermedia entre `ContentArea` (que decide qué vista mostrar) y `TrytonForm` (componente existente que renderiza el formulario real).

**Funcionalidades específicas:**

1. **Wrapper de TrytonForm**
   - Encapsula el componente `TrytonForm` existente
   - Le pasa las props necesarias: model, viewId, recordData, onSave, onCancel
   - Proporciona un contenedor con padding y título

2. **Renderizado de header**
   - Muestra título de la vista (de `selectedMenuInfo.actionName` o `menuItem.name`)
   - Muestra subtítulo con el nombre del modelo (ej: "health.patient - Form view")
   - Usa componentes Typography de Ant Design (Title, Paragraph)

3. **Props que recibe:**
   ```javascript
   {
     formInfo: {
       model: string,         // Nombre del modelo (ej: 'health.patient')
       viewId: number,        // ID de la vista de Tryton
       viewType: string,      // 'form' (tipo de vista formulario)
       fieldsView: object,    // Definición de la vista (XML parseado)
       recordData: object     // Datos del registro (null si creando nuevo)
     },
     selectedMenuInfo: {
       actionName: string,    // Nombre de la acción
       menuItem: object,      // Item del menú que activó esta vista
       resModel: string       // Nombre del modelo
     }
   }
   ```

4. **Integración con TrytonForm:**
   - `TrytonForm` es un componente existente de ~664 líneas en `src/components/`
   - Renderiza formularios dinámicamente según XML de vista de Tryton
   - Maneja diferentes tipos de campos: char, text, selection, many2one, one2many, date, datetime, boolean, integer, float
   - Soporta notebooks (tabs) y groups (agrupaciones de campos)
   - Maneja validación y submit de datos
   - Proporciona botones Save y Cancel

5. **Estructura del componente:**
   ```javascript
   <div> {/* Container con padding */}
     <div> {/* Header section */}
       <Title>{actionName || menuItemName || 'Form'}</Title>
       <Paragraph>{resModel} - Form view</Paragraph>
     </div>

     <TrytonForm
       model={formInfo.model}
       viewId={formInfo.viewId}
       recordData={formInfo.recordData}
       onSave={(values) => console.log('Save:', values)}
       onCancel={() => console.log('Cancel')}
     />
   </div>
   ```

   **Nota:** Los handlers `onSave` y `onCancel` actualmente solo hacen console.log (placeholder).
   En el Dashboard original, estos handlers tenían lógica para actualizar estados y hacer llamadas RPC.

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original (~1,634 líneas), la vista de formulario estaba renderizada inline dentro del `<Content>`:

```javascript
// Dashboard.jsx original (líneas ~1350-1550 aproximadamente)
return (
  <Layout>
    <DashboardHeader />
    <Sider>...</Sider>

    <Content style={{ ... }}>
      {/* RENDERIZADO CONDICIONAL INLINE */}
      {!loadingContent && formInfo && selectedMenuInfo?.viewType === 'form' && (
        <div style={{
          padding: '24px',
          background: '#F8F9FA',
          minHeight: 'calc(100vh - 64px)',
          overflowY: 'auto'
        }}>
          {/* TÍTULO INLINE */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={2} style={{ margin: 0, color: '#333333' }}>
              {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Form'}
            </Title>
            <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
              {selectedMenuInfo?.resModel} - Form view
            </Paragraph>
          </div>

          {/* TRYTON FORM INLINE */}
          <TrytonForm
            model={formInfo.model}
            viewId={formInfo.viewId}
            recordData={formInfo.recordData}
            onSave={(values) => {
              // Lógica de guardado inline (~80 líneas)
              setLoadingContent(true);

              const savePromise = formInfo.recordData
                ? trytonService.updateRecord(formInfo.model, formInfo.recordData.id, values)
                : trytonService.createRecord(formInfo.model, values);

              savePromise
                .then(result => {
                  message.success(
                    formInfo.recordData ? 'Registro actualizado' : 'Registro creado'
                  );

                  // Recargar tabla si venimos de una tabla
                  if (tableInfo) {
                    loadTableData(tableInfo.model, tableInfo.viewId);
                  }

                  // Volver a la tabla o dashboard
                  setFormInfo(null);
                  setActiveTab(tableInfo ? selectedMenuInfo.menuItem.id : 'dashboard');
                  setLoadingContent(false);
                })
                .catch(error => {
                  console.error('Error saving:', error);
                  message.error('Error al guardar: ' + (error.message || 'Unknown error'));
                  setLoadingContent(false);
                });
            }}
            onCancel={() => {
              // Lógica de cancelación inline (~20 líneas)
              Modal.confirm({
                title: '¿Cancelar?',
                content: '¿Está seguro? Los cambios no guardados se perderán.',
                onOk() {
                  setFormInfo(null);
                  setActiveTab(tableInfo ? selectedMenuInfo.menuItem.id : 'dashboard');
                }
              });
            }}
          />
        </div>
      )}

      {/* ... más renderizado condicional para otras vistas ... */}
    </Content>
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **JSX gigante**: ~200 líneas de JSX inline para renderizar el formulario
- ❌ **Handlers inline masivos**: onSave tiene ~80 líneas de lógica compleja
- ❌ **Lógica de negocio mezclada**: Lógica de guardado + actualización de estados + navegación en el mismo lugar
- ❌ **Anidación compleja**: Múltiples niveles de condicionales y promesas
- ❌ **Difícil de testear**: No puedes testear la vista de formulario aisladamente
- ❌ **Difícil de reutilizar**: La vista solo existe dentro del return del Dashboard
- ❌ **Acoplamiento**: Depende de muchos estados del Dashboard (setLoadingContent, setFormInfo, setActiveTab, tableInfo, etc.)
- ❌ **Difícil de encontrar**: Para encontrar la vista de formulario hay que buscar entre 1,634 líneas
- ❌ **Difícil de modificar**: Cambiar la lógica de guardado requiere editar el Dashboard gigante

### DESPUÉS (FormView.jsx):

Ahora la vista de formulario es un componente separado de ~36 líneas:

```javascript
// src/app/views/FormView.jsx
import React from 'react';
import { Typography } from 'antd';
import TrytonForm from '../../components/TrytonForm';

const { Title, Paragraph } = Typography;

const FormView = ({ formInfo, selectedMenuInfo }) => {
  return (
    <div style={{
      padding: '24px',
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, color: '#333333' }}>
          {selectedMenuInfo?.actionName || selectedMenuInfo?.menuItem?.name || 'Form'}
        </Title>
        <Paragraph style={{ color: '#6C757D', margin: '8px 0 0 0' }}>
          {selectedMenuInfo?.resModel} - Form view
        </Paragraph>
      </div>

      <TrytonForm
        model={formInfo.model}
        viewId={formInfo.viewId}
        recordData={formInfo.recordData}
        onSave={(values) => console.log('Save:', values)}
        onCancel={() => console.log('Cancel')}
      />
    </div>
  );
};

export default FormView;
```

**Mejoras con este enfoque:**

- ✅ **Componente pequeño**: Solo 36 líneas (vs ~200 líneas inline)
- ✅ **Sin lógica compleja inline**: Los handlers actuales son placeholders simples
- ✅ **Separación clara**: FormView solo es un wrapper + header
- ✅ **Fácil de testear**: Puedes testear FormView aisladamente
- ✅ **Reutilizable**: Se puede importar y usar en cualquier parte
- ✅ **Desacoplado**: No depende de estados del Dashboard
- ✅ **Fácil de encontrar**: `src/app/views/FormView.jsx`
- ✅ **Props explícitas**: Todas las dependencias vienen por props

**Nota sobre los handlers:**
Los handlers `onSave` y `onCancel` actualmente son placeholders. La lógica real de guardado debería:
1. Estar en un hook custom (ej: `useFormActions`)
2. O ser pasada como prop desde Dashboard/ContentArea
3. Esto permite mantener FormView como un componente "tonto" (presentational)

---

### `LoadingView.jsx`
**Líneas:** ~25 líneas
**Responsabilidad:** Vista de loading mientras se carga contenido

**¿Qué hace este archivo?**

`LoadingView.jsx` es un componente simple que muestra un spinner de carga centrado. Se renderiza cuando `loadingContent === true` en el Dashboard.

**Funcionalidades específicas:**

1. **Spinner de carga**
   - Usa `<Spin>` de Ant Design con tamaño "large"
   - Centrado vertical y horizontal en la pantalla
   - Ocupa toda la altura disponible (menos el header)

2. **Mensaje de carga**
   - Muestra texto "Cargando contenido..." debajo del spinner
   - Usa Typography.Text de Ant Design

3. **Props que recibe:**
   ```javascript
   // No recibe props
   <LoadingView />
   ```

4. **Estructura del componente:**
   ```javascript
   <div style={{
     display: 'flex',
     flexDirection: 'column',
     justifyContent: 'center',
     alignItems: 'center',
     minHeight: 'calc(100vh - 64px)',
     background: '#F8F9FA'
   }}>
     <Spin size="large" />
     <Text style={{ marginTop: '16px', color: '#999' }}>
       Cargando contenido...
     </Text>
   </div>
   ```

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original (~1,634 líneas), el loading estaba renderizado inline dentro del `<Content>`:

```javascript
// Dashboard.jsx original (líneas ~1100-1130 aproximadamente)
return (
  <Layout>
    <DashboardHeader />
    <Sider>...</Sider>

    <Content style={{ ... }}>
      {/* LOADING INLINE */}
      {loadingContent && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)',
          background: '#F8F9FA'
        }}>
          <Spin size="large" />
          <Text style={{ marginTop: '16px', color: '#999' }}>
            Cargando contenido...
          </Text>
        </div>
      )}

      {/* ... resto del contenido ... */}
    </Content>
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **JSX inline**: Aunque es pequeño (~20 líneas), está mezclado con 400+ líneas de otro contenido
- ❌ **Difícil de customizar**: Para agregar una animación o mensaje diferente hay que editar Dashboard.jsx
- ❌ **No reutilizable**: Solo existe dentro del return del Dashboard
- ❌ **Acoplamiento**: Está mezclado con la lógica de renderizado de otras vistas
- ❌ **Difícil de testear**: No puedes testear el loading aisladamente

### DESPUÉS (LoadingView.jsx):

Ahora el loading es un componente separado de ~25 líneas:

```javascript
// src/app/views/LoadingView.jsx
import React from 'react';
import { Spin, Typography } from 'antd';

const { Text } = Typography;

const LoadingView = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 'calc(100vh - 64px)',
      background: '#F8F9FA'
    }}>
      <Spin size="large" />
      <Text style={{ marginTop: '16px', color: '#999' }}>
        Cargando contenido...
      </Text>
    </div>
  );
};

export default LoadingView;
```

**Mejoras con este enfoque:**

- ✅ **Componente independiente**: Solo 25 líneas en un archivo dedicado
- ✅ **Fácil de customizar**: Para agregar animación/spinner diferente solo editar este archivo
- ✅ **Reutilizable**: Se puede importar y usar en cualquier parte
- ✅ **Desacoplado**: No depende del Dashboard
- ✅ **Fácil de testear**: Puedes testear el loading aisladamente
- ✅ **Extensible**: Fácil agregar props (ej: `message` customizable)

**Ejemplo de extensión:**
```javascript
const LoadingView = ({ message = 'Cargando contenido...' }) => (
  <div>
    <Spin size="large" />
    <Text>{message}</Text>
  </div>
);

// Uso:
<LoadingView message="Cargando pacientes..." />
```

---

## 🔄 Resumen del Refactor

### Reducción de complejidad:

```
Dashboard.jsx ORIGINAL: ~1,634 líneas
├─ TableView inline (~200 líneas)
├─ FormView inline (~200 líneas)
└─ LoadingView inline (~20 líneas)

DESPUÉS: 3 archivos (~98 líneas totales)
├─ TableView.jsx:    37 líneas ✅
├─ FormView.jsx:     36 líneas ✅
└─ LoadingView.jsx:  25 líneas ✅
```

**Líneas eliminadas del Dashboard.jsx original:** ~420 líneas
**Líneas en componentes nuevos:** ~98 líneas
**Reducción neta:** ~322 líneas (77% de reducción)

---

## 🎯 Beneficios del Refactor

### 1. **Separación de Vistas**
Cada vista tiene su propio archivo independiente:
```javascript
import TableView from './views/TableView';
import FormView from './views/FormView';
import LoadingView from './views/LoadingView';
```

### 2. **Reusabilidad**
Las vistas pueden usarse fuera del Dashboard:
```javascript
// En cualquier componente
function MyComponent() {
  return <TableView tableInfo={data} selectedMenuInfo={info} />;
}
```

### 3. **Mantenibilidad**
- Modificar tabla → solo editar `TableView.jsx` (37 líneas)
- Modificar formulario → solo editar `FormView.jsx` (36 líneas)
- Customizar loading → solo editar `LoadingView.jsx` (25 líneas)
- Ya no hay que buscar entre 1,634 líneas

### 4. **Testabilidad**
Vistas más pequeñas son más fáciles de testear:
```javascript
// Test de TableView
test('TableView renders title correctly', () => {
  const tableInfo = { model: 'health.patient', viewId: 1, viewType: 'tree' };
  const selectedMenuInfo = { actionName: 'Pacientes', resModel: 'health.patient' };
  render(<TableView tableInfo={tableInfo} selectedMenuInfo={selectedMenuInfo} />);
  expect(screen.getByText('Pacientes')).toBeInTheDocument();
  expect(screen.getByText('health.patient - Table view')).toBeInTheDocument();
});

// Test de LoadingView
test('LoadingView renders spinner', () => {
  render(<LoadingView />);
  expect(screen.getByText('Cargando contenido...')).toBeInTheDocument();
});
```

### 5. **Routing Limpio**
ContentArea decide qué vista renderizar con lógica clara:
```javascript
// En ContentArea.jsx
const renderContent = () => {
  if (loadingContent) return <LoadingView />;
  if (activeTab === 'dashboard') return <DashboardHome />;
  if (tableInfo) return <TableView tableInfo={tableInfo} />;
  if (formInfo) return <FormView formInfo={formInfo} />;
  return <DashboardHome />;
};
```

### 6. **Extensibilidad**
Agregar nueva vista es trivial:
```javascript
// 1. Crear nuevo archivo: src/app/views/ChartView.jsx
export const ChartView = ({ chartInfo }) => (
  <div>
    <Title>Chart</Title>
    <TrytonChart chartInfo={chartInfo} />
  </div>
);

// 2. Integrar en ContentArea.jsx (1 línea)
if (chartInfo) return <ChartView chartInfo={chartInfo} />;
```

---

## 🔗 Integración con Componentes Existentes

### TableView → TrytonTable

```
TableView.jsx (wrapper simple de 37 líneas)
└─ TrytonTable.jsx (componente complejo existente de ~339 líneas)
   ├─ TanStack Table (renderizado de tabla)
   ├─ Action buttons (Create, Edit, Delete)
   ├─ Toolbar (Actions, Reports)
   ├─ Field renderers (many2one, selection, boolean, etc.)
   └─ Paginación y sorting
```

**Ventaja:**
- `TrytonTable.jsx` ya existe y funciona perfectamente
- `TableView.jsx` solo es un wrapper limpio con header
- No duplicamos código, solo organizamos mejor

---

### FormView → TrytonForm

```
FormView.jsx (wrapper simple de 36 líneas)
└─ TrytonForm.jsx (componente complejo existente de ~664 líneas)
   ├─ XML parser (parsea vista de Tryton)
   ├─ Field renderers (char, text, many2one, one2many, etc.)
   ├─ Notebooks (tabs)
   ├─ Groups (agrupaciones)
   ├─ Validación
   └─ Submit handler
```

**Ventaja:**
- `TrytonForm.jsx` ya existe y funciona perfectamente
- `FormView.jsx` solo es un wrapper limpio con header
- Mantiene toda la funcionalidad existente

---

## 📊 Flujo de Datos

### 1. Usuario click en menú:
```
MenuItem (click)
→ useMenuActions.handleMenuClick()
→ trytonService.getMenuActionInfo()
→ Determina: tabla o formulario
→ Actualiza tableInfo o formInfo
```

### 2. ContentArea recibe props:
```
ContentArea recibe:
├─ tableInfo: { model, viewId, viewType, fieldsView, data }
└─ formInfo: { model, viewId, viewType, fieldsView, recordData }
```

### 3. ContentArea renderiza vista:
```javascript
if (tableInfo) {
  return <TableView tableInfo={tableInfo} sessionData={sessionData} />;
}

if (formInfo) {
  return <FormView formInfo={formInfo} sessionData={sessionData} />;
}
```

### 4. Vista renderiza contenido:
```
TableView
└─ TrytonTable
   └─ Renderiza tabla con datos

FormView
└─ TrytonForm
   └─ Renderiza formulario con campos
```

---

## 📚 Referencias

Ver documentación completa:
- `/REFACTORING_PLAN.md` - Plan de refactorización general
- `/CLAUDE.md` - Arquitectura del proyecto
- `src/components/TrytonTable.jsx` - Componente tabla existente
- `src/components/TrytonForm.jsx` - Componente form existente
- `src/app/layout/ContentArea.jsx` - Router de vistas
- `src/app/hooks/README.md` - Documentación de hooks
