import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Loader from "../components/Loader/Loader";
import PhoneField from "../components/PhoneField";
import Footer from "../components/Footer";
import "../styles/order-form.css";

const NewOrder = () => {
  const navigate = useNavigate();

  // Состояния для формы
  const [formData, setFormData] = useState({
    fio: "",
    phone: "",
    backup_phone: "",
    address: "",
    model: "",
    service_datetime: "",
    delivery_datetime: "",
    appointment_date: "",
    warehouse: "Основной",
    buy_price: "",
    sell_price_ac: "",
    price_install: "",
    my_commission: "",
    status: "Новый",
    promises: "",
    installer_opinion: "",
    installer_id: "",
    marker_color: "blue",
  });

  // Состояния для загрузки списков
  const [clients, setClients] = useState([]);
  const [installers, setInstallers] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isNewClient, setIsNewClient] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  // Общие состояния
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Загружаем клиентов и монтажников при монтировании
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingLists(true);
        const [clientsData, installersData] = await Promise.all([
          api.getClients(),
          api.getInstallers(),
        ]);
        setClients(clientsData);
        setInstallers(installersData);
      } catch (err) {
        console.error("Ошибка загрузки списков:", err);
        setError("Не удалось загрузить клиентов или монтажников");
      } finally {
        setLoadingLists(false);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Определяем client_id
      let clientId;
      if (isNewClient) {
        if (!formData.fio || !formData.phone || !formData.address) {
          throw new Error("Заполните ФИО, телефон и адрес нового клиента");
        }
        const clientData = {
          full_name: formData.fio,
          phone: formData.phone,
          backup_phone: formData.backup_phone || "",
          address: formData.address,
          comments: formData.installer_opinion || "",
        };
        console.log("Sending client data:", clientData);
        const client = await api.createClient(clientData);
        clientId = client.id;
      } else {
        if (!selectedClientId) {
          throw new Error("Выберите клиента из списка");
        }
        clientId = selectedClientId;
      }

      // 2. Подготавливаем даты
      const service_datetime = formData.service_datetime
        ? new Date(formData.service_datetime).toISOString()
        : new Date().toISOString();

      const delivery_datetime = formData.delivery_datetime
        ? new Date(formData.delivery_datetime).toISOString()
        : null;

      // 3. Создаём заказ
      const orderData = {
        client_id: clientId,
        installer_id: formData.installer_id || null,
        service_type: formData.model || "Установка кондиционера",
        service_datetime: service_datetime,
        delivery_datetime: delivery_datetime,
        status: formData.status,
        address_text: formData.address,
        warehouse: formData.warehouse,
        promise: formData.promises || "",
        marker_color: formData.marker_color,
      };
      const order = await api.createOrder(orderData);

      // 4. Создаём финансовую запись
      const financeData = {
        order_id: order.id,
        purchase_price: parseFloat(formData.buy_price) || 0,
        sale_price_client: parseFloat(formData.sell_price_ac) || 0,
        installer_pay: parseFloat(formData.price_install) || 0,
        my_commission: parseFloat(formData.my_commission) || 0,
        payment_state: "Не оплачен",
      };
      await api.createFinance(financeData);

      // 5. Перенаправляем на список заказов
      navigate("/orders");
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
        <form id="orderForm" className="crm-form" onSubmit={handleSubmit}>
          <h1>Новый заказ</h1>
          {error && <div className="error">{error}</div>}
          {loadingLists && (
            <div style={{ textAlign: "center", margin: "20px 0" }}>
              <Loader size="small" text="Загрузка клиентов и монтажников..." />
            </div>
          )}

          {/* Карточка клиента */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👤 Карточка клиента</legend>

            {/* Переключатель новый/существующий */}
            <div className="crm-form__toggle" style={{ marginBottom: "15px" }}>
              <label style={{ marginRight: "20px" }}>
                <input
                  type="radio"
                  name="clientType"
                  value="new"
                  checked={isNewClient}
                  onChange={() => setIsNewClient(true)}
                />{" "}
                Новый клиент
              </label>
              <label>
                <input
                  type="radio"
                  name="clientType"
                  value="existing"
                  checked={!isNewClient}
                  onChange={() => setIsNewClient(false)}
                />{" "}
                Существующий клиент
              </label>
            </div>

            {isNewClient ? (
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
                  <PhoneField
                    id="client_phone"
                    name="phone"
                    label="Номер телефона"
                    value={formData.phone}
                    onChange={(value) =>
                      setFormData({ ...formData, phone: value })
                    }
                  />
                </div>
                <div className="crm-form__field">
                  <PhoneField
                    id="client_backup_phone"
                    name="backup_phone"
                    label="Резервный телефон"
                    value={formData.backup_phone}
                    onChange={(value) =>
                      setFormData({ ...formData, backup_phone: value })
                    }
                  />
                </div>
                <div className="crm-form__field crm-form__field--full">
                  <label className="crm-form__label">Адрес</label>
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
            ) : (
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Выберите клиента</label>
                <select
                  name="clientId"
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="crm-form__input"
                  required={!isNewClient}
                >
                  <option value="">-- Выберите клиента --</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name} ({client.phone}) — {client.address}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </fieldset>

          {/* Планирование и Логистика */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">
              📅 Планирование и Логистика
            </legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label className="crm-form__label">
                  Дата и время обслуживания
                </label>
                <input
                  type="datetime-local"
                  name="service_datetime"
                  value={formData.service_datetime}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">
                  Дата и время доставки (склад)
                </label>
                <input
                  type="datetime-local"
                  name="delivery_datetime"
                  value={formData.delivery_datetime}
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

              {/* Выбор монтажника */}
              <div className="crm-form__field">
                <label className="crm-form__label">Монтажник</label>
                <select
                  name="installer_id"
                  value={formData.installer_id}
                  onChange={handleChange}
                  className="crm-form__input"
                >
                  <option value="">-- Не назначен --</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.full_name}{" "}
                      {inst.nickname ? `(${inst.nickname})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Цвет маркера */}
              <div className="crm-form__field">
                <label className="crm-form__label">
                  Цвет маркера (для карты)
                </label>
                <select
                  name="marker_color"
                  value={formData.marker_color}
                  onChange={handleChange}
                  className="crm-form__input"
                >
                  <option value="blue">Синий</option>
                  <option value="red">Красный</option>
                  <option value="green">Зелёный</option>
                  <option value="yellow">Жёлтый</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Финансы */}
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

          {/* Статус и Заметки */}
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
                  <option value="Новый">Новый</option>
                  <option value="Ждет установщика">Ждет установщика</option>
                  <option value="Выполнен">Выполнен</option>{" "}
                  {/* Было "Завершено" */}
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
            <button
              type="submit"
              className="crm-form__button crm-form__button--submit"
              disabled={loading || loadingLists}
            >
              {loading ? "Сохранение..." : "🚀 Создать карточку заказа"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default NewOrder;
