// Handler catch-all para todas las rutas /api/*
// Este archivo captura todas las rutas que no coinciden con handlers más específicos
const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Obtener el path desde los parámetros de la ruta
  // En Vercel, [...path] captura todo y lo pone en req.query.path como array
  const pathArray = req.query.path || [];
  const pathString = Array.isArray(pathArray) ? pathArray.join('/') : pathArray;
  
  // Construir el path de Tryton
  let trytonPath = '/';
  if (pathString && pathString.trim() !== '') {
    trytonPath = `/${pathString}`;
    // Asegurar que termine con / si no tiene extensión (Tryton requiere esto)
    if (!trytonPath.endsWith('/') && !pathString.includes('.')) {
      trytonPath += '/';
    }
  }
  
  const trytonUrl = `${TRYTON_SERVER}${trytonPath}`;
  
  // Log para debugging
  console.log(`[Proxy catch-all] Details:`, {
    pathArray: pathArray,
    pathString: pathString,
    trytonPath: trytonPath,
    trytonUrl: trytonUrl,
    method: req.method,
    reqUrl: req.url,
    query: req.query
  });
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
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
