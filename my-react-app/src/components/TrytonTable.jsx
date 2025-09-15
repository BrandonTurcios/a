import React, { useState, useEffect } from 'react';
import { Card, Spin, Alert, Button, Space, Typography } from 'antd';
import { 
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { DataTable } from './ui/data-table';
import trytonService from '../services/trytonService';

const { Title, Text } = Typography;

const TrytonTable = ({ 
  model, 
  viewId, 
  viewType = 'tree', 
  domain = [], 
  limit = 100,
  title = null 
}) => {
  const [tableInfo, setTableInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);

  useEffect(() => {
    loadTableData();
  }, [model, viewId, viewType, domain, limit]);

  const loadTableData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔍 Cargando tabla para modelo: ${model}`);
      
      // Primero verificar el tipo de vista
      const fieldsView = await trytonService.getFieldsView(model, viewId, viewType);
      console.log('🔍 Vista obtenida:', fieldsView);
      
      // Solo proceder si es una vista de tipo "tree"
      if (!fieldsView || fieldsView.type !== 'tree') {
        throw new Error(`Vista no es de tipo "tree" (tipo actual: ${fieldsView?.type || 'desconocido'})`);
      }
      
      const info = await trytonService.getTableInfo(
        model, 
        viewId, 
        viewType, 
        domain, 
        limit
      );
      
      console.log('✅ Información de tabla cargada:', info);
      
      setTableInfo(info);
      
      // Generar columnas dinámicamente basadas en la vista
      const generatedColumns = generateColumns(info.fieldsView);
      setColumns(generatedColumns);
      
      // Procesar datos
      const processedData = processData(info.data);
      setData(processedData);
      
    } catch (error) {
      console.error('❌ Error cargando tabla:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateColumns = (fieldsView) => {
    if (!fieldsView.fields) return [];
    
    const cols = [];
    
    console.log('🔍 Generando columnas para campos:', Object.keys(fieldsView.fields));
    console.log('🔍 Arch de vista:', fieldsView.arch);
    
    // Procesar campos de la vista
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      console.log(`🔍 Procesando campo: ${fieldName}`, fieldDef);
      
      // Solo incluir campos que están en la vista tree
      if (shouldIncludeField(fieldName, fieldsView.arch)) {
        console.log(`✅ Agregando columna para campo: ${fieldName}`);
        cols.push({
          accessorKey: fieldName,
          header: fieldDef.string || fieldName,
          cell: ({ getValue, row }) => {
            const value = getValue();
            const record = row.original;
            return formatCellValue(value, fieldDef, record);
          },
          meta: {
            fieldDef,
            fieldName
          }
        });
      }
    });
    
    console.log('✅ Columnas generadas:', cols.map(col => col.accessorKey));
    return cols;
  };

  const shouldIncludeField = (fieldName, arch) => {
    // Verificar si el campo está en el arch de la vista
    if (arch && arch.includes(`name="${fieldName}"`)) {
      console.log(`✅ Campo "${fieldName}" encontrado en arch de vista`);
      return true;
    }
    
    // Campos básicos que siempre incluir
    const basicFields = ['id', 'name', 'code', 'rec_name'];
    
    // Campos relacionados importantes que mostrar
    const relatedFields = ['party', 'template', 'product', 'company', 'supplier'];
    
    const shouldInclude = basicFields.includes(fieldName) || relatedFields.includes(fieldName);
    
    if (shouldInclude) {
      console.log(`✅ Campo "${fieldName}" incluido por ser básico o relacionado`);
    } else {
      console.log(`❌ Campo "${fieldName}" excluido`);
    }
    
    return shouldInclude;
  };

  const formatCellValue = (value, fieldDef, record = null) => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Debug: Log para ver qué está pasando
    const fieldName = fieldDef.name || '';
    console.log(`🔍 Formateando campo "${fieldName}":`, {
      value,
      fieldDef,
      record: record ? Object.keys(record) : null
    });
    
    // Manejar objetos complejos (relaciones con rec_name)
    if (typeof value === 'object' && value.rec_name) {
      console.log(`✅ Campo "${fieldName}" es objeto con rec_name:`, value.rec_name);
      return value.rec_name;
    }
    
    // Manejar arrays (many2many, one2many)
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} elemento(s)` : '-';
    }
    
    // Manejar números decimales
    if (fieldDef.type === 'numeric' && typeof value === 'object' && value.decimal) {
      return parseFloat(value.decimal).toFixed(4);
    }
    
    // Manejar booleanos
    if (fieldDef.type === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    
    // Manejar fechas
    if (fieldDef.type === 'date' || fieldDef.type === 'timestamp') {
      return new Date(value).toLocaleDateString();
    }
    
    // Manejar IDs que tienen objetos relacionados
    if (typeof value === 'number' && record) {
      // Buscar el objeto relacionado con el mismo nombre pero terminado en "."
      const relatedFieldName = fieldName + '.';
      const relatedObject = record[relatedFieldName];
      
      console.log(`🔍 Buscando objeto relacionado "${relatedFieldName}":`, relatedObject);
      
      if (relatedObject && typeof relatedObject === 'object' && relatedObject.rec_name) {
        console.log(`✅ Encontrado rec_name para "${fieldName}":`, relatedObject.rec_name);
        return relatedObject.rec_name;
      } else {
        console.log(`❌ No se encontró rec_name para "${fieldName}"`);
      }
    }
    
    console.log(`📝 Retornando valor original para "${fieldName}":`, String(value));
    return String(value);
  };

  const processData = (rawData) => {
    return rawData.map((record, index) => ({
      ...record,
      _index: index + 1
    }));
  };

  const handleRefresh = () => {
    loadTableData();
  };

  if (loading) {
    return (
      <Card>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '200px' 
        }}>
          <Spin size="large" />
          <Text style={{ marginLeft: '16px' }}>Cargando tabla...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {title || `Tabla: ${model}`}
            </Title>
            <Text type="secondary">
              {data.length} registro(s) encontrado(s)
            </Text>
          </div>
          
          <Space>
            <Button 
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              title="Actualizar"
            >
              Actualizar
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              title="Exportar"
            >
              Exportar
            </Button>
            <Button 
              icon={<FilterOutlined />}
              title="Filtros"
            >
              Filtros
            </Button>
            <Button 
              icon={<SettingOutlined />}
              title="Configurar"
            >
              Configurar
            </Button>
          </Space>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        searchable={true}
        pagination={true}
        pageSize={20}
      />
      
      {/* Información de depuración (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <details style={{ marginTop: '16px' }}>
          <summary style={{ cursor: 'pointer', color: '#666' }}>
            Información de depuración
          </summary>
          <pre style={{ 
            background: '#f5f5f5', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {JSON.stringify({
              model,
              viewId,
              viewType,
              domain,
              columnsCount: columns.length,
              dataCount: data.length,
              fieldsView: tableInfo?.fieldsView
            }, null, 2)}
          </pre>
        </details>
      )}
    </Card>
  );
};

export default TrytonTable;
