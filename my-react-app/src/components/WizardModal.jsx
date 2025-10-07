import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, message, Spin, Card, Row, Col, AutoComplete } from 'antd';
import { CloseOutlined, CheckOutlined } from '@ant-design/icons';
import trytonService from '../services/trytonService';

// Component for many2one fields with autocomplete
const Many2OneField = ({ name, string, required, help, relation, disabled, form }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Function to search options based on text
  const searchOptions = async (searchText) => {
    if (!relation || !searchText || searchText.length < 2) {
      setOptions([]);
      return;
    }

    try {
      setLoading(true);
      console.log(`🔍 Searching options for ${name} (${relation}) with text: "${searchText}"`);
      
      const autocompleteMethod = `model.${relation}.autocomplete`;
      const autocompleteOptions = await trytonService.makeRpcCall(autocompleteMethod, [
        searchText,  // text
        [],          // domain (empty to search all)
        1000,        // limit
        null,        // order (null for default order)
        {}           // context (empty, service will add context automatically)
      ]);
      
      if (autocompleteOptions && Array.isArray(autocompleteOptions)) {
        const formattedOptions = autocompleteOptions.map(option => ({
          value: option.id,
          label: option.name || option.rec_name || `ID: ${option.id}`,
          id: option.id,
          name: option.name || option.rec_name
        }));
        
        setOptions(formattedOptions);
        console.log(`✅ Options found for "${searchText}": ${formattedOptions.length}`);
      } else {
        setOptions([]);
      }
    } catch (error) {
      console.warn(`⚠️ Error searching options for ${name}:`, error.message);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle selection
  const handleSelect = (value, option) => {
    console.log(`✅ Option selected for ${name}:`, { value, option });
    // Ensure it's always a string
    setInputValue(option.label || '');
    // Update form value with the ID
    form.setFieldValue(name, value);
  };

  // Function to handle input change
  const handleChange = (value) => {
    // Ensure it's always a string, never undefined or null
    setInputValue(value || '');
    // If user clears the text, also clear the form value
    if (!value) {
      form.setFieldValue(name, null);
    }
  };

  return (
    <>
      {/* Hidden field to store the real ID */}
      <Form.Item name={name} style={{ display: 'none' }}>
        <input type="hidden" />
      </Form.Item>
      
      {/* Visible field to show the label */}
      <Form.Item
        label={string}
        rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
        help={help}
      >
        <AutoComplete
          placeholder={`Search ${string.toLowerCase()}...`}
          disabled={disabled}
          loading={loading}
          options={options}
          onSearch={searchOptions}
          onSelect={handleSelect}
          onChange={handleChange}
          value={inputValue || ''} // Siempre un string, nunca undefined
          filterOption={false} // Desactivar filtrado local ya que se hace en el servidor
          showSearch
          allowClear
          style={{ width: '100%' }}
          notFoundContent={loading ? "Searching..." : "No options found"}
        />
      </Form.Item>
    </>
  );
};

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

  const currentLoading = loading || internalLoading;

  useEffect(() => {
    if (wizardInfo && wizardInfo.fieldsView && visible) {
      console.log('🧙 Configurando formulario de wizard:', wizardInfo);
      
       // Generar campos del formulario
       const fields = generateFormFields(wizardInfo.fieldsView);
       setFormFields(fields);
      
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
      
      if (group.fields && Array.isArray(group.fields)) {
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
      }

       if (groupFields.length > 0) {
         fields.push({
           groupId: group.id,
           title: group.title,
           colspan: group.colspan,
           fields: groupFields
         });
       }
    });

    // Si no se pudieron parsear grupos del XML, crear un grupo por defecto con todos los campos
    if (fields.length === 0) {
      console.warn('⚠️ No se pudieron parsear grupos del XML, creando grupo por defecto');
      const allFields = [];
      
      Object.keys(fieldDefinitions).forEach(fieldName => {
        const fieldDef = fieldDefinitions[fieldName];
        
        if (fieldDef) {
          allFields.push({
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

       if (allFields.length > 0) {
         fields.push({
           groupId: 'default',
           title: null, // Sin título específico
           colspan: 4,
           fields: allFields
         });
       }
    }

    console.log(`✅ Grupos generados para wizard: ${fields.length}`);
    return fields;
  };

  // Parsear grupos del XML arch
  const parseFormGroups = (arch) => {
    if (!arch) {
      console.warn('⚠️ No hay arch XML para parsear');
      return [];
    }

    console.log('🔍 Parseando XML arch:', arch);
    const groups = [];
    
    try {
      // Extraer grupos usando regex más flexible
      const groupRegex = /<group[^>]*id="([^"]*)"[^>]*(?:colspan="([^"]*)")?[^>]*>(.*?)<\/group>/gs;
      let match;
      
      while ((match = groupRegex.exec(arch)) !== null) {
        const groupId = match[1];
        const colspan = parseInt(match[2]) || 4;
        const groupContent = match[3];
        
        console.log(`📦 Procesando grupo: ${groupId}, colspan: ${colspan}`);
        console.log(`📝 Contenido del grupo:`, groupContent);
        
        // Extraer campos del grupo
        const fieldRegex = /<field name="([^"]*)"[^>]*\/>/g;
        const fields = [];
        let fieldMatch;
        
        while ((fieldMatch = fieldRegex.exec(groupContent)) !== null) {
          fields.push(fieldMatch[1]);
        }
        
         console.log(`🔧 Fields found in ${groupId}:`, fields);
         
         groups.push({
           id: groupId,
           title: null, // Sin título específico
           colspan: colspan,
           fields: fields || [] // Asegurar que fields siempre sea un array
         });
      }
      
      console.log(`✅ Grupos parseados:`, groups);
      return groups;
    } catch (error) {
      console.error('❌ Error parsing XML:', error);
      return [];
    }
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
      
      message.success('Wizard executed successfully');
      onClose();
      
    } catch (error) {
      console.error('Error sending wizard:', error);
      message.error('Error executing wizard: ' + error.message);
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
      console.error('Error canceling wizard:', error);
      message.error('Error canceling wizard: ' + error.message);
    }
  };

  // Renderizar campo del formulario
  const renderFormField = (field) => {
    const { name, fieldDef, required, readonly, type, string } = field;

    if (!fieldDef) {
      return (
        <Form.Item key={name} name={name} label={string}>
          <input disabled placeholder="Field not available" />
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
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
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
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
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
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
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
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
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
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help}
          >
            <input type="time" {...commonProps} />
          </Form.Item>
        );

       case 'many2one':
         return (
           <Many2OneField
             key={name}
             name={name}
             string={string}
             required={required}
             help={fieldDef.help}
             relation={fieldDef.relation}
             disabled={readonly || currentLoading}
             form={form}
           />
         );

      default:
        return (
          <Form.Item
            key={name}
            name={name}
            label={string}
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help}
          >
            <input {...commonProps} placeholder={`Field type ${type}`} />
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
            Cancel
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
            {formFields.map((group, groupIndex) => {
              // Verificación defensiva
              if (!group || !group.fields || !Array.isArray(group.fields)) {
                console.warn(`⚠️ Grupo ${groupIndex} no tiene campos válidos:`, group);
                return null;
              }
              
               return (
                 <Card 
                   key={groupIndex}
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
               );
            })}
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>Error: Could not load wizard information</p>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default WizardModal;
