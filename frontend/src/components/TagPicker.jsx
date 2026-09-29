// 匯入 React CreatableSelect，允許搜尋既有標籤或直接建立新標籤。
import React from "react";
import CreatableSelect from "react-select/creatable";
import { useLanguage } from "../language.jsx";

// 提供作品或屬性標籤的 Autocomplete 多選欄位。
export default function TagPicker({ label, kind, options, value, onChange, onCreate, busy = false }) {
  const { t } = useLanguage();
  // 定義符合目前深紅/白色 UI 的 React Select 樣式。
  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: 46,
      borderColor: state.isFocused ? "#d32f2f" : "#d9d4cd",
      borderRadius: 8,
      boxShadow: state.isFocused ? "0 0 0 3px rgba(211, 47, 47, .1)" : "none",
      "&:hover": { borderColor: "#bd7778" },
    }),
    multiValue: (base) => ({ ...base, borderRadius: 999, backgroundColor: kind === "work" ? "#f5e6d1" : "#f7e3e3" }),
    multiValueLabel: (base) => ({ ...base, padding: "4px 3px 4px 9px", color: "#443b3e", fontSize: 12 }),
    multiValueRemove: (base) => ({ ...base, borderRadius: "0 999px 999px 0", color: "#74696a", ":hover": { backgroundColor: "#d32f2f", color: "white" } }),
    option: (base, state) => ({ ...base, color: "#2c272b", backgroundColor: state.isFocused ? "#f8ece7" : "white", fontSize: 13 }),
    menu: (base) => ({ ...base, zIndex: 8, overflow: "hidden", borderRadius: 9 }),
    placeholder: (base) => ({ ...base, color: "#8b8381", fontSize: 12 }),
  };

  return (
    <label className="field-label tag-picker-label">
      {label}
      <CreatableSelect
        isMulti
        isClearable
        isDisabled={busy}
        classNamePrefix="tag-select"
        aria-label={label}
        options={options}
        value={value}
        onChange={(selection) => onChange(selection || [])}
        onCreateOption={(name) => onCreate(name, kind)}
        formatCreateLabel={(name) => t("Create tag {name}", { name })}
        noOptionsMessage={({ inputValue }) => inputValue ? t("No matching tags. Press Enter to create one.") : t("No tags yet. Type to create one.")}
        placeholder={t("Search or type a new tag…")}
        closeMenuOnSelect={false}
        styles={selectStyles}
      />
    </label>
  );
}
