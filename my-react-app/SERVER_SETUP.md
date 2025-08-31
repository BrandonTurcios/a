# 🚨 Solución para "NetworkError when attempting to fetch resource"

## 🔍 Diagnóstico del Problema

El error "NetworkError when attempting to fetch resource" indica que **el servidor Tryton no está ejecutándose** en el puerto 8000. Esto es diferente del error de CORS - aquí el problema es que no hay ningún servidor respondiendo.

## ✅ Solución Paso a Paso

### 1. Verificar si el Servidor Está Ejecutándose

```bash
# Verificar procesos de Tryton
ps aux | grep trytond

# Verificar el puerto 8000
netstat -tlnp | grep 8000
# o en Windows:
netstat -an | findstr :8000
```

### 2. Iniciar el Servidor Tryton

Si el servidor no está ejecutándose, inícialo:

```bash
# Opción 1: Usando gnuhealth-control
gnuhealth-control start

# Opción 2: Directamente con trytond
trytond -c /ruta/a/tu/trytond.conf

# Opción 3: Si usas systemd
sudo systemctl start trytond
```

### 3. Verificar que el Servidor Se Inició Correctamente

```bash
# Verificar logs
tail -f /var/log/trytond.log

# Verificar estado
gnuhealth-control status

# Probar conexión
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"common.db.list","params":[],"id":1}'
```

## 🔧 Configuración del Proxy de Desarrollo

He configurado un proxy de desarrollo en Vite para evitar problemas de CORS. Esto significa que:

- Tu aplicación React se conectará a `/tryton` en lugar de `http://localhost:8000`
- Vite redirigirá automáticamente las peticiones a `http://localhost:8000`
- Esto evita problemas de CORS durante el desarrollo

### Configuración Actual:

```javascript
// vite.config.js
server: {
  proxy: {
    '/tryton': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/tryton/, '')
    }
  }
}
```

## 🧪 Probar la Conexión

1. **Inicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

2. **Abre `http://localhost:5173`** en tu navegador

3. **Verifica el componente "Estado del Servidor":**
   - Debería mostrar el estado del servidor Tryton
   - Debería mostrar el estado del proxy

## 🚨 Problemas Comunes y Soluciones

### Problema: "gnuhealth-control: command not found"

**Solución:**
```bash
# Instalar gnuhealth-control si no está instalado
sudo apt-get install gnuhealth-control
# o
pip install gnuhealth-control
```

### Problema: "Permission denied"

**Solución:**
```bash
# Ejecutar con permisos de administrador
sudo gnuhealth-control start
# o
sudo trytond -c /ruta/a/tu/trytond.conf
```

### Problema: "Port 8000 already in use"

**Solución:**
```bash
# Verificar qué está usando el puerto
lsof -i :8000
# o
netstat -tlnp | grep 8000

# Detener el proceso que está usando el puerto
sudo kill -9 <PID>
```

### Problema: "Database connection failed"

**Solución:**
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Iniciar PostgreSQL si no está ejecutándose
sudo systemctl start postgresql
```

## 📋 Checklist de Verificación

- [ ] El servidor Tryton está ejecutándose (`ps aux | grep trytond`)
- [ ] El puerto 8000 está disponible (`netstat -tlnp | grep 8000`)
- [ ] PostgreSQL está ejecutándose
- [ ] La configuración de Tryton es correcta
- [ ] El proxy de desarrollo está configurado
- [ ] La aplicación React está ejecutándose (`npm run dev`)

## 🔍 Verificación en el Navegador

1. Abre las **Herramientas de Desarrollador** (F12)
2. Ve a la pestaña **Console**
3. Busca mensajes de error relacionados con la conexión
4. Ve a la pestaña **Network** y verifica las peticiones a `/tryton`

## 📞 Comandos Útiles para Debugging

```bash
# Verificar estado completo
gnuhealth-control status

# Ver logs en tiempo real
gnuhealth-control logs
# o
tail -f /var/log/trytond.log

# Reiniciar completamente
gnuhealth-control restart

# Verificar configuración
trytond --config-file=/ruta/a/tu/trytond.conf --check-config

# Probar conexión directa
curl -v http://localhost:8000/
```

## 🎯 Próximos Pasos

Una vez que el servidor esté ejecutándose:

1. **Verifica que aparezca "Servidor Tryton: Ejecutándose"** en la interfaz
2. **Verifica que aparezca "Proxy de Desarrollo: Funcionando"**
3. **Intenta hacer login** con las credenciales de ejemplo
4. **Explora el dashboard** una vez autenticado

Si sigues teniendo problemas, revisa los logs del servidor para obtener más información sobre el error específico.
