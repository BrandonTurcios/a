import { theme } from 'antd';
import { colors, themeColors } from './colors';

/**
 * Configuración del tema de Ant Design
 * Aplica la paleta de colores personalizada a todos los componentes de Ant Design
 */
export const antdThemeConfig = {
  algorithm: theme.defaultAlgorithm, // Modo light
  token: {
    // Colores principales
    colorPrimary: colors.primary.A500, // #01768F
    colorSuccess: colors.success.A500, // #28A745
    colorWarning: colors.warning.A500, // #FFC107
    colorError: colors.danger.A500, // #DC3545
    colorInfo: colors.info.A500, // #17A2B8
    
    // Colores de texto
    colorText: colors.neutral.A900, // #212529
    colorTextSecondary: colors.neutral.A700, // #6C757D
    colorTextTertiary: colors.neutral.A600, // #ADB5BD
    colorTextQuaternary: colors.neutral.A500, // #CED4DA
    
    // Fondos
    colorBgContainer: colors.neutral.A50, // #FFFFFF
    colorBgElevated: colors.neutral.A50, // #FFFFFF
    colorBgLayout: colors.neutral.A100, // #F8F9FA
    colorBgSpotlight: colors.neutral.A200, // #F1F3F4
    
    // Bordes
    colorBorder: colors.neutral.A400, // #DEE2E6
    colorBorderSecondary: colors.neutral.A300, // #E9ECEF
    
    // Hover y estados
    colorPrimaryHover: colors.primary.A700, // #015D70
    colorPrimaryActive: colors.primary.A800, // #014E5F
    colorPrimaryBg: colors.primary.A50, // #E0F4F7
    colorPrimaryBgHover: colors.primary.A100, // #B3E3EB
    colorSuccessBg: colors.success.A50, // #E6F6EA
    colorWarningBg: colors.warning.A50, // #FFF8E1
    colorErrorBg: colors.danger.A50, // #FBEAEA
    colorInfoBg: colors.info.A50, // #E1F4F7
    
    // Componentes específicos
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,
    
    // Tipografía
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    
    // Espaciado
    controlHeight: 40,
    controlHeightLG: 44,
    controlHeightSM: 32,
    
    // Sombras
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
  components: {
    // Button
    Button: {
      primaryColor: colors.neutral.A50, // Texto blanco en botones primarios
      colorPrimary: colors.primary.A500,
      colorPrimaryHover: colors.primary.A700,
      colorPrimaryActive: colors.primary.A800,
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 44,
      controlHeightSM: 32,
    },
    // Input
    Input: {
      colorPrimary: colors.primary.A500,
      colorPrimaryHover: colors.primary.A700,
      borderRadius: 8,
      controlHeight: 40,
      controlHeightLG: 44,
      controlHeightSM: 32,
    },
    // Card
    Card: {
      borderRadius: 12,
      borderRadiusLG: 16,
      colorBorderSecondary: colors.neutral.A300,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    // Table
    Table: {
      borderRadius: 8,
      colorBorderSecondary: colors.neutral.A300,
    },
    // Menu
    Menu: {
      colorPrimary: colors.primary.A500,
      colorItemBg: 'transparent',
      colorItemBgHover: colors.primary.A50,
      colorItemBgActive: colors.primary.A100,
      colorItemBgSelected: colors.primary.A100,
      colorItemText: colors.neutral.A900,
      colorItemTextHover: colors.primary.A700,
      colorItemTextActive: colors.primary.A700,
      colorItemTextSelected: colors.primary.A700,
    },
    // Layout
    Layout: {
      colorBgHeader: colors.neutral.A50,
      colorBgBody: colors.neutral.A100,
      colorBgContainer: colors.neutral.A50,
    },
    // Modal
    Modal: {
      borderRadius: 16,
      borderRadiusLG: 16,
    },
    // Tag
    Tag: {
      borderRadius: 6,
      colorSuccess: colors.success.A500,
      colorError: colors.danger.A500,
      colorWarning: colors.warning.A500,
      colorInfo: colors.info.A500,
    },
    // Alert
    Alert: {
      borderRadius: 8,
      colorSuccess: colors.success.A500,
      colorError: colors.danger.A500,
      colorWarning: colors.warning.A500,
      colorInfo: colors.info.A500,
    },
    // Select
    Select: {
      colorPrimary: colors.primary.A500,
      borderRadius: 8,
      controlHeight: 40,
    },
    // Form
    Form: {
      colorError: colors.danger.A500,
      colorWarning: colors.warning.A500,
    },
    // Tooltip
    Tooltip: {
      colorBgSpotlight: colors.neutral.A900,
      colorTextLightSolid: colors.neutral.A50,
      borderRadius: 6,
      fontSize: 13,
      fontWeightStrong: 500,
      paddingBlock: 8,
      paddingInline: 12,
      boxShadowSecondary: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    // Notification
    Notification: {
      zIndexPopup: 10000,
      defaultTop: 24,
      defaultBottom: 24,
      defaultLeft: 24,
      defaultRight: 24,
      defaultPlacement: 'topRight',
    },
  },
};

export default antdThemeConfig;
