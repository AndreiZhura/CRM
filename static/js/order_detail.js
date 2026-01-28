const orderId = window.location.pathname.split('/').pop();

// 1. ГЛАВНАЯ ФУНКЦИЯ ЗАГРУЗКИ ДАННЫХ
async function initPage() {
    try {
        // ПАРАЛЛЕЛЬНО загружаем список монтажников и данные заказа
        const [instResponse, orderResponse] = await Promise.all([
            fetch('/api/installers'),
            fetch(`/api/order/${orderId}`)
        ]);

        const installers = await instResponse.json();
        const data = await orderResponse.json();

        // 2. ЗАПОЛНЯЕМ СПИСОК МОНТАЖНИКОВ
        const installerSelect = document.getElementById('installer_id');
        if (installerSelect) {
            installerSelect.innerHTML = '<option value="">-- Выберите монтажника --</option>';
            installers.forEach(inst => {
                const option = document.createElement('option');
                option.value = inst.id;
                option.textContent = inst.fio;
                if (inst.id === data.installer_id) option.selected = true;
                installerSelect.appendChild(option);
            });
        }

        // 3. ЗАПОЛНЯЕМ ПОЛЯ КЛИЕНТА
        document.getElementById('fio').value = data.fio || '';
        document.getElementById('address').value = data.address || '';
        
        // --- ОБРАБОТКА ТЕЛЕФОНА (Теперь ВНУТРИ initPage) ---
        const phoneInput = document.getElementById('client_phone');
        if (phoneInput) {
            // Берем данные из поля phone (как они приходят из БД)
            phoneInput.value = data.phone || '';
            // Генерируем событие 'input', чтобы сработал phone.js (маска и кнопки)
            phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        // 4. ЛОГИСТИКА
        document.getElementById('service_date').value = data.service_date || '';
        document.getElementById('appointment_date').value = data.appointment_date || '';
        document.getElementById('delivery_date').value = data.delivery_date || '';
        document.getElementById('warehouse').value = data.warehouse || '';
        document.getElementById('seller_name').value = data.seller_name || 'Олег';

        // 5. ФИНАНСЫ
        document.getElementById('buy_price').value = data.buy_price || 0;
        document.getElementById('sell_price_ac').value = data.sell_price_ac || 0;
        document.getElementById('price_install').value = data.price_install || 0;
        document.getElementById('my_commission').value = data.my_commission || 0;
        document.getElementById('is_money_returned').checked = data.is_money_returned;

        // 6. СТАТУС И КОММЕНТАРИИ
        document.getElementById('status').value = data.status || 'Новая заявка';
        document.getElementById('promises').value = data.promises || '';
        document.getElementById('comments').value = data.comments || '';
        
        if (data.created_at) {
            document.getElementById('created_at').value = new Date(data.created_at).toLocaleString('ru-RU');
        }

    } catch (err) {
        console.error("Системная ошибка загрузки:", err);
        alert("Ошибка при получении данных с Mac Mini");
    }
}

// 2. ФУНКЦИЯ СОХРАНЕНИЯ
const form = document.getElementById('editOrderForm');
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Собираем данные. Важно: ID поля телефона теперь client_phone
    const updatedData = {
        fio: document.getElementById('fio').value,
        phone: document.getElementById('client_phone').value, // ИЗМЕНЕНО
        address: document.getElementById('address').value,
        service_date: document.getElementById('service_date').value || null,
        appointment_date: document.getElementById('appointment_date').value || null,
        delivery_date: document.getElementById('delivery_date').value || null,
        warehouse: document.getElementById('warehouse').value,
        seller_name: document.getElementById('seller_name').value,
        buy_price: parseFloat(document.getElementById('buy_price').value) || 0,
        sell_price_ac: parseFloat(document.getElementById('sell_price_ac').value) || 0,
        price_install: parseFloat(document.getElementById('price_install').value) || 0,
        my_commission: parseFloat(document.getElementById('my_commission').value) || 0,
        is_money_returned: document.getElementById('is_money_returned').checked,
        status: document.getElementById('status').value,
        promises: document.getElementById('promises').value,
        comments: document.getElementById('comments').value,
        installer_id: document.getElementById('installer_id').value ? parseInt(document.getElementById('installer_id').value) : null
    };

    try {
        const response = await fetch(`/api/order/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert('✅ Изменения успешно сохранены в БД!');
        } else {
            throw new Error('Ошибка сервера');
        }
    } catch (err) {
        alert('❌ Не удалось сохранить: ' + err.message);
    }
});

// 3. ФУНКЦИЯ УДАЛЕНИЯ
const deleteBtn = document.getElementById('deleteOrder');
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        if (confirm("⚠️ ВНИМАНИЕ! Вы точно хотите УДАЛИТЬ этот заказ?")) {
            try {
                const response = await fetch(`/api/order/${orderId}`, { method: 'DELETE' });
                if (response.ok) {
                    alert('Заказ успешно удален');
                    window.location.href = '/journal';
                }
            } catch (err) {
                alert('Ошибка при удалении');
            }
        }
    });
}

// ЗАПУСК СИСТЕМЫ
document.addEventListener('DOMContentLoaded', initPage);