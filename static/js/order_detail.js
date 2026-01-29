/**
 * ЕДИНАЯ СИСТЕМА УПРАВЛЕНИЯ ЗАКАЗАМИ (Журнал + Редактирование)
 * Безопасно работает на Mac Mini 2014
 */

// --- 1. ЛОГИКА ФИЛЬТРАЦИИ (Для страницы Журнала) ---
function applyFilters() {
    const filterClient = document.getElementById('filterClient');
    const filterAddress = document.getElementById('filterAddress');
    const filterStatus = document.getElementById('filterStatus');
    const tableBody = document.getElementById('ordersTableBody');

    if (!tableBody || !filterClient) return; // Выходим, если мы не на странице журнала

    const clientVal = filterClient.value.toLowerCase().trim();
    const addressVal = filterAddress.value.toLowerCase().trim();
    const statusVal = filterStatus.value;

    const rows = tableBody.querySelectorAll('tr');

    rows.forEach(row => {
        if (row.cells.length < 5) return;

        const clientText = row.cells[0].textContent.toLowerCase();
        const addressText = row.cells[1].textContent.toLowerCase();
        const statusText = row.cells[4].textContent.trim();

        const matchClient = clientText.includes(clientVal);
        const matchAddress = addressText.includes(addressVal);
        const matchStatus = statusVal === "" || statusText === statusVal;

        row.style.display = (matchClient && matchAddress && matchStatus) ? "" : "none";
    });
}

// --- 2. ЛОГИКА РЕДАКТИРОВАНИЯ (Для страницы Деталей) ---
async function initEditPage() {
    const orderId = window.location.pathname.split('/').pop();
    if (!orderId || isNaN(orderId)) return; // Если в URL нет ID, значит мы не в редактировании

    const editForm = document.getElementById('editOrderForm');
    if (!editForm) return;

    try {
        const [instResponse, orderResponse] = await Promise.all([
            fetch('/api/installers'),
            fetch(`/api/order/${orderId}`)
        ]);

        const installers = await instResponse.json();
        const data = await orderResponse.json();

        // Заполняем монтажников
        const instSelect = document.getElementById('installer_id');
        if (instSelect) {
            instSelect.innerHTML = '<option value="">-- Выберите монтажника --</option>';
            installers.forEach(inst => {
                const opt = document.createElement('option');
                opt.value = inst.id;
                opt.textContent = inst.fio;
                if (inst.id === data.installer_id) opt.selected = true;
                instSelect.appendChild(opt);
            });
        }

        // Заполняем остальные поля (безопасно)
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || (el.type === 'number' ? 0 : '');
        };

        setVal('fio', data.fio);
        setVal('address', data.address);
        setVal('client_phone', data.phone);
        setVal('service_date', data.service_date);
        setVal('status', data.status);
        
        // Триггер для phone.js (чтобы кнопки Call/TG появились)
        const phoneInput = document.getElementById('client_phone');
        if (phoneInput) phoneInput.dispatchEvent(new Event('input', { bubbles: true }));

    } catch (err) {
        console.error("Ошибка инициализации страницы:", err);
    }
}

// --- 3. ГЛАВНЫЙ ЗАПУСК (DOMContentLoaded) ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("Система: Инициализация...");

    // Активируем поиск, если есть инпуты
    const fClient = document.getElementById('filterClient');
    const fAddress = document.getElementById('filterAddress');
    const fStatus = document.getElementById('filterStatus');

    if (fClient) fClient.addEventListener('input', applyFilters);
    if (fAddress) fAddress.addEventListener('input', applyFilters);
    if (fStatus) fStatus.addEventListener('change', applyFilters);

    // Активируем редактирование, если есть форма
    const editForm = document.getElementById('editOrderForm');
    if (editForm) {
        initEditPage();
        
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            // ... (сюда вставь свой блок fetch PUT из старого кода) ...
            console.log("Сохранение...");
        });
    }

    // Активируем удаление, если есть кнопка
    const deleteBtn = document.getElementById('deleteOrder');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            if (confirm("Удалить заказ?")) {
                const orderId = window.location.pathname.split('/').pop();
                const res = await fetch(`/api/order/${orderId}`, { method: 'DELETE' });
                if (res.ok) window.location.href = '/journal';
            }
        });
    }
});