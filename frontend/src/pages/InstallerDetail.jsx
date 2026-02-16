import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/installer_profile.css';
import '../styles/installer_detail.css';
import '../styles/phone.css';

const InstallerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [installer, setInstaller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' или 'history'
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchInstaller = async () => {
      try {
        const data = await api.getInstaller(id);
        setInstaller(data);
        // TODO: загрузить заказы мастера (пока заглушка)
        setOrders([]);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInstaller();
  }, [id]);

  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setInstaller(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Преобразуем specialization из строки в массив (если поле ввода)
      const specializationArray = installer.specialization
        ? installer.specialization.split(',').map(s => s.trim()).filter(s => s)
        : [];
      const dataToSend = {
        ...installer,
        specialization: specializationArray,
      };
      await api.updateInstaller(id, dataToSend);
      alert('Данные сохранены');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить мастера?')) {
      try {
        await api.deleteInstaller(id);
        navigate('/installers');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const renderOrders = () => {
    // TODO: заменить на реальную загрузку заказов
    const dummyOrders = [
      { id: 1, client: 'Иванов Иван', address: 'ул. Ленина, 10', status: 'В работе' },
      { id: 2, client: 'Петров Петр', address: 'пр. Мира, 5', status: 'Завершён' },
    ];
    return dummyOrders.map(order => (
      <tr key={order.id}>
        <td>{order.id}</td>
        <td>{order.client}</td>
        <td>{order.address}</td>
        <td>{order.status}</td>
      </tr>
    ));
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!installer) return <div>Монтажник не найден</div>;

  return (
    <div className="page">
      <Header />
      <main className="content" id="installer-page" data-id={id}>
        <div className="installer-container">
          <header className="installer-top-bar">
            <h1>Профиль мастера</h1>
            <div className="installer-top-bar__actions">
              <button className="btn-save" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Сохранение...' : '💾 Сохранить всё'}
              </button>
            </div>
          </header>

          <section className="installer-card">
            <h3 className="installer-card__title">👤 Личные данные</h3>
            <div className="installer-form-linear">
              <div className="field-group">
                <label>Полное ФИО (можно редактировать)</label>
                <input
                  type="text"
                  id="full_name"
                  className="input-large"
                  value={installer.full_name || ''}
                  onChange={handleInputChange}
                  placeholder="Иванов Иван Иванович"
                />
              </div>
              <div className="field-row">
                <div className="field-group">
                  <label>Кличка / Позывной</label>
                  <input
                    type="text"
                    id="nickname"
                    value={installer.nickname || ''}
                    onChange={handleInputChange}
                    placeholder="Напр: Снежный Барс"
                  />
                </div>

                <div className="field-group">
                  <label>Телефон</label>
                  <div className="phone-input-container">
                    <input
                      type="tel"
                      id="phone"
                      className="phone-mask"
                      value={installer.phone || ''}
                      onChange={handleInputChange}
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="installer-card card-debt">
            <h3 className="installer-card__title">💰 Финансовое состояние</h3>
            <div className="installer-form-linear">
              <div className="field-row" style={{ alignItems: 'center', gap: '20px' }}>
                <div
                  className="field-group-checkbox"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <input
                    type="checkbox"
                    id="is_debtor"
                    style={{ width: '22px', height: '22px', cursor: 'pointer' }}
                    checked={installer.is_debtor || false}
                    onChange={handleInputChange}
                  />
                  <label
                    htmlFor="is_debtor"
                    style={{ fontWeight: 'bold', color: '#e11d48', cursor: 'pointer' }}
                  >
                    Мастер в долгу
                  </label>
                </div>

                {/* Сумма долга – в модели Installer нет поля debt_amount, поэтому убираем или оставляем заглушку */}
                <div className="field-group">
                  <label>Сумма долга (₽)</label>
                  <input
                    type="number"
                    id="debt_amount"
                    placeholder="0"
                    step="0.01"
                    value="0"
                    disabled
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="installer-card">
            <h3 className="installer-card__title">🛠 Профессиональные данные</h3>
            <div className="installer-form-linear">
              <div className="field-row">
                <div className="field-group">
                  <label>Специализация (через запятую)</label>
                  <input
                    type="text"
                    id="specialization"
                    value={installer.specialization?.join(', ') || ''}
                    onChange={handleInputChange}
                    placeholder="Установка, чистка..."
                  />
                </div>
                <div className="field-group">
                  <label>Базовая ставка (₽)</label>
                  <input
                    type="number"
                    id="base_price"
                    value={installer.base_price || 0}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="field-group">
                <label>Досье и заметки (текстовая информация)</label>
                <textarea
                  id="comments"
                  rows="6"
                  value={installer.comments || ''}
                  onChange={handleInputChange}
                  placeholder="Опишите опыт..."
                ></textarea>
              </div>
            </div>
          </section>

          <section className="installer-card">
            <div className="card-header-flex">
              <h3 className="installer-card__title">🚀 Заказы мастера</h3>
              <div className="status-filter">
                <button
                  className={`filter-btn ${activeTab === 'active' ? 'active' : ''}`}
                  id="btn-active"
                  onClick={() => setActiveTab('active')}
                >
                  В работе
                </button>
                <button
                  className={`filter-btn ${activeTab === 'history' ? 'active' : ''}`}
                  id="btn-history"
                  onClick={() => setActiveTab('history')}
                >
                  История (архив)
                </button>
              </div>
            </div>
            <div className="table-responsive">
              <table className="installer-table">
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Клиент</th>
                    <th>Адрес</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody id="installer_orders_body">
                  {renderOrders()}
                </tbody>
              </table>
            </div>
          </section>

          <section className="installer-danger-zone">
            <div className="danger-zone-content">
              <div className="danger-zone-text">
                <h4>Удаление мастера</h4>
                <p>Это действие нельзя отменить.</p>
              </div>
              <button className="btn-delete-safe" onClick={handleDelete}>
                Удалить профиль мастера
              </button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InstallerDetail;