/**
 * Paleta de colores del proyecto
 * Basada en #01768f (azul verdoso)
 */

export const colors = {
  primary: {
    A50: "#E0F4F7",
    A100: "#B3E3EB",
    A200: "#80D0DD",
    A300: "#4DBDCF",
    A400: "#26ADC3",
    A500: "#01768F", // Color principal base
    A600: "#016A81",
    A700: "#015D70", // Hover / activo
    A800: "#014E5F",
    A900: "#003B47"
  },
  secondary: {
    A50: "#D8FAF4",
    A100: "#A6F2E5",
    A200: "#73E9D6",
    A300: "#40E0C6",
    A400: "#1AD8BA",
    A500: "#00BFA6", // Verde-agua complementario
    A600: "#00AC94",
    A700: "#009C85",
    A800: "#008C7D", // Hover o texto sobre fondo claro
    A900: "#00685D"
  },
  neutral: {
    A50: "#FFFFFF", // Fondo tarjetas
    A100: "#F8F9FA", // Fondo principal
    A200: "#F1F3F4",
    A300: "#E9ECEF",
    A400: "#DEE2E6", // Borde / Divider
    A500: "#CED4DA",
    A600: "#ADB5BD",
    A700: "#6C757D", // Texto secundario
    A800: "#495057",
    A900: "#212529" // Texto principal
  },
  success: {
    A50: "#E6F6EA",
    A100: "#C1EAC5",
    A200: "#97DC9E",
    A300: "#6ECD76",
    A400: "#4DC45A",
    A500: "#28A745",
    A600: "#21913C",
    A700: "#1A7C33",
    A800: "#12662A",
    A900: "#0B4D1E"
  },
  danger: {
    A50: "#FBEAEA",
    A100: "#F5C2C7",
    A200: "#EE909A",
    A300: "#E66072",
    A400: "#DF3E55",
    A500: "#DC3545",
    A600: "#C82F3D",
    A700: "#B22835",
    A800: "#9A212E",
    A900: "#7A1722"
  },
  warning: {
    A50: "#FFF8E1",
    A100: "#FFECB3",
    A200: "#FFE082",
    A300: "#FFD54F",
    A400: "#FFCA28",
    A500: "#FFC107",
    A600: "#FFB300",
    A700: "#FFA000",
    A800: "#FF8F00",
    A900: "#FF6F00"
  },
  info: {
    A50: "#E1F4F7",
    A100: "#B3E2E9",
    A200: "#80CEDA",
    A300: "#4DBACA",
    A400: "#26ABC0",
    A500: "#17A2B8",
    A600: "#1493A8",
    A700: "#118497",
    A800: "#0E7586",
    A900: "#0A5A68"
  }
};

// Colores principales para uso común
export const themeColors = {
  // Primarios
  primary: colors.primary.A500,
  primaryDark: colors.primary.A700,
  primaryLight: colors.primary.A200,
  primaryHover: colors.primary.A700,
  primaryActive: colors.primary.A600,
  
  // Secundarios
  secondary: colors.secondary.A500,
  secondaryDark: colors.secondary.A800,
  secondaryHover: colors.secondary.A700,
  
  // Neutrales
  background: colors.neutral.A100,
  cardBackground: colors.neutral.A50,
  textPrimary: colors.neutral.A900,
  textSecondary: colors.neutral.A700,
  border: colors.neutral.A400,
  
  // Estados
  success: colors.success.A500,
  danger: colors.danger.A500,
  warning: colors.warning.A500,
  info: colors.info.A500
};

export default colors;
