// Vercel Serverless Function para proxy de Tryton
// Captura todas las rutas bajo /api/*

const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Log inicial para verificar que la función se está ejecutando
  console.log(`[Proxy Handler] Function called - Method: ${req.method}, URL: ${req.url}`);
  
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
  // Obtener el path de los parámetros de ruta
  // req.query.path será un array para catch-all routes como [...path]
  const pathArray = req.query.path || [];
  const pathString = Array.isArray(pathArray) ? pathArray.join('/') : (pathArray || '');
  
  // Construir la URL del servidor Tryton
  // Si path está vacío (request a /api/), usar '/'
  // Si hay path (ej: gnuhealth_demo), usar /path/
  let trytonPath = '/';
  if (pathString && pathString.trim() !== '') {
    // Remover cualquier / inicial que pueda tener
    const cleanPath = pathString.replace(/^\/+/, '');
    trytonPath = `/${cleanPath}`;
    // Asegurar que termine con / si no tiene extensión (Tryton requiere esto)
    if (!trytonPath.endsWith('/') && !cleanPath.includes('.')) {
      trytonPath += '/';
    }
  }
  
  const trytonUrl = `${TRYTON_SERVER}${trytonPath}`;
  
  // Logging detallado para debugging
  console.log(`[Proxy] Request details:`, {
    method: req.method,
    url: req.url,
    query: req.query,
    pathArray: pathArray,
    pathString: pathString,
    trytonPath: trytonPath,
    trytonUrl: trytonUrl,
    body: req.body ? (typeof req.body === 'string' ? req.body.substring(0, 200) : JSON.stringify(req.body).substring(0, 200)) : 'no body'
  });
  
  // Preparar headers
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Copiar headers importantes de la request original
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization;
  }
  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }
  
  try {
    // Preparar el body si existe
    let body = undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      if (req.body) {
        body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }
    
    // Hacer la request al servidor Tryton
    const response = await fetch(trytonUrl, {
      method: req.method,
      headers,
      body,
    });
    
    // Obtener la respuesta
    const contentType = response.headers.get('content-type') || '';
    let responseData;
    
    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
    
    // Agregar CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Copiar content-type de la respuesta
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }
    
    // Enviar respuesta
    if (typeof responseData === 'object') {
      res.status(response.status).json(responseData);
    } else {
      res.status(response.status).send(responseData);
    }
  } catch (error) {
    console.error('[Proxy Error]', {
      error: error.message,
      stack: error.stack,
      url: trytonUrl,
      method: req.method,
      pathString: pathString
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Error al conectar con el servidor Tryton',
      message: error.message,
      url: trytonUrl,
      debug: {
        pathString: pathString,
        trytonPath: trytonPath,
        originalUrl: req.url
      }
    });
  }
}
