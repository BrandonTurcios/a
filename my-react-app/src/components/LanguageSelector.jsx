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
    disabled: false,
  },
  { code: "fr", name: "Français", flag: "🇫🇷", disabled: false },
  { code: "de", name: "Deutsch", flag: "🇩🇪", disabled: false },
  { code: "it", name: "Italiano", flag: "🇮🇹", disabled: false },
  { code: "pt", name: "Português", flag: "🇵🇹", disabled: true },
  { code: "ru", name: "Русский", flag: "🇷🇺", disabled: true },
  { code: "zh_CN", name: "中文 (简体)", flag: "🇨🇳", disabled: false },
  { code: "ca", name: "Català", flag: "🇪🇸", disabled: false },
  { code: "nl", name: "Nederlands", flag: "🇳🇱", disabled: false },
  { code: "pl", name: "Polski", flag: "🇵🇱", disabled: false },
  { code: "uk", name: "Українська", flag: "🇺🇦", disabled: false },
  { code: "tr", name: "Türkçe", flag: "🇹🇷", disabled: false },
  { code: "ro", name: "Română", flag: "🇷🇴", disabled: false },
  { code: "hu", name: "Magyar", flag: "🇭🇺", disabled: false },
  { code: "cs", name: "Čeština", flag: "🇨🇿", disabled: false },
  { code: "bg", name: "Български", flag: "🇧🇬", disabled: false },
  { code: "sl", name: "Slovenščina", flag: "🇸🇮", disabled: false },
  { code: "et", name: "Eesti", flag: "🇪🇪", disabled: false },
  { code: "fi", name: "Suomi", flag: "🇫🇮", disabled: false },
  { code: "lt", name: "Lietuvių", flag: "🇱🇹", disabled: false },
  { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩", disabled: false },
  { code: "lo", name: "ລາວ", flag: "🇱🇦", disabled: false },
  { code: "fa", name: "فارسی", flag: "🇮🇷", disabled: false },
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
