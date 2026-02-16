import React from 'react';

const Dashboard = () => {
  return (
    <div>
      <h1>Добро пожаловать в CRM</h1>
      <p>Здесь будет сводка по заказам, клиентам и монтажникам</p>
      <a href="/orders/new">Создать новый заказ</a>
    </div>
  );
};

export default Dashboard;