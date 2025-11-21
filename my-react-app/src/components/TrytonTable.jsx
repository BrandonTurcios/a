import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Card, Spin, Alert, Button, Typography, Menu, Badge } from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  FilterOutlined,
  SettingOutlined,
  FileOutlined,
  CommentOutlined,
  LinkOutlined,
  PrinterOutlined,
  MailOutlined
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
  filtered = false, // Indicar si está filtrado
  // Handlers para el menú contextual
  onContextMenuAttach = null,
  onContextMenuNote = null,
  onContextMenuRelate = null,
  onContextMenuPrint = null,
  onContextMenuEmail = null,
  toolbarInfo = null // Información del toolbar para saber qué opciones mostrar
}) => {
  const { t } = useTranslation();
  const [tableInfo, setTableInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowData, setRowData] = useState([]);
  const gridRef = useRef(null);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuSelectedRows, setContextMenuSelectedRows] = useState([]);
  const [openSubmenuKeys, setOpenSubmenuKeys] = useState([]);
  const [attachmentsCount, setAttachmentsCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [unreadNotesCount, setUnreadNotesCount] = useState(0);

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
        cellStyle: (params) => {
          const baseStyle = {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '8px'
          };

          // Aplicar el mismo color de fondo que las demás columnas cuando está seleccionada
          if (params.node && params.node.isSelected && params.node.isSelected()) {
            return {
              ...baseStyle,
              backgroundColor: 'var(--color-primary-100)'
            };
          }

          return baseStyle;
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
              lineHeight: '1.5',
              fontSize: '15px',
              fontWeight: '500'
            };

            // Resaltar fila seleccionada (con checkbox marcado)
            if (params.node && params.node.isSelected && params.node.isSelected()) {
              return {
                ...baseStyle,
                backgroundColor: 'var(--color-primary-100)',
                fontWeight: '600'
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

        setTimeout(() => {
          const activeElement = document.activeElement;
          if (activeElement && (
            activeElement.type === 'checkbox' ||
            activeElement.classList.contains('ag-checkbox-input') ||
            activeElement.closest('.ag-checkbox-input-wrapper')
          )) {
            activeElement.blur();
          }
        }, 50);

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

  // Cargar contadores de attachments y notes cuando cambia el registro seleccionado
  useEffect(() => {
    const loadCounts = async () => {
      if (!model || contextMenuSelectedRows.length === 0) {
        setAttachmentsCount(0);
        setNotesCount(0);
        setUnreadNotesCount(0);
        return;
      }

      const selectedRecord = contextMenuSelectedRows[0];
      if (!selectedRecord?.id) return;

      const resourceKey = `${model},${selectedRecord.id}`;
      
      try {
        // Cargar attachments
        const attachmentIds = await trytonService.searchAttachments(resourceKey);
        setAttachmentsCount(attachmentIds?.length || 0);

        // Cargar notes
        const noteIds = await trytonService.searchNotes(resourceKey);
        if (noteIds && noteIds.length > 0) {
          const notes = await trytonService.readNotes(noteIds);
          setNotesCount(notes?.length || 0);
          setUnreadNotesCount(notes?.filter(n => n.unread).length || 0);
        } else {
          setNotesCount(0);
          setUnreadNotesCount(0);
        }
      } catch (e) {
        console.error('Error loading counts:', e);
        setAttachmentsCount(0);
        setNotesCount(0);
        setUnreadNotesCount(0);
      }
    };

    if (contextMenuVisible && contextMenuSelectedRows.length > 0) {
      loadCounts();
    }
  }, [model, contextMenuSelectedRows, contextMenuVisible]);

  // Calcular posición del menú para que no se salga de la pantalla
  const calculateMenuPosition = useCallback((x, y) => {
    const menuWidth = 250; // Ancho estimado del menú
    const menuHeight = 300; // Alto estimado del menú
    const padding = 10;

    let finalX = x;
    let finalY = y;

    // Ajustar horizontalmente
    if (x + menuWidth > window.innerWidth) {
      finalX = window.innerWidth - menuWidth - padding;
    }
    if (finalX < padding) {
      finalX = padding;
    }

    // Ajustar verticalmente
    if (y + menuHeight > window.innerHeight) {
      finalY = window.innerHeight - menuHeight - padding;
    }
    if (finalY < padding) {
      finalY = padding;
    }

    return { x: finalX, y: finalY };
  }, []);

  // Manejar click derecho para mostrar menú contextual
  const onCellContextMenu = useCallback((event) => {
    if (!gridRef.current) return;

    // Obtener filas seleccionadas
    const selectedRows = gridRef.current.api.getSelectedRows();
    
    // Solo mostrar menú si hay filas seleccionadas
    if (selectedRows.length === 0) {
      return;
    }

    // Prevenir el menú contextual por defecto
    event.event.preventDefault();
    event.event.stopPropagation();

    // Calcular posición ajustada
    const adjustedPosition = calculateMenuPosition(
      event.event.clientX,
      event.event.clientY
    );

    // Guardar posición del click
    setContextMenuPosition(adjustedPosition);

    // Guardar filas seleccionadas
    setContextMenuSelectedRows(selectedRows);

    // Mostrar menú
    setContextMenuVisible(true);
  }, [calculateMenuPosition]);

  // Cerrar menú contextual cuando se hace click fuera o se presiona ESC
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuVisible(false);
      setOpenSubmenuKeys([]);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setContextMenuVisible(false);
        setOpenSubmenuKeys([]);
      }
    };

    if (contextMenuVisible) {
      // Usar setTimeout para que el click que abre el menú no lo cierre inmediatamente
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('contextmenu', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('contextmenu', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      // Cerrar submenús cuando se cierra el menú contextual
      setOpenSubmenuKeys([]);
    }
  }, [contextMenuVisible]);

  // Construir items del menú contextual
  const contextMenuItems = useMemo(() => {
    if (!toolbarInfo || contextMenuSelectedRows.length === 0) return [];

    const items = [];
    const { action = [], relate = [], print = [], emails = [] } = toolbarInfo;
    const selectedRecord = contextMenuSelectedRows[0];

    // Attachments
    if (onContextMenuAttach) {
      const attachLabel = (
        <span>
          {t('common.attach')}
          {attachmentsCount > 0 && (
            <Badge count={attachmentsCount} size="small" style={{ marginLeft: '8px' }} />
          )}
        </span>
      );
      items.push({
        key: 'attach',
        label: attachLabel,
        icon: <FileOutlined />,
        onClick: ({ domEvent }) => {
          domEvent?.stopPropagation();
          setContextMenuVisible(false);
          if (selectedRecord) {
            onContextMenuAttach(selectedRecord);
          }
        }
      });
    }

    // Notes
    if (onContextMenuNote) {
      const notesBadgeText = notesCount > 0 ? `${unreadNotesCount}/${notesCount}` : null;
      const noteLabel = (
        <span>
          {t('common.comment')}
          {notesBadgeText && (
            <Badge count={notesBadgeText} size="small" style={{ marginLeft: '8px' }} />
          )}
        </span>
      );
      items.push({
        key: 'note',
        label: noteLabel,
        icon: <CommentOutlined />,
        onClick: ({ domEvent }) => {
          domEvent?.stopPropagation();
          setContextMenuVisible(false);
          if (selectedRecord) {
            onContextMenuNote(selectedRecord);
          }
        }
      });
    }

    // Relate
    if (relate.length > 0 && onContextMenuRelate) {
      if (relate.length === 1) {
        items.push({
          key: 'relate',
          label: t('common.relate'),
          icon: <LinkOutlined />,
          onClick: ({ domEvent }) => {
            domEvent?.stopPropagation();
            setContextMenuVisible(false);
            if (selectedRecord) {
              onContextMenuRelate(relate[0], selectedRecord);
            }
          }
        });
      } else {
        items.push({
          key: 'relate',
          label: t('common.relate'),
          icon: <LinkOutlined />,
          children: relate.map((item, index) => ({
            key: `relate-${index}`,
            label: item.name || `Relate ${index + 1}`,
            onClick: ({ domEvent }) => {
              domEvent?.stopPropagation();
              setContextMenuVisible(false);
              if (selectedRecord) {
                onContextMenuRelate(item, selectedRecord);
              }
            }
          }))
        });
      }
    }

    // Print
    if (print.length > 0 && onContextMenuPrint) {
      if (print.length === 1) {
        items.push({
          key: 'print',
          label: t('common.print'),
          icon: <PrinterOutlined />,
          onClick: ({ domEvent }) => {
            domEvent?.stopPropagation();
            setContextMenuVisible(false);
            const record = contextMenuSelectedRows[0];
            if (record) {
              console.log('🖨️ Context menu print clicked:', print[0], 'for record:', record);
              onContextMenuPrint(print[0], record);
            }
          }
        });
      } else {
        items.push({
          key: 'print',
          label: t('common.print'),
          icon: <PrinterOutlined />,
          children: print.map((item, index) => ({
            key: `print-${index}`,
            label: item.name || `Print ${index + 1}`,
            onClick: ({ domEvent }) => {
              domEvent?.stopPropagation();
              setContextMenuVisible(false);
              const record = contextMenuSelectedRows[0];
              if (record) {
                console.log('🖨️ Context menu print clicked:', item, 'for record:', record);
                onContextMenuPrint(item, record);
              }
            }
          }))
        });
      }
    }

    // Email
    if (onContextMenuEmail) {
      items.push({
        key: 'email',
        label: t('common.email'),
        icon: <MailOutlined />,
        onClick: ({ domEvent }) => {
          domEvent?.stopPropagation();
          setContextMenuVisible(false);
          if (selectedRecord) {
            onContextMenuEmail(selectedRecord);
          }
        }
      });
    }

    return items;
  }, [toolbarInfo, contextMenuSelectedRows, onContextMenuAttach, onContextMenuNote, onContextMenuRelate, onContextMenuPrint, onContextMenuEmail, t, attachmentsCount, notesCount, unreadNotesCount]);

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

  // Prevenir menú contextual del navegador en el contenedor de la tabla
  const handleContainerContextMenu = useCallback((e) => {
    if (!gridRef.current) return;
    
    const selectedRows = gridRef.current.api.getSelectedRows();
    
    // Si hay filas seleccionadas, prevenir el menú del navegador
    if (selectedRows.length > 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  // Agregar estilos personalizados para headers de AG Grid
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ag-theme-alpine .ag-header {
        background: var(--color-primary-700) !important;
        color: white !important;
        font-weight: 600 !important;
        border-bottom: 2px solid var(--color-primary-800) !important;
      }
      .ag-theme-alpine .ag-header-cell {
        background: var(--color-primary-700) !important;
        color: white !important;
        border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      .ag-theme-alpine .ag-header-cell-text {
        color: white !important;
        font-weight: 600 !important;
      }
      .ag-theme-alpine .ag-header-cell-label {
        color: white !important;
      }
      .ag-theme-alpine .ag-icon {
        color: white !important;
        opacity: 0.9 !important;
      }
      .ag-theme-alpine .ag-icon-asc::before,
      .ag-theme-alpine .ag-icon-desc::before,
      .ag-theme-alpine .ag-icon-menu::before {
        color: white !important;
      }
      .ag-theme-alpine .ag-header-cell-resize {
        background: rgba(255, 255, 255, 0.3) !important;
      }
      .ag-theme-alpine .ag-header-cell:hover,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover,
      .ag-theme-alpine .ag-header-cell[class*="hover"],
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover {
        background: #014E5F !important;
        background-color: #014E5F !important;
        color: white !important;
      }
      .ag-theme-alpine .ag-header-cell:hover *,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover *,
      .ag-theme-alpine .ag-header-cell:hover .ag-header-cell-text,
      .ag-theme-alpine .ag-header-cell:hover .ag-header-cell-label,
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover * {
        color: white !important;
      }
      .ag-theme-alpine .ag-header-cell:hover .ag-icon,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover .ag-icon,
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover .ag-icon {
        color: white !important;
        opacity: 1 !important;
        fill: white !important;
      }
      .ag-theme-alpine .ag-header-cell:hover .ag-icon-asc::before,
      .ag-theme-alpine .ag-header-cell:hover .ag-icon-desc::before,
      .ag-theme-alpine .ag-header-cell:hover .ag-icon-menu::before,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover .ag-icon-asc::before,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover .ag-icon-desc::before,
      .ag-theme-alpine .ag-header-cell.ag-header-cell-hover .ag-icon-menu::before,
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover .ag-icon-asc::before,
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover .ag-icon-desc::before,
      .ag-theme-alpine .ag-header-row .ag-header-cell:hover .ag-icon-menu::before {
        color: white !important;
        opacity: 1 !important;
        fill: white !important;
      }
      .ag-theme-alpine .ag-row {
        background: white !important;
        border-bottom: 1px solid var(--color-neutral-200) !important;
      }
      .ag-theme-alpine .ag-row:hover {
        background: var(--color-primary-50) !important;
      }
      .ag-theme-alpine .ag-row-selected {
        background: var(--color-primary-100) !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

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

  const gridHeight = 'calc(100vh - 240px)';

  return (
    <div 
      style={{
        minHeight: '500px',
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        flex: 1,
        background: 'var(--color-neutral-50)'
      }}
      onContextMenu={handleContainerContextMenu}
    >
      <div 
        className="ag-theme-alpine"
        style={{
          width: '100%',
          height: gridHeight,
          minHeight: '480px',
          background: 'white',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        onContextMenu={handleContainerContextMenu}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onSelectionChanged={onSelectionChanged}
          onRowClicked={onRowClicked}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellContextMenu={onCellContextMenu}
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
      
      {/* Menú contextual - renderizado en portal para estar por encima de todo */}
      {contextMenuVisible && contextMenuItems.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            zIndex: 10000,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            borderRadius: '12px',
            background: 'var(--color-card-background)',
            border: '1px solid var(--color-primary-200)',
            minWidth: '220px',
            maxWidth: '320px',
            pointerEvents: 'auto',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Menu
            mode="vertical"
            items={contextMenuItems}
            style={{
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '500',
              padding: '6px 0',
              background: 'transparent'
            }}
            onClick={(info) => {
              // El onClick ya está manejado en cada item
              if (info.domEvent) {
                info.domEvent.stopPropagation();
              }
              // Cerrar el menú contextual cuando se hace clic en un item sin submenú
              if (!info.key.startsWith('relate-') && !info.key.startsWith('print-') && info.key !== 'relate' && info.key !== 'print') {
                setContextMenuVisible(false);
                setOpenSubmenuKeys([]);
              }
            }}
            getPopupContainer={() => document.body}
            triggerSubMenuAction="click"
            openKeys={openSubmenuKeys}
            onOpenChange={(keys) => {
              setOpenSubmenuKeys(keys);
            }}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default TrytonTable;
