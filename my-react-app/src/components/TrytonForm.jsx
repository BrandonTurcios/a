import {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useTranslation } from "react-i18next";
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
  App,
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
  CopyOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import trytonService from "../services/trytonService";
import { parseFormSections } from "../utils/formParser";
import FormSections from "./FormSection";
import { colors } from "../config/colors";

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const imagePrefixHints = ["iVBORw0K", "/9j/", "R0lGOD", "Qk0"];
// SVG base64 starts with "PHN2Zy" (which is "<svg" encoded)
const svgBase64Prefix = "PHN2Zy";
const isLikelySvgBase64 = (value) => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  // Check if it's already an SVG string
  if (trimmed.startsWith("<svg") || trimmed.startsWith("<?xml")) return true;
  // Check base64 prefix for SVG
  if (trimmed.startsWith(svgBase64Prefix)) return true;
  // Try to decode a larger sample to check for SVG content
  try {
    // Take a larger sample to ensure we catch SVG declarations
    const sample = trimmed.substring(0, Math.min(200, trimmed.length));
    // Remove any padding
    const cleanSample = sample.replace(/=+$/, "");
    if (cleanSample.length < 4) return false;
    const decoded = atob(cleanSample);
    const decodedTrimmed = decoded.trim();
    // Check for SVG markers
    return (
      decodedTrimmed.startsWith("<svg") ||
      decodedTrimmed.startsWith("<?xml") ||
      decodedTrimmed.includes("<svg") ||
      decodedTrimmed.includes("xmlns=\"http://www.w3.org/2000/svg\"")
    );
  } catch (error) {
    // If decoding fails, it's not valid base64, so not an SVG
    return false;
  }
};

const isBase64Image = (value) => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  // Check for data URLs
  if (trimmed.startsWith("data:image")) {
    // Check if it's SVG in data URL
    if (trimmed.includes("svg+xml")) return true;
    return true; // Other image types
  }
  // Check for base64 image prefixes (PNG, JPG, GIF, etc.)
  const sample = trimmed.substring(0, 20);
  if (imagePrefixHints.some((hint) => sample.startsWith(hint))) return true;
  // Check for SVG
  return isLikelySvgBase64(trimmed);
};

const getImageDataUrl = (base64) => {
  if (!base64) return null;
  const trimmed = base64.trim();
  // If it's already a data URL, return as is
  if (trimmed.startsWith("data:")) return trimmed;
  // Check if it's SVG
  if (isLikelySvgBase64(trimmed)) {
    return `data:image/svg+xml;base64,${trimmed}`;
  }
  // Default to PNG for other images
  return `data:image/png;base64,${trimmed}`;
};

const createFieldLabel = (labelText, required, icon = null) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontWeight: "bold",
      color: "var(--color-text-primary)",
    }}
  >
    {required && (
      <span style={{ color: "var(--color-danger-500)" }}>*</span>
    )}
    {icon && (
      <span style={{ color: "var(--color-primary-500)" }}>{icon}</span>
    )}
    {labelText}
  </div>
);

