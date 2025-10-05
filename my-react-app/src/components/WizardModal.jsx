import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, message, Spin } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';

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
    }
  }, [wizardInfo, visible, form]);

  // Generar campos del formulario basado en fieldsView
  const generateFormFields = (fieldsView) => {
    if (!fieldsView || !fieldsView.fields) {
      return [];
    }

    const fields = [];
    const fieldDefinitions = fieldsView.fields;

    // Procesar cada campo
    Object.keys(fieldDefinitions).forEach(fieldName => {
      const fieldDef = fieldDefinitions[fieldName];
      
      if (fieldDef) {
        fields.push({
          name: fieldName,
          fieldDef: fieldDef,
          required: fieldDef.required || false,
          readonly: fieldDef.readonly || false,
          type: fieldDef.type,
          string: fieldDef.string || fieldName,
          help: fieldDef.help || '',
          domain: fieldDef.domain || '[]'
        });
      }
    });

    console.log(`✅ Campos generados para wizard: ${fields.length}`);
    return fields;
  };

  // Cargar opciones de selección para campos many2one
  const loadSelectionOptions = async (fieldsView) => {
    if (!fieldsView || !fieldsView.fields) {
      return;
    }

    const options = {};
    const fieldDefinitions = fieldsView.fields;

    // Procesar campos many2one
    Object.keys(fieldDefinitions).forEach(fieldName => {
      const fieldDef = fieldDefinitions[fieldName];
      
      if (fieldDef && fieldDef.type === 'many2one' && fieldDef.relation) {
        // Por ahora, establecer opciones vacías
        // En el futuro se pueden cargar dinámicamente
        options[fieldName] = [];
      }
    });

    setSelectionOptions(options);
  };

  // Manejar envío del formulario
  const handleSubmit = async (values) => {
    try {
      setInternalLoading(true);
      console.log('🧙 Enviando formulario de wizard:', values);
      
      // Encontrar el botón por defecto o el primer botón de submit
      const submitButton = wizardInfo.buttons?.find(btn => btn.default || btn.validate);
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
      await onCancel();
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
            <select {...commonProps}>
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
    if (!wizardInfo.buttons || wizardInfo.buttons.length === 0) {
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={currentLoading}
        >
          {formFields.map(renderFormField)}
        </Form>
      </Spin>
    </Modal>
  );
};

export default WizardModal;
