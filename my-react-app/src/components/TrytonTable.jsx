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
      
      console.log(`🔍 Loading table for model: ${model}`);
      
      // First verify the view type
      const fieldsView = await trytonService.getFieldsView(model, viewId, viewType);
      console.log('🔍 View obtained:', fieldsView);
      
      // Only proceed if it's a "tree" type view
      if (!fieldsView || fieldsView.type !== 'tree') {
        throw new Error(`View is not of type "tree" (current type: ${fieldsView?.type || 'unknown'})`);
      }
      
      const info = await trytonService.getTableInfo(
        model, 
        viewId, 
        viewType, 
        domain, 
        limit
      );
      
      console.log('✅ Table information loaded:', info);
      
      setTableInfo(info);
      
      // Generate columns dynamically based on the view
      const generatedColumns = generateColumns(info.fieldsView);
      setColumns(generatedColumns);
      
      // Process data
      const processedData = processData(info.data);
      setData(processedData);
      
    } catch (error) {
      console.error('❌ Error loading table:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateColumns = (fieldsView) => {
    if (!fieldsView.fields) return [];
    
    const cols = [];
    
    // Process view fields
    Object.entries(fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      // Only include fields that are in the tree view
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
    // Check if the field is in the view arch
    if (arch && arch.includes(`name="${fieldName}"`)) {
      return true;
    }
    
    // Basic fields to always include
    const basicFields = ['id', 'name', 'code', 'rec_name'];
    
    // Important related fields to show
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
    
    // Handle complex objects (relations with rec_name)
    if (typeof value === 'object' && value.rec_name) {
      return value.rec_name;
    }
    
    // Handle arrays (many2many, one2many)
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value.length} element(s)` : '-';
    }
    
    // Handle decimal numbers
    if (fieldDef.type === 'numeric' && typeof value === 'object' && value.decimal) {
      return parseFloat(value.decimal).toFixed(4);
    }
    
    // Handle booleans
    if (fieldDef.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Handle dates
    if (fieldDef.type === 'date' || fieldDef.type === 'timestamp' || fieldDef.type === 'datetime') {
      // Tryton can return objects { __class__: 'datetime', ... }
      const dt = typeof value === 'object' ? parseTrytonDateTime(value) : new Date(value);
      if (dt && !isNaN(dt.getTime())) {
        // Show date and time if it's timestamp/datetime
        if (fieldDef.type === 'timestamp' || fieldDef.type === 'datetime') {
          return dt.toLocaleString();
        }
        return dt.toLocaleDateString();
      }
      return String(value);
    }
    
    // Handle IDs that have related objects
    if (typeof value === 'number' && record) {
      const fieldName = fieldDef.name || '';
      
      // Search for the related object with the same name but ending in "."
      const relatedFieldName = fieldName + '.';
      const relatedObject = record[relatedFieldName];
      
      if (relatedObject && typeof relatedObject === 'object' && relatedObject.rec_name) {
        return relatedObject.rec_name;
      }
    }
    
    // If it's null but there's a related object, try to show that
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
          <Text style={{ marginLeft: '16px' }}>Loading table...</Text>
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
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="rounded-2xl shadow-lg border border-gray-200 bg-white p-6">
      <div className="mb-4 flex justify-end">
        <Space className="flex flex-wrap gap-2">
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            title="Update"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Update
          </Button>
          <Button 
            icon={<DownloadOutlined />}
            title="Export"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Export
          </Button>
          <Button 
            icon={<FilterOutlined />}
            title="Filters"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Filters
          </Button>
          <Button 
            icon={<SettingOutlined />}
            title="Configure"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            Configure
          </Button>
        </Space>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <DataTable
          columns={columns}
          data={data}
          searchable={true}
          pagination={true}
          pageSize={20}
        />
      </div>
      
      {/* Debug information (development only) */}
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
    </div>
  );
};

export default TrytonTable;
