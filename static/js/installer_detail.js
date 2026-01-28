// Глобальное хранилище для заказов
let allOrders = []; 

// 1. Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    loadInstallerData();
});

// 2. Основная функция загрузки данных (Добавлены поля долга)
async function loadInstallerData() {
    const pageElement = document.getElementById('installer-page');
    if (!pageElement) return;
    
    const installerId = pageElement.getAttribute('data-id');

    try {
        const response = await fetch(`/api/installers/${installerId}`);
        if (!response.ok) throw new Error("Мастер не найден");
        
        const data = await response.json();
        const info = data.info || data;   

        // ЗАПОЛНЯЕМ ИНПУТЫ (Линейная структура)
        const fields = {
            'fio': info.fio,
            'nickname': info.nickname,
            'phone': info.phone,
            'specialization': info.specialization,
            'base_price': info.base_price,
            'dossier': info.dossier,
            // СИСТЕМНЫЕ ПОЛЯ ДОЛГА:
            'is_debtor': info.is_debtor,
            'debt_amount': info.debt_amount
        };

        for (const [id, value] of Object.entries(fields)) {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'is_debtor') {
                    // Для чекбокса меняем свойство checked
                    el.checked = Boolean(value);
                } else {
                    el.value = value || (id === 'base_price' || id === 'debt_amount' ? 0 : '');
                }
            }
        }

        // ЗАПОЛНЯЕМ ТАБЛИЦУ ЗАКАЗОВ
        allOrders = data.orders || [];
        renderOrders('active'); 

    } catch (error) {
        console.error("Системная ошибка загрузки:", error);
    }
}

// 3. Функция рендеринга таблицы заказов
function renderOrders(filter) {
    const tbody = document.getElementById('installer_orders_body');
    const btnActive = document.getElementById('btn-active');
    const btnHistory = document.getElementById('btn-history');

    if (!tbody) return;
    tbody.innerHTML = ''; 

    if (btnActive) btnActive.classList.toggle('active', filter === 'active');
    if (btnHistory) btnHistory.classList.toggle('active', filter === 'history');

    const filtered = allOrders.filter(order => {
        const finalStatuses = ['Выполнен', 'Отменен', 'Завершено', 'Завершен'];
        const isFinished = finalStatuses.includes(order.status);
        return filter === 'active' ? !isFinished : isFinished;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#94a3b8;">
            ${filter === 'active' ? 'Нет текущих задач' : 'История пуста'}
        </td></tr>`;
        return;
    }

    filtered.forEach(order => {
        const statusClass = (order.status === 'Завершено' || order.status === 'Выполнен') 
                            ? 'status-success' 
                            : `status-${order.status || 'default'}`;

        const row = `
            <tr onclick="window.location='/order_page/${order.id}'" style="cursor:pointer">
                <td><strong>#${order.id}</strong></td>
                <td>${order.client_name || '—'}</td>
                <td>${order.address || '—'}</td>
                <td><span class="status-pill ${statusClass}">${order.status}</span></td>
            </tr>
        `;
        tbody.insertAdjacentHTML('beforeend', row);
    });
}

// 4. Сохранение данных (Добавлен сбор данных о долге)
async function saveInstaller() {
    const pageElement = document.getElementById('installer-page');
    if (!pageElement) return;
    const id = pageElement.getAttribute('data-id');
    
    // Вспомогательные функции для чтения из DOM
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    const isChecked = (id) => document.getElementById(id) ? document.getElementById(id).checked : false;

    const updatedData = {
        fio: val('fio'),
        nickname: val('nickname'),
        phone: val('phone'),
        specialization: val('specialization'),
        base_price: parseFloat(val('base_price')) || 0,
        dossier: val('dossier'),
        // ОТПРАВЛЯЕМ ФИНАНСЫ НА СЕРВЕР:
        is_debtor: isChecked('is_debtor'),
        debt_amount: parseFloat(val('debt_amount')) || 0,
        status: "В работе" 
    };

    console.log("System: Отправка обновленных данных...", updatedData);

    try {
        const response = await fetch(`/api/installers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            alert("✅ Изменения сохранены!");
            loadInstallerData(); // Перезагружаем данные для актуализации
        } else {
            const err = await response.json();
            alert("❌ Ошибка при сохранении: " + JSON.stringify(err.detail));
        }
    } catch (e) {
        alert("❌ Ошибка связи с сервером Mac mini");
    }
}

// 5. Удаление мастера
function confirmDelete() {
    const fioEl = document.getElementById('fio');
    const name = fioEl ? fioEl.value : "мастера";
    if (confirm(`⚠️ Вы уверены, что хотите удалить ${name}?`)) {
        deleteInstaller();
    }
}

async function deleteInstaller() {
    const id = document.getElementById('installer-page').getAttribute('data-id');
    try {
        const response = await fetch(`/api/installers/${id}`, { method: 'DELETE' });
        if (response.ok) {
            window.location.href = '/installers';
        } else {
            alert("Ошибка удаления");
        }
    } catch (e) {
        console.error(e);
    }
}