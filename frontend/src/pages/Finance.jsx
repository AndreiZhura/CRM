import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Loader from '../components/Loader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/finance.css';

const Finance = () => {
  const [summary, setSummary] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [summaryRes, monthlyRes] = await Promise.all([
          api.getFinanceSummary(),
          api.getMonthlyFinance()
        ]);
        console.log('Summary:', summaryRes);
        console.log('Monthly:', monthlyRes);
        setSummary(summaryRes);
        setMonthlyData(monthlyRes);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="page">
      <Header />
      <main className="page__main">
        <Loader />
      </main>
      <Footer />
    </div>
  );

  if (error) return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="error">Ошибка: {error}</div>
      </main>
      <Footer />
    </div>
  );

  if (!summary) return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="error">Нет данных</div>
      </main>
      <Footer />
    </div>
  );

  const chartData = monthlyData.map(item => ({
    name: `${item.month.toString().padStart(2, '0')}/${item.year}`,
    profit: item.profit
  }));

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="finance-container">
          <h1 className="finance-title">Финансовая сводка</h1>

          <div className="summary-cards">
            <div className="summary-card">
              <h3>Общая прибыль</h3>
              <p className="summary-value">{summary.total_profit.toLocaleString()} ₽</p>
            </div>
            <div className="summary-card">
              <h3>Выплачено монтажникам</h3>
              <p className="summary-value">{summary.total_installer_pay.toLocaleString()} ₽</p>
            </div>
            <div className="summary-card">
              <h3>Всего заказов</h3>
              <p className="summary-value">{summary.total_orders}</p>
            </div>
            <div className="summary-card">
              <h3>Средняя прибыль</h3>
              <p className="summary-value">{summary.avg_profit.toLocaleString()} ₽</p>
            </div>
          </div>

          <div className="chart-container">
            <h2>Прибыль по месяцам</h2>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="profit" fill="var(--accent-color)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="no-data">Нет данных для графика</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Finance;