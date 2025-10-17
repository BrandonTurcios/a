# 📂 src/app/layout/

Componentes de layout y estructura visual del Dashboard.

---

## 📄 Archivos

### `Sidebar.jsx`
**Líneas:** ~103 líneas
**Responsabilidad:** Barra lateral (menú de navegación)

**¿Qué hace este archivo?**

`Sidebar.jsx` es un componente React que renderiza la barra lateral del Dashboard. Su función principal es contener y gestionar la visualización del menú de navegación jerárquico que proviene del backend de Tryton.

**Funcionalidades específicas:**

1. **Renderizado de estructura lateral fija**
   - Utiliza `<Sider>` de Ant Design como contenedor principal
   - Soporta modo colapsado (abierto/cerrado) controlado por prop `open`
   - Ancho configurable: 320px (abierto) / 80px (cerrado)

2. **Manejo de estados de carga**
   - **Estado loading**: Muestra un spinner centrado con mensaje "Cargando menú..."
   - **Estado error**: Muestra Alert de Ant Design con mensaje de error y botón "Reintentar"
   - **Estado success**: Renderiza el componente MenuTree con los items del menú

3. **Scrollbar personalizado**
   - Usa `useEffect` para inyectar estilos CSS dinámicos al `<head>` del documento
   - Aplica estilos a la clase `.sidebar-scroll` para customizar el scrollbar
   - También aplica hover effects a `.menu-item-button`

4. **Props que recibe:**
   ```javascript
   {
     open: boolean,               // Sidebar abierto/cerrado
     menuItems: array,            // Items del menú (de Tryton backend)
     loading: boolean,            // Estado de carga
     error: string|null,          // Mensaje de error (si existe)
     expandedMenus: Set,          // Set con IDs de menús expandidos
     activeTab: string,           // ID del tab/menú activo
     onMenuClick: function,       // Handler cuando se hace click en un item
     onRetry: function            // Handler para reintentar carga si hubo error
   }
   ```

5. **Integración con MenuTree**
   - Si no hay loading ni error, renderiza `<MenuTree />` pasándole:
     - `items={menuItems}` - Los items del menú
     - `activeTab={activeTab}` - Para resaltar el item activo
     - `expandedMenus={expandedMenus}` - Para saber qué items expandir
     - `onMenuClick={onMenuClick}` - Para manejar clicks
     - `sidebarOpen={open}` - Para adaptar el renderizado según el estado

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original (~1,634 líneas), el sidebar estaba renderizado inline dentro del return principal del componente:

