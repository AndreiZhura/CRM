import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/header.css';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="header">
      <div className="header__container">
        <div className="header__left-group">
          <Link to="/" className="header__logo">❄️ Тестовая</Link>
          <div className="header__status">
            <span className="header__dot"></span>
            <span className="header__status-text">Система Online</span>
          </div>
        </div>
        
        <button 
          className={`header__burger ${isMenuOpen ? 'open' : ''}`} 
          onClick={toggleMenu}
          aria-label="Меню"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <nav className={`header__nav ${isMenuOpen ? 'active' : ''}`}>
          <Link to="/orders/new" className="header__link" onClick={() => setIsMenuOpen(false)}>📝 Новый заказ</Link>
          <Link to="/orders" className="header__link" onClick={() => setIsMenuOpen(false)}>📋 Журнал</Link>
          <Link to="/installers" className="header__link" onClick={() => setIsMenuOpen(false)}>👨‍🔧 Мастера</Link>
          <Link to="/installers/new" className="header__link" onClick={() => setIsMenuOpen(false)}>➕ Добавить мастера</Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;