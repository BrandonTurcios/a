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
  Tooltip,
  AutoComplete
} from 'antd';
import { 
  SaveOutlined, 
  EditOutlined, 
  EyeOutlined, 
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  SearchOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import trytonService from '../services/trytonService';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Component for many2one fields with autocomplete
const Many2OneField = ({ name, label, fieldDef, required, readonly, help, form, defaultValue }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const relation = fieldDef.relation;

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
          value: option.id.toString(),
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
    setInputValue(option.label || '');
    // Update form value with the ID (as integer)
    form.setFieldValue(name, parseInt(value));
  };

  // Function to handle input change
  const handleChange = (value) => {
    setInputValue(value || '');
    // If user clears the text, also clear the form value
    if (!value) {
      form.setFieldValue(name, null);
    }
  };

  // Load default value when component mounts
  useEffect(() => {
    if (defaultValue && typeof defaultValue === 'object') {
      // If defaultValue has a rec_name property, use it as display value
      if (defaultValue.rec_name) {
        setInputValue(defaultValue.rec_name);
        // Set the actual ID value in the form
        const actualId = defaultValue.id || defaultValue;
        form.setFieldValue(name, actualId);
      }
    } else if (defaultValue) {
      // If defaultValue is just an ID, try to load the record name
      loadRecordName(defaultValue);
    }
  }, [defaultValue, name, form]);

  // Function to load record name for a given ID
  const loadRecordName = async (recordId) => {
    if (!relation || !recordId) return;
    
    try {
      const records = await trytonService.getModelData(relation, [['id', '=', recordId]], ['id', 'name', 'rec_name'], 1);
      if (records && records.length > 0) {
        const record = records[0];
        setInputValue(record.name || record.rec_name || `ID: ${record.id}`);
        form.setFieldValue(name, recordId);
      }
    } catch (error) {
      console.warn(`⚠️ Error loading record name for ${name}:`, error.message);
    }
  };

  return (
    <Form.Item
      name={name}
      label={
        <div className="flex items-center gap-2 font-medium text-gray-700">
          {required && <span className="text-red-500">*</span>}
          <SearchOutlined className="text-teal-600" />
          {label}
        </div>
      }
      rules={[{ required, message: `${label} es requerido` }]}
      help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
      className="mb-6"
    >
      <AutoComplete
        value={inputValue}
        options={options}
        onSearch={searchOptions}
        onSelect={handleSelect}
        onChange={handleChange}
        placeholder={`Buscar ${label.toLowerCase()}...`}
        disabled={readonly}
        notFoundContent={loading ? <Spin size="small" /> : null}
        className="w-full"
        style={{ width: '100%' }}
        filterOption={false}
      >
        <Input
          suffix={loading ? <Spin size="small" /> : <SearchOutlined className="text-gray-400" />}
          className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12"
        />
      </AutoComplete>
    </Form.Item>
  );
};

// Helper function to process many2one data from backend format to component format
const processMany2OneData = (data, fieldsView) => {
  if (!data || !fieldsView || !fieldsView.fields) {
    return data;
  }

  const processedData = { ...data };

  // Identificar campos many2one y procesarlos
  Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef.type === 'many2one') {
      const fieldValue = data[fieldName];
      const fieldRecName = data[`${fieldName}.rec_name`];

      // Si tenemos el ID y el rec_name, crear un objeto
      if (fieldValue !== null && fieldValue !== undefined && fieldRecName) {
        processedData[fieldName] = {
          id: fieldValue,
          rec_name: fieldRecName
        };
        console.log(`Procesado many2one ${fieldName}:`, processedData[fieldName]);
      }
    }
  });

  return processedData;
};

// Helper function to extract only the IDs from many2one fields for form values
const extractFormValues = (data, fieldsView) => {
  if (!data || !fieldsView || !fieldsView.fields) {
    return data;
  }

  const formValues = { ...data };

  // Para campos many2one, extraer solo el ID
  Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef.type === 'many2one' && data[fieldName]) {
      if (typeof data[fieldName] === 'object' && data[fieldName].id) {
        // Si es un objeto, extraer el ID
        formValues[fieldName] = data[fieldName].id;
      }
      // Si ya es un número, dejarlo como está
    }
    
    // Remover campos expandidos (.rec_name) del formulario
    if (fieldName.includes('.')) {
      delete formValues[fieldName];
    }
  });

  return formValues;
};

