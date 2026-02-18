import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";

import api from "../services/api";
import Header from "../components/Header";
import Loader from "../components/Loader"; // импорт компонента-лоадера
import Footer from "../components/Footer";
import "../styles/orders-list.css";

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    client: "",
    address: "",
    status: "",
  });

  const statusOptions = [
    { value: "", label: "Все статусы" },
    { value: "Новый", label: "Новый" },
    { value: "Ждет установщика", label: "Ждет установщика" },
    { value: "Выполнен", label: "Выполнен" },
    { value: "Завершено", label: "Завершено" },
  ];
  const customSelectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: "var(--input-bg)",
      borderColor: state.isFocused
        ? "var(--accent-color)"
        : "var(--border-color)",
      boxShadow: state.isFocused ? "0 0 0 3px rgba(59, 130, 246, 0.1)" : "none",
      "&:hover": {
        borderColor: "var(--accent-color)",
      },
      padding: "2px",
      borderRadius: "8px",
      minHeight: "42px",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "var(--input-bg)",
      borderRadius: "8px",
      boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
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
      "&:active": {
        backgroundColor: "var(--accent-hover)",
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "var(--text-primary)",
    }),
    input: (provided) => ({
      ...provided,
      color: "var(--text-primary)",
    }),
    placeholder: (provided) => ({
      ...provided,
      color: "var(--text-secondary)",
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "var(--text-secondary)",
      "&:hover": {
        color: "var(--text-primary)",
      },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "var(--border-color)",
    }),
  };

  // ... в JSX, вместо <select>:
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.getOrders();
        setOrders(data);
        setFilteredOrders(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    const filtered = orders.filter((order) => {
      const clientMatch =
        order.client?.full_name
          ?.toLowerCase()
          .includes(filters.client.toLowerCase()) ?? true;
      const addressMatch =
        order.address_text
          ?.toLowerCase()
          .includes(filters.address.toLowerCase()) ?? true;
      const statusMatch =
        filters.status === "" || order.status === filters.status;
      return clientMatch && addressMatch && statusMatch;
    });
    setFilteredOrders(filtered);
  }, [filters, orders]);

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Новый":
      case "Новая заявка":
        return "status-novaya-zayavka";
      case "Ждет установщика":
        return "status-zhdet-ustanovshchika";
      case "Завершено":
      case "Выполнен":
        return "status-zaversheno";
      default:
        return "";
    }
  };

  // Если идёт загрузка – показываем лоадер с шапкой и подвалом
  if (loading) {
    return (
      <div className="page">
        <Header />
        <main className="page__main">
          <Loader /> {/* красивый спиннер вместо обычного текста */}
        </main>
        <Footer />
      </div>
    );
  }

  // Если ошибка – показываем сообщение
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <section className="orders-list">
          <div className="orders-list__container">
            <h2 className="orders-list__title">Журнал заказов</h2>

            <div className="orders-filter">
              <div className="filter-group">
                <label htmlFor="filterClient">Клиент</label>
                <input
                  type="text"
                  id="filterClient"
                  name="client"
                  className="filter-input"
                  placeholder="Поиск по ФИО..."
                  value={filters.client}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="filterAddress">Адрес</label>
                <input
                  type="text"
                  id="filterAddress"
                  name="address"
                  className="filter-input"
                  placeholder="Поиск по адресу..."
                  value={filters.address}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="filterStatus">Статус</label>
                <Select
                  id="filterStatus"
                  name="status"
                  options={statusOptions}
                  value={statusOptions.find(
                    (option) => option.value === filters.status,
                  )}
                  onChange={(selected) =>
                    setFilters({
                      ...filters,
                      status: selected ? selected.value : "",
                    })
                  }
                  styles={customSelectStyles}
                  isClearable
                  placeholder="Все статусы"
                  className="filter-select"
                  classNamePrefix="filter-select"
                />
              </div>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="no-orders">📭 Заказов на данный момент нет</div>
            ) : (
              <table className="orders-table">
                <thead className="orders-table__head">
                  <tr className="orders-table__row">
                    <th className="orders-table__th">Клиент</th>
                    <th className="orders-table__th">Адрес</th>
                    <th className="orders-table__th">Модель</th>
                    <th className="orders-table__th">Цена</th>
                    <th className="orders-table__th">Статус</th>
                  </tr>
                </thead>
                <tbody className="orders-table__body">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="orders-table__row">
                      <td className="orders-table__td" data-label="Клиент">
                        <Link to={`/orders/${order.id}`}>
                          {order.client?.full_name || "—"}
                        </Link>
                      </td>
                      <td className="orders-table__td" data-label="Адрес">
                        {order.address_text || "—"}
                      </td>
                      <td className="orders-table__td" data-label="Модель">
                        {order.service_type || "—"}
                      </td>
                      <td className="orders-table__td" data-label="Цена">
                        {order.finance?.sale_price_client
                          ? `${order.finance.sale_price_client} ₽`
                          : "—"}
                      </td>
                      <td className="orders-table__td" data-label="Статус">
                        <span
                          className={`status-badge ${getStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default OrdersList;