const createFieldHelp = (helpText) =>
  helpText ? (
    <Text type="secondary" style={{ fontSize: "12px" }}>
      {helpText}
    </Text>
  ) : null;

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
    console.log(`🔍 Campo ${fieldDef.name} sin states:`, {
      "fieldDef.readonly": fieldDef.readonly,
      staticReadonly: staticReadonly,
    });
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
  const { t } = useTranslation();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [recordData, setRecordData] = useState(null);
  const [fieldsView, setFieldsView] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
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

  // Function to handle opening the record in a modal
  const handleOpenRecord = async () => {
    const currentValue = form.getFieldValue(name);
    if (!currentValue || !relation) {
      message.warning(t("form.selectField", { field: label }));
      return;
    }

    try {
      setLoadingRecord(true);
      setModalVisible(true);

      // Get form view for the related model
      const formFieldsView = await trytonService.getFieldsView(
        relation,
        null,
        "form"
      );

      if (!formFieldsView) {
        throw new Error(t("errors.couldNotGetFormView"));
      }

      setFieldsView(formFieldsView);

      // Get expanded fields for relations
      const fields = Object.keys(formFieldsView.fields || {});
      const expandedFields =
        trytonService.expandFieldsForRelationsFromFieldsView(
          fields,
          formFieldsView
        );

      // Get record data using model.read
      const recordDataResult = await trytonService.getFormRecordData(
        relation,
        currentValue,
        expandedFields
      );

      setRecordData(recordDataResult);
    } catch (error) {
      console.error("Error opening record:", error);
      message.error(`Error opening record: ${error.message}`);
      setModalVisible(false);
    } finally {
      setLoadingRecord(false);
    }
  };

  // Get current record ID from form
  const getCurrentRecordId = () => {
    return form.getFieldValue(name);
  };

  return (
    <div style={{ marginBottom: "24px", width: "100%", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: "bold",
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}
      >
        {required && (
          <span style={{ color: "var(--color-danger-500)" }}>*</span>
        )}
        <SearchOutlined style={{ color: "var(--color-primary-500)" }} />
        {label}
      </div>

      <div style={{ marginBottom: help ? "12px" : "0", display: "flex", gap: "12px", alignItems: "flex-start", width: "100%", minWidth: 0, overflow: "visible" }}>
        <div style={{ flex: 1, minWidth: 0, overflow: "visible", width: "100%" }}>
          <AutoComplete
            value={inputValue}
            options={options}
            onSearch={searchOptions}
            onSelect={handleSelect}
            onChange={handleChange}
            placeholder={help || `Type in the ${label.toLowerCase()}`}
            disabled={readonly}
            notFoundContent={loading ? <Spin size="small" /> : null}
            style={{ width: "100%", minWidth: 0 }}
            filterOption={false}
            className="modern-autocomplete"
          >
            <Input
              suffix={
                loading ? (
                  <Spin size="small" />
                ) : (
                  <SearchOutlined
                    style={{ color: "var(--color-primary-500)" }}
                  />
                )
              }
              style={{
                borderRadius: "16px",
                border: "1.5px solid var(--color-neutral-200)",
                height: "48px",
                fontSize: "15px",
                padding: "12px 16px",
                background: "linear-gradient(180deg, #fff, #fafbfc)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                width: "100%",
                minWidth: 0,
                overflow: "visible",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--color-primary-500)";
                e.target.style.background = "linear-gradient(180deg, #fff, #f0f9ff)";
                e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--color-neutral-200)";
                e.target.style.background = "linear-gradient(180deg, #fff, #fafbfc)";
                e.target.style.boxShadow = "none";
              }}
              onMouseEnter={(e) => {
                if (!e.target.disabled && document.activeElement !== e.target) {
                  e.target.style.borderColor = "var(--color-primary-400)";
                }
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target) {
                  e.target.style.borderColor = "var(--color-neutral-200)";
                }
              }}
            />
          </AutoComplete>
        </div>
        <Button
          type="default"
          icon={<EyeOutlined />}
          onClick={handleOpenRecord}
          disabled={!getCurrentRecordId() || readonly}
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1.5px solid var(--color-neutral-200)",
            background: "linear-gradient(180deg, #fff, #fafbfc)",
            color: "var(--color-primary-700)",
            fontWeight: 500,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            padding: 0,
          }}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.borderColor = "var(--color-primary-400)";
              e.currentTarget.style.background = "linear-gradient(180deg, #fff, #f0f9ff)";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--color-neutral-200)";
            e.currentTarget.style.background = "linear-gradient(180deg, #fff, #fafbfc)";
            e.currentTarget.style.boxShadow = "none";
          }}
          title={t("form.openRecord")}
        />
      </div>

      {/* Campo oculto para almacenar el ID en el formulario */}
      <Form.Item
        name={name}
        hidden
        rules={[
          {
            required,
            message: t("validation.fieldRequired", { field: label }),
          },
        ]}
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

      {/* Modal to show the related record */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <EyeOutlined style={{ color: "var(--color-primary-500)" }} />
            <span>{label} - {t("form.view")}</span>
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setRecordData(null);
          setFieldsView(null);
        }}
        footer={null}
        width="90vw"
        style={{ maxWidth: "1200px" }}
        destroyOnClose
      >
        <Spin spinning={loadingRecord}>
          {fieldsView && recordData && (
            <TrytonForm
              model={relation}
              fieldsView={fieldsView}
              recordData={recordData}
              recordId={getCurrentRecordId()}
              readonly={false}
              title={`${label} - ${t("form.view")}`}
              onSave={async (values, savedRecordId) => {
                try {
                  // El TrytonForm ya maneja el guardado, solo necesitamos recargar los datos
                  message.success(t("common.success"));
                  // Recargar los datos del registro actualizado
                  const fields = Object.keys(fieldsView.fields || {});
                  const expandedFields =
                    trytonService.expandFieldsForRelationsFromFieldsView(
                      fields,
                      fieldsView
                    );
                  const updatedData = await trytonService.getFormRecordData(
                    relation,
                    savedRecordId || getCurrentRecordId(),
                    expandedFields
                  );
                  setRecordData(updatedData);
                } catch (error) {
                  console.error("Error saving record:", error);
                  message.error(`Error saving: ${error.message}`);
                }
              }}
              onCancel={() => {
                setModalVisible(false);
                setRecordData(null);
                setFieldsView(null);
              }}
            />
          )}
        </Spin>
      </Modal>
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
          fieldsView = await trytonService.getFieldsView(
            relation,
            null,
            "form"
          );
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
                  
                  // Si el valor es un objeto con rec_name, usarlo directamente
                  if (typeof value === "object" && value.rec_name) {
                    return value.rec_name;
                  }
                  
                  // Si el valor es un número, verificar si hay un campo relacionado con punto
                  // Por ejemplo, si fieldName es "patient" y value es 1, buscar "patient." en el record
                  if (typeof value === "number" && record) {
                    const relatedFieldName = `${fieldName}.`;
                    const relatedField = record[relatedFieldName];
                    if (relatedField && typeof relatedField === "object" && relatedField.rec_name) {
                      return relatedField.rec_name;
                    }
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
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: "500",
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}
      >
        {required && (
          <span style={{ color: "var(--color-danger-500)" }}>*</span>
        )}
        {label}
      </div>

      <div
        style={{
          padding: "16px",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          background: "var(--color-neutral-100)",
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
              data-span={8}
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
                              content:
                                "Are you sure you want to delete this record?",
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

// Component for binary/image fields with upload and preview
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

const extractBase64Payload = (value) => {
  if (!value) return null;
  if (typeof value === "string") {
    return value.startsWith("data:")
      ? value.split(",")[1] || ""
      : value;
  }
  if (typeof value === "object") {
    if (value.base64) return value.base64;
    if (value.__class__ === "bytes" && value.base64) {
      return value.base64;
    }
  }
  return null;
};

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
      if (
        typeof defaultValue === "string" &&
        defaultValue.startsWith("data:")
      ) {
        setImageUrl(defaultValue);
      } else if (typeof defaultValue === "object" && defaultValue.base64) {
        // Si es un objeto con base64
        setImageUrl(getImageDataUrl(defaultValue.base64));
      } else if (
        typeof defaultValue === "object" &&
        defaultValue.__class__ === "bytes"
      ) {
        // Formato Tryton bytes
        setImageUrl(getImageDataUrl(defaultValue.base64));
      } else if (typeof defaultValue === "string" && isBase64Image(defaultValue)) {
        setImageUrl(getImageDataUrl(defaultValue));
      }
    }
  }, [defaultValue]);

  const handleChange = async (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }

    if (info.file.status === "done") {
      try {
        // Convertir a base64
        const base64 = await fileToBase64(info.file.originFileObj);
        // Extraer solo la parte base64 (sin el prefijo data:image/...)
        const base64Data = base64.split(",")[1] || base64;
        
        // Usar getImageDataUrl para asegurar el formato correcto (especialmente para SVG)
        const imageDataUrl = getImageDataUrl(base64Data);
        setImageUrl(imageDataUrl);

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
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: "500",
          color: "var(--color-text-primary)",
          marginBottom: "8px",
        }}
      >
        {required && (
          <span style={{ color: "var(--color-danger-500)" }}>*</span>
        )}
        <PictureOutlined style={{ color: "var(--color-primary-500)" }} />
        {label}
      </div>

      <Upload
        name={name}
        listType="picture-card"
        className="avatar-uploader"
        showUploadList={false}
        beforeUpload={(file) => {
          const isImage = file.type.startsWith("image/") || file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
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

const BinaryFileField = ({
  name,
  label,
  required,
  readonly,
  help,
  form,
  defaultValue,
}) => {
  const { t } = useTranslation();
  const [base64Value, setBase64Value] = useState(
    extractBase64Payload(defaultValue)
  );
  const [fileName, setFileName] = useState(
    defaultValue?.filename || defaultValue?.name || label || name
  );
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setBase64Value(extractBase64Payload(defaultValue));
    setFileName(defaultValue?.filename || defaultValue?.name || label || name);
  }, [defaultValue, label, name]);

  const approxSize = base64Value
    ? Math.max(1, Math.round((base64Value.length * 3) / 4 / 1024))
    : 0;

  const handleCopy = async () => {
    if (!base64Value) return;
    try {
      await navigator.clipboard.writeText(base64Value);
      message.success("Base64 copiado al portapapeles");
    } catch (error) {
      message.warning("No se pudo copiar al portapapeles");
    }
  };

  const handleDownload = () => {
    if (!base64Value) return;
    const link = document.createElement("a");
    link.href = `data:application/octet-stream;base64,${base64Value}`;
    link.download = fileName || `${name}.bin`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const beforeUpload = async (file) => {
    try {
      setUploading(true);
      const base64 = await fileToBase64(file);
      const payload = base64.split(",")[1] || base64;
      setBase64Value(payload);
      setFileName(file.name);
      form.setFieldValue(name, {
        __class__: "bytes",
        base64: payload,
        filename: file.name,
      });
      message.success(`${file.name} listo`);
    } catch (error) {
      console.error("Error loading file:", error);
      message.error("No se pudo procesar el archivo");
    } finally {
      setUploading(false);
    }
    return false;
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <Form.Item
        name={name}
        label={createFieldLabel(label, required)}
        style={{ marginBottom: "12px" }}
      >
          <div
          style={{
            border: "1px solid var(--color-neutral-200)",
            borderRadius: "14px",
            background: "var(--color-neutral-25)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <Text strong style={{ color: "var(--color-primary-800)" }}>
                {fileName || "Sin nombre"}
              </Text>
              <div style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>
                {base64Value
                  ? `${approxSize} KB • base64`
                  : "Sin archivo cargado"}
              </div>
            </div>
            <Space size={8}>
              {base64Value && (
                <>
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopy}
                    size="small"
                  >
                    Copiar base64
                  </Button>
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                    size="small"
                    type="primary"
                  >
                    Descargar archivo
                  </Button>
                </>
              )}
              {!readonly && (
                <Upload
                  showUploadList={false}
                  beforeUpload={beforeUpload}
                  disabled={uploading}
                >
                  <Button
                    icon={<UploadOutlined />}
                    size="small"
                    loading={uploading}
                  >
                    Cargar archivo
                  </Button>
                </Upload>
              )}
            </Space>
          </div>
          {base64Value && isBase64Image(base64Value) && (
            <div
              style={{
                width: "100%",
                background: "#fff",
                borderRadius: "12px",
                border: "1px solid var(--color-neutral-200)",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <Image
                src={getImageDataUrl(base64Value)}
                alt={fileName || label}
                style={{ maxHeight: 260, objectFit: "contain" }}
              />
            </div>
          )}
          {!isBase64Image(base64Value) && (
            <div
              style={{
                maxHeight: "160px",
                overflow: "auto",
                background: "#fff",
                borderRadius: "10px",
                border: "1px solid var(--color-neutral-200)",
                padding: "12px",
                fontFamily: "monospace",
                fontSize: "12px",
                color: "var(--color-text-primary)",
                wordBreak: "break-all",
              }}
            >
              {base64Value
                ? base64Value.length > 1200
                  ? `${base64Value.slice(0, 1200)}…`
                  : base64Value
                : "Sin archivo cargado"}
            </div>
          )}
          {help && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {help}
            </Text>
          )}
        </div>
      </Form.Item>
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
  // Manejar valores falsy, strings vacíos, y valores inválidos
  if (!value || value === "" || value === "null" || value === "undefined") {
    return null;
  }

  // If it's already a dayjs object, return it
  if (dayjs.isDayjs(value)) return value;

  // If it's a string, parse it
  if (typeof value === "string") {
    // Trim whitespace
    const trimmed = value.trim();
    if (!trimmed) return null;

    try {
      const parsed = dayjs(trimmed);
      return parsed.isValid() ? parsed : null;
    } catch (e) {
      console.warn("Error parsing date string:", trimmed, e);
      return null;
    }
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
  if (!fieldsView || !fieldsView.fields) {
    return data || {};
  }

  // Inicializar formValues con todos los campos del fieldsView
  // Esto asegura que todos los campos se muestren, incluso si son null o no están en data
  const formValues = {};
  
  // Primero, inicializar todos los campos del fieldsView con null o su valor de data
  Object.keys(fieldsView.fields).forEach((fieldName) => {
    // Omitir campos expandidos (que tienen punto en el nombre)
    if (!fieldName.includes(".")) {
      formValues[fieldName] = data && data[fieldName] !== undefined ? data[fieldName] : null;
    }
  });

  // Copiar otros valores de data que no están en fieldsView (por si acaso)
  if (data) {
    Object.keys(data).forEach((key) => {
      if (!key.includes(".") && !fieldsView.fields[key]) {
        formValues[key] = data[key];
      }
    });
  }

  // Process each field based on its type
  Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
    // Omitir campos expandidos
    if (fieldName.includes(".")) {
      return;
    }

    // Para campos many2one, extraer solo el ID
    if (fieldDef.type === "many2one" && formValues[fieldName]) {
      if (typeof formValues[fieldName] === "object" && formValues[fieldName].id) {
        // Si es un objeto procesado, extraer el ID
        formValues[fieldName] = formValues[fieldName].id;
        console.log(`✅ Extrayendo ID de ${fieldName}:`, formValues[fieldName]);
      }
      // If it's already a number (direct ID), keep it as is
      else if (typeof formValues[fieldName] === "number") {
        // Ya está bien
        console.log(
          `✅ Manteniendo ID directo de ${fieldName}:`,
          formValues[fieldName]
        );
      }
    } else if (fieldDef.type === "many2one" && !formValues[fieldName]) {
      // Campo many2one sin valor, establecer null explícitamente
      formValues[fieldName] = null;
    }

    // Para campos date/datetime, convertir a dayjs
    if (fieldDef.type === "date" || fieldDef.type === "datetime") {
      if (formValues[fieldName]) {
        const parsed = parseTrytonDate(formValues[fieldName]);
        if (parsed) {
          formValues[fieldName] = parsed;
          console.log(
            `✅ Convirtiendo fecha ${fieldName}:`,
            formValues[fieldName],
            "→",
            parsed.format("YYYY-MM-DD")
          );
        } else {
          formValues[fieldName] = null;
          console.warn(
            `⚠️ Could not parse date for ${fieldName}:`,
            formValues[fieldName]
          );
        }
      } else {
        // Campo date/datetime sin valor, establecer null explícitamente
        formValues[fieldName] = null;
      }
    }
  });

  return formValues;
};

const TrytonForm = forwardRef(
  (
    {
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
    },
    ref
  ) => {
    const { t } = useTranslation();
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
        console.log("🖱️ Submit llamado desde componente padre (toolbar)");
        form.submit();
      },
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

        // Parsear secciones del formulario (pasar recordData para incluir todos los campos)
        const parsedSections = parseFormSections(fieldsView, recordData);
        setFormSections(parsedSections.sections);
        console.log("📋 Secciones parseadas:", parsedSections.sections);
        console.log("📋 Arch XML:", fieldsView.arch);
        console.log(
          "📋 Fields available:",
          Object.keys(fieldsView.fields || {})
        );

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

        // Parsear secciones del formulario (pasar recordData para incluir todos los campos)
        const dataToUse = formInfo.data || recordData;
        const parsedSections = parseFormSections(formInfo.fieldsView, dataToUse);
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
      console.log("🔍 Tipo de vista:", fieldsView.type);
      console.log("🔍 Arch contiene:", fieldsView.arch?.substring(0, 200));
      
      // Verificar si el arch es de tipo tree (aunque el type del fieldsView sea "form")
      // Esto sucede cuando se hace fields_get desde una vista tree editable
      const isTreeArch = fieldsView.arch && (fieldsView.arch.includes("<tree") || fieldsView.arch.includes('editable="1"'));
      const hasArchFields = archFields.length > 0;
      
      console.log(`🔍 isTreeArch: ${isTreeArch}, arch type: ${fieldsView.type}, arch preview: ${fieldsView.arch?.substring(0, 100)}`);
      
      // Si hay datos del registro (recordData), incluir todos los campos que están en los datos
      // Esto asegura que campos con valor null también se muestren
      const hasRecordData = recordData && Object.keys(recordData).length > 0;
      // Obtener todos los campos que están en recordData (incluyendo los que tienen valor null explícito)
      const fieldsInRecordData = hasRecordData 
        ? Object.keys(recordData).filter(key => !key.includes(".") && recordData.hasOwnProperty(key))
        : [];
      
      // Si el arch es de tipo tree, SIEMPRE incluir todos los campos del fieldsView
      // Esto es porque cuando el arch es tree, solo contiene los campos visibles en la tabla,
      // pero en el formulario queremos mostrar todos los campos disponibles
      // También incluir todos si no hay campos en el arch o si hay datos del registro
      const isFormMode = viewType === "form" || !readonly;
      const hasFieldsNotInArch = hasRecordData && fieldsInRecordData.some(field => !archFields.includes(field));
      
      // CRÍTICO: Si hay datos del registro, SIEMPRE incluir todos los campos que están en los datos
      // Esto asegura que campos con valor null también se muestren, incluso si no están en el arch del form
      // También incluir todos si el arch es tree o si no hay campos en el arch
      const shouldIncludeAllFields = isTreeArch || !hasArchFields || hasRecordData;

      console.log(`🔍 shouldIncludeAllFields: ${shouldIncludeAllFields} (isTreeArch: ${isTreeArch}, isFormMode: ${isFormMode}, hasArchFields: ${hasArchFields}, hasFieldsNotInArch: ${hasFieldsNotInArch})`);
      if (hasRecordData) {
        console.log(`🔍 Campos en recordData que no están en arch:`, fieldsInRecordData.filter(field => !archFields.includes(field)));
      }

      // Process fields that are in arch or are basic
      Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
        // Omitir campos expandidos (que tienen punto en el nombre)
        if (fieldName.includes(".")) {
          return;
        }

        const isInArch = archFields.includes(fieldName);
        const isBasicField = [
          "id",
          "name",
          "code",
          "rec_name",
          "active",
        ].includes(fieldName);
        
        // Verificar si el campo está en los datos del registro (incluso si es null)
        // Usar hasOwnProperty para detectar campos que están explícitamente como null
        const isInRecordData = hasRecordData && recordData.hasOwnProperty(fieldName);

        // PRIORIDAD: Si el campo está en los datos del registro, SIEMPRE incluirlo (incluso si es null)
        // Esto asegura que todos los campos del read se muestren, independientemente del arch
        // También incluir si está en arch, es básico, o si debemos incluir todos los campos
        if (isInRecordData || isInArch || isBasicField || shouldIncludeAllFields) {
          console.log(
            `✅ Incluyendo campo: ${fieldName} (tipo: ${fieldDef.type}, readonly: ${fieldDef.readonly}, isInArch: ${isInArch}, isInRecordData: ${isInRecordData}, shouldIncludeAll: ${shouldIncludeAllFields})`
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
            `⏭️ Omitiendo campo: ${fieldName} (no está en arch ni es básico ni en recordData)`
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

    // Helper function para estilos comunes de inputs
    const inputStyle = {
      borderRadius: "6px",
      height: "40px",
      fontSize: "14px",
    };

    const renderFormField = (field) => {
      const { name, label, fieldDef, required, readonly, help } = field;

      // Validar que fieldDef existe
      if (!fieldDef) {
        console.warn(`⚠️ Field ${name} has no fieldDef defined`);
        return (
          <Form.Item key={name} name={name} label={label || name}>
            <Input disabled placeholder={t("wizard.fieldNotAvailable")} />
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
        label: createFieldLabel(label, required),
        required,
        disabled: isReadonly,
        style: { marginBottom: "24px" },
      };

      // Si hay help, agregarlo como prop help
      if (help) {
        commonProps.help = createFieldHelp(help);
      }

      // Helper function to create descriptive placeholder
      const createPlaceholder = (fieldLabel, fieldHelp) => {
        if (fieldHelp) {
          // Use help text if available, truncate if too long
          return fieldHelp.length > 60 ? fieldHelp.substring(0, 57) + "..." : fieldHelp;
        }
        // Create placeholder from label
        return `Type in the ${fieldLabel.toLowerCase()}`;
      };

      switch (fieldType) {
        case "char":
        case "varchar":
          return (
            <Form.Item key={name} {...commonProps}>
              <Input
                disabled={isReadonly}
                placeholder={createPlaceholder(label, help)}
                style={{
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-neutral-200)",
                  height: "48px",
                  fontSize: "15px",
                  padding: "12px 16px",
                  background: "linear-gradient(180deg, #fff, #fafbfc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className="modern-input"
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-primary-500)";
                  e.target.style.background = "linear-gradient(180deg, #fff, #f0f9ff)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--color-neutral-200)";
                  e.target.style.background = "linear-gradient(180deg, #fff, #fafbfc)";
                  e.target.style.boxShadow = "none";
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled && document.activeElement !== e.target) {
                    e.target.style.borderColor = "var(--color-primary-400)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = "var(--color-neutral-200)";
                  }
                }}
              />
            </Form.Item>
          );

        case "text":
          return (
            <Form.Item key={name} {...commonProps}>
              <Input.TextArea
                disabled={isReadonly}
                rows={4}
                placeholder={createPlaceholder(label, help)}
                style={{
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-neutral-200)",
                  fontSize: "15px",
                  padding: "12px 16px",
                  background: "linear-gradient(180deg, #fff, #fafbfc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  resize: "vertical",
                  minHeight: "120px",
                }}
                className="modern-textarea"
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-primary-500)";
                  e.target.style.background = "linear-gradient(180deg, #fff, #f0f9ff)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(20, 184, 166, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--color-neutral-200)";
                  e.target.style.background = "linear-gradient(180deg, #fff, #fafbfc)";
                  e.target.style.boxShadow = "none";
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled && document.activeElement !== e.target) {
                    e.target.style.borderColor = "var(--color-primary-400)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (document.activeElement !== e.target) {
                    e.target.style.borderColor = "var(--color-neutral-200)";
                  }
                }}
              />
            </Form.Item>
          );

        case "integer":
        case "bigint":
          return (
            <Form.Item key={name} {...commonProps}>
              <InputNumber
                disabled={isReadonly}
                style={{ width: "100%" }}
                placeholder={createPlaceholder(label, help)}
                className="modern-input-number"
                controls={{
                  style: {
                    color: "var(--color-primary-500)",
                  }
                }}
              />
            </Form.Item>
          );

        case "float":
        case "numeric":
          return (
            <Form.Item key={name} {...commonProps}>
              <InputNumber
                disabled={isReadonly}
                style={{ width: "100%", ...inputStyle }}
                step={0.01}
                placeholder={createPlaceholder(label, help)}
                className="modern-input-number"
                controls={{
                  style: {
                    color: "var(--color-primary-500)",
                  }
                }}
              />
            </Form.Item>
          );

        case "boolean": {
          const booleanProps = {
            ...commonProps,
            label: null,
          };
          booleanProps.help = null;

          const renderLabel = () => (
            <div
              style={{
                fontWeight: 600,
                color: "var(--color-primary-800)",
                fontSize: "15px",
                flex: 1,
                lineHeight: 1.3,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                wordBreak: "normal",
                hyphens: "auto",
              }}
            >
              {label}
            </div>
          );

          const labelNode = renderLabel();

          return (
            <Form.Item
              key={name}
              {...booleanProps}
              valuePropName="checked"
              colon={false}
              className="boolean-card-item"
              style={{ marginBottom: "20px" }}
              data-span={6}
            >
              <div
                className="boolean-card"
                style={{
                  border: "1px solid var(--color-neutral-200)",
                  borderRadius: "22px",
                  padding: "18px",
                  background: "linear-gradient(180deg, #fff, #f5fbff)",
                  minHeight: "160px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  minWidth: "260px",
                  maxWidth: "360px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                    {labelNode}
                    {help && (
                      <Tooltip title={help}>
                        <InfoCircleOutlined style={{ color: "var(--color-primary-500)", fontSize: "14px" }} />
                      </Tooltip>
                    )}
                  </div>
                  <Switch disabled={isReadonly} />
                </div>
                <div
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: "13px",
                    lineHeight: 1.4,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    wordBreak: "normal",
                    hyphens: "auto",
                  }}
                >
                  {help || ""}
                </div>
              </div>
            </Form.Item>
          );
        }

        case "date": {
          const dateProps = {
            ...commonProps,
            normalize: (value) => {
              // Normalizar el valor antes de pasarlo al DatePicker
              if (!value || value === "" || value === "null" || value === "undefined") {
                return null;
              }
              if (dayjs.isDayjs(value)) {
                return value;
              }
              const parsed = parseTrytonDate(value);
              return parsed;
            }
          };
          dateProps.label = createFieldLabel(
            label,
            required,
            <CalendarOutlined />
          );
          return (
            <Form.Item key={name} {...dateProps}>
              <DatePicker
                disabled={isReadonly}
                style={{ 
                  width: "100%",
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-neutral-200)",
                  height: "48px",
                  fontSize: "15px",
                  background: "linear-gradient(180deg, #fff, #fafbfc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                placeholder={createPlaceholder(label, help) || label}
                className="modern-datepicker"
                popupStyle={{
                  borderRadius: "16px",
                }}
              />
            </Form.Item>
          );
        }

        case "datetime": {
          const datetimeProps = {
            ...commonProps,
            normalize: (value) => {
              // Normalizar el valor antes de pasarlo al DatePicker
              if (!value || value === "" || value === "null" || value === "undefined") {
                return null;
              }
              if (dayjs.isDayjs(value)) {
                return value;
              }
              const parsed = parseTrytonDate(value);
              return parsed;
            }
          };
          datetimeProps.label = createFieldLabel(
            label,
            required,
            <CalendarOutlined />
          );
          return (
            <Form.Item key={name} {...datetimeProps}>
              <DatePicker
                disabled={isReadonly}
                showTime
                style={{ 
                  width: "100%",
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-neutral-200)",
                  height: "48px",
                  fontSize: "15px",
                  background: "linear-gradient(180deg, #fff, #fafbfc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                placeholder={createPlaceholder(label, help) || label}
                className="modern-datepicker"
                popupStyle={{
                  borderRadius: "16px",
                }}
              />
            </Form.Item>
          );
        }

        case "timedelta":
          return (
            <Form.Item key={name} {...commonProps}>
              <div style={{ display: "flex", gap: "8px" }}>
                <InputNumber
                  placeholder={t("form.days")}
                  style={{ flex: 1 }}
                  min={0}
                />
                <InputNumber
                  placeholder={t("form.hours")}
                  style={{ flex: 1 }}
                  min={0}
                  max={23}
                />
                <InputNumber
                  placeholder={t("form.minutes")}
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
              <Form.Item key={name} {...commonProps}>
                <Select
                  disabled={isReadonly}
                  placeholder={createPlaceholder(label, help)}
                  style={{
                    width: "100%",
                    borderRadius: "16px",
                    border: "1.5px solid var(--color-neutral-200)",
                    height: "48px",
                    fontSize: "15px",
                    background: "linear-gradient(180deg, #fff, #fafbfc)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                  className="modern-select"
                  popupClassName="modern-select-dropdown"
                >
                  {dynamicOptions.length > 0 ? (
                    dynamicOptions.map(([value, optionLabel]) => (
                      <Option key={value} value={value}>
                        {optionLabel}
                      </Option>
                    ))
                  ) : (
                    <Option value="loading">{t("form.loadingOptions")}</Option>
                  )}
                </Select>
              </Form.Item>
            );
          }
          return (
            <Form.Item key={name} {...commonProps}>
              <Select
                disabled={isReadonly}
                placeholder={createPlaceholder(label, help)}
                style={{
                  width: "100%",
                  borderRadius: "16px",
                  border: "1.5px solid var(--color-neutral-200)",
                  height: "48px",
                  fontSize: "15px",
                  background: "linear-gradient(180deg, #fff, #fafbfc)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
                className="modern-select"
                popupClassName="modern-select-dropdown"
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
                placeholder={label}
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
                placeholder={label}
                style={{ width: "100%" }}
              >
                {/* Las opciones se cargarían dinámicamente */}
                <Option value="loading">{t("form.loadingOptions")}</Option>
              </Select>
            </Form.Item>
          );

        case "one2many":
          return (
            <Form.Item key={name} {...commonProps}>
              <div
                style={{
                  padding: "12px",
                  border: "1px solid #d9d9d9",
                  borderRadius: "6px",
                  background: "#fafafa",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "8px",
                  }}
                >
                  <Text type="secondary" style={{ fontWeight: "500" }}>
                    {label} ({t("form.one2Many")})
                  </Text>
                  <Button
                    size="small"
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      console.log(
                        `Opening wizard for one2many field: ${name} (${fieldDef.relation})`
                      );
                      // TODO: Implementar wizard para editar registros relacionados
                    }}
                  >
                    {t("common.add")}
                  </Button>
                </div>
                <div
                  style={{
                    minHeight: "60px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#8c8c8c",
                    fontSize: "12px",
                  }}
                >
                  {formData[name] && formData[name].length > 0 ? (
                    <Text type="secondary">
                      {formData[name].length} {t("form.relatedRecordsManage")}
                    </Text>
                  ) : (
                    <Text type="secondary">{t("form.noRelatedRecords")}</Text>
                  )}
                </div>
              </div>
            </Form.Item>
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
            <BinaryFileField
              key={name}
              name={name}
              label={label}
              required={required}
              readonly={isReadonly}
              help={help}
              form={form}
              defaultValue={formData[name]}
            />
          );

        default:
          return (
            <Form.Item key={name} {...commonProps}>
              <Input
                placeholder={label}
              />
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
              console.log(
                `⏭️ Omitiendo campo one2many ${fieldName} (se maneja a través de registros relacionados)`
              );
              return;
            }

            // Campos binary ya están en formato correcto (__class__: "bytes")
            if (fieldDef.type === "binary" && fieldValue) {
              // Si ya está en formato Tryton bytes, mantenerlo
              if (
                typeof fieldValue === "object" &&
                fieldValue.__class__ === "bytes"
              ) {
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

        // Mostrar notificación de éxito
        message.success("Record saved successfully");

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
          <Text style={{ marginLeft: "16px" }}>{t("form.loading")}</Text>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message={t("common.error")}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadFormData}>
              {t("common.retry")}
            </Button>
          }
        />
      );
    }

    return (
      <div
        style={{
          background: "var(--color-card-background)",
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        {/* Header con acciones */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "16px 24px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-neutral-50)",
          }}
        >
          <Space size="middle">
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
                      style={{
                        background: colors.success.A500,
                        borderColor: colors.success.A500,
                        borderRadius: "8px",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.success.A600;
                        e.currentTarget.style.borderColor = colors.success.A600;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.success.A500;
                        e.currentTarget.style.borderColor = colors.success.A500;
                      }}
                    >
                      {submitButtonText}
                    </Button>
                    <Button
                      icon={<MinusOutlined />}
                      onClick={handleCancel}
                      style={{
                        background: "transparent",
                        borderColor: colors.danger.A300,
                        color: colors.danger.A600,
                        borderRadius: "8px",
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.danger.A50;
                        e.currentTarget.style.borderColor = colors.danger.A500;
                        e.currentTarget.style.color = colors.danger.A700;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = colors.danger.A300;
                        e.currentTarget.style.color = colors.danger.A600;
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    onClick={handleEdit}
                      style={{
                        background: colors.secondary.A500,
                        borderColor: colors.secondary.A500,
                        borderRadius: "8px",
                        fontWeight: 500,
                      }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = colors.secondary.A600;
                      e.currentTarget.style.borderColor = colors.secondary.A600;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = colors.secondary.A500;
                      e.currentTarget.style.borderColor = colors.secondary.A500;
                    }}
                  >
                    Edit
                  </Button>
                )}
              </>
            )}
          </Space>
        </div>

        {/* Contenido del formulario */}
        <div
          style={{
            padding: "24px",
            background: "var(--color-card-background)",
            overflow: "visible",
            minWidth: 0,
          }}
        >
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
                    style={{ marginBottom: "16px", minWidth: 0, overflow: "visible" }}
                  >
                    {renderFormField(field)}
                  </Col>
                ))}
              </Row>
            )}

            {fields.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                <Text>{t("form.noFields")}</Text>
              </div>
            )}
          </Form>
        </div>

      </div>
    );
  }
);

TrytonForm.displayName = "TrytonForm";

export default TrytonForm;
