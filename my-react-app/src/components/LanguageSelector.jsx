import React from "react";
import { Select } from "antd";

const { Option } = Select;

// Lista completa de idiomas de Tryton con sus banderas
const LANGUAGES = [
  { code: "en", name: "English", flag: "🇬🇧", disabled: false },
  { code: "es", name: "Español", flag: "🇪🇸", disabled: false },
  {
    code: "es_419",
    name: "Español (Latinoamérica)",
    flag: "🇲🇽",
    disabled: true,
  },
  { code: "fr", name: "Français", flag: "🇫🇷", disabled: true },
  { code: "de", name: "Deutsch", flag: "🇩🇪", disabled: true },
  { code: "it", name: "Italiano", flag: "🇮🇹", disabled: true },
  { code: "pt", name: "Português", flag: "🇵🇹", disabled: true },
  { code: "ru", name: "Русский", flag: "🇷🇺", disabled: true },
  { code: "zh_CN", name: "中文 (简体)", flag: "🇨🇳", disabled: true },
  { code: "ca", name: "Català", flag: "🇪🇸", disabled: true },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", disabled: true },
  { code: "pl", name: "Polski", flag: "🇵🇱", disabled: true },
  { code: "uk", name: "Українська", flag: "🇺🇦", disabled: true },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", disabled: true },
  { code: "ro", name: "Română", flag: "🇷🇴", disabled: true },
  { code: "hu", name: "Magyar", flag: "🇭🇺", disabled: true },
  { code: "cs", name: "Čeština", flag: "🇨🇿", disabled: true },
  { code: "bg", name: "Български", flag: "🇧🇬", disabled: true },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮", disabled: true },
  { code: "et", name: "Eesti", flag: "🇪🇪", disabled: true },
  { code: "fi", name: "Suomi", flag: "🇫🇮", disabled: true },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹", disabled: true },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩", disabled: true },
  { code: "lo", name: "ລາວ", flag: "🇱🇦", disabled: true },
  { code: "fa", name: "فارسی", flag: "🇮🇷", disabled: true },
];

const LanguageSelector = ({
  value = "en",
  onChange,
  style = {},
  disabled = false,
}) => {
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      style={{
        width: 200,
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      dropdownStyle={{ maxHeight: 400 }}
    >
      {LANGUAGES.map((lang) => (
        <Option key={lang.code} value={lang.code} disabled={lang.disabled}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              opacity: lang.disabled ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{lang.flag}</span>
            <span style={{ lineHeight: 1 }}>{lang.name}</span>
          </div>
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSelector;
export { LANGUAGES };
