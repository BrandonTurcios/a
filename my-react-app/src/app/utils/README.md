# 📂 src/app/utils/

Utilidades y helpers del Dashboard.

---

## 📄 Archivos

### `iconMapper.jsx`
**Líneas:** ~91 líneas
**Responsabilidad:** Mapeo y renderizado de iconos del menú

**¿Qué hace este archivo?**

`iconMapper.jsx` es un módulo utilitario que exporta una función `getIconComponent()` encargada de determinar qué icono renderizar para cada item del menú. Implementa un sistema de prioridades que intenta usar iconos reales del backend de Tryton primero, y si no están disponibles, usa iconos de Lucide React como fallback.

**Funcionalidades específicas:**

1. **Sistema de prioridades de iconos (4 niveles)**

   **PRIORIDAD 1: SVG desde Tryton backend (`item.iconUrl`)**
   - Si el item tiene `iconUrl`, lo renderiza como `<img src={iconUrl} />`
   - Este es el icono REAL que viene del backend de Tryton
   - Tryton guarda todos los iconos en el modelo `ir.ui.icon`
   - El backend envía el SVG ya procesado en base64: `data:image/svg+xml;base64,...`
   - Preserva colores originales del backend (sin necesidad de filtros CSS)

   **PRIORIDAD 2: Emoji → Lucide React (`item.icon`)**
   - Si el item tiene `icon` (emoji), busca en el `iconMap`
   - Ejemplo: `'📊'` → `<BarChart3 size={20} />`
   - Total de 17 emojis mapeados a iconos Lucide

   **PRIORIDAD 3: Nombre del item → Lucide React (`item.name`)**
   - Si el item tiene `name`, busca en el `nameMap`
   - Ejemplo: `'Health'` → `<Heart size={20} />`
   - Total de 14 nombres mapeados a iconos Lucide

   **PRIORIDAD 4: Fallback por defecto**
   - Si ninguna prioridad anterior coincide, retorna `<FileText size={16} />`

2. **Función principal: `getIconComponent(item)`**

   ```javascript
   export const getIconComponent = (item) => {
     // PRIORIDAD 1: iconUrl desde Tryton backend
     if (item?.iconUrl) {
       return (
         <img
           src={item.iconUrl}
           alt={item.name || 'icon'}
           style={{
             width: '16px',
             height: '16px',
             objectFit: 'contain'
           }}
         />
       );
     }

     // PRIORIDAD 2: Emoji a Lucide React
     const iconMap = { ... };
     if (item?.icon && iconMap[item.icon]) {
       const IconComponent = iconMap[item.icon];
       return <IconComponent size={20} />;
     }

     // PRIORIDAD 3: Nombre del item a Lucide React
     const nameMap = { ... };
     if (item?.name && nameMap[item.name]) {
       const IconComponent = nameMap[item.name];
       return <IconComponent size={20} />;
     }

     // PRIORIDAD 4: Fallback
     return <FileText size={16} />;
   };
   ```

3. **Mapeos de iconos**

   **iconMap** (emoji → Lucide React):
   ```javascript
   const iconMap = {
     '📊': BarChart3,     // Dashboard/Gráficas
     '💰': DollarSign,    // Ventas/Dinero
     '🛒': ShoppingCart,  // Compras
     '📦': Package,       // Inventario
     '📋': ClipboardList, // Listas
     '👥': Users,         // Usuarios (plural)
     '⚙️': Settings,      // Configuración
     '❤️': Heart,         // Salud
     '👨‍⚕️': Stethoscope,  // Doctor
     '📅': Calendar,      // Citas/Calendario
     '💊': Pill,          // Medicina
     '🏥': Hospital,      // Hospital
     '🔐': Shield,        // Seguridad
     '👤': User,          // Usuario (singular)
     '🏢': Building2,     // Edificio/Departamento
     '📄': FileText,      // Documento
     '📈': Activity       // Actividad
   };
   ```

   **nameMap** (nombre → Lucide React):
   ```javascript
   const nameMap = {
     'Health': Heart,
     'Sales': DollarSign,
     'Purchase': ShoppingCart,
     'Inventory': Package,
     'Accounting': FileText,
     'HR': Users,
     'Settings': Settings,
     'Dashboard': BarChart3,
     'Patient': Heart,
     'Doctor': Stethoscope,
     'Appointment': Calendar,
     'Medicine': Pill,
     'Department': Building2,
     'Report': BarChart3
   };
   ```

