import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/installer_add.css';
import '../styles/phone.css';

const AddInstaller = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    phone: '',
    backup_phone: '',
    specialization: '',
    rating: 10,
    base_price: 0,
    is_debtor: false,
    comments: '',
    is_active: true,
    is_in_funnel: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Преобразуем specialization из строки в массив
    const specializationArray = formData.specialization
      .split(',')
      .map(s => s.trim())
      .filter(s => s !== '');

    const dataToSend = {
      ...formData,
      specialization: specializationArray,
      rating: Number(formData.rating),
      base_price: Number(formData.base_price),
    };

    try {
      await api.createInstaller(dataToSend);
      // Перенаправляем на страницу списка монтажников (создадим позже)
      navigate('/installers');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="form-container">
          <h1>Добавить мастера</h1>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="full_name">ФИО *</label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Иванов Иван Иванович"
              />
            </div>

            <div className="form-group">
              <label htmlFor="nickname">Кликуха (Nickname)</label>
              <input
                type="text"
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleChange}
                placeholder="Напр: Мороз"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Телефон *</label>
              <div className="phone-input-container">
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="phone-mask"
                  placeholder="+7 (___) ___-__-__"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="backup_phone">Резервный телефон</label>
              <div className="phone-input-container">
                <input
                  type="tel"
                  id="backup_phone"
                  name="backup_phone"
                  value={formData.backup_phone}
                  onChange={handleChange}
                  className="phone-mask"
                  placeholder="+7 (___) ___-__-__"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="specialization">Специализация *</label>
              <input
                type="text"
                id="specialization"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
                placeholder="Установщик, Альпинист"
                required
              />
              <small className="helper-text">Введите через запятую</small>
            </div>

            <div className="form-group">
              <label htmlFor="rating">Рейтинг (1-10)</label>
              <input
                type="number"
                id="rating"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                min="1"
                max="10"
                step="0.1"
              />
            </div>

            <div className="debt-banner">
              <h3 className="debt-title">💰 Финансовый статус</h3>
              <div className="debt-row">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="is_debtor"
                    name="is_debtor"
                    checked={formData.is_debtor}
                    onChange={handleChange}
                  />
                  <label htmlFor="is_debtor">В долгу</label>
                </div>
                {/* Поле суммы долга пока убрано, так как его нет в модели */}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="base_price">Цена за монтаж (базовая)</label>
              <input
                type="number"
                id="base_price"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                step="0.01"
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="is_in_funnel">Статус в воронке</label>
              <select
                id="is_in_funnel"
                name="is_in_funnel"
                value={formData.is_in_funnel}
                onChange={handleChange}
              >
                <option value={true}>Новый</option>
                <option value={false}>Проверен</option>
              </select>
              <small className="helper-text">"Проверен" — монтажник не показывается в активной воронке</small>
            </div>

            <div className="form-group">
              <label htmlFor="comments">Досье / Заметки</label>
              <textarea
                id="comments"
                name="comments"
                value={formData.comments}
                onChange={handleChange}
                rows="4"
                placeholder="Особенности мастера..."
              />
            </div>

            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Сохранение...' : '💾 Сохранить досье'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddInstaller;