import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/order-form.css'; // можно использовать общие стили формы
// если есть отдельный CSS для деталей заказа – раскомментируй следующую строку
// import '../styles/order-detail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clients, setClients] = useState([]);
  const [installers, setInstallers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderData, clientsData, installersData] = await Promise.all([
          api.getOrder(id),
          api.getClients().catch(() => []), // если метод не добавлен – игнорируем
          api.getInstallers().catch(() => []),
        ]);
        setOrder(orderData);
        setClients(clientsData);
        setInstallers(installersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOrder(prev => ({ ...prev, [name]: value }));
  };

  const handleFinanceChange = (field, value) => {
    setOrder(prev => ({
      ...prev,
      finance: { ...prev.finance, [field]: value }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Отправляем только изменяемые поля
      const dataToSend = {
        client_id: order.client_id,
        installer_id: order.installer_id,
        service_type: order.service_type,
        service_datetime: order.service_datetime,
        status: order.status,
        address_text: order.address_text,
      };
      await api.updateOrder(id, dataToSend);
      alert('Заказ обновлён');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Удалить заказ?')) {
      try {
        await api.deleteOrder(id);
        navigate('/orders');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!order) return <div>Заказ не найден</div>;

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="form-container"> {/* используем общий контейнер из order-form.css */}
          <h1>Редактирование заказа #{order.id}</h1>
          <form onSubmit={handleSubmit}>
            {/* Клиент */}
            <div className="form-group">
              <label htmlFor="client_id">Клиент</label>
              <select
                id="client_id"
                name="client_id"
                value={order.client_id || ''}
                onChange={handleInputChange}
              >
                <option value="">Выберите клиента</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>

            {/* Монтажник */}
            <div className="form-group">
              <label htmlFor="installer_id">Монтажник</label>
              <select
                id="installer_id"
                name="installer_id"
                value={order.installer_id || ''}
                onChange={handleInputChange}
              >
                <option value="">Не назначен</option>
                {installers.map(i => (
                  <option key={i.id} value={i.id}>{i.full_name}</option>
                ))}
              </select>
            </div>

            {/* Тип услуги */}
            <div className="form-group">
              <label htmlFor="service_type">Тип услуги</label>
              <input
                type="text"
                id="service_type"
                name="service_type"
                value={order.service_type || ''}
                onChange={handleInputChange}
              />
            </div>

            {/* Дата и время */}
            <div className="form-group">
              <label htmlFor="service_datetime">Дата и время</label>
              <input
                type="datetime-local"
                id="service_datetime"
                name="service_datetime"
                value={order.service_datetime ? order.service_datetime.slice(0,16) : ''}
                onChange={handleInputChange}
              />
            </div>

            {/* Статус */}
            <div className="form-group">
              <label htmlFor="status">Статус</label>
              <select
                id="status"
                name="status"
                value={order.status || ''}
                onChange={handleInputChange}
              >
                <option value="Новый">Новый</option>
                <option value="Ждет установщика">Ждет установщика</option>
                <option value="В работе">В работе</option>
                <option value="Выполнен">Выполнен</option>
                <option value="Отменен">Отменен</option>
              </select>
            </div>

            {/* Адрес */}
            <div className="form-group">
              <label htmlFor="address_text">Адрес</label>
              <input
                type="text"
                id="address_text"
                name="address_text"
                value={order.address_text || ''}
                onChange={handleInputChange}
              />
            </div>

            {/* Финансы */}
            {order.finance && (
              <fieldset className="form-section">
                <legend>Финансы</legend>
                <div className="form-group">
                  <label htmlFor="sale_price_client">Цена продажи (₽)</label>
                  <input
                    type="number"
                    id="sale_price_client"
                    value={order.finance.sale_price_client || 0}
                    onChange={(e) => handleFinanceChange('sale_price_client', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="profit">Прибыль</label>
                  <span>{order.finance.profit} ₽</span>
                </div>
                <div className="form-group">
                  <label htmlFor="payment_state">Статус оплаты</label>
                  <select
                    id="payment_state"
                    value={order.finance.payment_state || ''}
                    onChange={(e) => handleFinanceChange('payment_state', e.target.value)}
                  >
                    <option value="Не оплачен">Не оплачен</option>
                    <option value="Частично">Частично</option>
                    <option value="Оплачен">Оплачен</option>
                  </select>
                </div>
              </fieldset>
            )}

            {/* Кнопки действий */}
            <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" className="btn-delete" onClick={handleDelete}>
                Удалить заказ
              </button>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDetail;