# 🔧 Solución al Error de common.db.list

## Problema Identificado

El error 404 en `common.db.list` se debía a dos problemas principales:

### 1. **URL Incorrecta en la Configuración**
- **Antes:** `http://localhost:5173` (puerto de Vite/React)
- **Después:** `http://localhost:8000` (puerto estándar de Tryton)

### 2. **Lógica Incorrecta en la Construcción de URLs**
- `common.db.list` es un método que **NO** requiere base de datos
- El código estaba intentando usar la base de datos cuando estaba disponible
- Esto causaba que la URL se construyera como `/database/` en lugar de `/`

## Soluciones Implementadas

### ✅ Corrección de Configuración
```javascript
// env.config.js
export const trytonConfig = {
  baseURL: 'http://localhost:8000', // ✅ Puerto correcto de Tryton
  // ... resto de configuración
};
```

### ✅ Corrección de Lógica de URLs
```javascript
// trytonService.js - makeRpcCall
// common.db.list NO debe usar base de datos - es para listar las bases disponibles
if (method === 'common.db.list') {
  url = `${this.baseURL}/`; // ✅ Sin base de datos
} else if (this.database && this.database.trim() !== '' && methodsWithDatabase.includes(method)) {
  url = `${this.baseURL}/${this.database}/`; // ✅ Con base de datos
} else {
  url = `${this.baseURL}/`; // ✅ Sin base de datos
}
```

### ✅ Método de Prueba Específico
Se agregó `testDbList()` para probar específicamente `common.db.list`:
```javascript
async testDbList() {
  // Construir URL manualmente para common.db.list
  const url = `${this.baseURL}/`; // ✅ Siempre sin base de datos
  
  // ... resto del método
}
```

## Cómo Probar la Solución

### 1. **Verificar Configuración**
```bash
# Asegúrate de que Tryton esté corriendo en el puerto 8000
# Verifica que el archivo env.config.js tenga:
baseURL: 'http://localhost:8000'
```

### 2. **Usar el Componente de Prueba**
- El componente `ConnectionTest` ahora está integrado en la pantalla de login
- Haz clic en "🔍 Probar Conexión" para verificar la conexión
- Deberías ver las bases de datos disponibles

### 3. **Verificar en la Consola**
```javascript
// En la consola del navegador:
import trytonService from './services/trytonService';

// Probar conexión básica
trytonService.checkConnection();

// Probar específicamente common.db.list
trytonService.testDbList();
```

## Flujo Correcto de Conexión

### 1. **Sin Sesión (Login)**
```
URL: http://localhost:8000/
Método: common.db.list
Parámetros: []
Resultado: Lista de bases de datos disponibles
```

### 2. **Con Sesión (Operaciones)**
```
URL: http://localhost:8000/database_name/
Método: model.ir.module.search_read
Parámetros: [filtros, campos]
Resultado: Datos de la base de datos específica
```

## Métodos que NO Requieren Base de Datos

- `common.db.list` - Listar bases disponibles
- `common.db.login` - Hacer login (pero usa la base de datos en la URL)

## Métodos que SÍ Requieren Base de Datos

- `model.res.user.get_preferences`
- `model.ir.module.search_read`
- `model.ir.model.access.get_access`
- `model.ir.ui.menu.view_toolbar_get`
- `model.ir.ui.menu.fields_view_get`
- `model.ir.ui.menu.search_read`
- `model.ir.ui.icon.list_icons`

## Verificación de Funcionamiento

### ✅ Conexión Exitosa
```
✅ Conexión Exitosa
Servidor: http://localhost:8000
Mensaje: Conexión exitosa. X bases de datos encontradas.

🗄️ Bases de Datos Disponibles
[gnuhealth, test_db, production_db]
```

### ❌ Error de Conexión
```
❌ Conexión Fallida
Servidor: http://localhost:8000
Error: No se puede conectar al servidor Tryton

💡 Sugerencias de Solución
• Verifica que el servidor Tryton esté ejecutándose
• Comprueba que el puerto 8000 esté disponible
• Ejecuta: gnuhealth-control start
```

## Troubleshooting Adicional

### Si sigues teniendo problemas:

1. **Verifica que Tryton esté corriendo:**
   ```bash
   gnuhealth-control status
   # o
   systemctl status tryton
   ```

2. **Verifica el puerto:**
   ```bash
   netstat -tlnp | grep :8000
   # o
   ss -tlnp | grep :8000
   ```

3. **Verifica logs de Tryton:**
   ```bash
   tail -f /var/log/tryton/tryton.log
   ```

4. **Verifica configuración CORS:**
   ```ini
   # /etc/tryton/trytond.conf
   [web_cors]
   enabled = True
   origins = *
   methods = GET,POST,PUT,DELETE,OPTIONS
   headers = Content-Type,Authorization
   ```

## Resumen

El problema principal era que:
1. La configuración apuntaba al puerto incorrecto (5173 en lugar de 8000)
2. La lógica de construcción de URLs no manejaba correctamente `common.db.list`

Con estas correcciones, `common.db.list` debería funcionar correctamente y mostrar las bases de datos disponibles en tu servidor Tryton.