4. **Imports de Lucide React**

   ```javascript
   import {
     Heart,           // ❤️ Salud/Corazón
     User,            // 👤 Usuario
     Calendar,        // 📅 Calendario/Citas
     Pill,            // 💊 Medicina
     Building2,       // 🏢 Edificio/Departamento
     BarChart3,       // 📊 Gráfica/Dashboard
     Shield,          // 🔐 Seguridad
     Settings,        // ⚙️ Configuración
     FileText,        // 📄 Archivo/Documento
     Activity,        // 📈 Actividad
     Users,           // 👥 Usuarios (plural)
     Stethoscope,     // 👨‍⚕️ Estetoscopio/Doctor
     Hospital,        // 🏥 Hospital
     ClipboardList,   // 📋 Lista
     DollarSign,      // 💰 Ventas/Dinero
     ShoppingCart,    // 🛒 Compras
     Package          // 📦 Inventario/Paquete
   } from 'lucide-react';
   ```

   **Sobre Lucide React:**
   - Librería de iconos moderna y ligera (fork de Feather Icons)
   - SVGs optimizados y de alta calidad
   - Totalmente customizables (size, color, strokeWidth)
   - Tree-shakeable: Solo importa los iconos que usas
   - Docs: https://lucide.dev/

5. **Casos de uso**

   **En MenuItem.jsx:**
   ```javascript
   import { getIconComponent } from '../utils/iconMapper';

   const MenuItem = ({ item, ... }) => {
     return (
       <Button>
         {getIconComponent(item)}
         <span>{item.name}</span>
       </Button>
     );
   };
   ```

   **Con iconUrl desde Tryton:**
   ```javascript
   const menuItem = {
     id: 123,
     name: "Pacientes",
     iconUrl: "data:image/svg+xml;base64,PHN2Zy4uLg=="
   };

   getIconComponent(menuItem);
   // Retorna: <img src="data:image/svg+xml;base64,..." />
   ```

   **Con emoji:**
   ```javascript
   const menuItem = {
     id: 124,
     name: "Dashboard",
     icon: "📊"
   };

   getIconComponent(menuItem);
   // Retorna: <BarChart3 size={20} />
   ```

   **Con nombre (fallback):**
   ```javascript
   const menuItem = {
     id: 125,
     name: "Health"
   };

   getIconComponent(menuItem);
   // Retorna: <Heart size={20} />
   ```

   **Sin nada (fallback final):**
   ```javascript
   const menuItem = {
     id: 126,
     name: "Something"
   };

   getIconComponent(menuItem);
   // Retorna: <FileText size={16} />
   ```

---

**Comparación con Dashboard.jsx original:**

### ANTES (Dashboard.jsx original):

En el Dashboard.jsx original (~1,634 líneas), la función `getIconComponent()` estaba definida inline dentro del componente Dashboard:

```javascript
// Dashboard.jsx original (líneas ~700-850 aproximadamente)

const Dashboard = () => {
  // ... muchos estados (20+) ...

  // Función helper para obtener iconos (inline dentro del componente)
  const getIconComponent = (item) => {
    // PRIORIDAD 1: Emoji (NO consideraba iconUrl de Tryton)
    if (item.icon === '📊') return <BarChart3 size={20} />;
    if (item.icon === '💰') return <DollarSign size={20} />;
    if (item.icon === '🛒') return <ShoppingCart size={20} />;
    if (item.icon === '📦') return <Package size={20} />;
    if (item.icon === '📋') return <ClipboardList size={20} />;
    if (item.icon === '👥') return <Users size={20} />;
    if (item.icon === '⚙️') return <Settings size={20} />;
    if (item.icon === '❤️') return <Heart size={20} />;
    if (item.icon === '👨‍⚕️') return <Stethoscope size={20} />;
    if (item.icon === '📅') return <Calendar size={20} />;
    if (item.icon === '💊') return <Pill size={20} />;
    if (item.icon === '🏥') return <Hospital size={20} />;
    if (item.icon === '🔐') return <Shield size={20} />;
    if (item.icon === '👤') return <User size={20} />;
    if (item.icon === '🏢') return <Building2 size={20} />;
    if (item.icon === '📄') return <FileText size={20} />;
    if (item.icon === '📈') return <Activity size={20} />;

    // PRIORIDAD 2: Nombre del item (fallback)
    if (item.name === 'Health') return <Heart size={20} />;
    if (item.name === 'Sales') return <DollarSign size={20} />;
    if (item.name === 'Purchase') return <ShoppingCart size={20} />;
    if (item.name === 'Inventory') return <Package size={20} />;
    if (item.name === 'Accounting') return <FileText size={20} />;
    if (item.name === 'HR') return <Users size={20} />;
    if (item.name === 'Settings') return <Settings size={20} />;
    if (item.name === 'Dashboard') return <BarChart3 size={20} />;
    if (item.name === 'Patient') return <Heart size={20} />;
    if (item.name === 'Doctor') return <Stethoscope size={20} />;
    if (item.name === 'Appointment') return <Calendar size={20} />;
    if (item.name === 'Medicine') return <Pill size={20} />;
    if (item.name === 'Department') return <Building2 size={20} />;
    if (item.name === 'Report') return <BarChart3 size={20} />;

    // Fallback final
    return <FileText size={16} />;
  };

  // ... resto del componente (1,500+ líneas más) ...

  return (
    <Layout>
      <Sider>
        {menuItems.map(item => (
          <Button>
            {getIconComponent(item)}
            <span>{item.name}</span>
          </Button>
        ))}
      </Sider>
    </Layout>
  );
};

// Imports de Lucide React desperdigados al inicio del archivo
import {
  Heart, User, Calendar, Pill, Building2, BarChart3,
  Shield, Settings, FileText, Activity, Users,
  Stethoscope, Hospital, ClipboardList, DollarSign,
  ShoppingCart, Package
} from 'lucide-react';
```

**Problemas con este enfoque:**

- ❌ **NO considera iconUrl**: No renderiza iconos SVG reales del backend de Tryton
- ❌ **Función inline**: La función está dentro del componente Dashboard (no reutilizable)
- ❌ **Muchos if statements**: 30+ if statements anidados para mapear iconos
- ❌ **Difícil de mantener**: Para agregar un icono hay que buscar entre 1,634 líneas
- ❌ **Difícil de encontrar**: La función está perdida en medio del archivo gigante
- ❌ **Imports mezclados**: Los imports de Lucide están mezclados con otros 50+ imports
- ❌ **No reutilizable**: Solo puede usarse dentro del componente Dashboard
- ❌ **Acoplamiento**: Depende del scope del Dashboard (acceso a variables locales)
- ❌ **Sin documentación**: No hay comentarios explicando las prioridades
- ❌ **Rendimiento**: Re-crea la función en cada render del Dashboard (aunque React optimiza esto)

### DESPUÉS (iconMapper.jsx):

Ahora la lógica de iconos es un módulo dedicado de ~91 líneas:

