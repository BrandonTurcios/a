import React from 'react';
import {
  Heart,
  User,
  Calendar,
  Pill,
  Building2,
  BarChart3,
  Shield,
  Settings,
  FileText,
  Activity,
  Users,
  Stethoscope,
  Hospital,
  ClipboardList,
  DollarSign,
  ShoppingCart,
  Package
} from 'lucide-react';

// Función para obtener el componente del icono basado en las propiedades del item
export const getIconComponent = (item) => {
  if (item?.iconUrl) {
    return (
      <img
        src={item.iconUrl}
        alt={item.name || 'icon'}
        style={{
          width: '16px',
          height: '16px',
          objectFit: 'contain'
        }}
      />
    );
  }

  // Fallback SOLO si no hay iconUrl
  const iconMap = {
    '📊': BarChart3,
    '💰': DollarSign,
    '🛒': ShoppingCart,
    '📦': Package,
    '📋': ClipboardList,
    '👥': Users,
    '⚙️': Settings,
    '❤️': Heart,
    '👨‍⚕️': Stethoscope,
    '📅': Calendar,
    '💊': Pill,
    '🏥': Hospital,
    '🔐': Shield,
    '👤': User,
    '🏢': Building2,
    '📄': FileText,
    '📈': Activity
  };

  // Si es un emoji, usar el mapeo
  if (item?.icon && iconMap[item.icon]) {
    const IconComponent = iconMap[item.icon];
    return <IconComponent size={20} />;
  }

  // Mapeo basado en nombre del item (fallback final)
  const nameMap = {
    'Health': Heart,
    'Sales': DollarSign,
    'Purchase': ShoppingCart,
    'Inventory': Package,
    'Accounting': FileText,
    'HR': Users,
    'Settings': Settings,
    'Dashboard': BarChart3,
    'Patient': Heart,
    'Doctor': Stethoscope,
    'Appointment': Calendar,
    'Medicine': Pill,
    'Department': Building2,
    'Report': BarChart3
  };

  if (item?.name && nameMap[item.name]) {
    const IconComponent = nameMap[item.name];
    return <IconComponent size={20} />;
  }

  // Último fallback
  return <FileText size={16} />;
};
