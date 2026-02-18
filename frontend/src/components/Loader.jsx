import React from 'react';
import '../styles/Loader.css';

const Loader = ({ size = 'medium', color = '#2563eb', text = 'Загрузка...' }) => {
  const sizeClass = `loader--${size}`;
  return (
    <div className="loader-container">
      <div className={`loader ${sizeClass}`} style={{ borderTopColor: color }}></div>
      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;