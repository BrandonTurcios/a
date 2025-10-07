import { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Card, 
  Typography, 
  Alert, 
  Spin
} from 'antd';
import { 
  ExclamationCircleOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';

const { Title, Text } = Typography;
const { Option } = Select;

const Login = ({ onLogin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  useEffect(() => {
    // Obtener las bases de datos disponibles al cargar el componente (como hace el SAO)
    fetchDatabases();
  }, []);

  // Efecto para auto-seleccionar la base de datos si solo hay una
  useEffect(() => {
    if (databases.length === 1) {
      const currentDatabase = form.getFieldValue('database');
      if (!currentDatabase) {
        form.setFieldsValue({ database: databases[0] });
        setSelectedDatabase(databases[0]);
      }
    }
  }, [databases, form]);

  const fetchDatabases = async () => {
    try {
      setLoadingDatabases(true);
      console.log('🔍 Obteniendo bases de datos disponibles...');
      
      // Usar el método robusto del servicio que maneja errores
      const databases = await trytonService.getAvailableDatabases();
      console.log('✅ Bases de datos obtenidas:', databases);
      
      if (databases && Array.isArray(databases) && databases.length > 0) {
        setDatabases(databases);
      } else {
        console.log('No se encontraron bases de datos');
        setDatabases([]);
      }
    } catch (error) {
      console.error('Error obteniendo bases de datos:', error);
      setDatabases([]);
    } finally {
      setLoadingDatabases(false);
    }
  };


  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');

    try {
      const sessionData = await trytonService.login(
        values.database,
        values.username,
        values.password
      );
      
      onLogin(sessionData);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#F8F9FA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <Card 
          style={{ 
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid #E0E7EB'
          }}
          bodyStyle={{ padding: '40px' }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#00A88E',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <span style={{ fontSize: '24px', color: 'white' }}>🏥</span>
            </div>
            <Title level={3} style={{ margin: '0 0 8px 0', color: '#333333' }}>
              Tryton Management
            </Title>
            <Text style={{ color: '#6C757D', fontSize: '16px' }}>
              Inicia sesión en tu servidor
            </Text>
          </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              {/* Campo de Base de Datos */}
              <Form.Item
                name="database"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>Base de Datos</span>}
                rules={[{ required: true, message: 'Por favor selecciona una base de datos' }]}
              >
                {loadingDatabases ? (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <Spin />
                    <div style={{ marginTop: '8px', color: '#6C757D' }}>
                      Cargando...
                    </div>
                  </div>
                ) : databases.length > 0 ? (
                  <Select
                    placeholder="Selecciona una base de datos"
                    style={{ width: '100%', height: '40px' }}
                    showSearch
                    onChange={(value) => setSelectedDatabase(value)}
                  >
                    {databases.map((db, index) => (
                      <Option key={index} value={db}>
                        {db}
                      </Option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    placeholder="Nombre de la base de datos"
                    style={{ height: '40px' }}
                  />
                )}
              </Form.Item>

              {/* Campo de Usuario */}
              <Form.Item
                name="username"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>Usuario</span>}
                rules={[{ required: true, message: 'Por favor ingresa tu nombre de usuario' }]}
              >
                <Input 
                  placeholder="Nombre de usuario" 
                  style={{ height: '40px' }}
                />
              </Form.Item>

              {/* Campo de Contraseña */}
              <Form.Item
                name="password"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>Contraseña</span>}
                rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
              >
                <Input.Password 
                  placeholder="Contraseña" 
                  style={{ height: '40px' }}
                />
              </Form.Item>

              {/* Mensaje de Error */}
              {error && (
                <Alert
                  message="Error de autenticación"
                  description={error}
                  type="error"
                  icon={<ExclamationCircleOutlined />}
                  showIcon
                  style={{ marginBottom: '24px' }}
                />
              )}

              {/* Botón de Login */}
              <Form.Item style={{ marginBottom: '0' }}>
                <Button
                  htmlType="submit"
                  loading={loading}
                  disabled={loadingDatabases}
                  block
                  style={{
                    height: '44px',
                    background: '#00A88E',
                    borderColor: '#00A88E',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '500'
                  }}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
    </div>
  );
};

export default Login;
