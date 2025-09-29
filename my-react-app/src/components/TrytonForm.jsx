import { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  DatePicker, 
  Switch, 
  InputNumber, 
  Row, 
  Col, 
  Space, 
  Typography, 
  Divider, 
  Spin, 
  Alert,
  Tag,
  Tooltip
} from 'antd';
import { 
  SaveOutlined, 
  EditOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const TrytonForm = ({ 
  model, 
  viewId, 
  viewType = 'form', 
  recordId = null, 
  recordData = null,
  title = 'Formulario',
  onSave = null,
  onCancel = null,
  readonly = false 
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formInfo, setFormInfo] = useState(null);
  const [formData, setFormData] = useState({});
  const [fields, setFields] = useState([]);
  const [isEditing, setIsEditing] = useState(!readonly && !recordId);

  useEffect(() => {
    if (model && viewId) {
      loadFormData();
    }
  }, [model, viewId, viewType, recordId]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Cargando formulario para modelo: ${model}, vista: ${viewId}`);
      
      // Obtener información completa del formulario
      const formInfo = await trytonService.getFormInfo(model, viewId, viewType, recordId);
      console.log('🔍 Información de formulario obtenida:', formInfo);
      
      setFormInfo(formInfo.fieldsView);
      
      // Generar campos del formulario
      const formFields = generateFormFields(formInfo.fieldsView);
      setFields(formFields);
      
      // Si hay datos del registro, establecerlos
      if (formInfo.data || recordData) {
        const dataToUse = formInfo.data || recordData;
        setFormData(dataToUse);
        form.setFieldsValue(dataToUse);
        console.log('✅ Datos del registro establecidos:', dataToUse);
      } else {
        // Formulario nuevo - establecer valores por defecto
        const defaultValues = getDefaultValues(formInfo.fieldsView);
        setFormData(defaultValues);
        form.setFieldsValue(defaultValues);
        console.log('✅ Valores por defecto establecidos:', defaultValues);
      }
      
    } catch (error) {
      console.error('❌ Error cargando formulario:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };


  const generateFormFields = (fieldsView) => {
    const formFields = [];
    
    if (!fieldsView.fields) {
      return formFields;
    }
    
    // Obtener campos del arch XML
    const archFields = parseArchFields(fieldsView.arch);
    console.log('🔍 Campos encontrados en arch:', archFields);
    
    // Procesar campos que están en el arch o son básicos
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      const isInArch = archFields.includes(fieldName);
      const isBasicField = ['id', 'name', 'code', 'rec_name', 'active'].includes(fieldName);
      
      if (isInArch || isBasicField) {
        console.log(`✅ Incluyendo campo: ${fieldName} (tipo: ${fieldDef.type})`);
        formFields.push({
          name: fieldName,
          label: fieldDef.string || fieldName,
          fieldDef,
          required: fieldDef.required || false,
          readonly: fieldDef.readonly || false,
          help: fieldDef.help || null
        });
      } else {
        console.log(`⏭️ Omitiendo campo: ${fieldName} (no está en arch ni es básico)`);
      }
    });
    
    console.log(`📋 Total de campos del formulario: ${formFields.length}`);
    return formFields;
  };

  const shouldIncludeField = (fieldName, arch) => {
    // Verificar si el campo está en el arch de la vista
    if (arch && arch.includes(`name="${fieldName}"`)) {
      return true;
    }
    
    // Campos básicos que siempre incluir
    const basicFields = ['id', 'name', 'code', 'rec_name', 'active'];
    
    return basicFields.includes(fieldName);
  };

  const parseArchFields = (arch) => {
    if (!arch) return [];
    
    const fieldMatches = arch.match(/name="([^"]+)"/g);
    if (!fieldMatches) return [];
    
    return fieldMatches.map(match => match.replace(/name="([^"]+)"/, '$1'));
  };

  const getDefaultValues = (fieldsView) => {
    const defaults = {};
    
    if (fieldsView.fields) {
      Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
        if (fieldDef.default) {
          defaults[fieldName] = fieldDef.default;
        }
      });
    }
    
    return defaults;
  };

  const renderFormField = (field) => {
    const { name, label, fieldDef, required, readonly, help } = field;
    const fieldType = fieldDef.type;
    const isReadonly = readonly || !isEditing;
    
    const commonProps = {
      name,
      label: help ? (
        <div>
          <div>{label}</div>
          {help && (
            <Text type="secondary" style={{ fontSize: '12px', fontWeight: 'normal' }}>
              {help}
            </Text>
          )}
        </div>
      ) : label,
      required,
      disabled: isReadonly,
      style: { marginBottom: '16px' }
    };

    switch (fieldType) {
      case 'char':
      case 'varchar':
        return (
          <Form.Item key={name} {...commonProps}>
            <Input placeholder={`Ingrese ${label.toLowerCase()}`} />
          </Form.Item>
        );
        
      case 'text':
        return (
          <Form.Item key={name} {...commonProps}>
            <Input.TextArea 
              rows={4} 
              placeholder={`Ingrese ${label.toLowerCase()}`}
            />
          </Form.Item>
        );
        
      case 'integer':
      case 'bigint':
        return (
          <Form.Item key={name} {...commonProps}>
            <InputNumber 
              style={{ width: '100%' }}
              placeholder={`Ingrese ${label.toLowerCase()}`}
            />
          </Form.Item>
        );
        
      case 'float':
      case 'numeric':
        return (
          <Form.Item key={name} {...commonProps}>
            <InputNumber 
              style={{ width: '100%' }}
              step={0.01}
              placeholder={`Ingrese ${label.toLowerCase()}`}
            />
          </Form.Item>
        );
        
      case 'boolean':
        return (
          <Form.Item key={name} {...commonProps} valuePropName="checked">
            <Switch />
          </Form.Item>
        );
        
      case 'date':
        return (
          <Form.Item key={name} {...commonProps}>
            <DatePicker 
              style={{ width: '100%' }}
              placeholder={`Seleccione ${label.toLowerCase()}`}
            />
          </Form.Item>
        );
        
      case 'datetime':
        return (
          <Form.Item key={name} {...commonProps}>
            <DatePicker 
              showTime
              style={{ width: '100%' }}
              placeholder={`Seleccione ${label.toLowerCase()}`}
            />
          </Form.Item>
        );
        
      case 'timedelta':
        return (
          <Form.Item key={name} {...commonProps}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <InputNumber 
                placeholder="Días"
                style={{ flex: 1 }}
                min={0}
              />
              <InputNumber 
                placeholder="Horas"
                style={{ flex: 1 }}
                min={0}
                max={23}
              />
              <InputNumber 
                placeholder="Minutos"
                style={{ flex: 1 }}
                min={0}
                max={59}
              />
            </div>
          </Form.Item>
        );
        
      case 'selection':
        const options = fieldDef.selection || [];
        // Si selection es una función (string), mostrar placeholder
        if (typeof fieldDef.selection === 'string') {
          return (
            <Form.Item key={name} {...commonProps}>
              <Select placeholder={`Seleccione ${label.toLowerCase()}`}>
                <Option value="loading">Cargando opciones...</Option>
              </Select>
            </Form.Item>
          );
        }
        return (
          <Form.Item key={name} {...commonProps}>
            <Select placeholder={`Seleccione ${label.toLowerCase()}`}>
              {options.map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
        
      case 'many2one':
        return (
          <Form.Item key={name} {...commonProps}>
            <Select 
              placeholder={`Seleccione ${label.toLowerCase()}`}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {/* Las opciones se cargarían dinámicamente */}
              <Option value="loading">Cargando opciones...</Option>
            </Select>
          </Form.Item>
        );
        
      case 'multiselection':
        const multiselectionOptions = fieldDef.selection || [];
        return (
          <Form.Item key={name} {...commonProps}>
            <Select 
              mode="multiple"
              placeholder={`Seleccione ${label.toLowerCase()}`}
              style={{ width: '100%' }}
            >
              {multiselectionOptions.map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
        
      case 'many2many':
        return (
          <Form.Item key={name} {...commonProps}>
            <Select 
              mode="multiple"
              placeholder={`Seleccione ${label.toLowerCase()}`}
              style={{ width: '100%' }}
            >
              {/* Las opciones se cargarían dinámicamente */}
              <Option value="loading">Cargando opciones...</Option>
            </Select>
          </Form.Item>
        );
        
      case 'one2many':
        return (
          <Form.Item key={name} {...commonProps}>
            <div style={{ 
              padding: '12px', 
              border: '1px dashed #d9d9d9', 
              borderRadius: '6px',
              textAlign: 'center',
              color: '#8c8c8c'
            }}>
              <Text type="secondary">
                Campo de relación uno-a-muchos (one2many)
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Se implementará en futuras versiones
              </Text>
            </div>
          </Form.Item>
        );
        
      case 'binary':
        return (
          <Form.Item key={name} {...commonProps}>
            <div style={{ 
              padding: '12px', 
              border: '1px dashed #d9d9d9', 
              borderRadius: '6px',
              textAlign: 'center',
              color: '#8c8c8c'
            }}>
              <Text type="secondary">
                Campo de archivo (binary)
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Se implementará en futuras versiones
              </Text>
            </div>
          </Form.Item>
        );
        
      default:
        return (
          <Form.Item key={name} {...commonProps}>
            <Input placeholder={`Ingrese ${label.toLowerCase()}`} />
          </Form.Item>
        );
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      setError(null);
      
      console.log('💾 Guardando formulario:', values);
      
      if (recordId) {
        // Actualizar registro existente
        await trytonService.updateRecord(model, recordId, values);
        console.log('✅ Registro actualizado');
      } else {
        // Crear nuevo registro
        const newId = await trytonService.createRecord(model, values);
        console.log('✅ Nuevo registro creado:', newId);
        setFormData({ ...formData, id: newId[0] });
      }
      
      setIsEditing(false);
      
      if (onSave) {
        onSave(values, recordId);
      }
      
    } catch (error) {
      console.error('❌ Error guardando formulario:', error);
      setError(`Error guardando: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (recordId) {
      // Restaurar datos originales
      form.setFieldsValue(formData);
      setIsEditing(false);
    } else {
      // Limpiar formulario
      form.resetFields();
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '200px' 
      }}>
        <Spin size="large" />
        <Text style={{ marginLeft: '16px' }}>Cargando formulario...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={loadFormData}>
            Reintentar
          </Button>
        }
      />
    );
  }

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type="secondary">
              {model} {recordId ? `- Registro ${recordId}` : '- Nuevo registro'}
            </Text>
          </div>
          <Space>
            {!readonly && (
              <>
                {isEditing ? (
                  <>
                    <Button 
                      type="primary" 
                      icon={<SaveOutlined />}
                      loading={saving}
                      onClick={() => form.submit()}
                    >
                      Guardar
                    </Button>
                    <Button 
                      icon={<MinusOutlined />}
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button 
                    type="primary" 
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                  >
                    Editar
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>
      }
      style={{ borderRadius: '12px' }}
      bodyStyle={{ padding: '24px' }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={formData}
      >
        <Row gutter={[24, 0]}>
          {fields.map((field, index) => (
            <Col 
              key={field.name} 
              xs={24} 
              sm={12} 
              lg={8}
              style={{ marginBottom: '16px' }}
            >
              {renderFormField(field)}
            </Col>
          ))}
        </Row>
        
        {fields.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: '#8c8c8c'
          }}>
            <Text>No hay campos disponibles para este formulario</Text>
          </div>
        )}
      </Form>
      
      {formInfo && (
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Vista: {viewId} | Tipo: {formInfo.type} | Campos: {fields.length}
          </Text>
        </div>
      )}
    </Card>
  );
};

export default TrytonForm;
