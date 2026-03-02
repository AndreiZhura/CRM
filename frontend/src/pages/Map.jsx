import React, { useEffect, useState } from "react";
import { YMaps, Map, Placemark } from "@pbe/react-yandex-maps";
import api from "../services/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loader from "../components/Loader";
import "../styles/map.css";

const MapPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mapState, setMapState] = useState({
    center: [55.76, 37.64],
    zoom: 10,
  });

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.getOrders();
        // Фильтруем: только заказы с координатами, статус не "Выполнен" и не "Отменен"
        const ordersWithCoords = data.filter(
          (order) => order.lat && order.lon && order.status !== "Выполнен" && order.status !== "Отменен"
        );
        setOrders(ordersWithCoords);
        if (ordersWithCoords.length > 0) {
          setMapState({
            center: [ordersWithCoords[0].lat, ordersWithCoords[0].lon],
            zoom: 10,
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getMarkerColor = (status) => {
    switch (status) {
      case "Новый":
        return "blue";
      case "Ждет установщика":
        return "orange";
      case "В работе":
        return "green";
      case "Выполнен":
        return "gray";
      case "Отменен":
        return "red";
      default:
        return "darkblue";
    }
  };

  if (loading)
    return (
      <div className="page">
        <Header />
        <main className="page__main">
          <Loader />
        </main>
        <Footer />
      </div>
    );

  if (error)
    return (
      <div className="page">
        <Header />
        <main className="page__main">
          <div className="error">{error}</div>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="page">
      <Header />
      <main className="page__main">
        <div className="map-container">
          <h1 className="map-title">Карта заказов</h1>
          <YMaps>
            <Map state={mapState} width="100%" height="600px">
              {orders.map((order) => (
                <Placemark
                  key={order.id}
                  geometry={[order.lat, order.lon]}
                  onClick={() => window.open(`/orders/${order.id}`, '_self')}
                  properties={{
                    balloonContent: `
                      <strong>Заказ #${order.id}</strong><br/>
                      Клиент: ${order.client?.full_name || "—"}<br/>
                      Адрес: ${order.address_text || "—"}<br/>
                      Статус: ${order.status}
                    `,
                  }}
                  options={{
                    iconColor: getMarkerColor(order.status),
                  }}
                />
              ))}
            </Map>
          </YMaps>

          {/* Легенда цветов */}
          <div className="map-legend">
            <h3>Обозначение статусов на карте</h3>
            <ul className="legend-list">
              <li><span className="color-dot blue"></span> Новый</li>
              <li><span className="color-dot orange"></span> Ждет установщика</li>
              <li><span className="color-dot green"></span> В работе</li>
              <li><span className="color-dot gray"></span> Выполнен (скрыт)</li>
              <li><span className="color-dot red"></span> Отменен (скрыт)</li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MapPage;