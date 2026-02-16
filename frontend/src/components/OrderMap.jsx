import React from 'react';
import { Map, Placemark } from '@pbe/react-yandex-maps';

const OrderMap = ({ orders }) => {
  // Фильтруем заказы, у которых есть координаты
  const points = orders.filter(order => order.lat && order.lon);

  if (points.length === 0) {
    return <div>Нет заказов с координатами для отображения на карте</div>;
  }

  return (
    <Map
      defaultState={{
        center: [55.751244, 37.618423], // Москва, Кремль
        zoom: 9,
      }}
      width="100%"
      height="400px"
    >
      {points.map(order => (
        <Placemark
          key={order.id}
          geometry={[order.lat, order.lon]}
          properties={{
            balloonContent: `
              <strong>${order.service_type}</strong><br/>
              ${order.address_text}<br/>
              Статус: ${order.status}
            `,
          }}
        />
      ))}
    </Map>
  );
};

export default OrderMap;