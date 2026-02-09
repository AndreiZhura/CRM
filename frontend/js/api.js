// 1. Обработчик формы создания заказа
const orderForm = document.getElementById('orderForm');

if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Собираем ВСЕ данные по твоему списку для Олега
        const formData = {
            fio: document.getElementById('fio').value,
            phone: document.getElementById('phone').value,
            address: document.getElementById('address').value,
            
            // Даты (если пустые — отправляем null)
            service_date: document.getElementById('service_date')?.value || null,
            appointment_date: document.getElementById('appointment_date')?.value || null,
            delivery_date: document.getElementById('delivery_date')?.value || null,
            
            // Склад и продавец
            warehouse: document.getElementById('warehouse')?.value || "Основной",
            seller_name: "Олег", 
            
            // Информация о заказе
            ac_model_interest: document.getElementById('model')?.value || "",
            promises: document.getElementById('promises')?.value || "",
            
            // Финансы (превращаем в числа)
            buy_price: parseFloat(document.getElementById('buy_price')?.value) || 0,
            sell_price_ac: parseFloat(document.getElementById('sell_price_ac')?.value) || 0,
            price_install: parseFloat(document.getElementById('price_install')?.value) || 0,
            my_commission: parseFloat(document.getElementById('my_commission')?.value) || 0,
            
            // Чекбокс и статусы
            is_money_returned: document.getElementById('is_money_returned')?.checked || false,
            status: document.getElementById('status')?.value || "Новая заявка",
            installer_opinion: document.getElementById('installer_opinion')?.value || "",
            
            // Если есть выбор монтажника (пока заложим null или ID)
            installer_id: null 
        };

        try {
            const response = await fetch('/add_order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Карточка клиента сохранена! ❄️');
                e.target.reset();
            } else {
                const errorData = await response.json();
                console.error('Ошибка сервера:', errorData);
                alert('Ошибка: ' + (errorData.detail || 'не удалось сохранить'));
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
        }
    });
}

// 2. Функция загрузки Журнала (для телефона Олега)
async function loadOrders() {
    const tableBody = document.getElementById('ordersTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/orders');
        const orders = await response.json();
        
        tableBody.innerHTML = orders.map(order => {
            const moneyStatus = order.is_money_returned ? '✅' : '❌';
            
            // СИСТЕМНОЕ УЛУЧШЕНИЕ: Добавляем onclick на всю строку
            return `
                <tr class="orders-table__row" 
                    onclick="window.location='/order_page/${order.id}'" 
                    style="cursor: pointer;">
                    <td class="orders-table__td">
                        <strong>${order.fio}</strong><br>
                        <small>${order.phone}</small>
                    </td>
                    <td class="orders-table__td">${order.address}</td>
                    <td class="orders-table__td">
                        ${order.comments || '—'}<br>
                        <small>📅 Установка: ${order.appointment_date || 'не назначена'}</small>
                    </td>
                    <td class="orders-table__td">
                        <strong>${order.sell_price_ac} ₽</strong><br>
                        <small>Возврат: ${moneyStatus}</small>
                    </td>
                    <td class="orders-table__td">
                        <span class="status-badge status-${order.status.replace(/\s+/g, '-').toLowerCase()}">
                            ${order.status}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Ошибка журнала:', error);
    }
}

loadOrders();