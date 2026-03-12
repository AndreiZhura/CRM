import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import api from "../services/api";
import Header from "../components/Header";
import Loader from "../components/Loader";
import AddressSuggest from "../components/AddressSuggest";
import PhoneField from "../components/PhoneField";
import Footer from "../components/Footer";
import "../styles/order-form.css";

const NewOrder = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fio: "",
    phone: "",
    backup_phone: "",
    orderAddress: "",
    service_datetime: "",
    delivery_datetime: "",
    appointment_date: "",
    warehouse: "Основной",
    status: "Новый",
    promises: "",
    installer_opinion: "",
  });

  const [clients, setClients] = useState([]);
  const [installers, setInstallers] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [isNewClient, setIsNewClient] = useState(true);
  const [loadingLists, setLoadingLists] = useState(true);

  // Изменено: quantity, purchase_price, sale_price, warranty_manufacturer теперь строки
  const [items, setItems] = useState([
    {
      item_type: "product",
      name: "",
      quantity: "1",
      purchase_price: "",
      sale_price: "",
      warranty_manufacturer: "",
      warranty_master: 0,
      sort_order: 0,
    },
  ]);

  const [orderInstallers, setOrderInstallers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        alert("Не удалось загрузить списки");
      } finally {
        setLoadingLists(false);
      }
    };
    fetchData();
  }, []);

  const clientOptions = clients.map((client) => ({
    value: client.id,
    label: `${client.full_name} (${client.phone}) — ${client.address}`,
  }));

  const handleClientSelect = (selectedOption) => {
    const clientId = selectedOption ? selectedOption.value : "";
    setSelectedClientId(clientId);
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        setFormData((prev) => ({ ...prev, orderAddress: client.address }));
      }
    }
  };

  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "var(--input-bg)",
      borderColor: state.isFocused
        ? "var(--accent-color)"
        : "var(--border-color)",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
      "&:hover": { borderColor: "var(--accent-color)" },
      padding: "2px",
      borderRadius: "8px",
      minHeight: "42px",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "var(--input-bg)",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
      zIndex: 1000,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? "var(--accent-color)"
        : state.isFocused
          ? "var(--border-color)"
          : "var(--input-bg)",
      color: state.isSelected ? "white" : "var(--text-primary)",
      cursor: "pointer",
      padding: "10px 12px",
      whiteSpace: "normal",
      wordWrap: "break-word",
    }),
    singleValue: (provided) => ({ ...provided, color: "var(--text-primary)" }),
    input: (provided) => ({ ...provided, color: "var(--text-primary)" }),
    placeholder: (provided) => ({
      ...provided,
      color: "var(--text-secondary)",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "var(--text-secondary)",
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "var(--border-color)",
    }),
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOrderAddressChange = (e) => {
    setFormData((prev) => ({ ...prev, orderAddress: e.target.value }));
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        item_type: "product",
        name: "",
        quantity: "1",
        purchase_price: "",
        sale_price: "",
        warranty_manufacturer: "",
        warranty_master: 0,
        sort_order: items.length,
      },
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addOrderInstaller = () => {
    setOrderInstallers([
      ...orderInstallers,
      {
        installer_id: "",
        role: "",
        base_payment: 0,
        is_primary: false,
      },
    ]);
  };

  const removeOrderInstaller = (index) => {
    setOrderInstallers(orderInstallers.filter((_, i) => i !== index));
  };

  const handleOrderInstallerChange = (index, field, value) => {
    const newInstallers = [...orderInstallers];
    newInstallers[index][field] = value;
    setOrderInstallers(newInstallers);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let clientId;
      if (isNewClient) {
        if (!formData.fio || !formData.phone) {
          throw new Error("Заполните ФИО и телефон нового клиента");
        }
        const clientData = {
          full_name: formData.fio,
          phone: formData.phone,
          backup_phone: formData.backup_phone || "",
          address: formData.orderAddress || "Адрес не указан",
          comments: formData.installer_opinion || "",
        };
        const client = await api.createClient(clientData);
        clientId = client.id;
      } else {
        if (!selectedClientId) {
          throw new Error("Выберите клиента из списка");
        }
        clientId = selectedClientId;
      }

      const service_datetime = formData.service_datetime
        ? new Date(formData.service_datetime).toISOString()
        : new Date().toISOString();
      const delivery_datetime = formData.delivery_datetime
        ? new Date(formData.delivery_datetime).toISOString()
        : null;

      const orderData = {
        client_id: clientId,
        service_datetime,
        delivery_datetime,
        status: formData.status,
        address_text: formData.orderAddress,
        warehouse: formData.warehouse,
        promise: formData.promises || "",
      };
      const order = await api.createOrder(orderData);

      for (const item of items) {
        if (!item.name) continue;
        // Преобразование пустых строк в числа
        await api.createOrderItem({
          order_id: order.id,
          item_type: item.item_type,
          name: item.name,
          quantity: item.quantity === "" ? 1 : parseInt(item.quantity) || 1,
          purchase_price: item.purchase_price === "" ? 0 : parseFloat(item.purchase_price) || 0,
          sale_price: item.sale_price === "" ? 0 : parseFloat(item.sale_price) || 0,
          warranty_manufacturer: item.warranty_manufacturer === "" ? 0 : parseInt(item.warranty_manufacturer) || 0,
          warranty_master: 0,
          sort_order: item.sort_order,
        });
      }

      for (const installer of orderInstallers) {
        if (!installer.installer_id || !installer.role) continue;
        await api.createOrderInstaller({
          order_id: order.id,
          installer_id: installer.installer_id,
          role: installer.role,
          base_payment: installer.base_payment,
          is_primary: installer.is_primary,
        });
      }

      alert("Заказ успешно создан!");
      navigate(`/orders/${order.id}`);
    } catch (err) {
      setError(err.message);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <form className="crm-form" onSubmit={handleSubmit}>
          <h1>Новый заказ</h1>
          {error && <div className="error">{error}</div>}
          {loadingLists && (
            <div className="loader-wrapper">
              <Loader size="small" text="Загрузка клиентов и монтажников..." />
            </div>
          )}

          {/* Карточка клиента */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👤 Карточка клиента</legend>
            <div className="crm-form__toggle">
              <label>
                <input
                  type="radio"
                  name="clientType"
                  checked={isNewClient}
                  onChange={() => setIsNewClient(true)}
                />
                Новый клиент
              </label>
              <label>
                <input
                  type="radio"
                  name="clientType"
                  checked={!isNewClient}
                  onChange={() => setIsNewClient(false)}
                />
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
                    onChange={(value) => setFormData({ ...formData, phone: value })}
                  />
                </div>
                <div className="crm-form__field">
                  <PhoneField
                    id="client_backup_phone"
                    name="backup_phone"
                    label="Резервный телефон"
                    value={formData.backup_phone}
                    onChange={(value) => setFormData({ ...formData, backup_phone: value })}
                  />
                </div>
              </div>
            ) : (
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Выберите клиента</label>
                <Select
                  name="clientId"
                  options={clientOptions}
                  value={
                    clientOptions.find(
                      (option) => option.value === selectedClientId,
                    ) || null
                  }
                  onChange={handleClientSelect}
                  placeholder="-- Выберите клиента --"
                  isClearable
                  styles={customSelectStyles}
                />
              </div>
            )}
          </fieldset>

          {/* Планирование и логистика */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📅 Планирование и логистика</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field">
                <label className="crm-form__label">Дата и время обслуживания</label>
                <input
                  type="datetime-local"
                  name="service_datetime"
                  value={formData.service_datetime}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Дата и время доставки</label>
                <input
                  type="datetime-local"
                  name="delivery_datetime"
                  value={formData.delivery_datetime}
                  onChange={handleChange}
                  className="crm-form__input"
                />
              </div>
              <div className="crm-form__field">
                <label className="crm-form__label">Дата установки (договор)</label>
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
            <div className="crm-form__field crm-form__field--full" style={{ marginTop: "20px" }}>
              <label className="crm-form__label">Адрес заказа</label>
              <AddressSuggest
                name="orderAddress"
                value={formData.orderAddress}
                onChange={handleOrderAddressChange}
                className="crm-form__input"
                placeholder="Начните вводить адрес..."
              />
            </div>
          </fieldset>

          {/* Позиции заказа */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📦 Позиции заказа</legend>
            {items.map((item, index) => (
              <div key={index} className="item-block">
                <div className="item-header">
                  <h4>Позиция #{index + 1}</h4>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="item-remove-btn"
                      title="Удалить позицию"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label className="crm-form__label">Тип</label>
                    <select
                      value={item.item_type}
                      onChange={(e) =>
                        handleItemChange(index, "item_type", e.target.value)
                      }
                      className="crm-form__input"
                    >
                      <option value="product">Товар</option>
                      <option value="service">Услуга</option>
                    </select>
                  </div>
                  <div className="crm-form__field">
                    <label className="crm-form__label">Название</label>
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(index, "name", e.target.value)
                      }
                      className="crm-form__input"
                    />
                  </div>
                  <div className="crm-form__field">
                    <label className="crm-form__label">Количество</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="crm-form__input"
                    />
                  </div>
                  {item.item_type === "product" && (
                    <div className="crm-form__field">
                      <label className="crm-form__label">Закупка (₽)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[0-9]*[.,]?[0-9]*"
                        value={item.purchase_price}
                        onChange={(e) =>
                          handleItemChange(index, "purchase_price", e.target.value)
                        }
                        className="crm-form__input"
                      />
                    </div>
                  )}
                  <div className="crm-form__field">
                    <label className="crm-form__label">Продажа (₽)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      value={item.sale_price}
                      onChange={(e) =>
                        handleItemChange(index, "sale_price", e.target.value)
                      }
                      className="crm-form__input"
                    />
                  </div>
                  <div className="crm-form__field">
                    <label className="crm-form__label">Гарантия (лет)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.warranty_manufacturer}
                      onChange={(e) =>
                        handleItemChange(index, "warranty_manufacturer", e.target.value)
                      }
                      className="crm-form__input"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="crm-form__button crm-form__button--secondary"
            >
              ➕ Добавить позицию
            </button>
          </fieldset>

          {/* Монтажники в заказе */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">👥 Монтажники</legend>
            {orderInstallers.length === 0 && <p>Нет назначенных монтажников</p>}
            {orderInstallers.map((oi, index) => (
              <div key={index} className="item-block">
                <div className="item-header">
                  <h4>Монтажник #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeOrderInstaller(index)}
                    className="item-remove-btn"
                    title="Удалить монтажника"
                  >
                    ✕
                  </button>
                </div>
                <div className="crm-form__grid">
                  <div className="crm-form__field">
                    <label className="crm-form__label">Монтажник *</label>
                    <select
                      value={oi.installer_id}
                      onChange={(e) =>
                        handleOrderInstallerChange(
                          index,
                          "installer_id",
                          e.target.value,
                        )
                      }
                      className="crm-form__input"
                    >
                      <option value="">-- Выберите монтажника --</option>
                      {installers.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.full_name} {inst.nickname && `(${inst.nickname})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="crm-form__field">
                    <label className="crm-form__label">Роль</label>
                    <input
                      type="text"
                      value={oi.role}
                      onChange={(e) =>
                        handleOrderInstallerChange(index, "role", e.target.value)
                      }
                      className="crm-form__input"
                      placeholder="ведущий, помощник, ..."
                    />
                  </div>
                  <div className="crm-form__field">
                    <label className="crm-form__label">Оплата (₽)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={oi.base_payment}
                      onChange={(e) =>
                        handleOrderInstallerChange(
                          index,
                          "base_payment",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="crm-form__input"
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                    />
                  </div>
                  <div
                    className="crm-form__field"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        checked={oi.is_primary}
                        onChange={(e) =>
                          handleOrderInstallerChange(
                            index,
                            "is_primary",
                            e.target.checked,
                          )
                        }
                      />{" "}
                      Основной
                    </label>
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addOrderInstaller}
              className="crm-form__button crm-form__button--secondary"
            >
              ➕ Назначить монтажника
            </button>
          </fieldset>

          {/* Статус и заметки */}
          <fieldset className="crm-form__section">
            <legend className="crm-form__legend">📝 Статус и заметки</legend>
            <div className="crm-form__grid">
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Статус заказа</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="crm-form__input"
                >
                  <option value="Новый">Новый</option>
                  <option value="Ждет установщика">Ждет установщика</option>
                  <option value="В работе">В работе</option>
                  <option value="Выполнен">Выполнен</option>
                </select>
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Обещания клиенту</label>
                <textarea
                  name="promises"
                  value={formData.promises}
                  onChange={handleChange}
                  className="crm-form__input"
                  rows="3"
                  placeholder="Уточнить время за час..."
                />
              </div>
              <div className="crm-form__field crm-form__field--full">
                <label className="crm-form__label">Заметки (мнение монтажника)</label>
                <textarea
                  name="installer_opinion"
                  value={formData.installer_opinion}
                  onChange={handleChange}
                  className="crm-form__input"
                  rows="3"
                  placeholder="Особенности доступа..."
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
              {loading ? "Сохранение..." : "🚀 Создать заказ"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default NewOrder;