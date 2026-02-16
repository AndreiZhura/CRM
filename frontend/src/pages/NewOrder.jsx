import React, { useState } from 'react';
import '../styles/header.css';
import '../styles/order-form.css';
import '../styles/footer.css';

const NewOrder = () => {
  const [formData, setFormData] = useState({
    client_id: '',
    installer_id: '',
    service_type: '',
    service_datetime: '',
    address_text: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        alert('Заказ создан');
        // перенаправление на список заказов, например
      } else {
        alert('Ошибка создания заказа');
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="page">
      <header className="header">
        {/* Здесь можно вынести хедер в отдельный компонент */}
        <h1>CRM Олега — Новый заказ</h1>
      </header>

      <main className="page__main">
        <form className="order-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="client_id">Клиент (ID)</label>
            <input
              type="number"
              id="client_id"
              name="client_id"
              value={formData.client_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="installer_id">Монтажник (ID)</label>
            <input
              type="number"
              id="installer_id"
              name="installer_id"
              value={formData.installer_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="service_type">Тип услуги</label>
            <input
              type="text"
              id="service_type"
              name="service_type"
              value={formData.service_type}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="service_datetime">Дата и время</label>
            <input
              type="datetime-local"
              id="service_datetime"
              name="service_datetime"
              value={formData.service_datetime}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="address_text">Адрес</label>
            <input
              type="text"
              id="address_text"
              name="address_text"
              value={formData.address_text}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit">Создать заказ</button>
        </form>
      </main>

      <footer className="footer">
        {/* Футер */}
        <p>© 2026 CRM Олега</p>
      </footer>
    </div>
  );
};

export default NewOrder;