```javascript
// src/app/utils/iconMapper.jsx
import React from 'react';
import {
  Heart,
  User,
  Calendar,
  Pill,
  Building2,
  BarChart3,
  Shield,
  Settings,
  FileText,
  Activity,
  Users,
  Stethoscope,
  Hospital,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  Package
} from 'lucide-react';

// Función para obtener el componente del icono basado en las propiedades del item
export const getIconComponent = (item) => {
  // PRIORIDAD 1: iconUrl desde Tryton backend (SVG real)
  if (item?.iconUrl) {
    return (
      <img
        src={item.iconUrl}
        alt={item.name || 'icon'}
        style={{
          width: '16px',
          height: '16px',
          objectFit: 'contain'
        }}
      />
    );
  }

  // PRIORIDAD 2: Emoji a Lucide React
  const iconMap = {
    '📊': BarChart3,
    '💰': DollarSign,
    '🛒': ShoppingCart,
    '📦': Package,
    '📋': ClipboardList,
    '👥': Users,
    '⚙️': Settings,
    '❤️': Heart,
    '👨‍⚕️': Stethoscope,
    '📅': Calendar,
    '💊': Pill,
    '🏥': Hospital,
    '🔐': Shield,
    '👤': User,
    '🏢': Building2,
    '📄': FileText,
    '📈': Activity
  };

  if (item?.icon && iconMap[item.icon]) {
    const IconComponent = iconMap[item.icon];
    return <IconComponent size={20} />;
  }

  // PRIORIDAD 3: Nombre del item a Lucide React
  const nameMap = {
    'Health': Heart,
    'Sales': DollarSign,
    'Purchase': ShoppingCart,
    'Inventory': Package,
    'Accounting': FileText,
    'HR': Users,
    'Settings': Settings,
    'Dashboard': BarChart3,
    'Patient': Heart,
    'Doctor': Stethoscope,
    'Appointment': Calendar,
    'Medicine': Pill,
    'Department': Building2,
    'Report': BarChart3
  };

  if (item?.name && nameMap[item.name]) {
    const IconComponent = nameMap[item.name];
    return <IconComponent size={20} />;
  }

  // PRIORIDAD 4: Fallback por defecto
  return <FileText size={16} />;
};
```

**Mejoras con este enfoque:**

- ✅ **Prioriza iconUrl**: Renderiza iconos SVG reales del backend de Tryton (preserva colores originales)
- ✅ **Módulo independiente**: Puede importarse y usarse en cualquier componente
- ✅ **Organización clara**: iconMap y nameMap como objetos (vs 30+ if statements)
- ✅ **Fácil de mantener**: Solo 91 líneas en un archivo dedicado
- ✅ **Fácil de encontrar**: `src/app/utils/iconMapper.jsx`
- ✅ **Imports centralizados**: Todos los imports de Lucide en un solo lugar
- ✅ **Documentación clara**: Comentarios explicando las 4 prioridades
- ✅ **Reutilizable**: Se importa con `import { getIconComponent } from './utils/iconMapper'`
- ✅ **Sin acoplamiento**: No depende de ningún componente específico
- ✅ **Extensible**: Agregar nuevo icono es tan simple como añadir una entrada al mapa
- ✅ **Rendimiento**: Solo se crea una vez (no se re-crea en cada render)

---

## 📊 Sistema de Iconos de Tryton (Backend)

### Cómo funciona en Tryton:

**1. Modelo `ir.ui.icon`:**

Tryton tiene un modelo dedicado para almacenar iconos SVG en la base de datos:

```python
# En Tryton backend (Python)
class Icon(ModelSQL, ModelView):
    'Icon'
    __name__ = 'ir.ui.icon'

    name = fields.Char('Name', required=True)     # Ej: 'tryton-list'
    icon = fields.Binary('Icon', required=True)   # SVG XML data
```

**2. Métodos RPC disponibles:**

```javascript
// Listar todos los iconos disponibles
await trytonService.makeRpcCall('model.ir.ui.icon.list_icons', []);
// Returns: [[1, 'tryton-list'], [2, 'tryton-star'], [3, 'tryton-health'], ...]

// Leer datos de iconos específicos
await trytonService.makeRpcCall('model.ir.ui.icon.read', [
  [iconId],           // Array de IDs de iconos
  ['name', 'icon'],   // Campos a leer
  {}                  // Context
]);
// Returns: [{id: 1, name: 'tryton-list', icon: '<svg xmlns="...">...</svg>'}]
```