```javascript
// Dashboard.jsx original (líneas ~900-1100 aproximadamente)
return (
  <Layout style={{ minHeight: '100vh' }}>
    <DashboardHeader ... />

    {/* SIDEBAR INLINE */}
    <Sider
      trigger={null}
      collapsible
      collapsed={!sidebarOpen}
      width={320}
      collapsedWidth={80}
      breakpoint="lg"
      onBreakpoint={(broken) => { ... }}
      style={{
        background: '#00A88E',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        height: '100vh',
        left: 0,
        top: 0,
        zIndex: 100,
        overflow: 'hidden'
      }}
    >
      <div className="sidebar-scroll" style={{ ... }}>
        {loadingMenu ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="large" />
            <p style={{ ... }}>Cargando menú...</p>
          </div>
        ) : menuError ? (
          <div style={{ padding: '16px' }}>
            <Alert
              message="Error"
              description={menuError}
              type="error"
              showIcon
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={loadSidebarMenu}>
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* RENDERIZADO DE MENÚ INLINE */}
            <div style={{ padding: '16px 0' }}>
              {menuItems.map((item) => renderMenuItem(item, 0))}
            </div>
          </>
        )}
      </div>
    </Sider>

    {/* Resto del Dashboard... */}
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **Acoplamiento**: El sidebar está acoplado al Dashboard.jsx principal (difícil de reutilizar)
- ❌ **JSX gigante**: El return del Dashboard tiene cientos de líneas mezclando sidebar + header + content
- ❌ **Estados mezclados**: `loadingMenu`, `menuError`, `menuItems` mezclados con otros 20+ estados
- ❌ **Difícil de testear**: No puedes testear el sidebar sin renderizar todo el Dashboard
- ❌ **Navegación complicada**: Para encontrar el código del sidebar hay que buscar entre 1,634 líneas
- ❌ **Estilos inline**: Los estilos del scrollbar estaban inline o en otro archivo CSS
- ❌ **useEffect disperso**: Los efectos para el scrollbar estaban en otro lado del archivo

### DESPUÉS (Sidebar.jsx):

Ahora el sidebar es un componente completamente independiente de ~103 líneas:

```javascript
// src/app/layout/Sidebar.jsx
import React, { useEffect } from 'react';
import { Layout, Spin, Alert, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import MenuTree from './MenuTree';

const { Sider } = Layout;

const Sidebar = ({ open, menuItems, loading, error, expandedMenus, activeTab, onMenuClick, onRetry }) => {
  // Inyecta estilos CSS personalizados en el head
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .sidebar-scroll::-webkit-scrollbar-track {
        background: transparent;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.3);
        border-radius: 3px;
      }
      .sidebar-scroll::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.5);
      }
      .menu-item-button:hover:not([disabled]) {
        background: rgba(255,255,255,0.1) !important;
      }
      .menu-item-button.ant-btn-primary:hover {
        background: #007BFF !important;
      }
      .menu-item-button[style*="background: rgb(0, 123, 255)"]:hover {
        background: #007BFF !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Sider
      trigger={null}
      collapsible
      collapsed={!open}
      width={320}
      collapsedWidth={80}
      breakpoint="lg"
      onBreakpoint={() => {}}
      style={{ /* estilos */ }}
    >
      <div className="sidebar-scroll" style={{ /* estilos */ }}>
        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <Spin size="large" />
            <p style={{ marginTop: '16px', color: 'rgba(255,255,255,0.7)' }}>
              Cargando menú...
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '16px' }}>
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={onRetry}>
                  Reintentar
                </Button>
              }
            />
          </div>
        ) : (
          <MenuTree
            items={menuItems}
            activeTab={activeTab}
            expandedMenus={expandedMenus}
            onMenuClick={onMenuClick}
            sidebarOpen={open}
          />
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;
```

**Mejoras con este enfoque:**

- ✅ **Componente independiente**: Puede reutilizarse en otros dashboards o aplicaciones
- ✅ **Props claras**: Solo recibe lo que necesita (8 props bien definidas)
- ✅ **Responsabilidad única**: Solo se encarga del sidebar, nada más
- ✅ **Fácil de testear**: Puedes testear el sidebar aisladamente
- ✅ **Fácil de encontrar**: Solo 103 líneas en un archivo dedicado
- ✅ **useEffect local**: Los estilos del scrollbar se inyectan en el mismo componente
- ✅ **Lógica clara**: if-else simple para loading/error/success
- ✅ **Integración limpia**: Usa MenuTree como subcomponente (separación de responsabilidades)

---

### `MenuTree.jsx`
**Líneas:** ~44 líneas
**Responsabilidad:** Renderizado recursivo de estructura de menú

**¿Qué hace este archivo?**

`MenuTree.jsx` es un componente recursivo que renderiza la estructura jerárquica del menú de Tryton. Su característica principal es que se llama a sí mismo para renderizar menús anidados (menús con hijos).

**Funcionalidades específicas:**

1. **Renderizado recursivo**
   - Recibe un array de `items` (items del menú)
   - Por cada item, renderiza un `<MenuItem />` individual
   - Si el item tiene hijos (`item.childs`) Y está expandido (`expandedMenus.has(item.id)`), se llama a sí mismo recursivamente con `level + 1`

2. **Control de profundidad**
   - Usa la prop `level` (default: 0) para saber en qué nivel de profundidad estamos
   - Nivel 0: Items raíz del menú
   - Nivel 1: Items hijos directos
   - Nivel 2+: Items nietos, bisnietos, etc.
   - El nivel se usa para aplicar indentación visual en MenuItem

3. **Manejo de expansión**
   - Recibe `expandedMenus` (un Set con IDs de items expandidos)
   - Solo renderiza hijos si `isExpanded === true`
   - Esto permite colapsar/expandir secciones del menú

4. **Props que recibe:**
   ```javascript
   {
     items: array,                // Array de items de menú de Tryton
     activeTab: string,           // ID del tab/menú activo
     expandedMenus: Set,          // Set de IDs expandidos
     onMenuClick: function,       // Handler de click
     level: number,               // Nivel de profundidad (default: 0)
     sidebarOpen: boolean        // Estado del sidebar (para renderizado condicional)
   }
   ```

5. **Lógica de renderizado:**
   ```javascript
   items.map((item) => {
     const hasChildren = item.childs && item.childs.length > 0;
     const isExpanded = expandedMenus.has(item.id);
     const isActive = activeTab === item.id;

     return (
       <div key={item.id}>
         <MenuItem ... />

         {/* RECURSIÓN: MenuTree se llama a sí mismo */}
         {hasChildren && isExpanded && (
           <MenuTree
             items={item.childs}
             level={level + 1}
             {...otherProps}
           />
         )}
       </div>
     );
   });
   ```

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original, la lógica recursiva estaba mezclada en una función helper `renderMenuItem()`:

```javascript
// Dashboard.jsx original (líneas ~600-750 aproximadamente)

// Función helper para renderizar items de menú (recursiva)
const renderMenuItem = (item, level = 0) => {
  const hasChildren = item.childs && item.chi.length > 0;
  const isExpanded = expandedMenus.has(item.id);
  const isActive = activeTab === item.id;
  const isChild = level > 0;

  return (
    <div key={item.id} style={{ marginBottom: '2px' }}>
      {/* RENDERIZADO INLINE DEL ITEM */}
      <div style={{
        marginLeft: isChild && sidebarOpen ? `${level * 20}px` : '0',
        position: 'relative',
        padding: '0 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          {/* Flecha indicadora para elementos hijo */}
          {isChild && sidebarOpen && (
            <div style={{ marginRight: '8px', color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
              →
            </div>
          )}

          {/* Botón del menú con JSX complejo inline */}
          <Button
            type="text"
            onClick={() => handleMenuClick(item)}
            className="menu-item-button"
            style={{ /* 30+ líneas de estilos inline */ }}
            title={sidebarOpen ? (item.description || item.name) : item.name}
          >
            {sidebarOpen ? (
              <Space style={{ width: '100%', minWidth: 0 }}>
                {getIconComponent(item)}
                <div style={{ /* más estilos */ }}>
                  <Text style={{ /* estilos */ }}>
                    {item.name}
                  </Text>
                  {item.type === 'module' && item.model && (
                    <Text style={{ /* estilos */ }}>
                      {item.model}
                    </Text>
                  )}
                </div>
              </Space>
            ) : (
              getIconComponent(item)
            )}
          </Button>

          {/* Indicador de expansión */}
          {hasChildren && sidebarOpen && (
            <div style={{ /* estilos */ }}>
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </div>
          )}
        </div>
      </div>

      {/* RECURSIÓN INLINE: renderMenuItem se llama a sí mismo */}
      {hasChildren && isExpanded && (
        <div>
          {item.childs.map((child) => renderMenuItem(child, level + 1))}
        </div>
      )}
    </div>
  );
};

// Uso en el JSX principal del Dashboard:
return (
  <Layout>
    <Sider>
      <div style={{ padding: '16px 0' }}>
        {menuItems.map((item) => renderMenuItem(item, 0))}
      </div>
    </Sider>
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **Función gigante**: `renderMenuItem` tiene ~150 líneas de JSX complejo
- ❌ **Mezclado**: Lógica de árbol (recursión) + lógica de item (renderizado) en la misma función
- ❌ **Difícil de seguir**: map() → renderMenuItem() → más map() → más renderMenuItem()
- ❌ **No reutilizable**: Función helper dentro del componente Dashboard
- ❌ **Coupling**: Depende de estados del Dashboard (handleMenuClick, expandedMenus, etc.)
- ❌ **Difícil de testear**: No puedes testear la lógica de árbol sin el Dashboard completo
- ❌ **Responsabilidades mezcladas**: Árbol + Item + Iconos + Estilos + Expansión todo en una función

### DESPUÉS (MenuTree.jsx):

Ahora el árbol es un componente separado de ~44 líneas:

```javascript
// src/app/layout/MenuTree.jsx
import React from 'react';
import MenuItem from './MenuItem';

const MenuTree = ({ items, activeTab, expandedMenus, onMenuClick, level = 0, sidebarOpen }) => {
  // Guard clause: si no hay items, no renderizar nada
  if (!items || items.length === 0) return null;

  return (
    <div style={{ padding: level === 0 ? '16px 0' : '0' }}>
      {items.map((item) => {
        const hasChildren = item.childs && item.childs.length > 0;
        const isExpanded = expandedMenus.has(item.id);
        const isActive = activeTab === item.id;

        return (
          <div key={item.id} style={{ marginBottom: '2px' }}>
            {/* Renderiza el item individual (delegado a MenuItem) */}
            <MenuItem
              item={item}
              isActive={isActive}
              isExpanded={isExpanded}
              hasChildren={hasChildren}
              level={level}
              onClick={onMenuClick}
              sidebarOpen={sidebarOpen}
            />

            {/* RECURSIÓN: MenuTree se llama a sí mismo para hijos */}
            {hasChildren && isExpanded && (
              <MenuTree
                items={item.childs}
                activeTab={activeTab}
                expandedMenus={expandedMenus}
                onMenuClick={onMenuClick}
                level={level + 1}
                sidebarOpen={sidebarOpen}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default MenuTree;
```

**Mejoras con este enfoque:**

- ✅ **Componente pequeño**: Solo 44 líneas (vs ~150 líneas de la función original)
- ✅ **Separación clara**: MenuTree maneja el árbol, MenuItem maneja el item individual
- ✅ **Recursión limpia**: Se llama a sí mismo de forma explícita y clara
- ✅ **Fácil de entender**: La lógica es: "Por cada item → renderiza MenuItem + (si tiene hijos Y está expandido → renderiza MenuTree recursivamente)"
- ✅ **Reutilizable**: Puede usarse en cualquier lugar que necesite renderizar un árbol de items
- ✅ **Testeable**: Puedes testear la recursión aisladamente
- ✅ **Props explícitas**: Todas las dependencias vienen por props (no hay estados ocultos)

---

### `MenuItem.jsx`
**Líneas:** ~113 líneas
**Responsabilidad:** Item individual del menú

**¿Qué hace este archivo?**

`MenuItem.jsx` es un componente que renderiza UN solo item del menú. Es el componente "hoja" en la estructura de árbol MenuTree → MenuItem.

**Funcionalidades específicas:**

1. **Renderizado de un item del menú**
   - Muestra icono (usando `getIconComponent` de iconMapper)
   - Muestra nombre del item
   - Opcionalmente muestra el modelo (si `item.type === 'module'`)
   - Aplica estilos según estado (activo, hover, nivel de profundidad)

2. **Indicador visual para items hijo**
   - Si `level > 0` (es un hijo), muestra flecha "→" a la izquierda
   - Solo se muestra si el sidebar está abierto

3. **Indicador de expansión**
   - Si el item tiene hijos (`hasChildren === true`), muestra flecha a la derecha:
     - `<DownOutlined />` si está expandido
     - `<RightOutlined />` si está colapsado
   - Solo se muestra si el sidebar está abierto

4. **Indentación dinámica**
   - Aplica `marginLeft: ${level * 20}px` para indentar items hijos
   - Solo aplica si el sidebar está abierto

5. **Modo collapsed/expanded**
   - Si `sidebarOpen === true`: Muestra icono + texto + flechas
   - Si `sidebarOpen === false`: Solo muestra icono centrado

6. **Props que recibe:**
   ```javascript
   {
     item: object,              // Item del menú (id, name, icon, childs, model, type, etc.)
     isActive: boolean,         // Si este item es el tab activo
     isExpanded: boolean,       // Si este item está expandido (relevante solo si tiene hijos)
     hasChildren: boolean,      // Si este item tiene hijos
     level: number,             // Nivel de profundidad (0 = raíz, 1+ = hijo)
     onClick: function,         // Handler cuando se hace click
     sidebarOpen: boolean      // Estado del sidebar
   }
   ```

7. **Estructura del renderizado:**
   ```javascript
   <div> {/* Container con marginLeft si es hijo */}
     <div> {/* Flex container */}
       {/* Flecha → si es hijo */}
       {isChild && sidebarOpen && <div>→</div>}

       {/* Botón principal */}
       <Button onClick={() => onClick(item)}>
         {sidebarOpen ? (
           <>
             {/* Icono + Texto + Modelo */}
             <Space>
               {getIconComponent(item)}
               <Text>{item.name}</Text>
               {item.model && <Text>{item.model}</Text>}
             </Space>
           </>
         ) : (
           {/* Solo icono */}
           getIconComponent(item)
         )}
       </Button>

       {/* Flecha ↓ o → si tiene hijos */}
       {hasChildren && sidebarOpen && (
         isExpanded ? <DownOutlined /> : <RightOutlined />
       )}
     </div>
   </div>
   ```

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original, el item del menú estaba renderizado inline dentro de la función `renderMenuItem()`:

```javascript
// Dashboard.jsx original (dentro de renderMenuItem, líneas ~620-720)
const renderMenuItem = (item, level = 0) => {
  const hasChildren = item.childs && item.childs.length > 0;
  const isExpanded = expandedMenus.has(item.id);
  const isActive = activeTab === item.id;
  const isChild = level > 0;

  return (
    <div key={item.id} style={{ marginBottom: '2px' }}>
      {/* TODO EL CÓDIGO DEL ITEM ESTÁ INLINE AQUÍ */}
      <div style={{
        marginLeft: isChild && sidebarOpen ? `${level * 20}px` : '0',
        position: 'relative',
        padding: '0 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          {/* Flecha → para hijos */}
          {isChild && sidebarOpen && (
            <div style={{
              marginRight: '8px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px'
            }}>
              →
            </div>
          )}

          {/* Botón del menú */}
          <Button
            type="text"
            onClick={() => handleMenuClick(item)}
            className="menu-item-button"
            style={{
              flex: 1,
              height: 'auto',
              padding: sidebarOpen ? '12px 16px' : '12px 8px',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarOpen ? 'flex-start' : 'center',
              background: isActive ? '#007BFF' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              minHeight: '40px',
              position: 'relative',
              maxWidth: '100%',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            title={sidebarOpen ? (item.description || item.name) : item.name}
          >
            {sidebarOpen ? (
              <Space style={{ width: '100%', minWidth: 0 }}>
                {getIconComponent(item)}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  minWidth: 0,
                  flex: 1
                }}>
                  <Text
                    style={{
                      fontSize: '14px',
                      fontWeight: isChild ? '400' : '500',
                      color: 'white',
                      wordBreak: 'break-word',
                      lineHeight: '1.3'
                    }}
                    ellipsis={{ tooltip: true }}
                  >
                    {item.name}
                  </Text>
                  {item.type === 'module' && item.model && (
                    <Text
                      style={{
                        fontSize: '12px',
                        opacity: 0.7,
                        color: 'rgba(255,255,255,0.7)',
                        wordBreak: 'break-word',
                        lineHeight: '1.2'
                      }}
                      ellipsis={{ tooltip: true }}
                    >
                      {item.model}
                    </Text>
                  )}
                </div>
              </Space>
            ) : (
              getIconComponent(item)
            )}
          </Button>

          {/* Indicador de expansión */}
          {hasChildren && sidebarOpen && (
            <div style={{
              marginLeft: '4px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px'
            }}>
              {isExpanded ? <DownOutlined /> : <RightOutlined />}
            </div>
          )}
        </div>
      </div>

      {/* Recursión para hijos */}
      {hasChildren && isExpanded && (
        <div>
          {item.childs.map((child) => renderMenuItem(child, level + 1))}
        </div>
      )}
    </div>
  );
};
```

**Problemas con este enfoque:**

- ❌ **Código inline gigante**: ~100 líneas de JSX para un solo item
- ❌ **Mezclado con recursión**: Lógica de item + lógica de árbol en la misma función
- ❌ **Estilos inline complejos**: Objetos de estilo con muchas propiedades calculadas dinámicamente
- ❌ **Difícil de leer**: Muchos niveles de anidación (div → div → Button → Space → div → Text)
- ❌ **No reutilizable**: Solo existe dentro de renderMenuItem
- ❌ **Difícil de testear**: No puedes testear un item aisladamente
- ❌ **Hover state complejo**: Manejado con clases CSS + estilos inline mezclados

### DESPUÉS (MenuItem.jsx):

Ahora el item es un componente separado de ~113 líneas:

```javascript
// src/app/layout/MenuItem.jsx
import React from 'react';
import { Button, Space, Typography } from 'antd';
import { RightOutlined, DownOutlined } from '@ant-design/icons';
import { getIconComponent } from '../utils/iconMapper.jsx'

const { Text } = Typography;

const MenuItem = ({ item, isActive, isExpanded, hasChildren, level = 0, onClick, sidebarOpen }) => {
  const isChild = level > 0;

  return (
    <div style={{
      marginLeft: isChild && sidebarOpen ? `${level * 20}px` : '0',
      position: 'relative',
      padding: '0 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
        {/* Flecha indicadora para elementos hijo */}
        {isChild && sidebarOpen && (
          <div style={{
            marginRight: '8px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px'
          }}>
            →
          </div>
        )}

        {/* Botón principal del menú */}
        <Button
          type="text"
          onClick={() => onClick(item)}
          className="menu-item-button"
          style={{
            flex: 1,
            height: 'auto',
            padding: sidebarOpen ? '12px 16px' : '12px 8px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarOpen ? 'flex-start' : 'center',
            background: isActive ? '#007BFF' : 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            minHeight: '40px',
            position: 'relative',
            maxWidth: '100%',
            overflow: 'hidden',
            transition: 'all 0.3s ease'
          }}
          title={sidebarOpen ? (item.description || item.name) : item.name}
        >
          {sidebarOpen ? (
            <Space style={{ width: '100%', minWidth: 0 }}>
              {getIconComponent(item)}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                minWidth: 0,
                flex: 1
              }}>
                <Text
                  style={{
                    fontSize: '14px',
                    fontWeight: isChild ? '400' : '500',
                    color: 'white',
                    wordBreak: 'break-word',
                    lineHeight: '1.3'
                  }}
                  ellipsis={{ tooltip: true }}
                >
                  {item.name}
                </Text>
                {item.type === 'module' && item.model && (
                  <Text
                    style={{
                      fontSize: '12px',
                      opacity: 0.7,
                      color: 'rgba(255,255,255,0.7)',
                      wordBreak: 'break-word',
                      lineHeight: '1.2'
                    }}
                    ellipsis={{ tooltip: true }}
                  >
                    {item.model}
                  </Text>
                )}
              </div>
            </Space>
          ) : (
            getIconComponent(item)
          )}
        </Button>

        {/* Indicador de expansión/contracción (solo si sidebar está abierto) */}
        {hasChildren && sidebarOpen && (
          <div style={{
            marginLeft: '4px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '12px'
          }}>
            {isExpanded ? <DownOutlined /> : <RightOutlined />}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItem;
```

**Mejoras con este enfoque:**

- ✅ **Componente independiente**: Puede usarse fuera de MenuTree si es necesario
- ✅ **Props explícitas**: Todas las dependencias vienen por props (isActive, isExpanded, hasChildren, etc.)
- ✅ **Responsabilidad única**: Solo renderiza un item, no maneja recursión
- ✅ **Fácil de testear**: Puedes testear diferentes estados (activo, expandido, hijo, etc.)
- ✅ **Lógica clara**: Renderizado condicional simple basado en props
- ✅ **Iconos separados**: Usa iconMapper.jsx (separación de responsabilidades)
- ✅ **Reutilizable**: Puede usarse en otros contextos que necesiten items de menú similares

---

### `ContentArea.jsx`
**Líneas:** ~51 líneas
**Responsabilidad:** Área de contenido principal (router de vistas)

**¿Qué hace este archivo?**

`ContentArea.jsx` es un componente que actúa como "router" del contenido principal del Dashboard. Su función es decidir QUÉ vista renderizar según el estado actual de la aplicación.

**Funcionalidades específicas:**

1. **Router de vistas**
   - Decide qué vista mostrar según los props recibidos
   - Funciona como un switch/case que evalúa múltiples condiciones en orden

2. **Prioridad de renderizado** (de mayor a menor):

   **1. Loading** → Si `loadingContent === true`, muestra `<LoadingView />`

   **2. Dashboard Home** → Si `activeTab === 'dashboard'`, muestra `<DashboardHome />`

   **3. Table View** → Si existe `tableInfo` Y `selectedMenuInfo.viewType === 'tree'`, muestra `<TableView />`

   **4. Form View** → Si existe `formInfo` Y `selectedMenuInfo.viewType === 'form'`, muestra `<FormView />`

   **5. Fallback** → Si nada coincide, muestra `<DashboardHome />` por defecto

3. **Props que recibe:**
   ```javascript
   {
     activeTab: string,           // ID del tab/menú activo ('dashboard' o ID de menú)
     selectedMenuInfo: object,    // Info del menú seleccionado (incluye viewType)
     tableInfo: object,           // Datos para renderizar tabla (null si no aplica)
     formInfo: object,            // Datos para renderizar formulario (null si no aplica)
     loadingContent: boolean,     // Si está cargando contenido del menú
     sessionData: object         // Datos de sesión (username, userId, etc.)
   }
   ```

4. **Función `renderContent()`**:
   ```javascript
   const renderContent = () => {
     // 1. Loading
     if (loadingContent) {
       return <LoadingView />;
     }

     // 2. Dashboard home
     if (activeTab === 'dashboard') {
       return <DashboardHome sessionData={sessionData} />;
     }

     // 3. Table view
     if (tableInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'tree') {
       return <TableView tableInfo={tableInfo} selectedMenuInfo={selectedMenuInfo} />;
     }

     // 4. Form view
     if (formInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'form') {
       return <FormView formInfo={formInfo} selectedMenuInfo={selectedMenuInfo} />;
     }

     // 5. Empty state / fallback
     return <DashboardHome sessionData={sessionData} />;
   };
   ```

5. **Integración con vistas**:
   - **LoadingView** - Vista de carga (spinner centrado)
   - **DashboardHome** - Vista principal con tarjetas de información
   - **TableView** - Vista de tabla para listas de registros (usa TrytonTable)
   - **FormView** - Vista de formulario para crear/editar registros (usa TrytonForm)

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original, el contenido principal estaba renderizado inline dentro del `<Content>` de Ant Design:

```javascript
// Dashboard.jsx original (líneas ~1100-1500 aproximadamente)
return (
  <Layout style={{ minHeight: '100vh' }}>
    <DashboardHeader ... />
    <Sider>...</Sider>

    {/* CONTENT AREA INLINE */}
    <Content style={{
      marginLeft: sidebarOpen ? 320 : 80,
      marginTop: 64,
      padding: 0,
      background: '#F8F9FA',
      minHeight: 'calc(100vh - 64px)',
      transition: 'margin-left 0.2s'
    }}>
      {/* RENDERIZADO CONDICIONAL GIGANTE */}

      {/* 1. Loading */}
      {loadingContent && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 'calc(100vh - 64px)'
        }}>
          <Spin size="large" tip="Cargando..." />
        </div>
      )}

      {/* 2. Dashboard home */}
      {!loadingContent && activeTab === 'dashboard' && (
        <div style={{ padding: '24px' }}>
          <Title level={2}>Bienvenido {sessionData?.username}</Title>
          {/* Tarjetas de información inline */}
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card>
                <Statistic title="Usuario" value={sessionData?.username} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="ID de Usuario" value={sessionData?.userId} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="Sesión" value={sessionData?.sessionId?.substring(0, 8)} />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      {/* 3. Table view */}
      {!loadingContent && tableInfo && selectedMenuInfo?.viewType === 'tree' && (
        <div style={{ padding: '24px' }}>
          <TrytonTable
            tableInfo={tableInfo}
            sessionData={sessionData}
            onEdit={(record) => {
              // Lógica de edición inline (~50 líneas)
              setLoadingContent(true);
              // ... más código
            }}
            onDelete={(recordIds) => {
              // Lógica de eliminación inline (~40 líneas)
              Modal.confirm({
                // ... configuración
              });
            }}
            onAction={(action, recordIds) => {
              // Lógica de acción inline (~60 líneas)
              handleActionExecution(action.id, recordIds);
            }}
            // ... más props
          />
        </div>
      )}

      {/* 4. Form view */}
      {!loadingContent && formInfo && selectedMenuInfo?.viewType === 'form' && (
        <div style={{ padding: '24px' }}>
          <TrytonForm
            formInfo={formInfo}
            sessionData={sessionData}
            onSave={(values) => {
              // Lógica de guardado inline (~80 líneas)
              setLoadingContent(true);
              trytonService.createRecord(formInfo.model, values)
                .then(result => {
                  // ... manejo de resultado
                })
                .catch(error => {
                  // ... manejo de error
                });
            }}
            onCancel={() => {
              // Lógica de cancelación inline
              setActiveTab('dashboard');
              setFormInfo(null);
            }}
          />
        </div>
      )}

      {/* 5. Empty state */}
      {!loadingContent && !tableInfo && !formInfo && activeTab !== 'dashboard' && (
        <div style={{ padding: '24px' }}>
          <Empty description="Seleccione un menú para comenzar" />
        </div>
      )}
    </Content>
  </Layout>
);
```

**Problemas con este enfoque:**

- ❌ **JSX gigante**: ~400 líneas de renderizado condicional en el mismo return
- ❌ **Anidación compleja**: Múltiples if anidados (`!loadingContent && tableInfo && viewType === ...`)
- ❌ **Lógica inline**: Handlers de eventos (onEdit, onSave, etc.) definidos inline con decenas de líneas
- ❌ **Difícil de seguir**: Para entender qué se renderiza en cada caso hay que leer 400+ líneas
- ❌ **Acoplamiento**: Todo el contenido está acoplado al Dashboard.jsx principal
- ❌ **Difícil de testear**: No puedes testear el routing de vistas aisladamente
- ❌ **Difícil de extender**: Para agregar una nueva vista hay que editar el return gigante del Dashboard

### DESPUÉS (ContentArea.jsx):

Ahora el área de contenido es un componente limpio de ~51 líneas:

```javascript
// src/app/layout/ContentArea.jsx
import React from 'react';
import { Layout } from 'antd';
import DashboardHome from '../dashboard/DashboardHome';
import LoadingView from '../views/LoadingView';
import TableView from '../views/TableView';
import FormView from '../views/FormView';

const { Content } = Layout;

const ContentArea = ({
  activeTab,
  selectedMenuInfo,
  tableInfo,
  formInfo,
  loadingContent,
  sessionData
}) => {
  const renderContent = () => {
    // Loading
    if (loadingContent) {
      return <LoadingView />;
    }

    // Dashboard home
    if (activeTab === 'dashboard') {
      return <DashboardHome sessionData={sessionData} />;
    }

    // Table view
    if (tableInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'tree') {
      return <TableView tableInfo={tableInfo} selectedMenuInfo={selectedMenuInfo} />;
    }

    // Form view
    if (formInfo && selectedMenuInfo && selectedMenuInfo.viewType === 'form') {
      return <FormView formInfo={formInfo} selectedMenuInfo={selectedMenuInfo} />;
    }

    // Empty state
    return <DashboardHome sessionData={sessionData} />;
  };

  return (
    <Content style={{ background: '#F8F9FA' }}>
      {renderContent()}
    </Content>
  );
};

export default ContentArea;
```

**Mejoras con este enfoque:**

- ✅ **Componente pequeño**: Solo 51 líneas (vs ~400 líneas inline)
- ✅ **Lógica clara**: Función `renderContent()` con if-else simple y secuencial
- ✅ **Fácil de leer**: Se ve inmediatamente qué se renderiza en cada caso
- ✅ **Vistas separadas**: Cada vista (LoadingView, TableView, FormView) es un componente independiente
- ✅ **Fácil de testear**: Puedes testear el routing aisladamente pasando diferentes props
- ✅ **Fácil de extender**: Para agregar una nueva vista solo añades un nuevo if en renderContent()
- ✅ **Props explícitas**: Todas las dependencias vienen por props
- ✅ **Desacoplado**: No depende directamente del Dashboard.jsx

---

## 🔄 Resumen del Refactor

### Reducción de complejidad:

```
Dashboard.jsx ORIGINAL: ~1,634 líneas
├─ Sidebar inline (~200 líneas)
├─ MenuTree inline (~150 líneas dentro de renderMenuItem)
├─ MenuItem inline (~100 líneas dentro de renderMenuItem)
└─ ContentArea inline (~400 líneas)

DESPUÉS: 4 archivos (~311 líneas totales)
├─ Sidebar.jsx:       103 líneas ✅
├─ MenuTree.jsx:       44 líneas ✅
├─ MenuItem.jsx:      113 líneas ✅
└─ ContentArea.jsx:    51 líneas ✅
```

**Líneas eliminadas del Dashboard.jsx original:** ~850 líneas
**Líneas en componentes nuevos:** ~311 líneas
**Reducción neta:** ~539 líneas (63% de reducción)

---

## 🎯 Beneficios del Refactor

### 1. **Modularidad**
Cada componente de layout es independiente y reutilizable:
```javascript
// Sidebar puede usarse en otros dashboards
import Sidebar from './layout/Sidebar';

// MenuItem puede usarse en otros menús
import MenuItem from './layout/MenuItem';

// ContentArea puede usarse como router en otros layouts
import ContentArea from './layout/ContentArea';
```

### 2. **Mantenibilidad**
- Cambios en sidebar → solo editar `Sidebar.jsx` (~103 líneas)
- Cambios en menú → solo editar `MenuItem.jsx` (~113 líneas) o `MenuTree.jsx` (~44 líneas)
- Cambios en routing de vistas → solo editar `ContentArea.jsx` (~51 líneas)
- Ya no hay que buscar entre 1,634 líneas para encontrar algo

### 3. **Testabilidad**
Componentes más pequeños son más fáciles de testear:
```javascript
// Test de MenuItem
test('should apply active styles when isActive=true', () => {
  const mockItem = { id: 1, name: 'Test' };
  render(<MenuItem item={mockItem} isActive={true} />);
  const button = screen.getByRole('button');
  expect(button).toHaveStyle({ background: '#007BFF' });
});

// Test de ContentArea
test('should render LoadingView when loadingContent=true', () => {
  render(<ContentArea loadingContent={true} />);
  expect(screen.getByText('Cargando...')).toBeInTheDocument();
});

// Test de MenuTree recursión
test('should render children when expanded', () => {
  const items = [
    { id: 1, name: 'Parent', childs: [{ id: 2, name: 'Child' }] }
  ];
  const expandedMenus = new Set([1]);
  render(<MenuTree items={items} expandedMenus={expandedMenus} />);
  expect(screen.getByText('Child')).toBeInTheDocument();
});
```

### 4. **Composabilidad**
Layout se construye componiendo piezas pequeñas:
```
Dashboard.jsx (~95 líneas)
├─ DashboardHeader.jsx
└─ Layout
    ├─ Sidebar.jsx (~103 líneas)
    │   └─ MenuTree.jsx (~44 líneas)
    │       └─ MenuItem.jsx (~113 líneas, recursivo)
    └─ ContentArea.jsx (~51 líneas)
        ├─ DashboardHome.jsx
        ├─ TableView.jsx
        ├─ FormView.jsx
        └─ LoadingView.jsx
```

### 5. **Separación de Responsabilidades**

| Componente | Responsabilidad Única |
|------------|----------------------|
| **Sidebar** | Contenedor lateral + manejo de loading/error |
| **MenuTree** | Lógica recursiva del árbol de menús |
| **MenuItem** | Renderizado de un item individual |
| **ContentArea** | Router de vistas (decide qué mostrar) |

Cada componente hace UNA cosa y la hace bien.

### 6. **Extensibilidad**

**Agregar nueva vista:**
```javascript
// 1. Crear nuevo componente
// src/app/views/ChartView.jsx
export const ChartView = ({ chartInfo }) => (
  <div style={{ padding: '24px' }}>
    <TrytonChart chartInfo={chartInfo} />
  </div>
);

// 2. Integrar en ContentArea (1 línea)
// src/app/layout/ContentArea.jsx
const renderContent = () => {
  if (loadingContent) return <LoadingView />;
  if (activeTab === 'dashboard') return <DashboardHome />;
  if (chartInfo) return <ChartView chartInfo={chartInfo} />; // ← Nueva vista
  if (tableInfo) return <TableView />;
  if (formInfo) return <FormView />;
  return <DashboardHome />;
};
```

**Customizar item de menú:**
```javascript
// Solo editar MenuItem.jsx (~113 líneas)
// Ejemplo: Agregar badge con contador
<MenuItem item={item} badge={item.unreadCount} />
```

---

## 🔗 Interacción entre Componentes

### Flujo de renderizado:

```
Dashboard.jsx
│
├─ Pasa props a Sidebar
│  │  Props: { open, menuItems, loading, error, ... }
│  │
│  └─ Sidebar renderiza según estado
│     │
│     ├─ Si loading → <Spin />
│     ├─ Si error → <Alert />
│     └─ Si OK → <MenuTree items={menuItems} ... />
│        │
│        └─ MenuTree mapea items
│           │
│           └─ Por cada item → <MenuItem item={item} ... />
│              │
│              ├─ Renderiza botón con icono + texto
│              │
│              └─ Si tiene hijos Y está expandido:
│                 └─ <MenuTree items={item.childs} level={level+1} /> (RECURSIÓN)
│
└─ Pasa props a ContentArea
   │  Props: { activeTab, tableInfo, formInfo, loadingContent, ... }
   │
   └─ ContentArea decide qué vista renderizar
      │
      ├─ Si loadingContent → <LoadingView />
      ├─ Si activeTab='dashboard' → <DashboardHome />
      ├─ Si tableInfo → <TableView />
      └─ Si formInfo → <FormView />
```

### Flujo de datos (click en menú):

```
1. Usuario click en MenuItem
   └─ <MenuItem onClick={onMenuClick} />

2. MenuItem llama onClick(item)
   └─ onClick es prop pasada desde MenuTree

3. MenuTree pasa el evento a Sidebar
   └─ onMenuClick prop de Sidebar

4. Sidebar pasa el evento a Dashboard
   └─ onMenuClick prop de Dashboard

5. Dashboard ejecuta handleMenuClick (hook useMenuActions)
   └─ Hook procesa el item y actualiza estados

6. Hook actualiza tableInfo o formInfo según el resultado
   └─ setTableInfo({ fieldsView, data, model, ... })

7. ContentArea recibe nuevos props
   └─ ContentArea re-renderiza con nueva vista

8. Nueva vista se muestra al usuario
   └─ <TableView /> o <FormView />
```

---

## 📚 Referencias

Ver documentación completa:
- `/REFACTORING_PLAN.md` - Plan de refactorización general
- `/CLAUDE.md` - Arquitectura del proyecto
- `src/app/dashboard/README.md` - Documentación del Dashboard principal
- `src/app/hooks/README.md` - Documentación de los custom hooks
- `src/app/views/README.md` - Documentación de las vistas (TableView, FormView, etc.)
- `src/app/utils/README.md` - Documentación de utilidades (iconMapper)
