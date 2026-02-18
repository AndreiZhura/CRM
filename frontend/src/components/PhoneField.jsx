import React, { useState, useEffect } from 'react';
import '../styles/phone.css';

const PhoneField = ({ value, onChange, id, name, label = "Телефон / Связь", required = false }) => {
  const [phoneDigits, setPhoneDigits] = useState('');

  // Извлечение цифр из пропса
  useEffect(() => {
    if (value) {
      const digits = value.replace(/\D/g, '');
      setPhoneDigits(digits.startsWith('8') ? '7' + digits.substring(1) : digits.substring(0, 11));
    } else {
      setPhoneDigits(''); // если value пустое, не ставим '7' по умолчанию
    }
  }, [value]);

  const formatPhone = (digits) => {
    if (!digits) return ''; // если цифр нет, возвращаем пустую строку
    let formatted = '+7';
    if (digits.length > 1) formatted += ' (' + digits.substring(1, 4);
    if (digits.length > 4) formatted += ') ' + digits.substring(4, 7);
    if (digits.length > 7) formatted += '-' + digits.substring(7, 9);
    if (digits.length > 9) formatted += '-' + digits.substring(9, 11);
    return formatted;
  };

  const handleInput = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.startsWith('8')) digits = '7' + digits.substring(1);
    if (digits.length === 0) digits = '7';
    if (digits.length > 11) digits = digits.substring(0, 11);
    setPhoneDigits(digits);
    onChange(`+${digits}`);
  };

  const handleFocus = () => {
    if (!phoneDigits) setPhoneDigits('7'); // при фокусе ставим '7', чтобы начать ввод
  };

  const isValid = phoneDigits.length === 11;
  const callLink = isValid ? `tel:+${phoneDigits}` : '#';
  const tgLink = isValid ? `https://t.me/+${phoneDigits}` : '#';

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <div className="phone-input-container">
        <input
          type="tel"
          id={id}
          name={name}
          className={`phone-mask ${isValid ? 'valid' : phoneDigits.length > 1 ? 'invalid' : ''}`}
          value={formatPhone(phoneDigits)}
          onInput={handleInput}
          onFocus={handleFocus}
          placeholder="+7 (999) 000-00-00"
          maxLength={18}
          required={required}
        />
        <div className="phone-actions">
          <a
            href={callLink}
            className={`action-btn ${isValid ? '' : 'hidden'}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            📞
          </a>
          <a
            href={tgLink}
            className={`action-btn ${isValid ? '' : 'hidden'}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ✈️
          </a>
        </div>
      </div>
      {!isValid && phoneDigits.length > 1 && (
        <div className="error-hint">Введите полный номер (11 цифр)</div>
      )}
    </div>
  );
};

export default PhoneField;