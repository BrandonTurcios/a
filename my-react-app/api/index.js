// Función para manejar TODAS las rutas bajo /api/*
// Vercel enruta /api/* a esta función cuando no hay otras funciones más específicas
const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Log inicial con toda la información disponible
  console.log(`[Proxy Handler index] Function called`, {
    method: req.method,
    url: req.url,
    query: req.query,
    queryPath: req.query?.path,
    headers: Object.keys(req.headers),
    // Headers específicos de Vercel que pueden contener el path original
    xForwardedUri: req.headers['x-forwarded-uri'],
    xVercelOriginalPath: req.headers['x-vercel-original-path'],
    referer: req.headers.referer,
    host: req.headers.host
  });
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
  // Obtener el path original
  // En Vercel, cuando hay rewrites, el path puede venir en req.query.path
  let urlPath = req.url || '/';
  
  // PRIMERO: Verificar si hay un query parameter (viene del rewrite en vercel.json)
  // El rewrite /api/:path* -> /api/proxy?path=:path* pone el path en query
  if (req.query && req.query.path !== undefined) {
    const queryPath = req.query.path;
    const pathString = Array.isArray(queryPath) ? queryPath.join('/') : queryPath;
    if (pathString) {
      urlPath = `/api/${pathString}`;
      console.log(`[Proxy] Found path in query parameter: ${urlPath}`);
    } else {
      // Path vacío significa que es /api/ o /api
      urlPath = '/api/';
      console.log(`[Proxy] Empty path in query, using /api/`);
    }
  } else {
    // Si no hay query parameter, intentar obtener del header x-forwarded-uri o x-vercel-original-path
    const forwardedUri = req.headers['x-forwarded-uri'] || 
                         req.headers['x-vercel-original-path'] ||
                         req.headers['x-invoke-path'] ||
                         null;
    
    if (forwardedUri) {
      urlPath = forwardedUri;
      console.log(`[Proxy] Found path in forwarded headers: ${forwardedUri}`);
    } else {
      // Intentar extraer del URL completo si está disponible
      // En Vercel, a veces el path completo está en req.url pero puede incluir query params
      if (req.url && req.url !== '/api' && req.url !== '/api/') {
        // Remover query params si existen
        const urlWithoutQuery = req.url.split('?')[0];
        if (urlWithoutQuery.startsWith('/api/')) {
          urlPath = urlWithoutQuery;
          console.log(`[Proxy] Using path from req.url: ${urlPath}`);
        }
      }
      
      // Si aún no tenemos el path, intentar extraer del referer
      if (urlPath === '/api/' || urlPath === '/api') {
        const referer = req.headers.referer || '';
        if (referer) {
          try {
            const refererUrl = new URL(referer);
            const refererPath = refererUrl.pathname;
            // Si el referer tiene un path que empieza con /api/
            if (refererPath.startsWith('/api/')) {
              urlPath = refererPath;
              console.log(`[Proxy] Extracted path from referer: ${refererPath}`);
            }
          } catch (e) {
            console.log(`[Proxy] Error parsing referer: ${e.message}`);
          }
        }
      }
    }
  }
  
  // Remover "/api" del inicio para obtener el path de Tryton
  let trytonPath = urlPath.replace(/^\/api\/?/, '') || '/';
  
  // Si después de remover /api queda vacío, usar /
  if (!trytonPath || trytonPath === '') {
    trytonPath = '/';
  }
  
  // Asegurar que empiece con /
  if (!trytonPath.startsWith('/')) {
    trytonPath = '/' + trytonPath;
  }
  
  // Asegurar que termine con / si no tiene extensión (Tryton requiere esto)
  // Pero no agregar / si ya es solo /
  if (trytonPath !== '/' && !trytonPath.endsWith('/') && !trytonPath.includes('.')) {
    trytonPath += '/';
  }
  
  const trytonUrl = `${TRYTON_SERVER}${trytonPath}`;
  
  console.log(`[Proxy index] Details:`, {
    originalUrl: urlPath,
    reqUrl: req.url,
    trytonPath: trytonPath,
    trytonUrl: trytonUrl,
    method: req.method,
    hasBody: !!req.body,
    bodyPreview: req.body ? (typeof req.body === 'string' ? req.body.substring(0, 200) : JSON.stringify(req.body).substring(0, 200)) : null,
    allHeaders: Object.keys(req.headers)
  });
  
  // Preparar headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }
  
  try {
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    const response = await fetch(trytonUrl, {
      method: req.method,
      headers,
      body,
    });
    
    const contentType = response.headers.get('content-type') || '';
    let responseData;
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    if (typeof responseData === 'object') {
      res.status(response.status).json(responseData);
    } else {
      res.status(response.status).send(responseData);
    }
  } catch (error) {
    console.error('[Proxy Error]', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Error al conectar con el servidor Tryton',
      message: error.message
    });
  }
}
