import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, message, Spin, Card, Row, Col, AutoComplete, Table, Input, Divider, Typography, Checkbox, DatePicker, TimePicker, Select } from 'antd';
import { CloseOutlined, CheckOutlined, PlusOutlined, MinusOutlined, SearchOutlined, CalendarOutlined, DollarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import trytonService from '../services/trytonService';
import './WizardModal.css';

const { Option } = Select;

const { Title, Text } = Typography;

// Component for many2one fields with autocomplete
const Many2OneField = ({ name, string, required, help, relation, disabled, form, defaultValue }) => {
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
        const displayName = record.name || record.rec_name || `ID: ${record.id}`;
        setInputValue(displayName);
        form.setFieldValue(name, recordId);
      }
    } catch (error) {
      console.warn(`⚠️ Error loading record name for ${relation} ID ${recordId}:`, error.message);
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
        className="mb-6"
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
          className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 h-12 text-base"
          notFoundContent={loading ? "Searching..." : "No options found"}
        />
      </Form.Item>
    </>
  );
};

// Component for many2many fields with table selection
const Many2ManyField = ({ name, string, relation, disabled, form, fieldDef, wizardInfo }) => {
  const [availableOptions, setAvailableOptions] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Load available options
  const loadOptions = async (search = '') => {
    if (!relation) return;
    
    try {
      setLoading(true);
      console.log(`🔍 Loading many2many options for ${name} (${relation})`);
      
      // Get the view for the relation
      let fields = ['id', 'name', 'rec_name'];
      
      // If there's a specific view defined in fieldDef.views
      if (fieldDef.views && fieldDef.views.tree) {
        const viewFields = Object.keys(fieldDef.views.tree.fields || {});
        fields = [...new Set([...fields, ...viewFields])];
      }
      
      // Search for records
      const searchParams = [
        search ? [['name', 'ilike', search]] : [], // domain
        0, // offset
        100, // limit
        null, // order
        {} // context
      ];
      
      const records = await trytonService.getModelData(relation, searchParams[0], fields, searchParams[2]);
      
      const formattedOptions = records.map(record => ({
        id: record.id,
        name: record.name || record.rec_name || `ID: ${record.id}`,
        ...record
      }));
      
      setAvailableOptions(formattedOptions);
      console.log(`✅ Loaded ${formattedOptions.length} options for ${relation}`);
      
    } catch (error) {
      console.error(`❌ Error loading many2many options for ${name}:`, error);
      setAvailableOptions([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding item to selection
  const handleAddItem = (item) => {
    if (!selectedItems.find(selected => selected.id === item.id)) {
      const newSelection = [...selectedItems, item];
      setSelectedItems(newSelection);
      const ids = newSelection.map(item => item.id);
      form.setFieldValue(name, ids);
      console.log(`✅ Added item to ${name}:`, item, 'IDs:', ids);
    }
  };

  // Handle removing item from selection
  const handleRemoveItem = (itemId) => {
    const newSelection = selectedItems.filter(item => item.id !== itemId);
    setSelectedItems(newSelection);
    const ids = newSelection.map(item => item.id);
    form.setFieldValue(name, ids);
    console.log(`❌ Removed item from ${name}:`, itemId, 'Remaining IDs:', ids);
  };

  // Handle search
  const handleSearch = (value) => {
    setSearchText(value);
    loadOptions(value);
  };

  // Load initial options
  useEffect(() => {
    loadOptions();
  }, [relation]);

  // Initialize field with empty array if no value
  useEffect(() => {
    const currentValue = form.getFieldValue(name);
    if (currentValue === undefined || currentValue === null) {
      form.setFieldValue(name, []);
      console.log(`🎯 Inicializando campo ${name} con array vacío`);
    }
  }, [name, form]);

  // Load default values when component mounts
  useEffect(() => {
    if (wizardInfo?.defaults?.[name]) {
      const defaultValues = wizardInfo.defaults[name];
      console.log(`🎯 Loading default values for ${name}:`, defaultValues);
      
      if (Array.isArray(defaultValues) && defaultValues.length > 0) {
        // If defaultValues are IDs, we need to load the actual records
        loadDefaultRecords(defaultValues);
      }
    }
  }, [wizardInfo?.defaults, name]);

  // Load default records for many2many field
  const loadDefaultRecords = async (recordIds) => {
    if (!relation || !Array.isArray(recordIds)) return;
    
    try {
      console.log(`🔍 Loading default records for ${name}:`, recordIds);
      
      // Get the view for the relation
      let fields = ['id', 'name', 'rec_name'];
      
      // If there's a specific view defined in fieldDef.views
      if (fieldDef.views && fieldDef.views.tree) {
        const viewFields = Object.keys(fieldDef.views.tree.fields || {});
        fields = [...new Set([...fields, ...viewFields])];
      }
      
      // Load records by IDs
      const records = await trytonService.getModelData(relation, [['id', 'in', recordIds]], fields, recordIds.length);
      
      const formattedRecords = records.map(record => ({
        id: record.id,
        name: record.name || record.rec_name || `ID: ${record.id}`,
        ...record
      }));
      
      setSelectedItems(formattedRecords);
      form.setFieldValue(name, recordIds);
      console.log(`✅ Loaded ${formattedRecords.length} default records for ${name}`);
      
    } catch (error) {
      console.error(`❌ Error loading default records for ${name}:`, error);
    }
  };

  // Define table columns for available options
  const availableColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddItem(record)}
          disabled={disabled || selectedItems.find(item => item.id === record.id)}
          className="rounded-lg border-0 bg-teal-600 hover:bg-teal-700 text-white transition-colors duration-300"
        >
          Add
        </Button>
      )
    }
  ];

  // Define table columns for selected items
  const selectedColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text) => text || 'N/A'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="default"
          size="small"
          icon={<MinusOutlined />}
          onClick={() => handleRemoveItem(record.id)}
          disabled={disabled}
          className="rounded-lg border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors duration-300"
        >
          Remove
        </Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Search input */}
      <Input
        placeholder={`Search ${string.toLowerCase()}...`}
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        disabled={disabled}
        className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 h-12 text-base"
      />

      {/* Available options table */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <SearchOutlined className="text-teal-600" />
          Available {string}
        </h4>
        <Table
          dataSource={availableOptions}
          columns={availableColumns}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{ pageSize: 5 }}
          className="rounded-lg"
        />
      </div>

      {/* Selected items */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckOutlined className="text-green-600" />
          Selected {string} ({selectedItems.length})
        </h4>
        {selectedItems.length > 0 ? (
          <Table
            dataSource={selectedItems}
            columns={selectedColumns}
            rowKey="id"
            size="small"
            pagination={false}
            className="rounded-lg"
          />
        ) : (
          <p className="text-gray-500 italic text-center py-4">No items selected</p>
        )}
      </div>
    </div>
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
        
        // Convertir valores datetime de Tryton a formato HTML datetime-local
        const processedDefaults = { ...wizardInfo.defaults };
        Object.keys(processedDefaults).forEach(key => {
          const value = processedDefaults[key];
          if (value && typeof value === 'object' && value.__class__ === 'datetime') {
            // Convertir datetime de Tryton a formato ISO string para datetime-local
            const date = new Date(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
            processedDefaults[key] = date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
            console.log(`🕒 Converted datetime ${key}:`, value, '->', processedDefaults[key]);
          }
        });
        
        // Asegurar que campos many2many tengan valores por defecto
        if (!processedDefaults.tests) {
          processedDefaults.tests = [];
          console.log('⚠️ Campo tests no tiene valor por defecto, estableciendo array vacío');
        }
        
        form.setFieldsValue(processedDefaults);
      }
      
      // Establecer valores iniciales
      if (wizardInfo.values) {
        console.log('🎯 Estableciendo valores iniciales:', wizardInfo.values);
        form.setFieldsValue(wizardInfo.values);
      }
      
      // Asegurar que todos los campos many2many tengan valores por defecto
      const allFields = wizardInfo.fieldsView?.fields || {};
      Object.keys(allFields).forEach(fieldName => {
        const fieldDef = allFields[fieldName];
        if (fieldDef.type === 'many2many') {
          const currentValue = form.getFieldValue(fieldName);
          if (currentValue === undefined || currentValue === null) {
            form.setFieldValue(fieldName, []);
            console.log(`🎯 Inicializando campo many2many ${fieldName} con array vacío`);
          }
        }
      });
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
      // PASO 1: Extraer campos que están fuera de grupos (en el nivel raíz del form)
      const formContent = arch.replace(/<form[^>]*>(.*)<\/form>/s, '$1');
      console.log('📋 Contenido del form:', formContent);
      
      // Buscar campos que NO están dentro de grupos
      const rootFields = [];
      const fieldRegex = /<field name="([^"]*)"[^>]*\/>/g;
      let fieldMatch;
      
      // Primero, marcar todas las posiciones donde empiezan y terminan los grupos
      const groupPositions = [];
      const groupRegex = /<group[^>]*>.*?<\/group>/gs;
      let groupMatch;
      while ((groupMatch = groupRegex.exec(formContent)) !== null) {
        groupPositions.push({
          start: groupMatch.index,
          end: groupMatch.index + groupMatch[0].length
        });
      }
      
      // Buscar campos que están fuera de grupos
      let fieldIndex = 0;
      fieldRegex.lastIndex = 0; // Reset regex
      while ((fieldMatch = fieldRegex.exec(formContent)) !== null) {
        const fieldStart = fieldMatch.index;
        const fieldEnd = fieldMatch.index + fieldMatch[0].length;
        const fieldName = fieldMatch[1];
        
        // Verificar si este campo está dentro de algún grupo
        const isInsideGroup = groupPositions.some(pos => 
          fieldStart >= pos.start && fieldEnd <= pos.end
        );
        
        if (!isInsideGroup) {
          rootFields.push(fieldName);
          console.log(`🔧 Campo raíz encontrado: ${fieldName}`);
        }
      }
      
      // Si hay campos raíz, crear un grupo para ellos
      if (rootFields.length > 0) {
        groups.push({
          id: 'root_fields',
          title: '',
          colspan: 4,
          fields: rootFields
        });
        console.log(`✅ Grupo raíz creado con ${rootFields.length} campos:`, rootFields);
      }
      
      // PASO 2: Extraer grupos usando regex más flexible
      const groupRegex2 = /<group[^>]*id="([^"]*)"[^>]*(?:colspan="([^"]*)")?[^>]*>(.*?)<\/group>/gs;
      let match;
      
      while ((match = groupRegex2.exec(arch)) !== null) {
        const groupId = match[1];
        const colspan = parseInt(match[2]) || 4;
        const groupContent = match[3];
        
        console.log(`📦 Procesando grupo: ${groupId}, colspan: ${colspan}`);
        console.log(`📝 Contenido del grupo:`, groupContent);
        
        // Extraer campos del grupo
        const groupFields = [];
        const groupFieldRegex = /<field name="([^"]*)"[^>]*\/>/g;
        let groupFieldMatch;
        
        while ((groupFieldMatch = groupFieldRegex.exec(groupContent)) !== null) {
          groupFields.push(groupFieldMatch[1]);
        }
        
         console.log(`🔧 Fields found in ${groupId}:`, groupFields);
         
         groups.push({
           id: groupId,
           title: null, // Sin título específico
           colspan: colspan,
           fields: groupFields || [] // Asegurar que fields siempre sea un array
         });
      }
      
      console.log(`✅ Total grupos parseados: ${groups.length}`, groups);
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
      console.log('🔍 Verificando campo tests:', values.tests);
      console.log('🔍 Tipo de tests:', typeof values.tests, Array.isArray(values.tests));
      
      // Procesar valores antes de enviar
      const processedValues = { ...values };
      
      // Asegurar que todos los campos tengan valores por defecto apropiados
      Object.keys(processedValues).forEach(fieldName => {
        const value = processedValues[fieldName];
        
        // Para campos many2many, asegurar que sean arrays
        // Los campos many2many suelen terminar en 's' (plural) o tener nombres específicos
        const isMany2ManyField = fieldName.endsWith('s') || 
                                fieldName === 'tests' || 
                                fieldName === 'items' || 
                                fieldName === 'records' ||
                                (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number');
        
        if (isMany2ManyField) {
          if (!Array.isArray(value)) {
            processedValues[fieldName] = [];
            console.log(`⚠️ Campo many2many ${fieldName} no es array, estableciendo array vacío`);
          }
        } else {
          // Para campos many2one y otros, asegurar que tengan null si están vacíos
          if (value === undefined || value === '') {
            processedValues[fieldName] = null;
            console.log(`⚠️ Campo ${fieldName} vacío, estableciendo null`);
          }
        }
      });
      
      // Logging adicional para debug
      console.log('🔍 Valores antes del procesamiento:', values);
      console.log('🔍 Valores después del procesamiento:', processedValues);
      console.log('🔍 Campo tests específico:', {
        original: values.tests,
        processed: processedValues.tests,
        type: typeof processedValues.tests,
        isArray: Array.isArray(processedValues.tests)
      });
      
      // Convertir valores datetime-local de vuelta al formato Tryton
      Object.keys(processedValues).forEach(key => {
        const value = processedValues[key];
        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
          // Es un datetime-local, convertir a objeto datetime de Tryton
          const date = new Date(value);
          processedValues[key] = {
            __class__: 'datetime',
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hour: date.getHours(),
            minute: date.getMinutes(),
            second: date.getSeconds(),
            microsecond: 0
          };
          console.log(`🕒 Converted datetime ${key}:`, value, '->', processedValues[key]);
        }
      });
      
      // Encontrar el botón por defecto o el primer botón de submit
      const submitButton = wizardInfo?.buttons?.find(btn => btn.default || btn.validate);
      const buttonState = submitButton?.state || 'end';
      
      console.log(`🎯 Botón seleccionado: ${submitButton?.string}, Estado: ${buttonState}`);
      console.log(`📤 Valores procesados para envío:`, processedValues);
      
      await onSubmit(processedValues, buttonState);
      
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
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
          >
            <Input 
              {...commonProps} 
              size="large"
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300"
            />
          </Form.Item>
        );

      case 'text':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Input.TextArea 
              {...commonProps} 
              rows={4}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 text-base"
            />
          </Form.Item>
        );

      case 'integer':
      case 'float':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
          >
            <Input 
              type="number"
              {...commonProps} 
              size="large"
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300"
            />
          </Form.Item>
        );

      case 'boolean':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            valuePropName="checked"
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Checkbox 
              disabled={readonly || currentLoading}
              className="text-base"
            >
              {string}
            </Checkbox>
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <CalendarOutlined className="text-teal-600" />
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <DatePicker 
              {...commonProps} 
              className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 h-12"
              format="YYYY-MM-DD"
            />
          </Form.Item>
        );

      case 'time':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <ClockCircleOutlined className="text-teal-600" />
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <TimePicker 
              {...commonProps} 
              className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 h-12"
              format="HH:mm"
            />
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
            defaultValue={wizardInfo?.defaults?.[name]}
          />
        );

      case 'many2many':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <SearchOutlined className="text-teal-600" />
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Many2ManyField
              name={name}
              string={string}
              relation={fieldDef.relation}
              disabled={readonly || currentLoading}
              form={form}
              fieldDef={fieldDef}
              wizardInfo={wizardInfo}
            />
          </Form.Item>
        );

      case 'datetime':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                <CalendarOutlined className="text-teal-600" />
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Input 
              type="datetime-local"
              {...commonProps} 
              size="large"
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300"
            />
          </Form.Item>
        );

      case 'selection':
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Select 
              {...commonProps}
              className="w-full rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300 h-12"
              placeholder={`Select ${string.toLowerCase()}...`}
              options={fieldDef.selection ? fieldDef.selection.map(([value, label]) => ({
                value,
                label
              })) : []}
            />
          </Form.Item>
        );

      default:
        return (
          <Form.Item
            key={name}
            name={name}
            label={
              <div className="flex items-center gap-2 font-medium text-gray-700">
                {required && <span className="text-red-500">*</span>}
                {string}
              </div>
            }
            rules={required ? [{ required: true, message: `Field ${string} is required` }] : []}
            help={fieldDef.help ? <Text type="secondary" className="text-xs">{fieldDef.help}</Text> : null}
            className="mb-6"
          >
            <Input 
              {...commonProps} 
              placeholder={`Field type ${type}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 transition-colors duration-300"
            />
          </Form.Item>
        );
    }
  };

  // Renderizar botones del wizard
  const renderButtons = () => {
    if (!wizardInfo || !wizardInfo.buttons || wizardInfo.buttons.length === 0) {
      return (
        <div className="flex justify-end gap-3 p-5 bg-white rounded-lg shadow-md -mx-6 -mb-6">
          <Button 
            onClick={handleCancel} 
            icon={<CloseOutlined />}
            size="large"
            className="min-w-[100px] border-gray-300 text-gray-600 rounded-lg hover:border-teal-600 hover:text-teal-600 transition-colors duration-300"
          >
            Cancel
          </Button>
          <Button 
            type="primary" 
            onClick={() => form.submit()} 
            icon={<CheckOutlined />}
            loading={currentLoading}
            size="large"
            className="min-w-[120px] bg-teal-600 border-teal-600 rounded-lg font-medium hover:bg-teal-700 hover:border-teal-700 transition-colors duration-300"
          >
            Ejecutar
          </Button>
        </div>
      );
    }

    return (
      <div className="flex justify-end gap-3 p-5 bg-white rounded-lg shadow-md -mx-6 -mb-6">
        {wizardInfo.buttons.map((button, index) => {
          if (button.validate) {
            return (
              <Button
                key={index}
                type={button.default ? "primary" : "default"}
                onClick={() => form.submit()}
                icon={<CheckOutlined />}
                loading={currentLoading}
                size="large"
                className={button.default 
                  ? "min-w-[120px] bg-teal-600 border-teal-600 rounded-lg font-medium hover:bg-teal-700 hover:border-teal-700 transition-colors duration-300"
                  : "min-w-[100px] rounded-lg hover:border-teal-600 transition-colors duration-300"
                }
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
                size="large"
                className="min-w-[100px] border-gray-300 text-gray-600 rounded-lg hover:border-teal-600 hover:text-teal-600 transition-colors duration-300"
              >
                {button.string}
              </Button>
            );
          }
        })}
      </div>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-3 py-2 border-b-2 border-teal-600">
          <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center text-white text-lg font-bold">
            W
          </div>
          <div>
            <Title level={3} className="m-0 text-teal-600">
              {title}
            </Title>
            <Text type="secondary" className="text-sm">
              Complete the form below to proceed
            </Text>
          </div>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={renderButtons()}
      width="90vw"
      style={{ maxWidth: '1200px', minWidth: '600px' }}
      destroyOnClose
      maskClosable={false}
      className="rounded-2xl wizard-modal"
      centered
      bodyStyle={{ 
        maxHeight: '80vh', 
        overflowY: 'auto',
        padding: '0'
      }}
    >
      <Spin spinning={currentLoading}>
        {wizardInfo ? (
          <div className="bg-gray-50 rounded-lg p-6 min-h-[400px]">
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
                     className="mb-5 rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300"
                     headStyle={{
                       background: '#00A88E',
                       borderRadius: '12px 12px 0 0',
                       borderBottom: 'none'
                     }}
                     title={
                       <div className="flex items-center gap-2 text-white">
                         <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center text-xs font-medium">
                           {groupIndex + 1}
                         </div>
                         {group.title}
                       </div>
                     }
                   >
                     <Row gutter={[24, 16]}>
                       {group.fields.map((field, fieldIndex) => {
                         // Ajustar columnas basado en el tipo de campo y cantidad
                         let colSpan = 24; // Por defecto una columna por fila
                         
                         // Campos especiales que necesitan toda la fila
                         if (field.type === 'many2many' || field.type === 'text') {
                           colSpan = 24; // Toda la fila
                         } else {
                           // Lógica mejorada para aprovechar mejor el espacio horizontal
                           if (group.fields.length <= 2) {
                             colSpan = 12; // 2 campos = 2 columnas
                           } else if (group.fields.length <= 3) {
                             colSpan = 8; // 3 campos = 3 columnas
                           } else if (group.fields.length <= 4) {
                             colSpan = 6; // 4 campos = 4 columnas
                           } else if (group.fields.length <= 6) {
                             colSpan = 8; // 5-6 campos = 3 columnas (2 filas)
                           } else if (group.fields.length <= 8) {
                             colSpan = 6; // 7-8 campos = 4 columnas (2 filas)
                           } else {
                             colSpan = 4; // 9+ campos = 6 columnas
                           }
                         }
                         
                         return (
                           <Col key={fieldIndex} span={colSpan}>
                             {renderFormField(field)}
                           </Col>
                         );
                       })}
                     </Row>
                   </Card>
                 );
              })}
            </Form>
          </div>
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
