// Handler para TODAS las rutas /api/*
// Maneja /api, /api/, /api/gnuhealth_demo/, etc.
const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Log inicial
  console.log(`[Proxy index] ====== HANDLER INDEX.JS EJECUTADO ======`, {
    method: req.method,
    url: req.url,
    query: req.query,
    timestamp: new Date().toISOString()
  });
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
  // Extraer el path desde req.query.path (viene del rewrite) o desde req.url
  let trytonPath = '/';
  
  // PRIMERO: Intentar obtener el path desde req.query.path (viene del rewrite)
  if (req.query && req.query.path !== undefined) {
    const queryPath = req.query.path;
    if (queryPath) {
      // El path puede venir como string o array
      const pathString = Array.isArray(queryPath) ? queryPath.join('/') : String(queryPath);
      if (pathString && pathString.trim() !== '') {
        trytonPath = `/${pathString}`;
        // Asegurar que termine con / si no tiene extensión
        if (!trytonPath.endsWith('/') && !pathString.includes('.')) {
          trytonPath += '/';
        }
      }
    }
  } else {
    // FALLBACK: Extraer el path desde req.url si no viene en query
    let urlPath = req.url || '/';
    const urlWithoutQuery = urlPath.split('?')[0];
    trytonPath = urlWithoutQuery.replace(/^\/api\/?/, '') || '/';
    
    if (!trytonPath || trytonPath === '') {
      trytonPath = '/';
    }
    
    if (!trytonPath.startsWith('/')) {
      trytonPath = '/' + trytonPath;
    }
    
    if (trytonPath !== '/' && !trytonPath.endsWith('/') && !trytonPath.includes('.')) {
      trytonPath += '/';
    }
  }
  
  const trytonUrl = `${TRYTON_SERVER}${trytonPath}`;
  
  console.log(`[Proxy index] Details:`, {
    originalUrl: req.url,
    queryPath: req.query?.path,
    trytonPath: trytonPath,
    trytonUrl: trytonUrl,
    method: req.method
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
      message: error.message,
      url: trytonUrl
    });
  }
}
