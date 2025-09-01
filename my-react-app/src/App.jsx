import { useState, useEffect } from 'react'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import ConnectionTest from './components/ConnectionTest'

function App() {
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay una sesión guardada al cargar la aplicación
    const savedSession = localStorage.getItem('tryton_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setSessionData(session);
      } catch (error) {
        console.error('Error parsing session data:', error);
        localStorage.removeItem('tryton_session');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (session) => {
    setSessionData(session);
    // Guardar la sesión en localStorage para persistencia
    localStorage.setItem('tryton_session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setSessionData(null);
    // Limpiar la sesión de localStorage
    localStorage.removeItem('tryton_session');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando Tryton...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {sessionData ? (
        <Dashboard sessionData={sessionData} onLogout={handleLogout} />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto py-8">
            <ConnectionTest />
            <div className="mt-8">
              <Login onLogin={handleLogin} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App
