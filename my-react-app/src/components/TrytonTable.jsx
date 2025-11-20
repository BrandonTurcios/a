import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Spin, Alert, Button, Space, Typography } from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  SettingOutlined
} from '@ant-design/icons';
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
  const { t } = useTranslation();
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
        throw new Error(t('errors.viewNotTree'));
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

    // Handle booleans - retornar solo el símbolo
    if (fieldDef.type === 'boolean') {
      return value ? '✓' : '✗';
    }

    // Handle gender field - convertir m/f a Male/Female
    if (fieldDef.name === 'gender' && fieldDef.type === 'selection') {
      if (value === 'm') return t('table.male');
      if (value === 'f') return t('table.female');
      if (value === 'm-f') return t('table.maleFemale');
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
        suppressMovable: true,
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
          minWidth: fieldDef.type === 'boolean' ? 60 : 120,
          width: fieldDef.type === 'boolean' ? 60 : undefined,
          cellRenderer: (params) => {
            const value = params.value;
            const record = params.data;
            const formatted = formatCellValue(value, fieldDef, record);
            
            // Si es un boolean, renderizar solo el símbolo centrado
            if (fieldDef.type === 'boolean') {
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: value ? 'var(--color-success-500)' : 'var(--color-text-secondary)',
                  width: '100%',
                  height: '100%'
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
              padding: '8px 12px',
              cursor: 'pointer',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              lineHeight: '1.5'
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
          },
          autoHeight: true,
          suppressMovable: false,
          suppressMenu: false
        });
      }
    });
    
    return cols;
  }, [tableInfo, enableRowSelection, selectedRecord]);

  // Rastrear el nodo actualmente seleccionado y cuándo se seleccionó
  const currentSelectedNodeRef = useRef(null);
  const selectionTimestampRef = useRef(0);

  // Manejar selección de filas (cuando cambia la selección)
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    
    const selectedRows = gridRef.current.api.getSelectedRows();
    if (selectedRows.length > 0) {
      // Buscar el nodo seleccionado
      gridRef.current.api.forEachNode((node) => {
        if (node.isSelected()) {
          currentSelectedNodeRef.current = node;
          selectionTimestampRef.current = Date.now();
        }
      });
      
      if (onRowSelect) {
        onRowSelect(selectedRows[0], true);
      }
    } else {
      currentSelectedNodeRef.current = null;
      selectionTimestampRef.current = 0;
      
      if (onRowSelect) {
        onRowSelect(null, false);
      }
    }
  }, [onRowSelect]);

  // Manejar click en fila - seleccionar sin abrir formulario, o abrir si ya está seleccionada
  const onRowClicked = useCallback((event) => {
    if (!event.data?.id || !gridRef.current) return;

    // Verificar si el click fue directamente en un checkbox
    const target = event.event?.target;
    if (target) {
      // Buscar si el click fue en un checkbox o en un elemento relacionado con el checkbox
      const isCheckboxClick = target.type === 'checkbox' || 
                              target.closest('.ag-selection-checkbox') ||
                              target.closest('[role="checkbox"]') ||
                              target.closest('.ag-checkbox') ||
                              target.closest('input[type="checkbox"]');
      
      if (isCheckboxClick) {
        // AG Grid manejará la selección automáticamente cuando se hace click en el checkbox
        // El evento onSelectionChanged se llamará después
        return;
      }
    }

    // IMPORTANTE: Verificar el estado de selección ANTES de hacer cualquier cambio
    // Como suppressRowClickSelection={true}, AG Grid no cambiará la selección automáticamente
    const isCurrentlySelected = event.node.isSelected();
    const currentTime = Date.now();
    
    // Verificar si esta fila ya estaba seleccionada ANTES del click
    // Usar timestamp para distinguir entre selección reciente (por este click) y selección previa
    const isSameNode = currentSelectedNodeRef.current === event.node;
    const timeSinceSelection = currentTime - selectionTimestampRef.current;
    const wasAlreadySelected = isSameNode && isCurrentlySelected && timeSinceSelection > 200; // Más de 200ms

    // Si la fila ya estaba seleccionada ANTES del click (hace más de 200ms), abrir el formulario
    if (wasAlreadySelected) {
      // La fila ya estaba seleccionada, abrir el formulario
      if (onRowDoubleClick) {
        onRowDoubleClick(event.data);
      }
      return; // Salir inmediatamente
    }

    // Si la fila NO está seleccionada, seleccionarla (sin abrir formulario)
    if (!isCurrentlySelected) {
      // Seleccionar la fila
      event.node.setSelected(true);
      
      // Actualizar el timestamp inmediatamente para evitar que el siguiente click abra el formulario
      // onSelectionChanged se llamará después y también actualizará el timestamp
      selectionTimestampRef.current = currentTime;
      
      // NO llamar a onRowClick aquí porque eso abriría el formulario
      // onSelectionChanged se llamará automáticamente y actualizará currentSelectedNodeRef
    }
  }, [onRowDoubleClick]);

  // Manejar doble click en fila - abrir formulario
  const onRowDoubleClicked = useCallback((event) => {
    // El doble click siempre abre el formulario
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
          <Text style={{ marginLeft: '16px' }}>{t('table.loading')}</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message={t('common.error')}
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={handleRefresh}>
              {t('common.retry')}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div style={{
      height: 'calc(100vh - 200px)',
      minHeight: '600px'
    }}>
      <div className="mb-4 flex justify-end" style={{ marginBottom: '16px' }}>
        <Space className="flex flex-wrap gap-2">
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            title={t('table.update')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            {t('table.update')}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            title={t('table.export')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            {t('table.export')}
          </Button>
          <Button
            icon={<FilterOutlined />}
            title={t('table.filters')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            {t('table.filters')}
          </Button>
          <Button
            icon={<SettingOutlined />}
            title={t('table.configure')}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
          >
            {t('table.configure')}
          </Button>
        </Space>
      </div>
      
      <div 
        className="ag-theme-alpine"
        style={{
          height: 'calc(100% - 80px)',
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
          suppressRowClickSelection={true}
          rowSelection={enableRowSelection ? 'multiple' : 'single'}
          suppressCellFocus={true}
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
