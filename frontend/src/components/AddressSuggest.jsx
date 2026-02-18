import React, { useState, useEffect, useRef } from 'react';
import '../styles/address-suggest.css'; // создадим файл стилей

const YANDEX_API_KEY = process.env.REACT_APP_YANDEX_API_KEY || '';

const AddressSuggest = ({ value, onChange, required, className, placeholder }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&geocode=${encodeURIComponent(query)}&format=json&results=5`
      );
      const data = await response.json();
      const featureMembers = data.response.GeoObjectCollection.featureMember;
      const addresses = featureMembers.map(f => f.GeoObject.metaDataProperty.GeocoderMetaData.text);
      setSuggestions(addresses);
      setShowSuggestions(true);
    } catch (err) {
      console.error('Ошибка геокодинга:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(e); // передаём событие дальше
    fetchSuggestions(val);
  };

  const handleSelect = (address) => {
    onChange({ target: { name: 'address', value: address } });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="address-suggest-wrapper" ref={wrapperRef}>
      <input
        ref={inputRef}
        type="text"
        name="address"
        value={value}
        onChange={handleInputChange}
        onFocus={() => value.length >= 3 && setShowSuggestions(true)}
        required={required}
        className={className}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showSuggestions && (
        <ul className="address-suggest-list">
          {loading && <li className="address-suggest-item loading">Загрузка...</li>}
          {!loading && suggestions.length === 0 && value.length >= 3 && (
            <li className="address-suggest-item no-results">Ничего не найдено</li>
          )}
          {suggestions.map((addr, idx) => (
            <li
              key={idx}
              className="address-suggest-item"
              onClick={() => handleSelect(addr)}
            >
              {addr}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AddressSuggest;