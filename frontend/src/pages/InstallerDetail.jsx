import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PhoneField from "../components/PhoneField";
import "../styles/installer_profile.css";
import "../styles/installer_detail.css";
import "../styles/phone.css";

const InstallerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [installer, setInstaller] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active"); // 'active' или 'history'

  // Загрузка данных монтажника и всех заказов
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [installerData, ordersData] = await Promise.all([
          api.getInstaller(id),
          api.getOrders(), // получаем все заказы
        ]);
        setInstaller(installerData);
        setOrders(ordersData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Обработка изменений полей формы
  const handleInputChange = (e) => {
    const { id, value, type, checked } = e.target;
    setInstaller((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));
  };

  // Обработка изменения телефона через PhoneField
  const handlePhoneChange = (value) => {
    setInstaller((prev) => ({ ...prev, phone: value }));
  };

  // Сохранение изменений монтажника
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Преобразуем specialization из строки в массив (если поле ввода)
      const specializationArray = installer.specialization
        ? installer.specialization
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s)
        : [];
      const dataToSend = {
        ...installer,
        specialization: specializationArray,
      };
      await api.updateInstaller(id, dataToSend);
      alert("Данные сохранены");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Удаление монтажника
  const handleDelete = async () => {
    if (window.confirm("Вы уверены, что хотите удалить мастера?")) {
      try {
        await api.deleteInstaller(id);
        navigate("/installers");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Фильтрация заказов по монтажнику и статусу
  const installerOrders = orders.filter(
    (order) => order.installer_id === installer?.id,
  );
  const activeOrders = installerOrders.filter(
    (order) => order.status !== "Выполнен" && order.status !== "Отменен",
  );
  const historyOrders = installerOrders.filter(
    (order) => order.status === "Выполнен" || order.status === "Отменен",
  );

  const displayedOrders = activeTab === "active" ? activeOrders : historyOrders;

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">Ошибка: {error}</div>;
  if (!installer) return <div className="not-found">Монтажник не найден</div>;

  return (
    <div className="page">
      <Header />
      <main className="content" id="installer-page" data-id={id}>
        <div className="installer-container">
          <header className="installer-top-bar">
            <h1>Профиль мастера</h1>
            <div className="installer-top-bar__actions">
              <button
                className="btn-save"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Сохранение..." : "💾 Сохранить всё"}
              </button>
            </div>
          </header>

          {/* Личные данные */}
          {/* Личные данные */}
          <section className="installer-card">
            <h3 className="installer-card__title">👤 Личные данные</h3>
            <div className="installer-form-linear">
              <div className="field-group">
                <label>Полное ФИО (можно редактировать)</label>
                <input
                  type="text"
                  id="full_name"
                  className="input-large"
                  value={installer.full_name || ""}
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
                    value={installer.nickname || ""}
                    onChange={handleInputChange}
                    placeholder="Напр: Снежный Барс"
                  />
                </div>

                <PhoneField
                  id="phone"
                  name="phone"
                  value={installer.phone || ""}
                  onChange={handlePhoneChange}
                  label="Телефон"
                />
              </div>
              {/* Резервный телефон слева с пустой колонкой справа */}
              <div className="field-row">
                <PhoneField
                  id="backup_phone"
                  name="backup_phone"
                  value={installer.backup_phone || ""}
                  onChange={(value) =>
                    setInstaller((prev) => ({ ...prev, backup_phone: value }))
                  }
                  label="Резервный телефон (необязательно)"
                />
                <div className="field-group"></div>{" "}
                {/* пустая колонка для отступа справа */}
              </div>
            </div>
          </section>

          {/* Финансовое состояние */}
          <section className="installer-card card-debt">
            <h3 className="installer-card__title">💰 Финансовое состояние</h3>
            <div className="installer-form-linear">
              <div
                className="field-row"
                style={{ alignItems: "center", gap: "20px" }}
              >
                <div
                  className="field-group-checkbox"
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <input
                    type="checkbox"
                    id="is_debtor"
                    style={{ width: "22px", height: "22px", cursor: "pointer" }}
                    checked={installer.is_debtor || false}
                    onChange={handleInputChange}
                  />
                  <label
                    htmlFor="is_debtor"
                    style={{
                      fontWeight: "bold",
                      color: "#e11d48",
                      cursor: "pointer",
                    }}
                  >
                    Мастер в долгу
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Профессиональные данные */}
          <section className="installer-card">
            <h3 className="installer-card__title">
              🛠 Профессиональные данные
            </h3>
            <div className="installer-form-linear">
              <div className="field-row">
                <div className="field-group">
                  <label>Специализация (через запятую)</label>
                  <input
                    type="text"
                    id="specialization"
                    value={installer.specialization?.join(", ") || ""}
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
                  value={installer.comments || ""}
                  onChange={handleInputChange}
                  placeholder="Опишите опыт..."
                ></textarea>
              </div>
            </div>
          </section>

          {/* Заказы мастера */}
          <section className="installer-card">
            <div className="card-header-flex">
              <h3 className="installer-card__title">🚀 Заказы мастера</h3>
              <div className="status-filter">
                <button
                  className={`filter-btn ${activeTab === "active" ? "active" : ""}`}
                  onClick={() => setActiveTab("active")}
                >
                  В работе ({activeOrders.length})
                </button>
                <button
                  className={`filter-btn ${activeTab === "history" ? "active" : ""}`}
                  onClick={() => setActiveTab("history")}
                >
                  История ({historyOrders.length})
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
                <tbody>
                  {displayedOrders.length > 0 ? (
                    displayedOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.client?.full_name || "—"}</td>
                        <td>{order.address_text || "—"}</td>
                        <td>{order.status}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center" }}>
                        Нет заказов
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Опасная зона удаления */}
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
