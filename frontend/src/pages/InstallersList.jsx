import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import Header from "../components/Header";
import "../styles/installers.css";
import Loader from "../components/Loader";
import Footer from "../components/Footer";

const InstallersList = () => {
  const [installers, setInstallers] = useState([]);
  const [filteredInstallers, setFilteredInstallers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchSpec, setSearchSpec] = useState("");
  const [filterDebt, setFilterDebt] = useState(false);

  useEffect(() => {
    const fetchInstallers = async () => {
      try {
        const data = await api.getInstallers();
        setInstallers(data);
        setFilteredInstallers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchInstallers();
  }, []);

  useEffect(() => {
    let filtered = installers;

    if (searchName) {
      filtered = filtered.filter((inst) =>
        inst.full_name?.toLowerCase().includes(searchName.toLowerCase()),
      );
    }

    if (searchSpec) {
      filtered = filtered.filter((inst) =>
        inst.specialization?.some((spec) =>
          spec.toLowerCase().includes(searchSpec.toLowerCase()),
        ),
      );
    }

    if (filterDebt) {
      filtered = filtered.filter((inst) => inst.is_debtor);
    }

    setFilteredInstallers(filtered);
  }, [searchName, searchSpec, filterDebt, installers]);

  const handleSearchName = (e) => setSearchName(e.target.value);
  const handleSearchSpec = (e) => setSearchSpec(e.target.value);
  const handleFilterDebt = (e) => setFilterDebt(e.target.checked);

  if (loading)
    return (
      <div className="page">
        <Header />
        <main className="content">
          <Loader />
        </main>
        <Footer />
      </div>
    );
  if (error) return <div className="error">Ошибка: {error}</div>;

  return (
    <div className="page">
      <Header />
      <main className="content">
        <div className="page-header">
          <h1>Список мастеров</h1>
          <Link to="/installers/new" className="btn-primary">
            <span>+</span> Добавить мастера
          </Link>
        </div>

        <div className="search-filters">
          <div className="search-group">
            <div className="input-wrapper">
              <input
                type="text"
                id="searchName"
                placeholder="Поиск по ФИО..."
                className="search-input"
                value={searchName}
                onChange={handleSearchName}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          <div className="search-group">
            <div className="input-wrapper">
              <input
                type="text"
                id="searchSpec"
                placeholder="Поиск по специализации..."
                className="search-input"
                value={searchSpec}
                onChange={handleSearchSpec}
              />
              <span className="search-icon">🔍</span>
            </div>
          </div>

          <div className="search-group checkbox-group">
            <input
              type="checkbox"
              id="filterDebt"
              className="custom-checkbox"
              checked={filterDebt}
              onChange={handleFilterDebt}
            />
            <label htmlFor="filterDebt">Только должники</label>
          </div>
        </div>

        <div className="table-responsive">
          {filteredInstallers.length === 0 ? (
            <div className="no-orders">📭 Мастеров пока нет</div>
          ) : (
            <table className="orders-table">
              <thead>
                <tr>
                  <th>ФИО / Ник</th>
                  <th>Телефон</th>
                  <th>Специализация</th>
                  <th>Рейтинг</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {filteredInstallers.map((inst) => (
                  <tr key={inst.id} className="orders-table__row">
                    <td className="orders-table__td" data-label="ФИО / Ник">
                      <div className="name-wrapper">
                        <Link to={`/installers/${inst.id}`}>
                          {inst.full_name}
                        </Link>
                        {inst.nickname && (
                          <span className="nickname-tag">{inst.nickname}</span>
                        )}
                      </div>
                    </td>
                    <td className="orders-table__td" data-label="Телефон">
                      {inst.phone}
                    </td>
                    <td className="orders-table__td" data-label="Специализация">
                      {inst.specialization?.join(", ")}
                    </td>
                    <td className="orders-table__td" data-label="Рейтинг">
                      {inst.rating}
                    </td>
                    <td className="orders-table__td" data-label="Статус">
                      {inst.is_debtor ? "Должник" : "Активен"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InstallersList;