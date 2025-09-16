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
    
    // Procesar campos de la vista
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      // Solo incluir campos que están en la vista tree
      if (shouldIncludeField(fieldName, fieldsView.arch)) {
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
    
    return cols;
  };

  const shouldIncludeField = (fieldName, arch) => {
    // Verificar si el campo está en el arch de la vista
    if (arch && arch.includes(`name="${fieldName}"`)) {
      return true;
    }
    
    // Campos básicos que siempre incluir
    const basicFields = ['id', 'name', 'code', 'rec_name'];
    
    // Campos relacionados importantes que mostrar
    const relatedFields = ['party', 'template', 'product', 'company', 'supplier'];
    
    return basicFields.includes(fieldName) || relatedFields.includes(fieldName);
  };

  const parseTrytonDateTime = (value) => {
    if (!value || typeof value !== 'object') return null;
    if (value.__class__ === 'datetime') {
      const { year, month, day, hour = 0, minute = 0, second = 0, microsecond = 0 } = value;
      try {
        const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.${String(microsecond).padStart(6, '0')}Z`;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      } catch (_) {
        return null;
      }
    }
    if (value.__class__ === 'date') {
      const { year, month, day } = value;
      try {
        const iso = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00Z`;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;
      } catch (_) {
        return null;
      }
    }
    return null;
  };

  const formatCellValue = (value, fieldDef, record = null) => {
    if (value === null || value === undefined) {
      return '-';
    }
    
    // Manejar objetos complejos (relaciones con rec_name)
    if (typeof value === 'object' && value.rec_name) {
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
    if (fieldDef.type === 'date' || fieldDef.type === 'timestamp' || fieldDef.type === 'datetime') {
      // Tryton puede devolver objetos { __class__: 'datetime', ... }
      const dt = typeof value === 'object' ? parseTrytonDateTime(value) : new Date(value);
      if (dt && !isNaN(dt.getTime())) {
        // Mostrar fecha y hora si es timestamp/datetime
        if (fieldDef.type === 'timestamp' || fieldDef.type === 'datetime') {
          return dt.toLocaleString();
        }
        return dt.toLocaleDateString();
      }
      return String(value);
    }
    
    // Manejar IDs que tienen objetos relacionados
    if (typeof value === 'number' && record) {
      const fieldName = fieldDef.name || '';
      
      // Buscar el objeto relacionado con el mismo nombre pero terminado en "."
      const relatedFieldName = fieldName + '.';
      const relatedObject = record[relatedFieldName];
      
      if (relatedObject && typeof relatedObject === 'object' && relatedObject.rec_name) {
        return relatedObject.rec_name;
      }
    }
    
    // Si es null pero hay un objeto relacionado, intentar mostrar ese
    if (value === null && record) {
      const fieldName = fieldDef.name || '';
      const relatedFieldName = fieldName + '.';
      const relatedObject = record[relatedFieldName];
      
      if (relatedObject && typeof relatedObject === 'object' && relatedObject.rec_name) {
        return relatedObject.rec_name;
      }
    }
    
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
            JSON
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
