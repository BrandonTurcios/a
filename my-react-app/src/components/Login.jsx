import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import LanguageSelector from './LanguageSelector';

const { Title, Text } = Typography;
const { Option } = Select;

const Login = ({ onLogin }) => {
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [databases, setDatabases] = useState([]);
  const [loadingDatabases, setLoadingDatabases] = useState(true);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language || 'en');

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
        values.password,
        selectedLanguage
      );

      // Pass both session data and password to parent
      onLogin(sessionData, values.password);
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
              <span style={{ fontSize: '24px', color: 'white', fontWeight: 'bold' }}>T</span>
            </div>
            <Title level={3} style={{ margin: '0 0 8px 0', color: '#333333' }}>
              {t('login.title')}
            </Title>
            <Text style={{ color: '#6C757D', fontSize: '16px' }}>
              {t('login.subtitle')}
            </Text>
          </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              {/* Database Field */}
              <Form.Item
                name="database"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>{t('login.database')}</span>}
                rules={[{ required: true, message: t('login.selectDatabaseError') }]}
              >
                {loadingDatabases ? (
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <Spin />
                    <div style={{ marginTop: '8px', color: '#6C757D' }}>
                      {t('login.loadingDatabases')}
                    </div>
                  </div>
                ) : databases.length > 0 ? (
                  <Select
                    placeholder={t('login.selectDatabase')}
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
                    placeholder={t('login.database')}
                    style={{ height: '40px' }}
                  />
                )}
              </Form.Item>

              {/* Username Field */}
              <Form.Item
                name="username"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>{t('login.username')}</span>}
                rules={[{ required: true, message: t('login.enterUsername') }]}
              >
                <Input
                  placeholder={t('login.username')}
                  style={{ height: '40px' }}
                />
              </Form.Item>

              {/* Password Field */}
              <Form.Item
                name="password"
                label={<span style={{ color: '#333333', fontWeight: '500' }}>{t('login.password')}</span>}
                rules={[{ required: true, message: t('login.enterPassword') }]}
              >
                <Input.Password
                  placeholder={t('login.password')}
                  style={{ height: '40px' }}
                />
              </Form.Item>

              {/* Language Selector */}
              <Form.Item
                label={<span style={{ color: '#333333', fontWeight: '500' }}>{t('login.language')}</span>}
              >
                <LanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  style={{ width: '100%', height: '40px' }}
                />
              </Form.Item>

              {/* Error Message */}
              {error && (
                <Alert
                  message={t('login.authError')}
                  description={error}
                  type="error"
                  icon={<ExclamationCircleOutlined />}
                  showIcon
                  style={{ marginBottom: '24px' }}
                />
              )}

              {/* Login Button */}
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
                  {loading ? t('login.signingIn') : t('login.signIn')}
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </div>
    </div>
  );
};

export default Login;
