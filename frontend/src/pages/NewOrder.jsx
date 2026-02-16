import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import '../styles/order-form.css';

const NewOrder = () => {
  const [formData, setFormData] = useState({
    fio: '',
    phone: '',
    address: '',
    model: '',
    service_date: '',
    delivery_date: '',
    appointment_date: '',
    warehouse: 'Основной',
    buy_price: '',
    sell_price_ac: '',
    price_install: '',
    my_commission: '',
    status: 'Новая заявка',
    promises: '',
    installer_opinion: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Здесь будет отправка на бэкенд
    console.log('Отправка формы:', formData);
    // TODO: создать заказ и затем финансы
  };

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <form id="orderForm" className="crm-form" onSubmit={handleSubmit}>
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👤 Карточка клиента</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label className="crm-form__label">ФИО клиента</label>
                <input
                  type="text"
                  name="fio"
                  value={formData.fio}
                  onChange={handleChange}
                  required
                  className="crm-form__input"
                  placeholder="Иванов Иван"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Номер телефона</label>
                <div className="phone-input-container">
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="crm-form__input phone-mask"
                    placeholder="+7 (___) ___-__-__"
                    required
                  />
                </div>
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Адрес (Проживания)</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="crm-form__input"
                  placeholder="ул. Пушкина, д. Колотушкина"
                />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Модель кондиционера</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="Haier Coral AS25H"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📅 Планирование и Логистика</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label className="crm-form__label">Дата обслуживания</label>
                <input
                  type="date"
                  name="service_date"
                  value={formData.service_date}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Дата доставки (склад)</label>
                <input
                  type="date"
                  name="delivery_date"
                  value={formData.delivery_date}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Установка (договор)</label>
                <input
                  type="date"
                  name="appointment_date"
                  value={formData.appointment_date}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Склад</label>
                <select
                  name="warehouse"
                  value={formData.warehouse}
                  onChange={handleChange}
                  className="crm-form__input"
                >
                  <option value="Основной">Основной</option>
                  <option value="Транзит">Транзит</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="crm-form__section crm-form__section--finance">
            <legend className="crm-form__legend">💰 Финансы</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label className="crm-form__label">Закупка (₽)</label>
                <input
                  type="number"
                  name="buy_price"
                  value={formData.buy_price}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="0"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Продажа (₽)</label>
                <input
                  type="number"
                  name="sell_price_ac"
                  value={formData.sell_price_ac}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="0"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Монтажнику (₽)</label>
                <input
                  type="number"
                  name="price_install"
                  value={formData.price_install}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="0"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Моя комиссия (₽)</label>
                <input
                  type="number"
                  name="my_commission"
                  value={formData.my_commission}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="0"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📝 Статус и Заметки</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Текущий статус</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="crm-form__input"
                >
                  <option value="Новая заявка">Новая заявка</option>
                  <option value="Ждет установщика">Ждет установщика</option>
                  <option value="Завершено">Завершено</option>
                </select>
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Обещания клиенту</label>
                <textarea
                  name="promises"
                  value={formData.promises}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="Уточнить время за час..."
                />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Мнение монтажника</label>
                <textarea
                  name="installer_opinion"
                  value={formData.installer_opinion}
                  onChange={handleChange}
                  className="crm-form__input"
                  placeholder="Сложный доступ к блоку..."
                />
              </div>
            </div>
          </fieldset>

          <div className="crm-form__actions">
            <button type="submit" className="crm-form__button crm-form__button--submit" id="saveOrderBtn">
              <span>🚀 Создать карточку заказа</span>
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default NewOrder;