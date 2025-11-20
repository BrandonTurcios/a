import { useState, useEffect } from "react";
import { message, Spin, Modal, Input, Form } from "antd";
import { useTranslation } from "react-i18next";
import { LockOutlined } from '@ant-design/icons';
import Login from "./components/Login";
import Dashboard from "./app/dashboard/Dashboard";
import trytonService from "./services/trytonService";

function App() {
  const { t, i18n } = useTranslation();
  const [sessionData, setSessionData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingLanguageChange, setPendingLanguageChange] = useState(null);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    // Verificar si hay una sesión guardada al cargar la aplicación
    const savedSession = localStorage.getItem("tryton_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        // Restaurar sesión en el servicio de Tryton
        const restored = trytonService.restoreSession(session);
        if (restored) {
          setSessionData(session);

          if (session.language) {
            i18n.changeLanguage(session.language);
          }
        } else {
          localStorage.removeItem("tryton_session");
        }
      } catch (error) {
        console.error("Error parsing session data:", error);
        localStorage.removeItem("tryton_session");
      }
    }
    setIsLoading(false);
  }, [i18n]);

  const handleLogin = (session, password) => {
    setSessionData(session);
    // Guardar la sesión en localStorage para persistencia (sin password)
    localStorage.setItem("tryton_session", JSON.stringify(session));

    if (session.language) {
      i18n.changeLanguage(session.language);
      localStorage.setItem("tryton_language", session.language);
    }
  };

  const handleLogout = () => {
    setSessionData(null);
    // Limpiar la sesión de localStorage y sessionStorage
    localStorage.removeItem("tryton_session");
    sessionStorage.removeItem("tryton_nav_state");
  };

  const handleLanguageChange = async (newLanguage, navigationState) => {
    if (!sessionData) {
      message.warning(t("app.languageChangeWarning"));
      handleLogout();
      return;
    }

    setPendingLanguageChange({ newLanguage, navigationState });
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async (values) => {
    if (!pendingLanguageChange) return;

    const { newLanguage, navigationState } = pendingLanguageChange;

    try {
      setIsChangingLanguage(true);
      setShowPasswordModal(false);
      passwordForm.resetFields();

      // Guardar estado de navegación antes de recargar
      if (navigationState) {
        sessionStorage.setItem(
          "tryton_nav_state",
          JSON.stringify(navigationState)
        );
      }

      // Hacer re-login con el nuevo idioma
      const newSession = await trytonService.login(
        sessionData.database,
        sessionData.username,
        values.password,
        newLanguage
      );

      // Actualizar sesión
      setSessionData(newSession);
      localStorage.setItem("tryton_session", JSON.stringify(newSession));

      // Guardar el idioma seleccionado
      localStorage.setItem("tryton_language", newLanguage);

      // Cambiar el idioma de i18n
      await i18n.changeLanguage(newLanguage);

      // Recargar la página para actualizar todo el contenido traducido
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      setIsChangingLanguage(false);
      message.error(t("app.languageChangeError") + ": " + error.message);
      console.error("Error changing language:", error);
    }
  };

  const handlePasswordModalCancel = () => {
    setShowPasswordModal(false);
    setPendingLanguageChange(null);
    passwordForm.resetFields();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t("app.loadingTryton")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Overlay de cambio de idioma */}
      {isChangingLanguage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.3s ease-in-out",
          }}
        >
          <Spin size="large" />
          <p style={{ marginTop: "24px", fontSize: "16px", color: "#333" }}>
            {t("app.changingLanguage")}
          </p>
        </div>
      )}

      {/* Modal para pedir contraseña al cambiar idioma */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LockOutlined />
            {t("app.passwordRequired")}
          </div>
        }
        open={showPasswordModal}
        onOk={() => passwordForm.submit()}
        onCancel={handlePasswordModalCancel}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
        destroyOnClose
      >
        <Form
          form={passwordForm}
          onFinish={handlePasswordSubmit}
          layout="vertical"
        >
          <Form.Item
            name="password"
            label={t("login.password")}
            rules={[{ required: true, message: t("login.enterPassword") }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder={t("login.password")}
              autoFocus
              size="large"
            />
          </Form.Item>
        </Form>
      </Modal>

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

export default App;
