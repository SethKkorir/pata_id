import React from 'react';
import './Input.css';

const Input = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  label,
  id,
  name,
  className = '',
  required = false,
  hint,
  error
}) => {
  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <input
        type={type}
        id={id}
        name={name}
        className={`input ${className} ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
      />
      {error && <p className="error-text">{error}</p>}
      {hint && <p className="form-hint">{hint}</p>}
    </div>
  );
};

export const Select = ({
  options,
  placeholder,
  value,
  onChange,
  label,
  id,
  name,
  className = '',
  required = false
}) => {
  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={id}>{label}</label>}
      <select
        id={id}
        name={name}
        className={`input select ${className}`}
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="">{placeholder || 'Select option'}</option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export const ToggleGroup = ({ options, value, onChange, label }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="toggle-group">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            className={`toggle-btn ${value === option.value ? 'active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Input;
export { Input };