# Debugging del Proxy en Vercel

## Problema actual

Al hacer login, se recibe un 404 cuando la request va a `/api/gnuhealth_demo/`.

## Pasos para debuggear

### 1. Verificar que las funciones se hayan desplegado

En el dashboard de Vercel:
1. Ve a tu proyecto
2. Click en "Functions" en el menú lateral
3. Deberías ver:
   - `api/index.js`
   - `api/[...path].js`

Si no aparecen, las funciones no se están desplegando correctamente.

### 2. Verificar los logs

En Vercel Dashboard:
1. Ve a "Deployments"
2. Click en el último deployment
3. Ve a "Functions" tab
4. Click en una función para ver los logs

Deberías ver logs como:
```
[Proxy Handler] Function called - Method: POST, URL: /api/gnuhealth_demo/
[Proxy] Request details: { ... }
```

### 3. Probar directamente las funciones

Prueba acceder directamente a:
- `https://proyecto-tryton-gnuhealth.vercel.app/api/` (debería funcionar)
- `https://proyecto-tryton-gnuhealth.vercel.app/api/test` (debería ir a [...path].js)

### 4. Verificar la estructura de archivos

Asegúrate de que los archivos estén en:
```
my-react-app/
  api/
    index.js
    [...path].js
  vercel.json
```

### 5. Si las funciones no aparecen

Puede ser que Vercel no esté detectando las funciones serverless. Intenta:

1. **Verificar que el proyecto esté configurado correctamente**:
   - En Vercel Dashboard → Settings → General
   - Framework Preset debería ser "Other" o "Vite"
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. **Forzar redeploy**:
   ```bash
   vercel --prod --force
   ```

3. **Verificar que los archivos estén en el repositorio**:
   ```bash
   git add api/ vercel.json
   git commit -m "Add serverless functions"
   git push
   ```

## Solución alternativa: Usar rewrites directos

Si las funciones serverless no funcionan, podemos intentar usar rewrites directos en `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://9.234.137.128:8000/:path*"
    }
  ]
}
```

Sin embargo, esto puede no funcionar para requests POST con body.

## Verificar logs en tiempo real

Puedes usar Vercel CLI para ver logs en tiempo real:

```bash
vercel logs proyecto-tryton-gnuhealth --follow
```

Esto mostrará todos los logs de las funciones serverless en tiempo real.
