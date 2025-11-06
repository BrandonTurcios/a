import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
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
  AutoComplete,
  Upload,
  Image,
  Table,
  Modal,
  message,
} from "antd";
import {
  SaveOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
  SearchOutlined,
  CalendarOutlined,
  UploadOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import trytonService from "../services/trytonService";
import { parseFormSections } from "../utils/formParser";
import FormSections from "./FormSection";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Evaluador PYSON simple para estados dinámicos
const evaluatePYSON = (pysonNode, record) => {
  if (!pysonNode || typeof pysonNode !== "object") return pysonNode;

  switch (pysonNode.__class__) {
    case "Eval":
      // Obtener valor del registro
      return record[pysonNode.v] ?? pysonNode.d;

    case "Not":
      // Negación
      return !evaluatePYSON(pysonNode.v, record);

    case "Bool":
      // Convertir a booleano
      return !!evaluatePYSON(pysonNode.v, record);

    case "Or":
      // OR lógico
      return pysonNode.s.some((s) => evaluatePYSON(s, record));

    case "And":
      // AND lógico
      return pysonNode.s.every((s) => evaluatePYSON(s, record));

    case "Greater":
      // Mayor que
      return evaluatePYSON(pysonNode.s1, record) > pysonNode.s2;

    case "In": {
      // Contenido en array
      const key = evaluatePYSON(pysonNode.k, record);
      return pysonNode.v.includes(key);
    }

    case "Get": {
      // Obtener valor de contexto u objeto
      const obj = evaluatePYSON(pysonNode.v, record);
      return obj?.[pysonNode.k] ?? pysonNode.d;
    }
    default:
      // Operador desconocido: retornar false (no readonly)
      console.warn("Operador PYSON desconocido:", pysonNode.__class__);
      return false;
  }
};

// Función para determinar si un campo es readonly
const isFieldReadonly = (fieldDef, formData) => {
  // Si no hay fieldDef, asumir que no es readonly
  if (!fieldDef) return false;

  // Evaluar estados dinámicos primero (tienen prioridad sobre readonly estático)
  if (fieldDef.states) {
    try {
      const states =
        typeof fieldDef.states === "string"
          ? JSON.parse(fieldDef.states)
          : fieldDef.states;

      if (states.readonly) {
        const result = evaluatePYSON(states.readonly, formData);

        // Debug: mostrar evaluación de campos importantes
        if (fieldDef.name === "ref" || fieldDef.name === "puid") {
          console.log(`🔍 Campo ${fieldDef.name} con states:`, {
            active: formData.active,
            states: states.readonly,
            result: result,
            readonly: result,
          });
        }

        return result;
      }
    } catch (e) {
      console.warn("Error evaluando states para", fieldDef.name, ":", e);
    }
  }

  // Si no hay estados dinámicos, usar el readonly estático del campo
  // Este valor viene de view_fields_get del modelo y ya está calculado por el servidor
  const staticReadonly = fieldDef.readonly === true;
  
  // Debug para campos sin states
  if (fieldDef.name === "puid" || fieldDef.name === "ref") {
    console.log(
      `🔍 Campo ${fieldDef.name} sin states:`,
      {
        "fieldDef.readonly": fieldDef.readonly,
        "staticReadonly": staticReadonly,
      }
    );
  }

  return staticReadonly;
};

// Component for many2one fields with autocomplete
const Many2OneField = ({
  name,
  label,
  fieldDef,
  required,
  readonly,
  help,
  form,
  defaultValue,
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const relation = fieldDef.relation;

  // Function to search options based on text
  const searchOptions = async (searchText) => {
    if (!relation || !searchText || searchText.length < 2) {
      setOptions([]);
      return;
    }

    try {
      setLoading(true);
      console.log(
        `🔍 Searching options for ${name} (${relation}) with text: "${searchText}"`
      );

      // Parsear el domain del campo (puede ser una cadena JSON)
      let domain = [];
      if (fieldDef.domain) {
        try {
          // Si domain es una cadena, intentar parsearla
          domain =
            typeof fieldDef.domain === "string"
              ? JSON.parse(fieldDef.domain)
              : fieldDef.domain;
          console.log(`📋 Using domain for ${name}:`, domain);
        } catch (e) {
          console.warn(`⚠️ Error parsing domain for ${name}:`, e.message);
          domain = [];
        }
      }

      // Use the autocomplete method from the service
      const autocompleteOptions = await trytonService.autocomplete(
        relation,
        searchText,
        domain,
        1000
        // context is automatically added in makeRpcCall
      );

      if (autocompleteOptions && Array.isArray(autocompleteOptions)) {
        const formattedOptions = autocompleteOptions.map((option) => ({
          value: option.id.toString(),
          label: option.name || option.rec_name || `ID: ${option.id}`,
          id: option.id,
          name: option.name || option.rec_name,
        }));

        setOptions(formattedOptions);
        console.log(
          `✅ Options found for "${searchText}": ${formattedOptions.length}`
        );
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
    setInputValue(option.label || "");
    // Update form value with the ID (as integer)
    form.setFieldValue(name, parseInt(value));
  };

  // Function to handle input change
  const handleChange = (value) => {
    setInputValue(value || "");
    // If user clears the text, also clear the form value
    if (!value) {
      form.setFieldValue(name, null);
    }
  };

  // Load default value when component mounts
  useEffect(() => {
    console.log(`🔍 Many2OneField ${name} - defaultValue:`, defaultValue);

    if (defaultValue && typeof defaultValue === "object") {
      // If defaultValue has a rec_name property, use it as display value
      if (defaultValue.rec_name) {
        console.log(
          `✅ Setting input value for ${name}:`,
          defaultValue.rec_name
        );
        setInputValue(defaultValue.rec_name);
        // Set the actual ID value in the form
        const actualId = defaultValue.id || defaultValue;
        form.setFieldValue(name, actualId);
      } else {
        console.log(
          `⚠️ Object defaultValue for ${name} has no rec_name:`,
          defaultValue
        );
      }
    } else if (defaultValue) {
      // If defaultValue is just an ID, try to load the record name
      console.log(`🔍 Loading record name for ${name} with ID:`, defaultValue);
      loadRecordName(defaultValue);
    } else {
      console.log(`⚠️ No defaultValue for ${name}`);
    }
  }, [defaultValue, name, form]);

  // Function to load record name for a given ID
  const loadRecordName = async (recordId) => {
    if (!relation || !recordId) return;

    try {
      const records = await trytonService.getModelData(
        relation,
        [["id", "=", recordId]],
        ["id", "name", "rec_name"],
        1
      );
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
    <div className="mb-6">
      <div className="flex items-center gap-2 font-medium text-gray-700 mb-2">
        {required && <span className="text-red-500">*</span>}
        <SearchOutlined className="text-teal-600" />
        {label}
      </div>

      <div style={{ marginBottom: help ? "12px" : "0" }}>
        <AutoComplete
          value={inputValue}
          options={options}
          onSearch={searchOptions}
          onSelect={handleSelect}
          onChange={handleChange}
          placeholder={`Search ${label.toLowerCase()}...`}
          disabled={readonly}
          notFoundContent={loading ? <Spin size="small" /> : null}
          className="w-full"
          style={{ width: "100%" }}
          filterOption={false}
        >
          <Input
            suffix={
              loading ? (
                <Spin size="small" />
              ) : (
                <SearchOutlined className="text-gray-400" />
              )
            }
            className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12"
          />
        </AutoComplete>
      </div>

      {/* Campo oculto para almacenar el ID en el formulario */}
      <Form.Item
        name={name}
        hidden
        rules={[{ required, message: `${label} es requerido` }]}
      >
        <Input type="hidden" />
      </Form.Item>

      {help && (
        <div style={{ marginTop: "8px", marginBottom: "16px" }}>
          <Text
            type="secondary"
            style={{ fontSize: "12px", lineHeight: "1.4" }}
          >
            {help}
          </Text>
        </div>
      )}
    </div>
  );
};

// Component for one2many fields with table and modal for editing
const One2ManyField = ({
  name,
  label,
  fieldDef,
  required,
  readonly,
  help,
  form,
  defaultValue,
  parentRecordId,
  parentModel,
}) => {
  const [relatedRecords, setRelatedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [tableColumns, setTableColumns] = useState([]);
  const relation = fieldDef.relation;
  const fieldString = fieldDef.field_string || name; // Campo que apunta al registro padre

  // Cargar registros relacionados
  const loadRelatedRecords = async () => {
    if (!relation || !parentRecordId) {
      setRelatedRecords([]);
      return;
    }

    try {
      setLoading(true);
      console.log(
        `🔍 Loading one2many records for ${name} (${relation}) where ${fieldString} = ${parentRecordId}`
      );

      // Obtener vista tree del modelo relacionado
      let fieldsView = null;
      try {
        fieldsView = await trytonService.getFieldsView(relation, null, "tree");
      } catch (e) {
        // Si no hay vista tree, intentar con form
        try {
          fieldsView = await trytonService.getFieldsView(relation, null, "form");
        } catch (e2) {
          console.warn(`⚠️ No view available for ${relation}`);
        }
      }

      if (fieldsView) {
        // Obtener campos de la vista
        const fields = Object.keys(fieldsView.fields || {});
        const expandedFields =
          trytonService.expandFieldsForRelationsFromFieldsView(
            fields,
            fieldsView
          );

        // Buscar registros relacionados
        const domain = [[fieldString, "=", parentRecordId]];
        const records = await trytonService.getModelData(
          relation,
          domain,
          expandedFields,
          1000
        );

        setRelatedRecords(records || []);

        // Generar columnas para la tabla
        if (fieldsView.fields) {
          const cols = [];
          Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
            if (shouldIncludeFieldInTable(fieldName, fieldsView.arch)) {
              cols.push({
                title: fieldDef.string || fieldName,
                dataIndex: fieldName,
                key: fieldName,
                render: (value, record) => {
                  if (value === null || value === undefined) return "-";
                  if (typeof value === "object" && value.rec_name) {
                    return value.rec_name;
                  }
                  if (Array.isArray(value)) {
                    return `${value.length} item(s)`;
                  }
                  return String(value);
                },
              });
            }
          });
          setTableColumns(cols);
        }

        console.log(`✅ Loaded ${records.length} related records`);
        
        // Actualizar valor del formulario con los IDs
        const ids = (records || []).map((r) => r.id);
        form.setFieldValue(name, ids);
      } else {
        // Si no hay vista, usar campos básicos
        const records = await trytonService.getModelData(
          relation,
          [[fieldString, "=", parentRecordId]],
          ["id", "name", "rec_name"],
          1000
        );
        setRelatedRecords(records || []);
        setTableColumns([
          {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (value) => value || "-",
          },
        ]);
        
        // Actualizar valor del formulario con los IDs
        const ids = (records || []).map((r) => r.id);
        form.setFieldValue(name, ids);
      }
    } catch (error) {
      console.error(`❌ Error loading one2many records for ${name}:`, error);
      message.error(`Error loading ${label}: ${error.message}`);
      setRelatedRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const shouldIncludeFieldInTable = (fieldName, arch) => {
    if (!arch) return false;
    return arch.includes(`name="${fieldName}"`);
  };

  useEffect(() => {
    if (parentRecordId) {
      loadRelatedRecords();
    } else if (defaultValue && Array.isArray(defaultValue)) {
      // Si hay valores por defecto (IDs), cargarlos
      setRelatedRecords(defaultValue);
      form.setFieldValue(
        name,
        defaultValue.map((r) => (typeof r === "object" ? r.id : r))
      );
    }
  }, [parentRecordId, relation, fieldString]);

  const handleAdd = () => {
    setEditingRecord(null);
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setModalVisible(true);
  };

  const handleDelete = async (recordId) => {
    try {
      await trytonService.deleteRecord(relation, recordId);
      message.success("Record deleted successfully");
      loadRelatedRecords();
    } catch (error) {
      console.error("Error deleting record:", error);
      message.error(`Error deleting record: ${error.message}`);
    }
  };

  const handleModalSave = async (values) => {
    try {
      if (editingRecord) {
        // Actualizar registro existente
        await trytonService.updateRecord(relation, editingRecord.id, values);
        message.success("Record updated successfully");
      } else {
        // Crear nuevo registro
        const newValues = {
          ...values,
          [fieldString]: parentRecordId,
        };
        await trytonService.createRecord(relation, newValues);
        message.success("Record created successfully");
      }
      setModalVisible(false);
      setEditingRecord(null);
      loadRelatedRecords();
    } catch (error) {
      console.error("Error saving record:", error);
      message.error(`Error saving record: ${error.message}`);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 font-medium text-gray-700 mb-2">
        {required && <span className="text-red-500">*</span>}
        {label}
      </div>

      <div
        style={{
          padding: "16px",
          border: "1px solid #d9d9d9",
          borderRadius: "8px",
          background: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <Text type="secondary" style={{ fontWeight: "500" }}>
            {relatedRecords.length} record(s)
          </Text>
          {!readonly && (
            <Button
              size="small"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
              disabled={!parentRecordId}
            >
              Add
            </Button>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Spin />
          </div>
        ) : relatedRecords.length > 0 ? (
          <Table
            dataSource={relatedRecords}
            columns={[
              ...tableColumns,
              {
                title: "Actions",
                key: "actions",
                render: (_, record) => (
                  <Space>
                    {!readonly && (
                      <>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEdit(record)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            Modal.confirm({
                              title: "Delete Record",
                              content: "Are you sure you want to delete this record?",
                              onOk: () => handleDelete(record.id),
                            });
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </Space>
                ),
              },
            ]}
            rowKey="id"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#8c8c8c",
            }}
          >
            <Text type="secondary">
              {parentRecordId
                ? "No related records. Click 'Add' to create one."
                : "Save the parent record first to add related records."}
            </Text>
          </div>
        )}
      </div>

      {/* Modal para editar/crear registro */}
      <Modal
        title={editingRecord ? `Edit ${label}` : `Add ${label}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingRecord(null);
        }}
        footer={null}
        width={800}
      >
        <TrytonForm
          model={relation}
          viewId={null}
          viewType="form"
          recordId={editingRecord?.id || null}
          recordData={editingRecord}
          title={editingRecord ? `Edit ${label}` : `Add ${label}`}
          onSubmit={handleModalSave}
          onCancel={() => {
            setModalVisible(false);
            setEditingRecord(null);
          }}
          readonly={readonly}
        />
      </Modal>

      {/* Campo oculto para almacenar los IDs en el formulario */}
      <Form.Item name={name} hidden>
        <Input type="hidden" />
      </Form.Item>

      {help && (
        <div style={{ marginTop: "8px", marginBottom: "16px" }}>
          <Text type="secondary" style={{ fontSize: "12px", lineHeight: "1.4" }}>
            {help}
          </Text>
        </div>
      )}
    </div>
  );
};

// Component for binary/image fields with upload and preview
const BinaryImageField = ({
  name,
  label,
  fieldDef,
  required,
  readonly,
  help,
  form,
  defaultValue,
}) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");

  // Cargar imagen existente
  useEffect(() => {
    if (defaultValue) {
      // Si defaultValue es base64, usarlo directamente
      if (typeof defaultValue === "string" && defaultValue.startsWith("data:")) {
        setImageUrl(defaultValue);
      } else if (typeof defaultValue === "object" && defaultValue.base64) {
        // Si es un objeto con base64
        setImageUrl(`data:image/png;base64,${defaultValue.base64}`);
      } else if (typeof defaultValue === "object" && defaultValue.__class__ === "bytes") {
        // Formato Tryton bytes
        setImageUrl(`data:image/png;base64,${defaultValue.base64}`);
      }
    }
  }, [defaultValue]);

  const getBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleChange = async (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }

    if (info.file.status === "done") {
      try {
        // Convertir a base64
        const base64 = await getBase64(info.file.originFileObj);
        setImageUrl(base64);

        // Extraer solo la parte base64 (sin el prefijo data:image/...)
        const base64Data = base64.split(",")[1];

        // Guardar en formato Tryton bytes
        form.setFieldValue(name, {
          __class__: "bytes",
          base64: base64Data,
        });

        setLoading(false);
        message.success("Image uploaded successfully");
      } catch (error) {
        console.error("Error processing image:", error);
        message.error("Error processing image");
        setLoading(false);
      }
    }

    if (info.file.status === "error") {
      setLoading(false);
      message.error("Error uploading image");
    }
  };

  const handlePreview = (file) => {
    if (file.url || file.preview) {
      setPreviewImage(file.url || file.preview);
      setPreviewVisible(true);
    } else if (imageUrl) {
      setPreviewImage(imageUrl);
      setPreviewVisible(true);
    }
  };

  const handleRemove = () => {
    setImageUrl(null);
    form.setFieldValue(name, null);
    message.success("Image removed");
  };

  const uploadButton = (
    <div>
      {loading ? <Spin /> : <UploadOutlined />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  );

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 font-medium text-gray-700 mb-2">
        {required && <span className="text-red-500">*</span>}
        <PictureOutlined className="text-teal-600" />
        {label}
      </div>

      <Upload
        name={name}
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        beforeUpload={(file) => {
          const isImage = file.type.startsWith("image/");
          if (!isImage) {
            message.error("You can only upload image files!");
            return false;
          }
          const isLt2M = file.size / 1024 / 1024 < 2;
          if (!isLt2M) {
            message.error("Image must be smaller than 2MB!");
            return false;
          }
          return true;
        }}
        onChange={handleChange}
        onPreview={handlePreview}
        disabled={readonly || loading}
        customRequest={({ file, onSuccess, onError }) => {
          // Simular upload (el procesamiento se hace en handleChange)
          setTimeout(() => {
            onSuccess("ok");
          }, 0);
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          uploadButton
        )}
      </Upload>

      {imageUrl && !readonly && (
        <div style={{ marginTop: "8px" }}>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleRemove}
          >
            Remove Image
          </Button>
        </div>
      )}

      {previewVisible && (
        <Image
          wrapperStyle={{ display: "none" }}
          preview={{
            visible: previewVisible,
            onVisibleChange: (visible) => setPreviewVisible(visible),
            mask: "Preview",
          }}
          src={previewImage}
        />
      )}

      {/* Campo oculto para almacenar el valor en el formulario */}
      <Form.Item name={name} hidden>
        <Input type="hidden" />
      </Form.Item>

      {help && (
        <div style={{ marginTop: "8px", marginBottom: "16px" }}>
          <Text type="secondary" style={{ fontSize: "12px", lineHeight: "1.4" }}>
            {help}
          </Text>
        </div>
      )}
    </div>
  );
};

// Helper function to process many2one data from backend format to component format
const processMany2OneData = (data, fieldsView) => {
  if (!data || !fieldsView || !fieldsView.fields) {
    return data;
  }

  console.log("🔍 Procesando datos many2one - entrada:", data);
  console.log(
    "🔍 Campos disponibles en fieldsView:",
    Object.keys(fieldsView.fields)
  );
  console.log("🔍 TODAS las claves en data:", Object.keys(data));

  const processedData = { ...data };

  // Identificar campos many2one y procesarlos
  Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
    if (fieldDef.type === "many2one") {
      const fieldValue = data[fieldName];
      const fieldRecName = data[`${fieldName}.rec_name`];

      // Skip null/undefined values - no need to process or log them
      if (fieldValue === null || fieldValue === undefined) {
        return;
      }

      console.log(`🔍 Procesando campo ${fieldName}:`, {
        fieldValue,
        fieldRecName,
        fieldType: fieldDef.type,
        relation: fieldDef.relation,
        hasValue: fieldValue !== null && fieldValue !== undefined,
        hasRecName: !!fieldRecName,
        fieldValueType: typeof fieldValue,
      });

      // CASO 1: Formato expandido de Tryton (fieldValue = ID, fieldExpanded = objeto con rec_name)
      const fieldExpanded = data[`${fieldName}.`]; // Objeto expandido con rec_name
      console.log(`🔍 Buscando clave "${fieldName}." en data:`, fieldExpanded);
      if (fieldExpanded && fieldExpanded.rec_name) {
        processedData[fieldName] = {
          id: fieldValue,
          rec_name: fieldExpanded.rec_name,
        };
        console.log(
          `✅ Procesado many2one ${fieldName} (formato expandido Tryton):`,
          processedData[fieldName]
        );
      }
      // CASO 2: Formato expandido manual (fieldValue = ID, fieldRecName = nombre)
      else if (fieldRecName) {
        processedData[fieldName] = {
          id: fieldValue,
          rec_name: fieldRecName,
        };
        console.log(
          `✅ Procesado many2one ${fieldName} (formato expandido manual):`,
          processedData[fieldName]
        );
      }
      // CASO 3: Formato objeto directo (fieldValue = objeto con id, name, rec_name)
      else if (typeof fieldValue === "object" && fieldValue.id) {
        processedData[fieldName] = {
          id: fieldValue.id,
          rec_name:
            fieldValue.rec_name || fieldValue.name || `ID: ${fieldValue.id}`,
        };
        console.log(
          `✅ Procesado many2one ${fieldName} (formato objeto):`,
          processedData[fieldName]
        );
      }
      // CASO 4: Solo ID (sin rec_name)
      else {
        processedData[fieldName] = fieldValue; // Keep as is, will be loaded dynamically
        console.log(
          `⚠️ Field ${fieldName} only has ID, will be loaded dynamically:`,
          fieldValue
        );
      }
    }
  });

  console.log("🔍 Procesando datos many2one - salida:", processedData);
  return processedData;
};

// Helper function to convert Tryton date/datetime objects to dayjs
const parseTrytonDate = (value) => {
  if (!value) return null;

  // If it's already a dayjs object, return it
  if (dayjs.isDayjs(value)) return value;

  // If it's a string, parse it
  if (typeof value === "string") {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed : null;
  }

  // If it's a Tryton date object: { __class__: 'date', year, month, day }
  if (typeof value === "object" && value.__class__ === "date") {
    try {
      const iso = `${String(value.year).padStart(4, "0")}-${String(
        value.month
      ).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`;
      const parsed = dayjs(iso);
      return parsed.isValid() ? parsed : null;
    } catch (e) {
      console.warn("Error parsing Tryton date:", value, e);
      return null;
    }
  }

  // If it's a Tryton datetime object: { __class__: 'datetime', year, month, day, hour, minute, second }
  if (typeof value === "object" && value.__class__ === "datetime") {
    try {
      const iso = `${String(value.year).padStart(4, "0")}-${String(
        value.month
      ).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${String(
        value.hour || 0
      ).padStart(2, "0")}:${String(value.minute || 0).padStart(
        2,
        "0"
      )}:${String(value.second || 0).padStart(2, "0")}`;
      const parsed = dayjs(iso);
      return parsed.isValid() ? parsed : null;
    } catch (e) {
      console.warn("Error parsing Tryton datetime:", value, e);
      return null;
    }
  }

  return null;
};

// Helper function to extract only the IDs from many2one fields for form values
const extractFormValues = (data, fieldsView) => {
  if (!data || !fieldsView || !fieldsView.fields) {
    return data;
  }

  const formValues = { ...data };

  // Process each field based on its type
  Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
    // Para campos many2one, extraer solo el ID
    if (fieldDef.type === "many2one" && data[fieldName]) {
      if (typeof data[fieldName] === "object" && data[fieldName].id) {
        // Si es un objeto procesado, extraer el ID
        formValues[fieldName] = data[fieldName].id;
        console.log(`✅ Extrayendo ID de ${fieldName}:`, data[fieldName].id);
      }
      // If it's already a number (direct ID), keep it as is
      else if (typeof data[fieldName] === "number") {
        formValues[fieldName] = data[fieldName];
        console.log(
          `✅ Manteniendo ID directo de ${fieldName}:`,
          data[fieldName]
        );
      }
    }

    // Para campos date/datetime, convertir a dayjs
    if (
      (fieldDef.type === "date" || fieldDef.type === "datetime") &&
      data[fieldName]
    ) {
      const parsed = parseTrytonDate(data[fieldName]);
      if (parsed) {
        formValues[fieldName] = parsed;
        console.log(
          `✅ Convirtiendo fecha ${fieldName}:`,
          data[fieldName],
          "→",
          parsed.format("YYYY-MM-DD")
        );
      } else {
        formValues[fieldName] = null;
        console.warn(
          `⚠️ Could not parse date for ${fieldName}:`,
          data[fieldName]
        );
      }
    }

    // Remover campos expandidos (.rec_name) del formulario
    if (fieldName.includes(".")) {
      delete formValues[fieldName];
    }
  });

  return formValues;
};

const TrytonForm = forwardRef(({
  model,
  viewId,
  viewType = "form",
  recordId = null,
  recordData = null,
  title = "Form",
  onSave = null,
  onCancel = null,
  readonly = false,
  onSubmit = null, // New prop to handle custom submission
  loading = false, // New prop for external loading state
  submitButtonText = "Save", // New prop for button text
  fieldsView = null, // New prop to pass fieldsView directly
  onFormChange = null, // Callback when form changes (dirty detection)
}, ref) => {
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
  const [formSections, setFormSections] = useState([]);
  const [initialValues, setInitialValues] = useState(null);

  // Rastrear campos modificados (solo se envían al servidor los campos que cambian)
  const [modifiedFields, setModifiedFields] = useState({});

  // Exponer método submit para que el componente padre pueda dispararlo
  useImperativeHandle(ref, () => ({
    submit: () => {
      console.log('🖱️ Submit llamado desde componente padre (toolbar)');
      form.submit();
    }
  }));

  // Manejar cambios en campos del formulario
  const handleFormChange = (changedValues, allValues) => {
    // Rastrear qué campos han sido modificados
    if (changedValues && Object.keys(changedValues).length > 0) {
      setModifiedFields((prev) => {
        const updated = { ...prev };
        Object.keys(changedValues).forEach((fieldName) => {
          updated[fieldName] = true;
        });
        console.log("📝 Campo modificado:", Object.keys(changedValues)[0]);
        return updated;
      });
    }

    // Detectar dirty state para componente padre
    if (onFormChange && initialValues) {
      const currentValues = form.getFieldsValue();
      const isDirty =
        JSON.stringify(currentValues) !== JSON.stringify(initialValues);
      onFormChange(isDirty);
    }
  };

  // Function to create field components for sections
  const createFieldComponents = () => {
    const fieldComponents = {};

    console.log(
      "🔍 Creating field components for fields:",
      fields.map((f) => f.name)
    );
    fields.forEach((field) => {
      fieldComponents[field.name] = renderFormField(field);
      console.log(`🔍 Created component for field: ${field.name}`);
    });

    console.log("🔍 Field components created:", Object.keys(fieldComponents));
    return fieldComponents;
  };

  useEffect(() => {
    if (fieldsView) {
      // Si se proporciona fieldsView directamente, usarlo
      setFormInfo(fieldsView);

      // Parsear secciones del formulario
      const parsedSections = parseFormSections(fieldsView);
      setFormSections(parsedSections.sections);
      console.log("📋 Secciones parseadas:", parsedSections.sections);
      console.log("📋 Arch XML:", fieldsView.arch);
      console.log("📋 Fields available:", Object.keys(fieldsView.fields || {}));

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
        setInitialValues(formValues);
        setModifiedFields({});
      } else {
        setInitialValues({});
        setModifiedFields({});
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

      // Get complete form information
      const formInfo = await trytonService.getFormInfo(
        model,
        viewId,
        viewType,
        recordId
      );
      console.log("🔍 Información de formulario obtenida:", formInfo);

      setFormInfo(formInfo.fieldsView);

      // Parsear secciones del formulario
      const parsedSections = parseFormSections(formInfo.fieldsView);
      setFormSections(parsedSections.sections);
      console.log("📋 Secciones parseadas:", parsedSections.sections);

      // Generar campos del formulario
      const formFields = generateFormFields(formInfo.fieldsView);
      setFields(formFields);

      // Load dynamic selection options
      await loadSelectionOptions(formInfo.fieldsView);

      // Si hay datos del registro, establecerlos
      if (formInfo.data || recordData) {
        const dataToUse = formInfo.data || recordData;

        // Procesar datos para many2one
        const processedData = processMany2OneData(
          dataToUse,
          formInfo.fieldsView
        );
        setFormData(processedData);

        // Establecer solo los IDs en el formulario
        const formValues = extractFormValues(
          processedData,
          formInfo.fieldsView
        );
        form.setFieldsValue(formValues);
        setInitialValues(formValues);

        console.log("✅ Datos del registro establecidos:", processedData);
        console.log("✅ Valores del formulario:", formValues);
      } else {
        // Formulario nuevo - establecer valores por defecto
        const defaultValues = getDefaultValues(formInfo.fieldsView);
        setFormData(defaultValues);
        form.setFieldsValue(defaultValues);
        setInitialValues(defaultValues);
        console.log("✅ Valores por defecto establecidos:", defaultValues);
      }
    } catch (error) {
      console.error("❌ Error loading form:", error);
      setError(error.message);
    } finally {
      setInternalLoading(false);
    }
  };

  const loadSelectionOptions = async (fieldsView) => {
    if (!fieldsView.fields) return;

    const optionsToLoad = {};

    // Identify selection fields that have methods
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      if (
        fieldDef.type === "selection" &&
        typeof fieldDef.selection === "string"
      ) {
        optionsToLoad[fieldName] = fieldDef.selection;
      }
    });

    // Load options for each field
    for (const [fieldName, methodName] of Object.entries(optionsToLoad)) {
      try {
        console.log(
          `🔍 Loading options for ${fieldName} using method ${methodName}`
        );
        const options = await trytonService.getSelectionOptions(
          model,
          methodName
        );
        setSelectionOptions((prev) => ({
          ...prev,
          [fieldName]: options,
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
    console.log("🔍 Campos encontrados en arch:", archFields);

    // Process fields that are in arch or are basic
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      const isInArch = archFields.includes(fieldName);
      const isBasicField = [
        "id",
        "name",
        "code",
        "rec_name",
        "active",
      ].includes(fieldName);

      if (isInArch || isBasicField) {
        console.log(
          `✅ Incluyendo campo: ${fieldName} (tipo: ${fieldDef.type}, readonly: ${fieldDef.readonly})`
        );
        formFields.push({
          name: fieldName,
          label: fieldDef.string || fieldName,
          fieldDef,
          required: fieldDef.required || false,
          readonly: fieldDef.readonly || false,
          help: fieldDef.help || null,
        });
      } else {
        console.log(
          `⏭️ Omitiendo campo: ${fieldName} (no está en arch ni es básico)`
        );
      }
    });

    console.log(`📋 Total de campos del formulario: ${formFields.length}`);
    return formFields;
  };

  const shouldIncludeField = (fieldName, arch) => {
    // Check if the field is in the view's arch
    if (arch && arch.includes(`name="${fieldName}"`)) {
      return true;
    }

    // Basic fields to always include
    const basicFields = ["id", "name", "code", "rec_name", "active"];

    return basicFields.includes(fieldName);
  };

  const parseArchFields = (arch) => {
    if (!arch) return [];

    const fieldMatches = arch.match(/name="([^"]+)"/g);
    if (!fieldMatches) return [];

    return fieldMatches.map((match) => match.replace(/name="([^"]+)"/, "$1"));
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
      console.warn(`⚠️ Field ${name} has no fieldDef defined`);
      return (
        <Form.Item key={name} name={name} label={label || name}>
          <Input disabled placeholder="Field not available" />
        </Form.Item>
      );
    }

    const fieldType = fieldDef.type;

    // Obtener valores actuales del formulario
    const currentFormData = form.getFieldsValue();

    // Evaluar si el campo es readonly usando PYSON
    const isDynamicReadonly = isFieldReadonly(fieldDef, currentFormData);
    const isReadonly = isDynamicReadonly || !isEditing;

    // Debug para el campo ref (PUID)
    if (name === "ref") {
      console.log("🔍 PUID (ref) debug:", {
        name,
        isEditing,
        isDynamicReadonly,
        isReadonly,
        "fieldDef.readonly": fieldDef.readonly,
        "fieldDef.states": fieldDef.states,
        "currentFormData.active": currentFormData.active,
        currentFormData,
      });
    }

    const commonProps = {
      name,
      label: help ? (
        <div>
          <div>{label}</div>
          {help && (
            <Text
              type="secondary"
              style={{ fontSize: "12px", fontWeight: "normal" }}
            >
              {help}
            </Text>
          )}
        </div>
      ) : (
        label
      ),
      required,
      disabled: isReadonly,
      style: { marginBottom: "16px" },
    };

    switch (fieldType) {
      case "char":
      case "varchar":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <Input
              disabled={isReadonly}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base"
            />
          </Form.Item>
        );

      case "text":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <Input.TextArea
              disabled={isReadonly}
              rows={4}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 text-base resize-y"
            />
          </Form.Item>
        );

      case "integer":
      case "bigint":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <InputNumber
              disabled={isReadonly}
              style={{ width: "100%" }}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base w-full"
            />
          </Form.Item>
        );

      case "float":
      case "numeric":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <InputNumber
              disabled={isReadonly}
              style={{ width: "100%" }}
              step={0.01}
              placeholder={`Enter ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 text-base w-full"
            />
          </Form.Item>
        );

      case "boolean":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <Switch
              disabled={isReadonly}
              className="[&.ant-switch-checked]:bg-teal-600 [&.ant-switch-checked]:shadow-teal-200"
            />
          </Form.Item>
        );

      case "date":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <DatePicker
              disabled={isReadonly}
              style={{ width: "100%" }}
              placeholder={`Select ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 w-full"
            />
          </Form.Item>
        );

      case "datetime":
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <DatePicker
              disabled={isReadonly}
              showTime
              style={{ width: "100%" }}
              placeholder={`Select ${label.toLowerCase()}`}
              className="rounded-lg border-2 border-gray-200 hover:border-teal-600 focus:border-teal-600 focus:shadow-teal-200 focus:shadow-lg transition-all duration-300 h-12 w-full"
            />
          </Form.Item>
        );

      case "timedelta":
        return (
          <Form.Item key={name} {...commonProps}>
            <div style={{ display: "flex", gap: "8px" }}>
              <InputNumber placeholder="Days" style={{ flex: 1 }} min={0} />
              <InputNumber
                placeholder="Hours"
                style={{ flex: 1 }}
                min={0}
                max={23}
              />
              <InputNumber
                placeholder="Minutes"
                style={{ flex: 1 }}
                min={0}
                max={59}
              />
            </div>
          </Form.Item>
        );

      case "selection": {
        const options = fieldDef.selection || [];
        // If selection is a function (string), use dynamically loaded options
        if (typeof fieldDef.selection === "string") {
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
              help={
                help ? (
                  <Text type="secondary" className="text-xs">
                    {help}
                  </Text>
                ) : null
              }
              className="mb-6"
            >
              <Select
                disabled={isReadonly}
                placeholder={`Select ${label.toLowerCase()}`}
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
            help={
              help ? (
                <Text type="secondary" className="text-xs">
                  {help}
                </Text>
              ) : null
            }
            className="mb-6"
          >
            <Select
              disabled={isReadonly}
              placeholder={`Select ${label.toLowerCase()}`}
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
      }

      case "many2one":
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

      case "multiselection": {
        const multiselectionOptions = fieldDef.selection || [];

        return (
          <Form.Item key={name} {...commonProps}>
            <Select
              mode="multiple"
              placeholder={`Select ${label.toLowerCase()}`}
              style={{ width: "100%" }}
            >
              {multiselectionOptions.map(([value, label]) => (
                <Option key={value} value={value}>
                  {label}
                </Option>
              ))}
            </Select>
          </Form.Item>
        );
      }
      case "many2many":
        return (
          <Form.Item key={name} {...commonProps}>
            <Select
              mode="multiple"
              placeholder={`Select ${label.toLowerCase()}`}
              style={{ width: "100%" }}
            >
              {/* Las opciones se cargarían dinámicamente */}
              <Option value="loading">Cargando opciones...</Option>
            </Select>
          </Form.Item>
        );

      case "one2many":
        return (
          <One2ManyField
            key={name}
            name={name}
            label={label}
            fieldDef={fieldDef}
            required={required}
            readonly={isReadonly}
            help={help}
            form={form}
            defaultValue={formData[name]}
            parentRecordId={recordId}
            parentModel={model}
          />
        );

      case "binary":
        // Determinar si es una imagen basándose en el nombre del campo o el tipo
        const isImageField =
          name.toLowerCase().includes("image") ||
          name.toLowerCase().includes("photo") ||
          name.toLowerCase().includes("picture") ||
          name.toLowerCase().includes("avatar") ||
          fieldDef.string?.toLowerCase().includes("image") ||
          fieldDef.string?.toLowerCase().includes("photo") ||
          fieldDef.string?.toLowerCase().includes("picture");
        
        if (isImageField) {
          return (
            <BinaryImageField
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
        }
        
        // Para otros campos binary (archivos), mostrar un componente básico
        return (
          <Form.Item key={name} {...commonProps}>
            <div
              style={{
                padding: "12px",
                border: "1px dashed #d9d9d9",
                borderRadius: "6px",
                textAlign: "center",
                color: "#8c8c8c",
              }}
            >
              <Text type="secondary">File field (binary)</Text>
              <br />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Will be implemented in future versions
              </Text>
            </div>
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={name} {...commonProps}>
            <Input placeholder={`Enter ${label.toLowerCase()}`} />
          </Form.Item>
        );
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      setError(null);

      // Solo enviar campos modificados O todos si es registro nuevo
      const isNewRecord = !recordId || recordId < 0;
      const writableValues = {};

      if (formInfo && formInfo.fields) {
        Object.entries(values).forEach(([fieldName, fieldValue]) => {
          const fieldDef = formInfo.fields[fieldName];

          if (!fieldDef) {
            if (isNewRecord || modifiedFields[fieldName]) {
              writableValues[fieldName] = fieldValue;
            }
            return;
          }

          // Solo incluir campos modificados (o todos si es registro nuevo)
          if (!isNewRecord && !modifiedFields[fieldName]) {
            return;
          }

          // Excluir campos readonly (son campos calculados o sin setter)
          // El servidor rechaza estos campos con "Missing setter function"
          if (
            fieldDef.readonly &&
            !(fieldDef.type === "one2many" || fieldDef.type === "many2many")
          ) {
            console.log(`⏭️ Omitiendo campo readonly: ${fieldName}`);
            return;
          }

          // Excluir campos calculados comunes
          const computedFields = [
            "age",
            "rec_name",
            "_timestamp",
            "_write",
            "_delete",
          ];
          if (computedFields.includes(fieldName)) {
            console.log(`⏭️ Omitiendo campo computado: ${fieldName}`);
            return;
          }

          // Convertir fechas de dayjs a string
          if (
            (fieldDef.type === "date" || fieldDef.type === "datetime") &&
            fieldValue
          ) {
            if (dayjs.isDayjs(fieldValue)) {
              if (fieldDef.type === "date") {
                writableValues[fieldName] = fieldValue.format("YYYY-MM-DD");
              } else {
                writableValues[fieldName] = fieldValue.toISOString();
              }
            } else {
              writableValues[fieldName] = fieldValue;
            }
            return;
          }

          // Campos one2many no se envían directamente (se manejan a través de los registros relacionados)
          if (fieldDef.type === "one2many") {
            console.log(`⏭️ Omitiendo campo one2many ${fieldName} (se maneja a través de registros relacionados)`);
            return;
          }

          // Campos binary ya están en formato correcto (__class__: "bytes")
          if (fieldDef.type === "binary" && fieldValue) {
            // Si ya está en formato Tryton bytes, mantenerlo
            if (typeof fieldValue === "object" && fieldValue.__class__ === "bytes") {
              writableValues[fieldName] = fieldValue;
            } else {
              writableValues[fieldName] = fieldValue;
            }
            return;
          }

          // Incluir campo
          writableValues[fieldName] = fieldValue;
          console.log(
            `✅ Incluyendo campo modificado: ${fieldName}`,
            fieldValue
          );
        });
      } else {
        Object.assign(writableValues, values);
      }

      console.log(
        "💾 Guardando formulario (valores escribibles):",
        writableValues
      );

      // Si se proporciona onSubmit, usarlo en lugar del flujo normal
      if (onSubmit) {
        await onSubmit(writableValues);
        return;
      }

      let savedRecordId = recordId;

      if (recordId) {
        // Actualizar registro existente
        await trytonService.updateRecord(model, recordId, writableValues);
        console.log("✅ Registro actualizado");
      } else {
        // Crear nuevo registro
        const newId = await trytonService.createRecord(model, writableValues);
        console.log("✅ Nuevo registro creado:", newId);
        savedRecordId = newId[0];
        setFormData({ ...formData, id: savedRecordId });
      }

      // 🔄 RECARGAR DATOS DEL SERVIDOR para obtener campos calculados actualizados
      if (savedRecordId && formInfo) {
        const fields = Object.keys(formInfo.fields || {});
        const expandedFields =
          trytonService.expandFieldsForRelationsFromFieldsView(
            fields,
            formInfo
          );

        const reloadedData = await trytonService.getFormRecordData(
          model,
          savedRecordId,
          expandedFields
        );

        // Procesar datos para many2one
        const processedData = processMany2OneData(reloadedData, formInfo);
        setFormData(processedData);

        // Establecer valores en el formulario
        const formValues = extractFormValues(processedData, formInfo);
        form.setFieldsValue(formValues);
        setInitialValues(formValues);
      }

      setIsEditing(false);

      // Limpiar campos modificados después de guardar
      setModifiedFields({});

      // Resetear estado dirty
      if (onFormChange) {
        onFormChange(false);
      }

      if (onSave) {
        onSave(writableValues, savedRecordId);
      }
    } catch (error) {
      console.error("❌ Error guardando formulario:", error);
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
      // Restaurar valores iniciales (ya procesados con dayjs)
      form.setFieldsValue(initialValues);
      setIsEditing(false);
      setModifiedFields({});
    } else {
      // Limpiar formulario
      form.resetFields();
    }

    if (onCancel) {
      onCancel();
    }
  };

  if (currentLoading || !formInfo || fields.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
        }}
      >
        <Spin size="large" />
        <Text style={{ marginLeft: "16px" }}>Cargando formulario...</Text>
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
        background: "linear-gradient(135deg, #00A88E 0%, #00C4A7 100%)",
        borderRadius: "16px 16px 0 0",
        border: "none",
        padding: "20px 24px",
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
                    onClick={() => {
                      console.log("🖱️ Save button clicked!");
                      form.submit();
                    }}
                    className="bg-teal-600 hover:bg-teal-700 border-teal-600 hover:border-teal-700 text-white rounded-lg shadow-md"
                  >
                    {submitButtonText}
                  </Button>
                  <Button
                    icon={<MinusOutlined />}
                    onClick={handleCancel}
                    className="bg-white border-gray-300 text-gray-600 hover:border-teal-600 hover:text-teal-600 rounded-lg"
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEdit}
                  className="bg-teal-600 hover:bg-teal-700 border-teal-600 hover:border-teal-700 text-white rounded-lg shadow-md"
                >
                  Edit
                </Button>
              )}
            </>
          )}
        </Space>
      }
      styles={{ body: { padding: "24px" } }}
    >
      <div className="bg-gray-50 rounded-lg p-6 -mx-6 -mb-6">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={formData}
          onValuesChange={handleFormChange}
        >
          {formSections.length > 0 &&
          formSections.some((s) => s.fields && s.fields.length > 0) ? (
            <FormSections
              sections={formSections}
              fields={formInfo?.fields || {}}
              form={form}
              fieldComponents={createFieldComponents()}
              loading={currentLoading}
            />
          ) : (
            <Row gutter={[24, 16]}>
              {fields.map((field) => (
                <Col
                  key={field.name}
                  xs={24}
                  sm={12}
                  lg={8}
                  style={{ marginBottom: "16px" }}
                >
                  {renderFormField(field)}
                </Col>
              ))}
            </Row>
          )}

          {fields.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Text>No fields available for this form</Text>
            </div>
          )}
        </Form>
      </div>

      {formInfo && (
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Text type="secondary" style={{ fontSize: "12px" }}>
            Vista: {viewId} | Tipo: {formInfo.type} | Campos: {fields.length}
          </Text>
        </div>
      )}
    </Card>
  );
});

TrytonForm.displayName = 'TrytonForm';

export default TrytonForm;
