import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Footer from "../components/Footer";
import PhoneField from "../components/PhoneField";
import "../styles/order-form.css";
import "../styles/phone.css";

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Основные данные
  const [order, setOrder] = useState(null);
  const [client, setClient] = useState(null);
  const [finance, setFinance] = useState(null);
  const [installers, setInstallers] = useState([]); // список всех монтажников для выбора

  // Списки связанных сущностей
  const [items, setItems] = useState([]);
  const [orderInstallers, setOrderInstallers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);

  // Состояния для форм добавления
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddInstaller, setShowAddInstaller] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);

  // Данные для новых записей
  const [newItem, setNewItem] = useState({
    item_type: "product",
    name: "",
    quantity: 1,
    purchase_price: 0,
    sale_price: 0,
    warranty_manufacturer: 0,
  });
  const [newOrderInstaller, setNewOrderInstaller] = useState({
    installer_id: "",
    role: "",
    base_payment: 0,
    is_primary: false,
  });
  const [newExpense, setNewExpense] = useState({
    amount: 0,
    description: "",
    expense_date: new Date().toISOString().split('T')[0],
    category: "other",
  });
  const [newPayment, setNewPayment] = useState({
    payment_type: "client",
    installer_id: "",
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    description: "",
  });

  // Общие состояния
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
        setFinance(orderData.finance || null);
        setItems(orderData.items || []);
        setOrderInstallers(orderData.installers || []);
        setExpenses(orderData.expenses || []);
        setPayments(orderData.payments || []);
        setInstallers(installersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Обработчики изменения полей заказа/клиента
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

  // Сохранение основного заказа и клиента
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (client?.id) {
        await api.updateClient(client.id, {
          full_name: client.full_name,
          phone: client.phone,
          backup_phone: client.backup_phone,
          address: client.address,
          comments: client.comments,
        });
      }
      await api.updateOrder(order.id, {
        client_id: client?.id,
        installer_id: order.installer_id || null, // пока оставляем, потом уберём
        service_type: order.service_type,
        service_datetime: order.service_datetime,
        status: order.status,
        address_text: client?.address || "",
        warehouse: order.warehouse,
        promise: order.promise,
      });
      alert("Заказ обновлён");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Удаление заказа
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

  // ---------- Работа с позициями ----------
  const handleAddItem = async () => {
    try {
      const created = await api.createOrderItem({
        order_id: order.id,
        ...newItem,
        warranty_master: 0,
        sort_order: items.length,
      });
      setItems([...items, created]);
      setShowAddItem(false);
      setNewItem({
        item_type: "product",
        name: "",
        quantity: 1,
        purchase_price: 0,
        sale_price: 0,
        warranty_manufacturer: 0,
      });
    } catch (err) {
      alert("Ошибка при добавлении позиции: " + err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (window.confirm("Удалить позицию?")) {
      try {
        await api.deleteOrderItem(itemId);
        setItems(items.filter((i) => i.id !== itemId));
      } catch (err) {
        alert("Ошибка удаления: " + err.message);
      }
    }
  };

  // ---------- Работа с монтажниками в заказе ----------
  const handleAddOrderInstaller = async () => {
    try {
      const created = await api.createOrderInstaller({
        order_id: order.id,
        ...newOrderInstaller,
      });
      setOrderInstallers([...orderInstallers, created]);
      setShowAddInstaller(false);
      setNewOrderInstaller({
        installer_id: "",
        role: "",
        base_payment: 0,
        is_primary: false,
      });
    } catch (err) {
      alert("Ошибка при назначении монтажника: " + err.message);
    }
  };

  const handleDeleteOrderInstaller = async (installerId) => {
    if (window.confirm("Удалить монтажника из заказа?")) {
      try {
        await api.deleteOrderInstaller(installerId);
        setOrderInstallers(orderInstallers.filter((oi) => oi.id !== installerId));
      } catch (err) {
        alert("Ошибка удаления: " + err.message);
      }
    }
  };

  // ---------- Работа с расходами ----------
  const handleAddExpense = async () => {
    try {
      const created = await api.createOrderExpense({
        order_id: order.id,
        ...newExpense,
      });
      setExpenses([...expenses, created]);
      setShowAddExpense(false);
      setNewExpense({
        amount: 0,
        description: "",
        expense_date: new Date().toISOString().split('T')[0],
        category: "other",
      });
    } catch (err) {
      alert("Ошибка при добавлении расхода: " + err.message);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm("Удалить расход?")) {
      try {
        await api.deleteOrderExpense(expenseId);
        setExpenses(expenses.filter((e) => e.id !== expenseId));
      } catch (err) {
        alert("Ошибка удаления: " + err.message);
      }
    }
  };

  // ---------- Работа с платежами ----------
  const handleAddPayment = async () => {
    try {
      const created = await api.createPayment({
        order_id: order.id,
        ...newPayment,
      });
      setPayments([...payments, created]);
      setShowAddPayment(false);
      setNewPayment({
        payment_type: "client",
        installer_id: "",
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        description: "",
      });
    } catch (err) {
      alert("Ошибка при добавлении платежа: " + err.message);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (window.confirm("Удалить платёж?")) {
      try {
        await api.deletePayment(paymentId);
        setPayments(payments.filter((p) => p.id !== paymentId));
      } catch (err) {
        alert("Ошибка удаления: " + err.message);
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
            <Link to="/orders" className="crm-form__back-link">← Вернуться в журнал</Link>
            <h2 className="crm-form__main-title">Редактирование заказа №<span>{order.id}</span></h2>
          </div>

          {/* Основные данные заказа и клиента (как было) */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👤 Данные клиента</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label>ФИО клиента</label>
                <input type="text" name="full_name" value={client.full_name || ""} onChange={handleClientChange} className="crm-form__input" />
              </div>
              <PhoneField id="client_phone" name="phone" value={client.phone || ""} onChange={handlePhoneChange} label="Телефон" />
              <PhoneField id="client_backup_phone" name="backup_phone" value={client.backup_phone || ""} onChange={(value) => setClient(prev => ({ ...prev, backup_phone: value }))} label="Резервный телефон" />
              <div className="crm-form__field crm-form__field--full">
                <label>Адрес</label>
                <input type="text" name="address" value={client.address || ""} onChange={handleClientChange} className="crm-form__input" />
              </div>
              <div className="crm-form__field">
                <label>Статус заказа</label>
                <select name="status" value={order.status || ""} onChange={handleOrderChange} className="crm-form__input">
                  <option value="Новый">Новый</option>
                  <option value="Ждет установщика">Ждет установщика</option>
                  <option value="В работе">В работе</option>
                  <option value="Выполнен">Выполнен</option>
                  <option value="Отказ">Отказ</option>
                </select>
              </div>
              <div className="crm-form__field">
                <label>Склад</label>
                <input type="text" name="warehouse" value={order.warehouse || ""} onChange={handleOrderChange} className="crm-form__input" />
              </div>
              <div className="crm-form__field">
                <label>Дата обслуживания</label>
                <input type="date" name="service_datetime" value={order.service_datetime?.slice(0,10) || ""} onChange={handleOrderChange} className="crm-form__input" />
              </div>
              <div className="crm-form__field">
                <label>Дата доставки</label>
                <input type="date" name="delivery_datetime" value={order.delivery_datetime?.slice(0,10) || ""} onChange={handleOrderChange} className="crm-form__input" />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label>Обещания</label>
                <textarea name="promise" value={order.promise || ""} onChange={handleOrderChange} className="crm-form__input" rows="3" />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label>Комментарии</label>
                <textarea name="comments" value={client.comments || ""} onChange={handleClientChange} className="crm-form__input" rows="3" />
              </div>
            </div>
          </fieldset>

          {/* Финансовая сводка (только для просмотра) */}
          {finance && (
            <fieldset className="crm-form__section crm-form__section--finance">
              <legend className="crm-form__legend">💰 Финансовая сводка</legend>
              <div className="crm-form__grid">
                <div className="crm-form__field">
                  <label>Выручка</label>
                  <div className="crm-form__static-value">{finance.revenue?.toFixed(2)} ₽</div>
                </div>
                <div className="crm-form__field">
                  <label>Себестоимость</label>
                  <div className="crm-form__static-value">{finance.cost_of_goods?.toFixed(2)} ₽</div>
                </div>
                <div className="crm-form__field">
                  <label>Выплаты монтажникам</label>
                  <div className="crm-form__static-value">{finance.installer_payments?.toFixed(2)} ₽</div>
                </div>
                <div className="crm-form__field">
                  <label>Расходы</label>
                  <div className="crm-form__static-value">{finance.expenses?.toFixed(2)} ₽</div>
                </div>
                <div className="crm-form__field">
                  <label>Прибыль</label>
                  <div className="crm-form__static-value" style={{ fontWeight: 'bold', color: finance.profit >= 0 ? '#10b981' : '#ef4444' }}>
                    {finance.profit?.toFixed(2)} ₽
                  </div>
                </div>
              </div>
            </fieldset>
          )}

          {/* Позиции заказа */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📦 Позиции заказа</legend>
            {items.length === 0 && <p>Нет позиций</p>}
            {items.map((item) => (
              <div key={item.id} className="item-block" style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{item.name}</strong> ({item.item_type === 'product' ? 'Товар' : 'Услуга'})<br />
                    Кол-во: {item.quantity}, закупка: {item.purchase_price} ₽, продажа: {item.sale_price} ₽<br />
                    Гарантия: {item.warranty_manufacturer} лет
                  </div>
                  <button type="button" onClick={() => handleDeleteItem(item.id)} className="item-remove-btn">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setShowAddItem(!showAddItem)} className="crm-form__button crm-form__button--secondary">
              {showAddItem ? 'Отмена' : '➕ Добавить позицию'}
            </button>
            {showAddItem && (
              <div className="add-form" style={{ marginTop: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h4>Новая позиция</h4>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label>Тип</label>
                    <select value={newItem.item_type} onChange={(e) => setNewItem({...newItem, item_type: e.target.value})} className="crm-form__input">
                      <option value="product">Товар</option>
                      <option value="service">Услуга</option>
                    </select>
                  </div>
                  <div className="crm-form__field">
                    <label>Название *</label>
                    <input type="text" value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} className="crm-form__input" />
                  </div>
                  <div className="crm-form__field">
                    <label>Количество</label>
                    <input type="number" min="1" value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})} className="crm-form__input" />
                  </div>
                  {newItem.item_type === 'product' && (
                    <div className="crm-form__field">
                      <label>Закупка (₽)</label>
                      <input type="number" min="0" step="0.01" value={newItem.purchase_price} onChange={(e) => setNewItem({...newItem, purchase_price: parseFloat(e.target.value) || 0})} className="crm-form__input" />
                    </div>
                  )}
                  <div className="crm-form__field">
                    <label>Продажа (₽)</label>
                    <input type="number" min="0" step="0.01" value={newItem.sale_price} onChange={(e) => setNewItem({...newItem, sale_price: parseFloat(e.target.value) || 0})} className="crm-form__input" />
                  </div>
                  <div className="crm-form__field">
                    <label>Гарантия (лет)</label>
                    <input type="number" min="0" value={newItem.warranty_manufacturer} onChange={(e) => setNewItem({...newItem, warranty_manufacturer: parseInt(e.target.value) || 0})} className="crm-form__input" />
                  </div>
                </div>
                <button type="button" onClick={handleAddItem} className="crm-form__button crm-form__button--submit" style={{ marginTop: '10px' }}>Сохранить</button>
              </div>
            )}
          </fieldset>

          {/* Монтажники в заказе */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👥 Монтажники</legend>
            {orderInstallers.length === 0 && <p>Нет назначенных монтажников</p>}
            {orderInstallers.map((oi) => {
              const inst = installers.find(i => i.id === oi.installer_id);
              return (
                <div key={oi.id} className="item-block" style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <strong>{inst?.full_name || 'Неизвестный'}</strong> {oi.is_primary && '⭐'}<br />
                      Роль: {oi.role}, оплата: {oi.base_payment} ₽
                    </div>
                    <button type="button" onClick={() => handleDeleteOrderInstaller(oi.id)} className="item-remove-btn">✕</button>
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => setShowAddInstaller(!showAddInstaller)} className="crm-form__button crm-form__button--secondary">
              {showAddInstaller ? 'Отмена' : '➕ Назначить монтажника'}
            </button>
            {showAddInstaller && (
              <div className="add-form" style={{ marginTop: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h4>Назначить монтажника</h4>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label>Монтажник *</label>
                    <select value={newOrderInstaller.installer_id} onChange={(e) => setNewOrderInstaller({...newOrderInstaller, installer_id: e.target.value})} className="crm-form__input" required>
                      <option value="">-- Выберите --</option>
                      {installers.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                    </select>
                  </div>
                  <div className="crm-form__field">
                    <label>Роль *</label>
                    <input type="text" value={newOrderInstaller.role} onChange={(e) => setNewOrderInstaller({...newOrderInstaller, role: e.target.value})} className="crm-form__input" required />
                  </div>
                  <div className="crm-form__field">
                    <label>Оплата (₽)</label>
                    <input type="number" min="0" step="0.01" value={newOrderInstaller.base_payment} onChange={(e) => setNewOrderInstaller({...newOrderInstaller, base_payment: parseFloat(e.target.value) || 0})} className="crm-form__input" />
                  </div>
                  <div className="crm-form__field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                    <label>
                      <input type="checkbox" checked={newOrderInstaller.is_primary} onChange={(e) => setNewOrderInstaller({...newOrderInstaller, is_primary: e.target.checked})} />
                      {' '}Основной
                    </label>
                  </div>
                </div>
                <button type="button" onClick={handleAddOrderInstaller} className="crm-form__button crm-form__button--submit" style={{ marginTop: '10px' }}>Назначить</button>
              </div>
            )}
          </fieldset>

          {/* Расходы */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">💸 Непредвиденные расходы</legend>
            {expenses.length === 0 && <p>Нет расходов</p>}
            {expenses.map((exp) => (
              <div key={exp.id} className="item-block" style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{exp.description || 'Без описания'}</strong><br />
                    Сумма: {exp.amount} ₽, дата: {exp.expense_date}, категория: {exp.category}
                  </div>
                  <button type="button" onClick={() => handleDeleteExpense(exp.id)} className="item-remove-btn">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setShowAddExpense(!showAddExpense)} className="crm-form__button crm-form__button--secondary">
              {showAddExpense ? 'Отмена' : '➕ Добавить расход'}
            </button>
            {showAddExpense && (
              <div className="add-form" style={{ marginTop: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h4>Новый расход</h4>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label>Сумма (₽) *</label>
                    <input type="number" min="0" step="0.01" value={newExpense.amount} onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})} className="crm-form__input" required />
                  </div>
                  <div className="crm-form__field">
                    <label>Описание</label>
                    <input type="text" value={newExpense.description} onChange={(e) => setNewExpense({...newExpense, description: e.target.value})} className="crm-form__input" />
                  </div>
                  <div className="crm-form__field">
                    <label>Дата</label>
                    <input type="date" value={newExpense.expense_date} onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})} className="crm-form__input" />
                  </div>
                  <div className="crm-form__field">
                    <label>Категория</label>
                    <select value={newExpense.category} onChange={(e) => setNewExpense({...newExpense, category: e.target.value})} className="crm-form__input">
                      <option value="materials">Материалы</option>
                      <option value="tools">Инструменты</option>
                      <option value="transport">Транспорт</option>
                      <option value="other">Прочее</option>
                    </select>
                  </div>
                </div>
                <button type="button" onClick={handleAddExpense} className="crm-form__button crm-form__button--submit" style={{ marginTop: '10px' }}>Добавить</button>
              </div>
            )}
          </fieldset>

          {/* Платежи */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">💳 Платежи</legend>
            {payments.length === 0 && <p>Нет платежей</p>}
            {payments.map((pay) => (
              <div key={pay.id} className="item-block" style={{ border: '1px solid var(--border-color)', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <strong>{pay.payment_type === 'client' ? 'Оплата клиента' : 'Выплата монтажнику'}</strong><br />
                    Сумма: {pay.amount} ₽, дата: {pay.payment_date}
                    {pay.installer_id && `, монтажник: ${installers.find(i => i.id === pay.installer_id)?.full_name || ''}`}
                    {pay.description && ` (${pay.description})`}
                  </div>
                  <button type="button" onClick={() => handleDeletePayment(pay.id)} className="item-remove-btn">✕</button>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setShowAddPayment(!showAddPayment)} className="crm-form__button crm-form__button--secondary">
              {showAddPayment ? 'Отмена' : '➕ Добавить платёж'}
            </button>
            {showAddPayment && (
              <div className="add-form" style={{ marginTop: '15px', padding: '15px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <h4>Новый платёж</h4>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label>Тип *</label>
                    <select value={newPayment.payment_type} onChange={(e) => setNewPayment({...newPayment, payment_type: e.target.value})} className="crm-form__input">
                      <option value="client">От клиента</option>
                      <option value="installer">Монтажнику</option>
                    </select>
                  </div>
                  <div className="crm-form__field">
                    <label>Сумма (₽) *</label>
                    <input type="number" min="0" step="0.01" value={newPayment.amount} onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})} className="crm-form__input" required />
                  </div>
                  <div className="crm-form__field">
                    <label>Дата</label>
                    <input type="date" value={newPayment.payment_date} onChange={(e) => setNewPayment({...newPayment, payment_date: e.target.value})} className="crm-form__input" />
                  </div>
                  {newPayment.payment_type === 'installer' && (
                    <div className="crm-form__field">
                      <label>Монтажник</label>
                      <select value={newPayment.installer_id} onChange={(e) => setNewPayment({...newPayment, installer_id: e.target.value})} className="crm-form__input">
                        <option value="">-- Не выбран --</option>
                        {installers.map(i => <option key={i.id} value={i.id}>{i.full_name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="crm-form__field crm-form__field--full">
                    <label>Описание</label>
                    <input type="text" value={newPayment.description} onChange={(e) => setNewPayment({...newPayment, description: e.target.value})} className="crm-form__input" />
                  </div>
                </div>
                <button type="button" onClick={handleAddPayment} className="crm-form__button crm-form__button--submit" style={{ marginTop: '10px' }}>Добавить</button>
              </div>
            )}
          </fieldset>

          {/* Кнопки действий */}
          <div className="crm-form__actions">
            <button type="submit" className="crm-form__button crm-form__button--submit" disabled={saving}>
              {saving ? "💾 Сохранение..." : "💾 Сохранить изменения заказа"}
            </button>
            <button type="button" className="crm-form__button crm-form__button--delete" onClick={handleDelete}>
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