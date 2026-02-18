import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Loader from '../components/Loader/Loader';
import Footer from "../components/Footer";
import PhoneField from "../components/PhoneField"; // новый импорт
import "../styles/order-form.css";
import "../styles/phone.css"; // если нужно

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [finance, setFinance] = useState(null);
  const [installers, setInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");


  // Загрузка данных
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [orderData, installersData] = await Promise.all([
          api.getOrder(id),
          api.getInstallers(),
        ]);
        setOrder(orderData);
        setClient(orderData.client || null);
        console.log('Client data:', orderData.client);
        setFinance(orderData.finance || null);
        setInstallers(installersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Обработчики
  const handleOrderChange = (e) => {
    const { name, value } = e.target;
    setOrder((prev) => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (value) => {
    setClient((prev) => ({ ...prev, phone: value }));
  };

  const handleFinanceChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFinance((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Обновляем клиента (один раз, со всеми полями)
      if (client?.id) {
        await api.updateClient(client.id, {
          full_name: client.full_name,
          phone: client.phone,
          backup_phone: client.backup_phone,
          address: client.address,
          comments: client.comments,
        });
      }
      // Обновляем заказ
      await api.updateOrder(order.id, {
        client_id: client?.id,
        installer_id: order.installer_id || null,
        service_type: order.service_type,
        service_datetime: order.service_datetime,
        status: order.status,
        address_text: client?.address || "",
        warehouse: order.warehouse,
        promise: order.promise,
      });
      // Обновляем финансы
      if (finance?.id) {
        await api.updateFinance(finance.id, {
          purchase_price: parseFloat(finance.purchase_price) || 0,
          sale_price_client: parseFloat(finance.sale_price_client) || 0,
          installer_pay: parseFloat(finance.installer_pay) || 0,
          my_commission: parseFloat(finance.my_commission) || 0,
          payment_state: finance.payment_state,
          installer_returned_money: finance.installer_returned_money,
        });
      }
      alert("Заказ обновлён");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Удалить заказ?")) {
      try {
        await api.deleteOrder(id);
        navigate("/orders");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading) return (
  <div className="page">
    <Header />
    <main className="content">
      <Loader />
    </main>
    <Footer />
  </div>
);
  if (error) return <div>Ошибка: {error}</div>;
  if (!order || !client) return <div>Заказ не найден</div>;

  return (
    <div className="page">
      <Header />
      <main className="content">
        <form onSubmit={handleSubmit} className="crm-form">
          <div className="crm-form__header-info">
            <Link to="/orders" className="crm-form__back-link">
              ← Вернуться в журнал
            </Link>
            <h2 className="crm-form__main-title">
              Редактирование заказа №<span>{order.id}</span>
            </h2>
          </div>

          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👤 Данные клиента</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label htmlFor="fio">ФИО клиента</label>
                <input
                  type="text"
                  id="fio"
                  name="full_name"
                  value={client.full_name || ""}
                  onChange={handleClientChange}
                  className="crm-form__input"
                />
              </div>
              <PhoneField
                id="client_phone"
                name="phone"
                value={client.phone || ""}
                onChange={handlePhoneChange}
                label="Телефон / Связь"
              />
              <PhoneField
                id="client_backup_phone"
                name="backup_phone"
                value={client.backup_phone || ""}
                onChange={(value) =>
                  setClient((prev) => ({ ...prev, backup_phone: value }))
                }
                label="Резервный телефон (необязательно)"
              />

              <div className="crm-form__field crm-form__field--full">
                <label htmlFor="address">Адрес установки</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={client.address || ""}
                  onChange={handleClientChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label htmlFor="installer_id">Назначенный монтажник</label>
                <select
                  id="installer_id"
                  name="installer_id"
                  value={order.installer_id || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                >
                  <option value="">-- Выберите монтажника --</option>
                  {installers.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">
              📅 Планирование и Логистика
            </legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label htmlFor="created_at">Дата обращения</label>
                <input
                  type="text"
                  id="created_at"
                  value={new Date(order.created_at).toLocaleString()}
                  className="crm-form__input"
                  readOnly
                />
              </div>
              <div className="crm-form__field">
                <label htmlFor="service_date">Дата обслуживания</label>
                <input
                  type="date"
                  id="service_date"
                  name="service_datetime"
                  value={order.service_datetime?.slice(0, 10) || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label htmlFor="delivery_date">Привоз кондиционера</label>
                <input
                  type="date"
                  id="delivery_date"
                  name="delivery_datetime"
                  value={order.delivery_datetime?.slice(0, 10) || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label htmlFor="warehouse">Склад отгрузки</label>
                <input
                  type="text"
                  id="warehouse"
                  name="warehouse"
                  value={order.warehouse || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                />
              </div>
            </div>
          </fieldset>

          {finance && (
            <fieldset className="crm-form__section crm-form__section--finance">
              <legend className="crm-form__legend">💰 Финансовая часть</legend>
              <div className="crm-form__grid">
                <div className="crm-form__field">
                  <label htmlFor="buy_price">Цена закупки (₽)</label>
                  <input
                    type="number"
                    id="buy_price"
                    name="purchase_price"
                    value={finance.purchase_price || 0}
                    onChange={handleFinanceChange}
                    className="crm-form__input"
                  />
                </div>
                <div className="crm-form__field">
                  <label htmlFor="sell_price_ac">Продажа клиенту (₽)</label>
                  <input
                    type="number"
                    id="sell_price_ac"
                    name="sale_price_client"
                    value={finance.sale_price_client || 0}
                    onChange={handleFinanceChange}
                    className="crm-form__input"
                  />
                </div>
                <div className="crm-form__field">
                  <label htmlFor="price_install">Оплата монтажнику (₽)</label>
                  <input
                    type="number"
                    id="price_install"
                    name="installer_pay"
                    value={finance.installer_pay || 0}
                    onChange={handleFinanceChange}
                    className="crm-form__input"
                  />
                </div>
                <div className="crm-form__field">
                  <label htmlFor="my_commission">Ваша комиссия (₽)</label>
                  <input
                    type="number"
                    id="my_commission"
                    name="my_commission"
                    value={finance.my_commission || 0}
                    onChange={handleFinanceChange}
                    className="crm-form__input"
                  />
                </div>
                <div className="crm-form__field crm-form__field--full">
                  <label className="crm-form__checkbox-label">
                    <input
                      type="checkbox"
                      id="is_money_returned"
                      name="installer_returned_money"
                      checked={finance.installer_returned_money || false}
                      onChange={handleFinanceChange}
                    />
                    <span className="crm-form__checkbox-text">
                      Монтажник вернул деньги в кассу
                    </span>
                  </label>
                </div>
              </div>
            </fieldset>
          )}

          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">⚙️ Статус и Исполнение</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label htmlFor="status">Текущий статус</label>
                <select
                  id="status"
                  name="status"
                  value={order.status || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                >
                  <option value="Новая заявка">Новая заявка</option>
                  <option value="Ждет установщика">Ждет установщика</option>
                  <option value="В работе">В работе</option>
                  <option value="Выполнен">Выполнен</option>{" "}
                  {/* было "Завершено" */}
                  <option value="Отказ">Отказ</option>
                </select>
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label htmlFor="promises">Обещания</label>
                <textarea
                  id="promises"
                  name="promise"
                  value={order.promise || ""}
                  onChange={handleOrderChange}
                  className="crm-form__input"
                  rows="3"
                />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label htmlFor="comments">Комментарии</label>
                <textarea
                  id="comments"
                  name="comments"
                  value={client.comments || ""}
                  onChange={handleClientChange}
                  className="crm-form__input"
                  rows="3"
                />
              </div>
            </div>
          </fieldset>

          <div className="crm-form__actions">
            <button
              type="submit"
              className="crm-form__button crm-form__button--submit"
              disabled={saving}
            >
              {saving ? "💾 Сохранение..." : "💾 Сохранить все изменения"}
            </button>
            <button
              type="button"
              className="crm-form__button crm-form__button--delete"
              onClick={handleDelete}
            >
              🗑 Удалить заказ
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default OrderDetail;

