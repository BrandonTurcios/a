// Handler para todas las rutas /api/* con path
// Este archivo se llama desde el rewrite en vercel.json
const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Log inicial
  console.log(`[Proxy proxy] ====== HANDLER PROXY.JS EJECUTADO ======`, {
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
  
  // Extraer el path desde req.query.path (del rewrite) o desde req.url
  let trytonPath = '/';
  
  // PRIMERO: Intentar obtener desde req.query.path (viene del rewrite)
  if (req.query && req.query.path !== undefined) {
    const queryPath = req.query.path;
    if (queryPath) {
      const pathString = Array.isArray(queryPath) ? queryPath.join('/') : String(queryPath);
      if (pathString && pathString.trim() !== '') {
        trytonPath = `/${pathString}`;
        if (!trytonPath.endsWith('/') && !pathString.includes('.')) {
          trytonPath += '/';
        }
      }
    }
  } else {
    // FALLBACK: Extraer desde req.url o headers
    // Intentar desde headers primero
    const forwardedUri = req.headers['x-forwarded-uri'] || 
                         req.headers['x-vercel-original-path'] ||
                         null;
    
    if (forwardedUri) {
      const pathFromHeader = forwardedUri.replace(/^\/api\/?/, '') || '/';
      if (pathFromHeader && pathFromHeader !== '') {
        trytonPath = pathFromHeader.startsWith('/') ? pathFromHeader : `/${pathFromHeader}`;
        if (!trytonPath.endsWith('/') && !pathFromHeader.includes('.')) {
          trytonPath += '/';
        }
      }
    } else {
      // Último fallback: desde req.url
      const urlPath = req.url || '/';
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
  }
  
  const trytonUrl = `${TRYTON_SERVER}${trytonPath}`;
  
  console.log(`[Proxy proxy] Details:`, {
    reqUrl: req.url,
    queryPath: req.query?.path,
    trytonPath: trytonPath,
    trytonUrl: trytonUrl,
    method: req.method,
    headers: {
      'x-forwarded-uri': req.headers['x-forwarded-uri'],
      'x-vercel-original-path': req.headers['x-vercel-original-path']
    }
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
    
    console.log(`[Proxy proxy] Making request to Tryton:`, {
      url: trytonUrl,
      method: req.method,
      hasBody: !!body
    });
    
    const response = await fetch(trytonUrl, {
      method: req.method,
      headers,
      body,
    });
    
    console.log(`[Proxy proxy] Tryton response:`, {
      status: response.status,
      statusText: response.statusText
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
