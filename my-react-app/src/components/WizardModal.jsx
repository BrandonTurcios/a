import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, message, Spin, Card, Row, Col } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import trytonService from '../services/trytonService';

const WizardModal = ({
  visible,
  onClose,
  onCancel,
  onSubmit,
  wizardInfo,
  loading = false,
  title = "Wizard"
}) => {
  const [form] = Form.useForm();
  const [internalLoading, setInternalLoading] = useState(false);
  const [formFields, setFormFields] = useState([]);
  const [selectionOptions, setSelectionOptions] = useState({});

  const currentLoading = loading || internalLoading;

  useEffect(() => {
    if (wizardInfo && wizardInfo.fieldsView && visible) {
      console.log('🧙 Configurando formulario de wizard:', wizardInfo);
      
      // Generar campos del formulario
      const fields = generateFormFields(wizardInfo.fieldsView);
      setFormFields(fields);
      
      // Cargar opciones de selección
      loadSelectionOptions(wizardInfo.fieldsView);
      
      // Establecer valores por defecto
      if (wizardInfo.defaults) {
        console.log('🎯 Estableciendo valores por defecto:', wizardInfo.defaults);
        form.setFieldsValue(wizardInfo.defaults);
      }
      
      // Establecer valores iniciales
      if (wizardInfo.values) {
        console.log('🎯 Estableciendo valores iniciales:', wizardInfo.values);
        form.setFieldsValue(wizardInfo.values);
      }
    } else if (visible && !wizardInfo) {
      // Si el modal está visible pero no hay wizardInfo, mostrar mensaje de error
      console.warn('⚠️ Modal de wizard visible pero wizardInfo es null');
      setFormFields([]);
    }
  }, [wizardInfo, visible, form]);

  // Generar campos del formulario basado en fieldsView y arch
  const generateFormFields = (fieldsView) => {
    if (!fieldsView || !fieldsView.fields) {
      return [];
    }

    // Parsear el XML para obtener la estructura de grupos
    const groups = parseFormGroups(fieldsView.arch);
    const fieldDefinitions = fieldsView.fields;
    const fields = [];

    // Procesar cada grupo
    groups.forEach(group => {
      const groupFields = [];
      
      group.fields.forEach(fieldName => {
        const fieldDef = fieldDefinitions[fieldName];
        
        if (fieldDef) {
          groupFields.push({
            name: fieldName,
            fieldDef: fieldDef,
            required: fieldDef.required || false,
            readonly: fieldDef.readonly || false,
            type: fieldDef.type,
            string: fieldDef.string || fieldName,
            help: fieldDef.help || '',
            domain: fieldDef.domain || '[]',
            relation: fieldDef.relation,
            on_change_with: fieldDef.on_change_with || []
          });
        }
      });

      if (groupFields.length > 0) {
        fields.push({
          groupId: group.id,
          groupTitle: group.title,
          colspan: group.colspan,
          fields: groupFields
        });
      }
    });

    console.log(`✅ Grupos generados para wizard: ${fields.length}`);
    return fields;
  };

  // Parsear grupos del XML arch
  const parseFormGroups = (arch) => {
    if (!arch) return [];

    const groups = [];
    
    // Extraer grupos usando regex
    const groupRegex = /<group[^>]*id="([^"]*)"[^>]*colspan="([^"]*)"[^>]*>(.*?)<\/group>/gs;
    let match;
    
    while ((match = groupRegex.exec(arch)) !== null) {
      const groupId = match[1];
      const colspan = parseInt(match[2]) || 4;
      const groupContent = match[3];
      
      // Extraer campos del grupo
      const fieldRegex = /<field name="([^"]*)"[^>]*\/>/g;
      const fields = [];
      let fieldMatch;
      
      while ((fieldMatch = fieldRegex.exec(groupContent)) !== null) {
        fields.push(fieldMatch[1]);
      }
      
      // Determinar título del grupo basado en el ID
      let title = '';
      switch (groupId) {
        case 'header':
          title = 'Información Principal';
          break;
        case 'date':
          title = 'Fechas y Horarios';
          break;
        case 'footer':
          title = 'Configuración';
          break;
        default:
          title = groupId.charAt(0).toUpperCase() + groupId.slice(1);
      }
      
      groups.push({
        id: groupId,
        title: title,
        colspan: colspan,
        fields: fields
      });
    }
    
    return groups;
  };

  // Cargar opciones de selección para campos many2one
  const loadSelectionOptions = async (fieldsView) => {
    if (!fieldsView || !fieldsView.fields) {
      return;
    }

    const options = {};
    const fieldDefinitions = fieldsView.fields;

    // Procesar campos many2one
    for (const fieldName of Object.keys(fieldDefinitions)) {
      const fieldDef = fieldDefinitions[fieldName];
      
      if (fieldDef && fieldDef.type === 'many2one' && fieldDef.relation) {
        try {
          console.log(`🔍 Cargando opciones para ${fieldName} (${fieldDef.relation})`);
          
          // Intentar cargar opciones usando autocomplete
          const autocompleteMethod = `model.${fieldDef.relation}.autocomplete`;
          const autocompleteOptions = await trytonService.makeRpcCall(autocompleteMethod, []);
          
          if (autocompleteOptions && Array.isArray(autocompleteOptions)) {
            options[fieldName] = autocompleteOptions.map(option => ({
              value: option.id,
              label: option.name || option.rec_name || `ID: ${option.id}`
            }));
            console.log(`✅ Opciones cargadas para ${fieldName}: ${options[fieldName].length}`);
          } else {
            options[fieldName] = [];
          }
        } catch (error) {
          console.warn(`⚠️ No se pudieron cargar opciones para ${fieldName}:`, error.message);
          options[fieldName] = [];
        }
      }
    }

    setSelectionOptions(options);
  };

  // Manejar envío del formulario
  const handleSubmit = async (values) => {
    try {
      setInternalLoading(true);
      console.log('🧙 Enviando formulario de wizard:', values);
      
      // Encontrar el botón por defecto o el primer botón de submit
      const submitButton = wizardInfo?.buttons?.find(btn => btn.default || btn.validate);
      const buttonState = submitButton?.state || 'end';
      
      console.log(`🎯 Botón seleccionado: ${submitButton?.string}, Estado: ${buttonState}`);
      
      await onSubmit(values, buttonState);
      
      message.success('Wizard ejecutado exitosamente');
      onClose();
      
    } catch (error) {
      console.error('Error enviando wizard:', error);
      message.error('Error ejecutando wizard: ' + error.message);
    } finally {
      setInternalLoading(false);
    }
  };

  // Manejar cancelación
  const handleCancel = async () => {
    try {
      console.log('🧙 Cancelando wizard...');
      if (onCancel) {
        await onCancel();
      }
      onClose();
    } catch (error) {
      console.error('Error cancelando wizard:', error);
      message.error('Error cancelando wizard: ' + error.message);
    }
  };

  // Renderizar campo del formulario
  const renderFormField = (field) => {
    const { name, fieldDef, required, readonly, type, string } = field;

    if (!fieldDef) {
      return (
        <Form.Item key={name} name={name} label={string}>
          <input disabled placeholder="Campo no disponible" />
        </Form.Item>
      );
    }

    const commonProps = {
      placeholder: string,
      disabled: readonly || currentLoading
    };

    switch (type) {
      case 'char':
      case 'varchar':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <input {...commonProps} />
          </Form.Item>
        );

      case 'text':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <textarea {...commonProps} rows={4} />
          </Form.Item>
        );

      case 'integer':
      case 'float':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <input type="number" {...commonProps} />
          </Form.Item>
        );

      case 'boolean':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            valuePropName="checked"
            help={fieldDef.help}
          >
            <input type="checkbox" disabled={readonly || currentLoading} />
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <input type="date" {...commonProps} />
          </Form.Item>
        );

      case 'time':
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <input type="time" {...commonProps} />
          </Form.Item>
        );

      case 'many2one':
        const options = selectionOptions[name] || [];
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <select {...commonProps} style={{ width: '100%', height: '32px' }}>
              <option value="">Seleccionar...</option>
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Form.Item>
        );

      default:
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Campo ${string} es requerido` }] : []}
            help={fieldDef.help}
          >
            <input {...commonProps} placeholder={`Campo tipo ${type}`} />
          </Form.Item>
        );
    }
  };

  // Renderizar botones del wizard
  const renderButtons = () => {
    if (!wizardInfo || !wizardInfo.buttons || wizardInfo.buttons.length === 0) {
      return (
        <Space>
          <Button onClick={handleCancel} icon={<CloseOutlined />}>
            Cancelar
          </Button>
          <Button 
            type="primary" 
            onClick={() => form.submit()} 
            icon={<CheckOutlined />}
            loading={currentLoading}
          >
            Ejecutar
          </Button>
        </Space>
      );
    }

    return (
      <Space>
        {wizardInfo.buttons.map((button, index) => {
          if (button.validate) {
            return (
              <Button
                key={index}
                type={button.default ? "primary" : "default"}
                onClick={() => form.submit()}
                icon={<CheckOutlined />}
                loading={currentLoading}
              >
                {button.string}
              </Button>
            );
          } else {
            return (
              <Button
                key={index}
                onClick={handleCancel}
                icon={<CloseOutlined />}
              >
                {button.string}
              </Button>
            );
          }
        })}
      </Space>
    );
  };

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      footer={renderButtons()}
      width={800}
      destroyOnClose
      maskClosable={false}
    >
      <Spin spinning={currentLoading}>
        {wizardInfo ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            disabled={currentLoading}
          >
            {formFields.map((group, groupIndex) => (
              <Card 
                key={groupIndex}
                title={group.groupTitle}
                size="small"
                style={{ marginBottom: '16px' }}
              >
                <Row gutter={[16, 16]}>
                  {group.fields.map((field, fieldIndex) => (
                    <Col 
                      key={fieldIndex}
                      span={group.colspan === 4 ? 12 : group.colspan === 2 ? 24 : 8}
                    >
                      {renderFormField(field)}
                    </Col>
                  ))}
                </Row>
              </Card>
            ))}
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Error: No se pudo cargar la información del wizard</p>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default WizardModal;
