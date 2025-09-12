import { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Select, 
  Card, 
  Typography, 
  Alert, 
  Spin, 
  Space,
  Divider,
  Row,
  Col
} from 'antd';
import { 
  LoginOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { 
  Database, 
  User, 
  Lock
} from 'lucide-react';
import trytonService from '../services/trytonService';

const { Title, Text, Paragraph } = Typography;
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={10}>
          <Card 
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: 'none'
            }}
            bodyStyle={{ padding: '48px' }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
              }}>
                <LoginOutlined style={{ fontSize: '32px', color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: 0, color: '#1f2937' }}>
                Tryton Health Management
              </Title>
              <Paragraph style={{ color: '#6b7280', margin: '8px 0 0 0' }}>
                Conecta con tu servidor Tryton
              </Paragraph>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size="large"
            >
              {/* Campo de Base de Datos */}
              <Form.Item
                name="database"
                label={
                  <Space>
                    <Database style={{ color: '#667eea' }} />
                    <Text strong>Base de Datos</Text>
                  </Space>
                }
                rules={[{ required: true, message: 'Por favor selecciona una base de datos' }]}
              >
                {loadingDatabases ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '24px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <Spin size="large" />
                    <div style={{ marginTop: '12px', color: '#64748b' }}>
                      Cargando bases de datos...
                    </div>
                  </div>
                ) : databases.length > 0 ? (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Select
                      placeholder="Selecciona una base de datos"
                      style={{ width: '100%' }}
                      size="large"
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                      }
                      onChange={(value) => setSelectedDatabase(value)}
                    >
                      {databases.map((db, index) => (
                        <Option key={index} value={db}>
                          <Space>
                            <CheckCircleOutlined style={{ color: '#10b981' }} />
                            {db}
                          </Space>
                        </Option>
                      ))}
                    </Select>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '14px'
                    }}>
                      <Text type="secondary">
                        {databases.length} base(s) de datos encontrada(s)
                        {selectedDatabase && (
                          <span style={{ color: '#52c41a', marginLeft: '8px' }}>
                            ✓ {selectedDatabase} seleccionada
                          </span>
                        )}
                      </Text>
                      <Button 
                        type="link" 
                        icon={<ReloadOutlined />}
                        onClick={fetchDatabases}
                        size="small"
                      >
                        Actualizar
                      </Button>
                    </div>
                  </Space>
                ) : (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Input
                      placeholder="Ej: tryton, his-50, etc."
                      prefix={<Database style={{ color: '#9ca3af' }} />}
                    />
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      fontSize: '14px'
                    }}>
                      <Text type="secondary">
                        No se pudieron cargar las bases de datos
                      </Text>
                      <Button 
                        type="link" 
                        icon={<ReloadOutlined />}
                        onClick={fetchDatabases}
                        size="small"
                      >
                        Reintentar
                      </Button>
                    </div>
                  </Space>
                )}
              </Form.Item>

              {/* Campo de Usuario */}
              <Form.Item
                name="username"
                label={
                  <Space>
                    <User style={{ color: '#667eea' }} />
                    <Text strong>Usuario</Text>
                  </Space>
                }
                rules={[{ required: true, message: 'Por favor ingresa tu nombre de usuario' }]}
              >
                <Input
                  placeholder="Tu nombre de usuario"
                  prefix={<User style={{ color: '#9ca3af' }} />}
                />
              </Form.Item>

              {/* Campo de Contraseña */}
              <Form.Item
                name="password"
                label={
                  <Space>
                    <Lock style={{ color: '#667eea' }} />
                    <Text strong>Contraseña</Text>
                  </Space>
                }
                rules={[{ required: true, message: 'Por favor ingresa tu contraseña' }]}
              >
                <Input.Password
                  placeholder="Tu contraseña"
                  prefix={<Lock style={{ color: '#9ca3af' }} />}
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
              <Form.Item style={{ marginBottom: '24px' }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  disabled={loadingDatabases}
                  size="large"
                  block
                  style={{
                    height: '48px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                  icon={<LoginOutlined />}
                >
                  {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            {/* Información adicional */}
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                ¿Necesitas ayuda? Verifica que el servidor esté ejecutándose y las credenciales sean correctas.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login;