**3. El menú incluye iconUrl:**

Cuando Tryton envía los items del menú, ya incluye el `iconUrl` procesado:

```javascript
// Ejemplo de item de menú desde Tryton backend
{
  id: 123,
  name: "Pacientes",
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDov...",  // ← SVG en base64
  childs: [],
  action: 456,
  sequence: 10
}

// iconMapper.jsx lo renderiza directamente como <img>
<img src={item.iconUrl} style={{ width: '16px', height: '16px' }} />
```

**4. Ventajas de los iconos SVG de Tryton:**

- ✅ **Colores originales**: Los SVGs vienen con sus colores del backend (verde, azul, rojo, etc.)
- ✅ **Sin procesamiento**: No se necesitan filtros CSS ni transformaciones
- ✅ **Consistencia**: Los iconos se ven exactamente como en el cliente oficial de Tryton
- ✅ **Escalabilidad**: SVG es vectorial, se ve bien en cualquier tamaño

---

## 🔧 Cómo Extender

### Agregar nuevo emoji → icono:

```javascript
// En iconMapper.jsx
const iconMap = {
  '📊': BarChart3,
  '💰': DollarSign,
  '🎯': Target,  // ← NUEVO: Agregar esta línea
  // ...
};

// No olvides importar el icono al inicio del archivo:
import { ..., Target } from 'lucide-react';
```

### Agregar nuevo nombre → icono:

```javascript
// En iconMapper.jsx
const nameMap = {
  'Health': Heart,
  'Sales': DollarSign,
  'Goals': Target,  // ← NUEVO: Agregar esta línea
  // ...
};

// No olvides importar el icono al inicio del archivo:
import { ..., Target } from 'lucide-react';
```

### Cambiar el fallback por defecto:

```javascript
// En iconMapper.jsx
// Último fallback (línea ~89)
return <FileText size={16} />;  // ← Cambiar este icono

// Por ejemplo, cambiar a un icono de "folder":
import { Folder } from 'lucide-react';
return <Folder size={16} />;
```

---

## 🎨 Ventajas del Sistema Actual

### ✅ Preserva colores originales
Los SVGs de Tryton vienen con sus colores originales (verde, azul, rojo), no necesitan filtros CSS.

### ✅ Fallback inteligente de 4 niveles
Si el backend no envía `iconUrl`, el sistema tiene 3 niveles adicionales de fallback para asegurar que siempre se muestre algún icono.

### ✅ Fácil de mantener
Un solo archivo (`iconMapper.jsx`) centraliza toda la lógica de iconos. Solo 91 líneas.

### ✅ Reutilizable
Cualquier componente puede importar `getIconComponent` y usarlo inmediatamente.

### ✅ Extensible
Agregar nuevos iconos es tan simple como añadir una entrada al objeto `iconMap` o `nameMap`.

### ✅ Tree-shakeable
Lucide React solo incluye en el bundle los iconos que realmente importas. Si solo usas 5 iconos, solo esos 5 se incluyen en el build final.

### ✅ Sin dependencia de CSS
No se necesitan hojas de estilo externas ni procesamiento CSS para los iconos. Todo funciona out-of-the-box.

---

## 📚 Referencias

**Lucide React:**
- Docs: https://lucide.dev/
- GitHub: https://github.com/lucide-icons/lucide
- NPM: https://www.npmjs.com/package/lucide-react

**Tryton Icons:**
- Ver: `/CLAUDE.md` sección "Icon System"
- Referencia: Tryton SAO (client web) `src/common.js` lines 3153-3284 (IconFactory)
- Documentación oficial: https://docs.tryton.org/

**Proyecto:**
- `/REFACTORING_PLAN.md` - Plan general del refactor
- `src/app/layout/MenuItem.jsx` - Componente que usa getIconComponent
- `src/app/layout/README.md` - Documentación de layout
