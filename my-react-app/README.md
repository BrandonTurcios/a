# Aplicación React para Tryton GNU Health

## 📋 Descripción del Proyecto

Esta es una aplicación web React moderna diseñada para conectarse y interactuar con servidores **Tryton GNU Health**. La aplicación proporciona una interfaz de usuario intuitiva para autenticación, gestión de sesiones y acceso a funcionalidades del sistema Tryton.

## 🏗️ Arquitectura del Proyecto

### Tecnologías Utilizadas
- **Frontend**: React 19.1.1 con Vite 7.1.2
- **Estilos**: Tailwind CSS 3.4.17
- **Build Tool**: Vite con plugin React
- **Linting**: ESLint 9.33.0
- **Gestión de Estado**: React Hooks (useState, useEffect)

### Estructura de Directorios
```
my-react-app/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Login.jsx       # Formulario de autenticación
│   │   ├── Dashboard.jsx   # Panel principal post-login
│   │   ├── ConnectionTest.jsx # Prueba de conectividad
│   │   └── ServerStatus.jsx # Estado del servidor
│   ├── services/            # Servicios de comunicación
│   │   ├── trytonService.js # Servicio principal Tryton
│   │   ├── trytonServiceDirect.js # Servicio directo
│   │   └── trytonServiceSAO.js # Servicio SAO
│   ├── App.jsx             # Componente principal
│   └── main.jsx            # Punto de entrada
├── public/                  # Archivos estáticos
├── dist/                    # Build de producción
└── config files            # Configuraciones de build
```

## 🔧 Configuración del Servidor Tryton

### Archivo de Configuración
El servidor Tryton está configurado en `/opt/gnuhealth/his-50/etc/trytond.conf`:

```ini
[database]
uri = postgresql://:5432
path = /opt/gnuhealth/his-50/attach

[web]
# Escucha en todas las interfaces de red
listen = 0.0.0.0:5173
cors = *
list = True

[jsonrpc]
listen = 0.0.0.0:8000
```

### Puertos y Servicios
- **Puerto 5173**: Servidor web Tryton (interfaz web)
- **Puerto 8000**: API JSON-RPC de Tryton
- **Puerto 5432**: Base de datos PostgreSQL

## 🚀 Funcionalidades Principales

### 1. Autenticación y Gestión de Sesiones
- **Login seguro** con validación de credenciales
- **Persistencia de sesión** usando localStorage
- **Gestión automática de tokens** de autenticación
- **Logout seguro** con limpieza de datos

### 2. Prueba de Conectividad
- **Verificación automática** del estado del servidor
- **Detección de bases de datos** disponibles
- **Diagnóstico de problemas** de conexión
- **Sugerencias de solución** para errores comunes

### 3. Dashboard Interactivo
- **Menú lateral dinámico** basado en permisos del usuario
- **Navegación por módulos** del sistema Tryton
- **Gestión de preferencias** del usuario
- **Interfaz responsive** con Tailwind CSS

### 4. Comunicación con Tryton
- **API JSON-RPC** completa implementada
- **Manejo de errores** robusto
- **Reintentos automáticos** en fallos de conexión
- **Sincronización de estado** con el servidor

## 🔌 Servicios de Comunicación

### TrytonService Principal
El servicio principal (`trytonService.js`) implementa:

```javascript
// Métodos principales
- login(database, username, password)     // Autenticación
- logout()                               // Cierre de sesión
- makeRpcCall(method, params)            // Llamadas RPC
- checkConnection()                       // Verificación de conexión
- getUserPreferences()                    // Preferencias del usuario
- getSidebarMenu()                       // Menú del sistema
```

### Características del Servicio
- **Replicación exacta del SAO** (Tryton Web Client)
- **Headers de autorización** compatibles con Tryton
- **Manejo de contexto** del usuario
- **Gestión de sesiones** robusta
- **Logging detallado** para debugging

## 🎨 Interfaz de Usuario

### Diseño y UX
- **Gradientes modernos** con Tailwind CSS
- **Componentes responsivos** para móvil y desktop
- **Estados de carga** con spinners animados
- **Manejo de errores** con mensajes claros
- **Navegación intuitiva** con iconos descriptivos

### Componentes Principales
1. **Login**: Formulario de autenticación con validación
2. **Dashboard**: Panel principal con menú lateral
3. **ConnectionTest**: Verificador de conectividad
4. **ServerStatus**: Indicador del estado del servidor

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js 18+ y npm
- Servidor Tryton GNU Health ejecutándose
- Base de datos PostgreSQL configurada

### Instalación
```bash
# Clonar el repositorio
git clone <repository-url>
cd my-react-app

# Instalar dependencias
npm install

# Configurar variables de entorno
cp env.config.js.example env.config.js
# Editar env.config.js con la URL del servidor

# Ejecutar en desarrollo
npm run dev

# Construir para producción
npm run build
```

### Configuración del Entorno
Editar `env.config.js`:
```javascript
export const trytonConfig = {
  baseURL: 'http://localhost:5173/', // 
  directURL: 'http://localhost:5173',      // URL directa de Tryton
  timeout: 30000,                          // Timeout en ms
  retries: 3                               // Número de reintentos
};
```

## 🔒 Seguridad

### Autenticación
- **Credenciales seguras** con validación del servidor
- **Tokens de sesión** temporales
- **Logout automático** en expiración
- **Limpieza de datos** sensibles

### Comunicación
- **HTTPS recomendado** para producción
- **Validación de CORS** configurada
- **Headers de seguridad** implementados
- **Sanitización de datos** de entrada

## 🐛 Debugging y Logging

### Logs del Sistema
La aplicación incluye logging detallado:
- **Conexiones** al servidor
- **Llamadas RPC** con parámetros
- **Errores** y excepciones
- **Estado de sesiones**

### Herramientas de Debug
```javascript
// Debug de sesión
trytonService.debugSession();

// Verificar conexión
trytonService.checkConnection();

// Probar métodos específicos
trytonService.testDbList();
```

## 📱 Compatibilidad

### Navegadores Soportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Dispositivos
- **Desktop**: Interfaz completa con sidebar
- **Tablet**: Layout adaptativo
- **Móvil**: Navegación optimizada

## 🔄 Estado del Desarrollo

### ✅ Completado
- Sistema de autenticación completo
- Comunicación RPC con Tryton
- Interfaz de usuario responsive
- Gestión de sesiones
- Pruebas de conectividad

### 🚧 En Desarrollo
- Módulos específicos de GNU Health
- Reportes y dashboards avanzados
- Integración con otros servicios
- Testing automatizado

### 📋 Pendiente
- Documentación de API completa
- Suite de tests unitarios
- CI/CD pipeline
- Dockerización

## 🤝 Contribución

### Cómo Contribuir
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request



**Nota**: Esta aplicación está diseñada específicamente para trabajar con servidores Tryton GNU Health. Asegúrate de que tu servidor esté configurado correctamente antes de usar la aplicación.
