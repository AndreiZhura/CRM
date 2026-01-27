const pageElement = document.getElementById('installer-page');
const INSTALLER_ID = pageElement.getAttribute('data-id');

async function loadInstallerProfile() {
    try {
        const response = await fetch(`/api/installers/${INSTALLER_ID}`);
        if (!response.ok) throw new Error("Мастер не найден");
        
        const data = await response.json();
        const info = data.info;
        const orders = data.orders;

        // Заполняем данные карточки
        document.getElementById('view_fio').textContent = info.fio;
        document.getElementById('view_nickname').textContent = info.nickname ? `@${info.nickname}` : '';
        document.getElementById('view_phone').textContent = info.phone || 'Не указан';
        document.getElementById('view_spec').textContent = info.specialization || 'Монтаж';
        document.getElementById('view_price').textContent = info.base_price;
        document.getElementById('avatar_letter').textContent = info.fio.charAt(0);
        
        const debtStatus = document.getElementById('view_debt_status');
        debtStatus.textContent = info.is_debtor ? "Есть задолженность" : "Долгов нет";
        debtStatus.style.color = info.is_debtor ? "#ef4444" : "#10b981";

        // Заполняем таблицу заказов
        const tableBody = document.getElementById('masterOrdersTable');
        if (orders.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Заказов пока нет</td></tr>';
        } else {
            tableBody.innerHTML = orders.map(order => `
                <tr class="orders-table__row">
                    <td>#${order.id}</td>
                    <td><strong>${order.client_name}</strong></td>
                    <td>${order.address || '—'}</td>
                    <td><span class="status-badge">${order.status}</span></td>
                    <td><a href="/order_page/${order.id}" class="btn-link">Открыть</a></td>
                </tr>
            `).join('');
        }

    } catch (error) {
        console.error("Ошибка:", error);
        alert("Не удалось загрузить профиль мастера");
    }
}

document.addEventListener('DOMContentLoaded', loadInstallerProfile);