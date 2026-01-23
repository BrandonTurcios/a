// Vercel Serverless Function para proxy de Tryton
// Captura todas las rutas bajo /api/*
export default async function handler(req, res) {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }
  
  // Obtener el path de los parámetros de ruta
  const path = req.query.path || [];
  const pathString = Array.isArray(path) ? path.join('/') : path;
  
  // Construir la URL del servidor Tryton
  // Si path está vacío, usar '/', sino usar el path completo
  const trytonPath = pathString ? `/${pathString}` : '/';
  const trytonUrl = `http://9.234.137.128:8000${trytonPath}`;
  
  console.log(`Proxying ${req.method} ${trytonUrl}`);
  
  // Obtener el método y headers de la request original
  const method = req.method;
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
    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }
    
    // Hacer la request al servidor Tryton
    const response = await fetch(trytonUrl, {
      method,
      headers,
      body,
    });
    
    // Obtener la respuesta
    const data = await response.text();
    
    // Intentar parsear como JSON, si falla usar texto
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
    
    // Agregar CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Copiar otros headers importantes de la respuesta
    if (response.headers.get('content-type')) {
      res.setHeader('Content-Type', response.headers.get('content-type'));
    }
    
    // Enviar respuesta
    res.status(response.status).json(jsonData);
  } catch (error) {
    console.error('Error en proxy:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Error al conectar con el servidor Tryton',
      message: error.message 
    });
  }
}
