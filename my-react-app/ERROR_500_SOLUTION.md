# 🔧 Solución para Error 500 en Tryton

## 🚨 Problema Identificado

El servidor Tryton está devolviendo un error 500 (Internal Server Error):

```
Error detallado en llamada RPC: 
Object { url: "/tryton/", method: "common.db.list", error: "HTTP error! status: 500 - INTERNAL SERVER ERROR" }
```

## ✅ **¡Buenas Noticias!**

El error 500 indica que:
- ✅ El servidor Tryton está ejecutándose
- ✅ CORS está funcionando (ya no hay errores 403)
- ✅ La conexión de red está funcionando
- ❌ Hay un problema interno en el servidor

## 🔍 **Diagnóstico del Error 500**

### 1. **Verificar los Logs del Servidor**

Los logs del servidor Tryton mostrarán el error específico. Busca en los logs algo como:

```bash
# Ver logs en tiempo real
tail -f /var/log/trytond.log
# o
gnuhealth-control logs
```

### 2. **Problemas Comunes que Causan Error 500**

#### **A. Problema de Base de Datos**
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar conexión a la base de datos
psql -h localhost -U tryton -d tryton
```

#### **B. Problema de Permisos**
```bash
# Verificar permisos del directorio de datos
ls -la /opt/gnuhealth/his-50/

# Verificar permisos del usuario que ejecuta Tryton
ps aux | grep trytond
```

#### **C. Problema de Configuración**
```bash
# Verificar configuración
trytond --config-file=/ruta/a/tu/trytond.conf --check-config
```

## 🛠️ **Soluciones Paso a Paso**

### **Solución 1: Verificar Base de Datos**

```bash
# 1. Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# 2. Si no está ejecutándose, iniciarlo
sudo systemctl start postgresql

# 3. Verificar que la base de datos existe
sudo -u postgres psql -l | grep tryton

# 4. Si la base de datos no existe, crearla
sudo -u postgres createdb tryton
```

### **Solución 2: Verificar Permisos**

```bash
# 1. Verificar el usuario que ejecuta Tryton
ps aux | grep trytond

# 2. Verificar permisos del directorio
ls -la /opt/gnuhealth/his-50/

# 3. Corregir permisos si es necesario
sudo chown -R gnuhealth:gnuhealth /opt/gnuhealth/his-50/
sudo chmod -R 755 /opt/gnuhealth/his-50/
```

### **Solución 3: Reiniciar Completamente**

```bash
# 1. Detener Tryton
gnuhealth-control stop
# o
pkill trytond

# 2. Esperar unos segundos
sleep 5

# 3. Verificar que no hay procesos residuales
ps aux | grep trytond

# 4. Iniciar nuevamente
gnuhealth-control start
```

### **Solución 4: Verificar Configuración**

```bash
# 1. Verificar que el archivo de configuración es válido
trytond --config-file=/ruta/a/tu/trytond.conf --check-config

# 2. Verificar que la configuración es correcta
cat /ruta/a/tu/trytond.conf | grep -E "(database|web|jsonrpc)"
```

## 🔍 **Comandos de Diagnóstico**

### **Verificar Estado Completo**

```bash
# Estado del sistema
gnuhealth-control status

# Logs en tiempo real
gnuhealth-control logs

# Verificar procesos
ps aux | grep -E "(trytond|postgres)"

# Verificar puertos
netstat -tlnp | grep -E "(8000|5432)"
```

### **Probar Conexión Directa**

```bash
# Probar conexión a PostgreSQL
psql -h localhost -U tryton -d tryton -c "SELECT version();"

# Probar API de Tryton directamente
curl -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"common.db.list","params":[],"id":1}' \
  -v
```

## 🚨 **Problemas Específicos y Soluciones**

### **Problema: "Database connection failed"**

```bash
# Verificar configuración de base de datos en trytond.conf
cat /ruta/a/tu/trytond.conf | grep -A 5 "database"

# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar que la base de datos existe
sudo -u postgres psql -l
```

### **Problema: "Permission denied"**

```bash
# Verificar permisos del directorio
ls -la /opt/gnuhealth/his-50/

# Corregir permisos
sudo chown -R gnuhealth:gnuhealth /opt/gnuhealth/his-50/
sudo chmod -R 755 /opt/gnuhealth/his-50/
```

### **Problema: "Module not found"**

```bash
# Verificar que los módulos estén instalados
trytond --config-file=/ruta/a/tu/trytond.conf -d tryton --update=all
```

## 📋 **Checklist de Verificación**

- [ ] PostgreSQL está ejecutándose (`sudo systemctl status postgresql`)
- [ ] La base de datos existe (`sudo -u postgres psql -l`)
- [ ] Los permisos son correctos (`ls -la /opt/gnuhealth/his-50/`)
- [ ] La configuración es válida (`trytond --check-config`)
- [ ] No hay errores en los logs (`tail -f /var/log/trytond.log`)
- [ ] El servidor responde (`curl -X POST http://localhost:8000/`)

## 🎯 **Próximos Pasos**

1. **Verifica los logs del servidor** para obtener el error específico
2. **Aplica la solución correspondiente** según el tipo de error
3. **Reinicia el servidor** después de hacer cambios
4. **Prueba la aplicación React** nuevamente

## 📞 **Comandos Útiles para Debugging**

```bash
# Ver logs en tiempo real
tail -f /var/log/trytond.log

# Ver estado completo
gnuhealth-control status

# Reiniciar completamente
gnuhealth-control restart

# Verificar configuración
trytond --config-file=/ruta/a/tu/trytond.conf --check-config

# Probar conexión
curl -v http://localhost:8000/
```

Una vez que hayas identificado y solucionado el problema específico en los logs, tu aplicación React debería poder conectarse correctamente.
