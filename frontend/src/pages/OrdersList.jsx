import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Select from "react-select";

import api from "../services/api";
import Header from "../components/Header";
import Loader from "../components/Loader";
import Footer from "../components/Footer";
import "../styles/orders-list.css";

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Фильтры
  const [filters, setFilters] = useState({
    client: "",
    address: "",
    status: "",
    serviceDate: "", // YYYY-MM-DD
    deliveryDate: "", // YYYY-MM-DD
  });

  // Фильтр по гарантии
  const [filterWarranty, setFilterWarranty] = useState(false);

  // Сортировка
  const [sortBy, setSortBy] = useState("createdAtDesc");

  const statusOptions = [
    { value: "", label: "Все статусы" },
    { value: "Новый", label: "Новый" },
    { value: "Ждет установщика", label: "Ждет установщика" },
    { value: "В работе", label: "В работе" },
    { value: "Выполнен", label: "Выполнен" },
    { value: "Отменен", label: "Отменен" },
  ];

  const sortOptions = [
    { value: "createdAtDesc", label: "По дате создания (сначала новые)" },
    { value: "createdAtAsc", label: "По дате создания (сначала старые)" },
    { value: "serviceDateDesc", label: "По дате обслуживания (сначала новые)" },
    { value: "serviceDateAsc", label: "По дате обслуживания (сначала старые)" },
    { value: "deliveryDateDesc", label: "По дате доставки (сначала новые)" },
    { value: "deliveryDateAsc", label: "По дате доставки (сначала старые)" },
  ];

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
      "&:active": { backgroundColor: "var(--accent-hover)" },
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
      "&:hover": { color: "var(--text-primary)" },
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: "var(--border-color)",
    }),
  };

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

  // Вспомогательная функция для получения даты из ISO строки (YYYY-MM-DD)
  const getDatePart = (isoString) =>
    isoString ? isoString.slice(0, 10) : null;

  // Фильтрация и сортировка
  useEffect(() => {
    let filtered = orders.filter((order) => {
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

      const serviceMatch =
        !filters.serviceDate ||
        (order.service_datetime &&
          getDatePart(order.service_datetime) === filters.serviceDate);

      const deliveryMatch =
        !filters.deliveryDate ||
        (order.delivery_datetime &&
          getDatePart(order.delivery_datetime) === filters.deliveryDate);

      const warrantyMatch = !filterWarranty || order.has_warranty === true;

      return (
        clientMatch &&
        addressMatch &&
        statusMatch &&
        serviceMatch &&
        deliveryMatch &&
        warrantyMatch
      );
    });

    // Сортировка
    filtered.sort((a, b) => {
      const getValue = (order, field) => {
        if (field === "createdAt")
          return order.created_at ? new Date(order.created_at) : null;
        if (field === "serviceDate")
          return order.service_datetime
            ? new Date(order.service_datetime)
            : null;
        if (field === "deliveryDate")
          return order.delivery_datetime
            ? new Date(order.delivery_datetime)
            : null;
        return null;
      };

      const [field, direction] = sortBy
        .match(/(createdAt|serviceDate|deliveryDate)(Asc|Desc)/)
        .slice(1);
      const valA = getValue(a, field);
      const valB = getValue(b, field);

      if (valA === null && valB === null) return 0;
      if (valA === null) return 1; // null в конец
      if (valB === null) return -1;

      if (direction === "Asc") return valA - valB;
      else return valB - valA;
    });

    setFilteredOrders(filtered);
  }, [filters, filterWarranty, sortBy, orders]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSortChange = (selectedOption) => {
    setSortBy(selectedOption.value);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Новый":
      case "Новая заявка":
        return "status-novaya-zayavka";
      case "Ждет установщика":
        return "status-zhdet-ustanovshchika";
      case "В работе":
        return "status-v-rabote";
      case "Выполнен":
      case "Завершено":
        return "status-zaversheno";
      case "Отменен":
        return "status-otmenen";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Header />
        <main className="page__main">
          <Loader />
        </main>
        <Footer />
      </div>
    );
  }

  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <section className="orders-list">
          <div className="orders-list__container">
            <h2 className="orders-list__title">Журнал заказов</h2>

            <div className="orders-filter">
              {/* Клиент */}
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

              {/* Адрес */}
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

              {/* Статус */}
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

              {/* Дата обслуживания */}
              <div className="filter-group">
                <label htmlFor="serviceDate">Дата обслуживания</label>
                <input
                  type="date"
                  id="serviceDate"
                  name="serviceDate"
                  className="filter-input"
                  value={filters.serviceDate}
                  onChange={handleFilterChange}
                />
              </div>

              {/* Дата доставки */}
              <div className="filter-group">
                <label htmlFor="deliveryDate">Дата доставки</label>
                <input
                  type="date"
                  id="deliveryDate"
                  name="deliveryDate"
                  className="filter-input"
                  value={filters.deliveryDate}
                  onChange={handleFilterChange}
                />
              </div>

              {/* Сортировка */}
              <div className="filter-group">
                <label htmlFor="sortBy">Сортировать по</label>
                <Select
                  id="sortBy"
                  options={sortOptions}
                  value={sortOptions.find((opt) => opt.value === sortBy)}
                  onChange={handleSortChange}
                  styles={customSelectStyles}
                  isClearable={false}
                  placeholder="Выберите сортировку"
                  className="filter-select"
                  classNamePrefix="filter-select"
                />
              </div>
              {/* Только с гарантией */}
              <div
                className="filter-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginTop: "auto",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={filterWarranty}
                    onChange={(e) => setFilterWarranty(e.target.checked)}
                  />
                  <span>Только с проблемами по гарантии</span>
                </label>
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
                    <th className="orders-table__th">Сумма</th>
                    <th className="orders-table__th">Статус</th>
                    <th className="orders-table__th">Гарантия</th>
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
                      <td className="orders-table__td" data-label="Сумма">
                        {order.finance?.revenue
                          ? `${Number(order.finance.revenue).toLocaleString()} ₽`
                          : "—"}
                      </td>
                      <td className="orders-table__td" data-label="Статус">
                        <span
                          className={`status-badge ${getStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="orders-table__td" data-label="Гарантия">
                        {order.has_warranty ? (
                          <span
                            style={{ color: "#dc2626", fontWeight: "bold" }}
                            title="Есть открытые гарантийные случаи"
                          >
                            ⚠️
                          </span>
                        ) : (
                          <span
                            style={{ color: "#10b981", fontSize: "1.2rem" }}
                            title="Нет проблем по гарантии"
                          >
                            ✓
                          </span>
                        )}
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
