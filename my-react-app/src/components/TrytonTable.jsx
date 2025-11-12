import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, Spin, Alert, Button, Typography } from 'antd';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import trytonService from '../services/trytonService';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);

const { Text } = Typography;

const TrytonTable = ({
  model,
  viewId,
  viewType = 'tree',
  domain = [],
  limit = 100,
  title = null,
  onRowClick = null,
  onRowDoubleClick = null,
  onRowSelect = null,
  enableRowSelection = false,
  selectedRecord = null,
  tableData = null, // Datos pre-cargados (para tablas relacionadas)
  filtered = false // Indicar si está filtrado
}) => {
  const [tableInfo, setTableInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowData, setRowData] = useState([]);
  const gridRef = useRef(null);

  useEffect(() => {
    // Si tenemos datos pre-cargados (tabla relacionada), usarlos directamente
    if (tableData && filtered) {
      console.log('🔗 Using pre-loaded filtered data');
      setTableInfo(tableData);
      
      // Process data
      const processedData = processData(tableData.data);
      setRowData(processedData);
      
      setLoading(false);
    } else {
      // Cargar datos normalmente
      loadTableData();
    }
  }, [model, viewId, viewType, domain, limit, tableData, filtered]);

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
      
      // Process data
      const processedData = processData(info.data);
      setRowData(processedData);
      
    } catch (error) {
      console.error('❌ Error loading table:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
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

    // Handle booleans - retornar el valor directamente para que ag-grid lo maneje
    if (fieldDef.type === 'boolean') {
      return value ? '✓ Sí' : '✗ No';
    }

    // Handle gender field - convertir m/f a Male/Female
    if (fieldDef.name === 'gender' && fieldDef.type === 'selection') {
      if (value === 'm') return 'Male';
      if (value === 'f') return 'Female';
      if (value === 'm-f') return 'Male-Female';
      return value;
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

  // Generar columnas para AG Grid
  const columnDefs = useMemo(() => {
    if (!tableInfo?.fieldsView?.fields) return [];

    const cols = [];
    
    // Agregar columna de selección si está habilitada
    if (enableRowSelection) {
      cols.push({
        headerName: '',
        field: 'select',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        width: 50,
        pinned: 'left',
        lockPosition: true,
        suppressMenu: true,
        sortable: false,
        filter: false,
        cellStyle: { 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '8px'
        }
      });
    }
    
    // Process view fields
    Object.entries(tableInfo.fieldsView.fields).forEach(([fieldName, fieldDef]) => {
      // Only include fields that are in the tree view
      if (shouldIncludeField(fieldName, tableInfo.fieldsView.arch)) {
        cols.push({
          field: fieldName,
          headerName: fieldDef.string || fieldName,
          sortable: true,
          filter: true,
          resizable: true,
          flex: fieldName === 'name' || fieldName === 'rec_name' ? 2 : 1,
          minWidth: 120,
          cellRenderer: (params) => {
            const value = params.value;
            const record = params.data;
            const formatted = formatCellValue(value, fieldDef, record);
            
            // Si es un boolean, renderizar con mejor formato
            if (fieldDef.type === 'boolean') {
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontWeight: value ? 'bold' : 'normal',
                  color: value ? 'var(--color-success-500)' : 'var(--color-text-secondary)'
                }}>
                  {formatted}
                </div>
              );
            }
            
            return formatted;
          },
          cellStyle: (params) => {
            const baseStyle = {
              display: 'flex',
              alignItems: 'center',
              padding: '8px 12px'
            };
            
            // Resaltar fila seleccionada
            if (selectedRecord && params.data?.id === selectedRecord.id) {
              return {
                ...baseStyle,
                backgroundColor: 'var(--color-primary-50)',
                fontWeight: '500'
              };
            }
            
            return baseStyle;
          }
        });
      }
    });
    
    return cols;
  }, [tableInfo, enableRowSelection, selectedRecord]);

  // Manejar selección de filas
  const onSelectionChanged = useCallback(() => {
    if (!onRowSelect || !gridRef.current) return;
    
    const selectedRows = gridRef.current.api.getSelectedRows();
    if (selectedRows.length > 0) {
      onRowSelect(selectedRows[0], true);
    } else {
      onRowSelect(null, false);
    }
  }, [onRowSelect]);

  // Manejar click en fila
  const onRowClicked = useCallback((event) => {
    if (onRowClick && event.data?.id) {
      onRowClick(event.data);
    }
  }, [onRowClick]);

  // Manejar doble click en fila
  const onRowDoubleClicked = useCallback((event) => {
    if (onRowDoubleClick && event.data?.id) {
      onRowDoubleClick(event.data);
    }
  }, [onRowDoubleClick]);

  // Sincronizar selección cuando cambia selectedRecord
  useEffect(() => {
    if (!gridRef.current || !selectedRecord) return;
    
    gridRef.current.api.forEachNode((node) => {
      if (node.data?.id === selectedRecord.id) {
        node.setSelected(true);
      } else {
        node.setSelected(false);
      }
    });
  }, [selectedRecord]);

  const handleRefresh = () => {
    loadTableData();
  };

  // Configuración por defecto de AG Grid
  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 120
  }), []);

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
    <div style={{
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid var(--color-border)',
      background: 'white',
      padding: '20px',
      height: 'calc(100vh - 200px)',
      minHeight: '600px'
    }}>
      <div 
        className="ag-theme-alpine"
        style={{
          height: '100%',
          width: '100%'
        }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={onRowClicked}
          onRowDoubleClicked={onRowDoubleClicked}
          suppressRowClickSelection={false}
          rowSelection={enableRowSelection ? 'multiple' : undefined}
          animateRows={true}
          enableCellTextSelection={true}
          pagination={true}
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50, 100]}
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
              columnsCount: columnDefs.length,
              dataCount: rowData.length,
              fieldsView: tableInfo?.fieldsView
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default TrytonTable;
