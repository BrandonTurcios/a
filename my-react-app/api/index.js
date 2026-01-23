// Función específica para /api/ (ruta raíz)
const TRYTON_SERVER = 'http://9.234.137.128:8000';

export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
  const trytonUrl = `${TRYTON_SERVER}/`;
  
  console.log(`[Proxy] ${req.method} /api/ -> ${trytonUrl}`);
  
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
