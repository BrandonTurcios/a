# Guía de Deploy - GNU Health React App

Esta guía explica cómo hacer deploy de la aplicación React en diferentes plataformas.

## 📋 Prerequisitos

- Node.js 22+ instalado
- Docker (opcional, para deploy con contenedores)
- Cuenta en plataforma de hosting (Vercel, Netlify, etc.)

## 🚀 Opciones de Deploy

### Opción 1: Deploy con Docker (Recomendado para producción)

#### 1. Build de la imagen Docker

```bash
cd my-react-app
docker build -f Dockerfile.prod -t gnuhealth-app:latest .
```

#### 2. Ejecutar el contenedor

```bash
docker run -d -p 80:80 --name gnuhealth-app gnuhealth-app:latest
```

La aplicación estará disponible en `http://localhost`

#### 3. Deploy en servidor remoto

```bash
# En tu servidor
docker pull gnuhealth-app:latest
docker stop gnuhealth-app 2>/dev/null || true
docker rm gnuhealth-app 2>/dev/null || true
docker run -d -p 80:80 --name gnuhealth-app --restart unless-stopped gnuhealth-app:latest
```

### Opción 2: Deploy en Vercel (Gratis y fácil)

#### 1. Instalar Vercel CLI

```bash
npm install -g vercel
```

#### 2. Login en Vercel

```bash
vercel login
```

#### 3. Deploy

```bash
cd my-react-app
vercel
```

#### 4. Configuración del Proxy (IMPORTANTE)

El archivo `vercel.json` ya está configurado para hacer proxy de las requests a `/api/*` hacia el servidor Tryton. Esto resuelve el problema de **Mixed Content** (HTTPS -> HTTP).

**El proxy funciona automáticamente**, no necesitas configuración adicional.

#### 5. Variables de entorno (opcional)

Si necesitas cambiar la URL del servidor Tryton, en el dashboard de Vercel:
- Ve a Settings > Environment Variables
- Agrega: `VITE_TRYTON_URL=http://9.234.137.128:8000`

**Nota:** 
- Vercel automáticamente detecta Vite y configura el build correctamente
- El proxy en `vercel.json` redirige `/api/*` a tu servidor Tryton
- Esto evita problemas de Mixed Content (HTTPS -> HTTP)

### Opción 3: Deploy en Netlify

#### 1. Instalar Netlify CLI

```bash
npm install -g netlify-cli
```

#### 2. Login

```bash
netlify login
```

#### 3. Deploy

```bash
cd my-react-app
npm run build
netlify deploy --prod --dir=dist
```

#### 4. Crear archivo `netlify.toml` (opcional)

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Opción 4: Deploy manual en servidor con Nginx

#### 1. Build de producción

```bash
cd my-react-app
npm install
npm run build
```

#### 2. Copiar archivos al servidor

```bash
# Los archivos estarán en la carpeta dist/
scp -r dist/* usuario@servidor:/var/www/gnuhealth-app/
```

#### 3. Configurar Nginx

Crear archivo `/etc/nginx/sites-available/gnuhealth-app`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/gnuhealth-app;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://9.234.137.128:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

#### 4. Activar sitio

```bash
sudo ln -s /etc/nginx/sites-available/gnuhealth-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Opción 5: Deploy en GitHub Pages

#### 1. Instalar gh-pages

```bash
npm install --save-dev gh-pages
```

#### 2. Agregar scripts a package.json

```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

#### 3. Configurar base en vite.config.js

```js
export default defineConfig({
  base: '/nombre-repositorio/', // Cambiar por el nombre de tu repo
  // ... resto de la configuración
})
```

#### 4. Deploy

```bash
npm run deploy
```

## 🔧 Configuración de Variables de Entorno

### Para producción, crear archivo `.env.production`:

```env
VITE_TRYTON_URL=http://9.234.137.128:8000
```

### Actualizar env.config.js si es necesario:

El archivo `env.config.js` ya maneja diferentes URLs para desarrollo y producción usando `import.meta.env.DEV`.

## 📝 Scripts de Build

### Build local para probar

```bash
npm run build
npm run preview  # Previsualizar el build localmente
```

### Verificar el build

```bash
# Los archivos estarán en dist/
ls -la dist/
```

## 🔒 Consideraciones de Seguridad

1. **CORS**: Asegúrate de que el backend Tryton permita requests desde tu dominio de producción
2. **HTTPS**: Usa HTTPS en producción (Vercel/Netlify lo incluyen automáticamente)
3. **Variables de entorno**: No commitees archivos `.env` con información sensible

## 🐳 Docker Compose (Opcional)

Crear `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    restart: unless-stopped
```

Ejecutar:

```bash
docker-compose up -d
```

## 📊 Monitoreo y Logs

### Docker logs

```bash
docker logs -f gnuhealth-app
```

### Nginx logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 🚨 Troubleshooting

### Problema: La app no carga después del deploy

- Verifica que el build se completó correctamente
- Revisa la consola del navegador para errores
- Verifica que la URL del backend Tryton sea accesible desde el servidor

### Problema: Errores de CORS

- Configura CORS en el backend Tryton para permitir tu dominio
- O usa el proxy de Nginx (ya configurado en nginx.conf)

### Problema: Rutas no funcionan (404)

- Asegúrate de que el servidor esté configurado para redirigir todas las rutas a `index.html` (SPA routing)

## 📚 Recursos Adicionales

- [Vite Deploy Guide](https://vitejs.dev/guide/static-deploy.html)
- [Docker Documentation](https://docs.docker.com/)
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
