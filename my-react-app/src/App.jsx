import { useState, useEffect } from 'react'
import { message, Spin } from 'antd'
import { useTranslation } from 'react-i18next'
import Login from './components/Login'
import Dashboard from './app/dashboard/Dashboard'
import trytonService from './services/trytonService'

function App() {
  const { t, i18n } = useTranslation();
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  useEffect(() => {
    // Verificar si hay una sesión guardada al cargar la aplicación
    const savedSession = localStorage.getItem('tryton_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Restaurar sesión en el servicio de Tryton
        const restored = trytonService.restoreSession(session);
        if (restored) {
          setSessionData(session);
        } else {
          localStorage.removeItem('tryton_session');
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
        localStorage.removeItem('tryton_session');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (session, password) => {
    setSessionData(session);
    // Guardar password en sessionStorage (se limpia al cerrar el tab)
    sessionStorage.setItem('tryton_temp_pwd', btoa(password)); // Base64 básico
    // Guardar la sesión en localStorage para persistencia (sin password)
    localStorage.setItem('tryton_session', JSON.stringify(session));
  };

  const handleLogout = () => {
    setSessionData(null);
    // Limpiar la sesión de localStorage y sessionStorage
    localStorage.removeItem('tryton_session');
    sessionStorage.removeItem('tryton_temp_pwd');
    sessionStorage.removeItem('tryton_nav_state');
  };

  const handleLanguageChange = async (newLanguage, navigationState) => {
    // Intentar obtener el password de sessionStorage
    const encodedPassword = sessionStorage.getItem('tryton_temp_pwd');

    if (!sessionData || !encodedPassword) {
      message.warning(t('app.languageChangeWarning'));
      handleLogout();
      return;
    }

    const password = atob(encodedPassword);

    try {
      setIsChangingLanguage(true);

      // Guardar estado de navegación antes de recargar
      if (navigationState) {
        sessionStorage.setItem('tryton_nav_state', JSON.stringify(navigationState));
      }

      // Hacer re-login con el nuevo idioma
      const newSession = await trytonService.login(
        sessionData.database,
        sessionData.username,
        password,
        newLanguage
      );

      // Actualizar sesión
      setSessionData(newSession);
      localStorage.setItem('tryton_session', JSON.stringify(newSession));

      // Guardar el idioma seleccionado
      localStorage.setItem('tryton_language', newLanguage);

      // Cambiar el idioma de i18n
      await i18n.changeLanguage(newLanguage);

      // Recargar la página para actualizar todo el contenido traducido
      // El overlay se mantiene hasta que recargue
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      setIsChangingLanguage(false);
      message.error(t('app.languageChangeError'));
      console.error('Error changing language:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('app.loadingTryton')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Overlay de cambio de idioma */}
      {isChangingLanguage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.3s ease-in-out'
        }}>
          <Spin size="large" />
          <p style={{ marginTop: '24px', fontSize: '16px', color: '#333' }}>
            {t('app.changingLanguage')}
          </p>
        </div>
      )}

      {sessionData ? (
        <Dashboard
          sessionData={sessionData}
          onLogout={handleLogout}
          onLanguageChange={handleLanguageChange}
        />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto py-8">
            <Login onLogin={handleLogin} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App
