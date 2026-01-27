async function loadInstallerProfile() {
    // 1. Берем ID из твоего нового тега <main id="installer-page" data-id="{{ id }}">
    const pageElement = document.getElementById('installer-page');
    if (!pageElement) return;
    
    const INSTALLER_ID = pageElement.getAttribute('data-id');

    try {
        const response = await fetch(`/api/installers/${INSTALLER_ID}`);
        if (!response.ok) throw new Error("Мастер не найден");
        
        const data = await response.json();
        const info = data.info;   // Данные из таблицы installers
        const orders = data.orders; // Данные из JOIN с заказами и клиентами

        // 2. Заполняем карточку мастера
        document.getElementById('view_fio').textContent = info.fio;
        document.getElementById('view_nickname').textContent = info.nickname ? `@${info.nickname}` : '';
        document.getElementById('view_phone').textContent = info.phone || 'Не указан';
        document.getElementById('view_spec').textContent = info.specialization || 'Монтаж';
        document.getElementById('view_price').textContent = info.base_price || 0;
        document.getElementById('avatar_letter').textContent = info.fio.charAt(0);
        
        const ratingElem = document.getElementById('view_rating');
        if (ratingElem) ratingElem.textContent = `⭐ ${info.rating || 10}`;

        const debtStatus = document.getElementById('view_debt_status');
        debtStatus.textContent = info.is_debtor ? "Есть долг" : "Оплачено";
        debtStatus.style.color = info.is_debtor ? "#ef4444" : "#10b981";

        // 3. Заполняем таблицу его заказов
        const tableBody = document.getElementById('masterOrdersTable');
        if (!orders || orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">У этого мастера пока нет заказов</td></tr>';
        } else {
            tableBody.innerHTML = orders.map(order => `
                <tr class="orders-table__row">
                    <td>#${order.id}</td>
                    <td><strong>${order.client_name}</strong></td>
                    <td>${order.address || '—'}</td>
                    <td><span class="status-badge">${order.status}</span></td>
                    <td><a href="/order_page/${order.id}" class="btn-link" style="color: #2563eb; font-weight: bold;">Открыть</a></td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error("Ошибка загрузки профиля:", error);
        document.getElementById('view_fio').textContent = "Ошибка: мастер не найден";
    }
}
// Функция удаления
async function deleteInstaller() {
    if (!confirm("Удалить мастера? Все его заказы станут 'без мастера'.")) return;
    
    const id = document.getElementById('installer-page').getAttribute('data-id');
    const res = await fetch(`/api/installers/${id}`, { method: 'DELETE' });
    if (res.ok) {
        window.location.href = '/installers'; // Возвращаемся к списку
    }
}

// Функция сохранения (редактирования)
async function saveInstallerChanges() {
    const id = document.getElementById('installer-page').getAttribute('data-id');
    const data = {
        fio: document.getElementById('edit_fio').value,
        phone: document.getElementById('edit_phone').value,
        // ... остальные поля
    };

    const res = await fetch(`/api/installers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) alert("Сохранено!");
}
// Запускаем один раз при загрузке страницы
document.addEventListener('DOMContentLoaded', loadInstallerProfile);