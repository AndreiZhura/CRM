// 1. Главная функция загрузки
async function loadInstallerProfile() {
    const pageElement = document.getElementById('installer-page');
    if (!pageElement) return;
    
    const INSTALLER_ID = pageElement.getAttribute('data-id');

    try {
        const response = await fetch(`/api/installers/${INSTALLER_ID}`);
        if (!response.ok) throw new Error("Мастер не найден");
        
        const data = await response.json();
        const info = data.info;   

        // ЗАПОЛНЯЕМ ДОСЬЕ (теперь в input-поля)
        // Мы используем .value, чтобы текст можно было редактировать
        if (document.getElementById('edit_fio')) {
            document.getElementById('edit_fio').value = info.fio || '';
        }
        if (document.getElementById('edit_phone')) {
            document.getElementById('edit_phone').value = info.phone || '';
        }
        if (document.getElementById('edit_spec')) {
            document.getElementById('edit_spec').value = info.specialization || 'Монтаж';
        }
        if (document.getElementById('edit_price')) {
            document.getElementById('edit_price').value = info.base_price || 0;
        }

        // Обновляем заголовок и аватарку в сайдбаре
        document.getElementById('top_fio').textContent = info.fio;
        document.getElementById('avatar_letter').textContent = info.fio ? info.fio.charAt(0) : '?';

        // Заполняем таблицу заказов
        renderOrdersTable(data.orders);

    } catch (error) {
        console.error("Ошибка:", error);
    }
}

// 2. Функция сохранения (та самая кнопка)
async function saveProfile() {
    const id = document.getElementById('installer-page').getAttribute('data-id');
    
    // Собираем свежие данные прямо из инпутов
    const updatedData = {
        fio: document.getElementById('edit_fio').value,
        phone: document.getElementById('edit_phone').value,
        specialization: document.getElementById('edit_spec').value,
        base_price: parseFloat(document.getElementById('edit_price').value) || 0
    };

    const response = await fetch(`/api/installers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });

    if (response.ok) {
        alert("✅ Изменения сохранены!");
        loadInstallerProfile(); // Обновляем данные на странице
    } else {
        alert("❌ Ошибка при сохранении");
    }
}

// Помогалка для таблицы
function renderOrdersTable(orders) {
    const tableBody = document.getElementById('masterOrdersTable');
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">Нет активных заказов</td></tr>';
        return;
    }
    tableBody.innerHTML = orders.map(order => `
        <tr>
            <td>#${order.id}</td>
            <td>${order.client_name || '—'}</td>
            <td>${order.address || '—'}</td>
            <td><span class="status-pill">${order.status}</span></td>
        </tr>
    `).join('');
}

document.addEventListener('DOMContentLoaded', loadInstallerProfile);