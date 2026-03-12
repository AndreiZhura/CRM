import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PhoneField from "../components/PhoneField";
import "../styles/installer_add.css";
import "../styles/phone.css";

const AddInstaller = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: "",
    nickname: "",
    phone: "",
    backup_phone: "",
    specialization: "",
    rating: 10,
    base_price: 0,
    is_debtor: false,
    debt_amount: 0,
    comments: "",
    is_active: true,
    is_in_funnel: true,
    status: "active",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Для чекбокса – checked, для числовых полей – число (или 0, если пусто)
    const processedValue =
      type === "checkbox"
        ? checked
        : type === "number"
          ? value === ""
            ? 0
            : parseFloat(value)
          : value;
    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Преобразуем specialization из строки в массив
    const specializationArray = formData.specialization
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    const dataToSend = {
      ...formData,
      specialization: specializationArray,
    };

    try {
      await api.createInstaller(dataToSend);
      alert("Мастер успешно создан!");
      navigate("/installers");
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
        <div className="form-container">
          <h1>Добавить мастера</h1>
          {error && <div className="error">{error}</div>}
          <form onSubmit={handleSubmit}>
            {/* ФИО */}
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

            {/* Кличка */}
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

            {/* Основной телефон */}
            <div className="form-group">
              <PhoneField
                id="phone"
                name="phone"
                label="Телефон *"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                required={true}
              />
            </div>

            {/* Резервный телефон */}
            <div className="form-group">
              <PhoneField
                id="backup_phone"
                name="backup_phone"
                label="Резервный телефон"
                value={formData.backup_phone}
                onChange={(value) =>
                  setFormData({ ...formData, backup_phone: value })
                }
                required={false}
              />
            </div>

            {/* Специализация */}
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

            {/* Рейтинг */}
            <div className="form-group">
              <label htmlFor="rating">Рейтинг (1-10)</label>
              <input
                type="number"
                id="rating"
                name="rating"
                value={formData.rating}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.target.select()}
                min="1"
                max="10"
                step="0.1"
                placeholder="10.0"
              />
            </div>

            {/* Финансовый статус */}
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
              </div>
              {/* Поле суммы долга, появляется только если отмечен чекбокс */}
              {formData.is_debtor && (
                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label htmlFor="debt_amount">Сумма долга (₽)</label>
                  <input
                    type="number"
                    id="debt_amount"
                    name="debt_amount"
                    value={formData.debt_amount}
                    onChange={handleChange}
                    onFocus={(e) => e.target.select()}
                    onClick={(e) => e.target.select()}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                  />
                </div>
              )}
            </div>

            {/* Статус активности */}
            <div className="form-group">
              <label htmlFor="status">Статус активности</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="crm-form__input"
              >
                <option value="active">Активен</option>
                <option value="fired">Уволен</option>
                <option value="vacation">В отпуске</option>
                <option value="sick">На больничном</option>
              </select>
              <small className="helper-text">
                Определяет доступность мастера
              </small>
            </div>
            {/* Базовая ставка */}
            <div className="form-group">
              <label htmlFor="base_price">Цена за монтаж (базовая)</label>
              <input
                type="number"
                id="base_price"
                name="base_price"
                value={formData.base_price}
                onChange={handleChange}
                onFocus={(e) => e.target.select()}
                onClick={(e) => e.target.select()}
                step="0.01"
                min="0"
                placeholder="0.00"
              />
            </div>

            {/* Статус в воронке */}
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
              <small className="helper-text"></small>
            </div>

            {/* Заметки */}
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
              {loading ? "Сохранение..." : "💾 Сохранить досье"}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AddInstaller;