const TrytonForm = ({ 
  model, 
  viewId, 
  viewType = 'form', 
  recordId = null, 
  recordData = null,
  title = 'Formulario',
  onSave = null,
  onCancel = null,
  readonly = false,
  onSubmit = null, // Nueva prop para manejar envío personalizado
  loading = false, // Nueva prop para estado de carga externo
  submitButtonText = 'Guardar', // Nueva prop para texto del botón
  fieldsView = null // Nueva prop para pasar fieldsView directamente
}) => {
  const [form] = Form.useForm();
  const [internalLoading, setInternalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formInfo, setFormInfo] = useState(null);
  
  // Usar loading externo si se proporciona, sino usar el interno
  const currentLoading = loading || internalLoading;
  const [formData, setFormData] = useState({});
  const [fields, setFields] = useState([]);
  const [isEditing, setIsEditing] = useState(!readonly && !recordId);
  const [selectionOptions, setSelectionOptions] = useState({});

  useEffect(() => {
    if (fieldsView) {
      // Si se proporciona fieldsView directamente, usarlo
      setFormInfo(fieldsView);
      
      // Generar campos del formulario usando generateFormFields
      const formFields = generateFormFields(fieldsView);
      setFields(formFields);
      
      // Load dynamic selection options
      loadSelectionOptions(fieldsView);
      
      // Procesar datos para many2one antes de establecerlos
      const processedData = processMany2OneData(recordData || {}, fieldsView);
      setFormData(processedData);
      
      if (recordData) {
        // Establecer solo los IDs en el formulario (no los objetos completos)
        const formValues = extractFormValues(processedData, fieldsView);
        form.setFieldsValue(formValues);
      }
    } else if (model && viewId) {
      loadFormData();
    }
  }, [model, viewId, viewType, recordId, fieldsView, recordData]);

  const loadFormData = async () => {
    try {
      setInternalLoading(true);
      setError(null);
      
      console.log(`🔍 Loading form for model: ${model}, view: ${viewId}`);
      
      // Obtener información completa del formulario
      const formInfo = await trytonService.getFormInfo(model, viewId, viewType, recordId);
      console.log('🔍 Información de formulario obtenida:', formInfo);
      
      setFormInfo(formInfo.fieldsView);
      
      // Generar campos del formulario
      const formFields = generateFormFields(formInfo.fieldsView);
      setFields(formFields);
      
      // Load dynamic selection options
      await loadSelectionOptions(formInfo.fieldsView);
      
      // Si hay datos del registro, establecerlos
      if (formInfo.data || recordData) {
        const dataToUse = formInfo.data || recordData;
        
        // Procesar datos para many2one
        const processedData = processMany2OneData(dataToUse, formInfo.fieldsView);
        setFormData(processedData);
        
        // Establecer solo los IDs en el formulario
        const formValues = extractFormValues(processedData, formInfo.fieldsView);
        form.setFieldsValue(formValues);
        
        console.log('✅ Datos del registro establecidos:', processedData);
        console.log('✅ Valores del formulario:', formValues);
      } else {
        // Formulario nuevo - establecer valores por defecto
        const defaultValues = getDefaultValues(formInfo.fieldsView);
        setFormData(defaultValues);
        form.setFieldsValue(defaultValues);
        console.log('✅ Valores por defecto establecidos:', defaultValues);
      }
      
    } catch (error) {
      console.error('❌ Error loading form:', error);
      setError(error.message);
    } finally {
      setInternalLoading(false);
    }
  };

  const loadSelectionOptions = async (fieldsView) => {
    if (!fieldsView.fields) return;
    
    const optionsToLoad = {};
    
    // Identificar campos selection que tienen métodos
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      if (fieldDef.type === 'selection' && typeof fieldDef.selection === 'string') {
        optionsToLoad[fieldName] = fieldDef.selection;
      }
    });
    
    // Load options for each field
    for (const [fieldName, methodName] of Object.entries(optionsToLoad)) {
      try {
        console.log(`🔍 Loading options for ${fieldName} using method ${methodName}`);
        const options = await trytonService.getSelectionOptions(model, methodName);
        setSelectionOptions(prev => ({
          ...prev,
          [fieldName]: options
        }));
        console.log(`✅ Opciones cargadas para ${fieldName}:`, options);
      } catch (error) {
        console.warn(`⚠️ Error cargando opciones para ${fieldName}:`, error);
        // Continuar con otros campos
      }
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
    
    // Validar que fieldDef existe
    if (!fieldDef) {
      console.warn(`⚠️ Campo ${name} no tiene fieldDef definido`);
      return (
        <Form.Item key={name} name={name} label={label || name}>
          <Input disabled placeholder="Campo no disponible" />
        </Form.Item>
      );
    }
    
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
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <Input 
              placeholder={`Ingrese ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base"
            />
          </Form.Item>
        );
        
      case 'text':
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <Input.TextArea 
              rows={4} 
              placeholder={`Ingrese ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 text-base resize-y"
            />
          </Form.Item>
        );
        
      case 'integer':
      case 'bigint':
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <InputNumber 
              style={{ width: '100%' }}
              placeholder={`Ingrese ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base w-full"
            />
          </Form.Item>
        );
        
      case 'float':
      case 'numeric':
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <InputNumber 
              style={{ width: '100%' }}
              step={0.01}
              placeholder={`Ingrese ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base w-full"
            />
          </Form.Item>
        );
        
      case 'boolean':
        return (
          <Form.Item 
            key={name} 
            {...commonProps} 
            valuePropName="checked"
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <Switch className="[&.ant-switch-checked]:bg-teal-600 [&.ant-switch-checked]:shadow-teal-200" />
          </Form.Item>
        );
        
      case 'date':
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <CalendarOutlined className="text-teal-600" />
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <DatePicker 
              style={{ width: '100%' }}
              placeholder={`Seleccione ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 w-full"
            />
          </Form.Item>
        );
        
      case 'datetime':
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <CalendarOutlined className="text-teal-600" />
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <DatePicker 
              showTime
              style={{ width: '100%' }}
              placeholder={`Seleccione ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 w-full"
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
        // Si selection es una función (string), usar opciones cargadas dinámicamente
        if (typeof fieldDef.selection === 'string') {
          const dynamicOptions = selectionOptions[name] || [];
          return (
            <Form.Item 
              key={name} 
              {...commonProps}
              label={
                <div className="flex items-center gap-2 font-medium text-gray-700">
                  {required && <span className="text-red-500">*</span>}
                  {label}
                </div>
              }
              help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
              className="mb-6"
            >
              <Select 
                placeholder={`Seleccione ${label.toLowerCase()}`}
                className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12"
              >
                {dynamicOptions.length > 0 ? (
                  dynamicOptions.map(([value, optionLabel]) => (
                    <Option key={value} value={value}>
                      {optionLabel}
                    </Option>
                  ))
                ) : (
                  <Option value="loading">Cargando opciones...</Option>
                )}
              </Select>
            </Form.Item>
          );
        }
        return (
          <Form.Item 
            key={name} 
            {...commonProps}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {label}
              </div>
            }
            help={help ? <Text type="secondary" className="text-xs">{help}</Text> : null}
            className="mb-6"
          >
            <Select 
              placeholder={`Seleccione ${label.toLowerCase()}`}
              className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12"
            >
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
          <Many2OneField
            key={name}
            name={name}
            label={label}
            fieldDef={fieldDef}
            required={required}
            readonly={isReadonly}
            help={help}
            form={form}
            defaultValue={formData[name]}
          />
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
      
      // Si se proporciona onSubmit, usarlo en lugar del flujo normal
      if (onSubmit) {
        await onSubmit(values);
        return;
      }
      
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

  if (currentLoading) {
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
      className="rounded-2xl shadow-lg border border-teal-100"
      headStyle={{
        background: 'linear-gradient(135deg, #00A88E 0%, #00C4A7 100%)',
        borderRadius: '16px 16px 0 0',
        border: 'none',
        padding: '20px 24px'
      }}
      title={null}
      extra={
        <Space className="flex flex-wrap gap-2">
          {!readonly && (
            <>
              {isEditing ? (
                <>
                  <Button 
                    type="primary" 
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => form.submit()}
                    className="bg-teal-600 hover:bg-teal-700 border-teal-600 hover:border-teal-700 text-white rounded-lg shadow-md"
                  >
                    {submitButtonText}
                  </Button>
                  <Button 
                    icon={<MinusOutlined />}
                    onClick={handleCancel}
                    className="bg-white border-gray-300 text-gray-600 hover:border-teal-600 hover:text-teal-600 rounded-lg"
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button 
                  type="primary" 
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  className="bg-teal-600 hover:bg-teal-700 border-teal-600 hover:border-teal-700 text-white rounded-lg shadow-md"
                >
                  Editar
                </Button>
              )}
            </>
          )}
        </Space>
      }
      styles={{ body: { padding: '24px' } }}
    >
      <div className="bg-gray-50 rounded-lg p-6 -mx-6 -mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={formData}
        >
          <Row gutter={[24, 16]}>
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
            <div className="text-center py-10 text-gray-500">
              <Text>No hay campos disponibles para este formulario</Text>
            </div>
          )}
        </Form>
      </div>
      
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
