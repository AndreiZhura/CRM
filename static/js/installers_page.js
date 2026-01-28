// 1. Глобальное состояние
let allInstallers = [];

// 2. Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log("System: Инициализация страницы мастеров...");
    fetchInstallers();

    // Слушатели для фильтров
    const searchName = document.getElementById('searchName');
    const searchSpec = document.getElementById('searchSpec');
    const filterDebt = document.getElementById('filterDebt');

    if (searchName) searchName.addEventListener('input', applyFilters);
    if (searchSpec) searchSpec.addEventListener('input', applyFilters);
    if (filterDebt) filterDebt.addEventListener('change', applyFilters);

    // Инициализация формы
    initInstallerForm();
});

// 3. Загрузка данных с сервера
async function fetchInstallers() {
    try {
        const response = await fetch('/api/installers');
        if (!response.ok) throw new Error('Ошибка сети');
        allInstallers = await response.json();
        renderTable(allInstallers);
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}

// 4. Логика фильтрации (Живой поиск)
function applyFilters() {
    const nameQuery = document.getElementById('searchName')?.value.toLowerCase() || '';
    const specQuery = document.getElementById('searchSpec')?.value.toLowerCase() || '';
    const onlyDebt = document.getElementById('filterDebt')?.checked;

    const filtered = allInstallers.filter(inst => {
        const matchesName = (inst.fio || "").toLowerCase().includes(nameQuery) ||
                            (inst.nickname && inst.nickname.toLowerCase().includes(nameQuery));
        const matchesSpec = (inst.specialization || "").toLowerCase().includes(specQuery);
        const matchesDebt = onlyDebt ? inst.is_debtor : true;

        return matchesName && matchesSpec && matchesDebt;
    });

    renderTable(filtered);
}

// 5. Отрисовка таблицы
function renderTable(installers) {
    const tableBody = document.getElementById('installersTableBody');
    if (!tableBody) return;

    if (!installers || installers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">Мастер не найден</td></tr>';
        return;
    }

    tableBody.innerHTML = installers.map(inst => {
        const rawPhone = inst.phone || '';
        const cleanNumber = rawPhone.replace(/\D/g, '');
        const linkNumber = cleanNumber.startsWith('8') ? '7' + cleanNumber.substring(1) : cleanNumber;

        return `
            <tr class="orders-table__row">
                <td class="orders-table__td">
                    <a href="/installers/profile/${inst.id}" class="installer-link">
                        <strong>${inst.fio}</strong>
                    </a>
                    ${inst.nickname ? `<br><small style="color:gray">(${inst.nickname})</small>` : ''}
                </td>
                <td class="orders-table__td">
                    <div class="table-phone-wrapper">
                        <span class="phone-number">${rawPhone || '—'}</span>
                        ${cleanNumber.length >= 10 ? `
                            <div class="table-phone-actions">
                                <a href="tel:+${linkNumber}">📞</a>
                                <a href="https://t.me/+${linkNumber}" target="_blank">✈️</a>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="orders-table__td">${inst.specialization || 'Монтаж'}</td>
                <td class="orders-table__td">⭐ ${inst.rating || 10}</td>
                <td class="orders-table__td">
                    <span class="status-badge" style="color: ${inst.is_debtor ? '#e11d48' : '#10b981'}; font-weight: bold;">
                        ${inst.is_debtor ? '❌ Долг' : '✅ Ок'}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

// 6. Работа с формой добавления
// 6. Работа с формой добавления (ИСПРАВЛЕННАЯ)
function initInstallerForm() {
    const form = document.getElementById('addInstallerForm'); // Проверь ID формы
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        
        // СИСТЕМНЫЙ СБОР: забираем всё, что добавили в HTML
        const formData = {
            fio: document.getElementById('fio').value,
            nickname: document.getElementById('nickname').value || "",
            phone: document.getElementById('phone').value || "",
            specialization: document.getElementById('specialization').value || "Монтаж",
            rating: parseInt(document.getElementById('rating').value) || 10,
            
            // ВОТ ЧЕГО НЕ ХВАТАЛО:
            is_debtor: document.getElementById('is_debtor').checked, // true/false
            debt_amount: parseFloat(document.getElementById('debt_amount').value) || 0,
            
            base_price: parseFloat(document.getElementById('base_price').value) || 0,
            status: document.getElementById('status').value || "Новый",
            dossier: document.getElementById('dossier').value || ""
        };

        console.log("System: Отправка данных на Python-сервер...", formData);

        try {
            const response = await fetch('/api/installers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                // Если у тебя на этой же странице модалка — закрываем
                if (typeof closeAddInstallerModal === "function") closeAddInstallerModal();
                
                // Если это отдельная страница — перенаправляем
                window.location.href = '/installers_page';
            } else {
                const err = await response.json();
                alert('Ошибка сервера: ' + JSON.stringify(err.detail));
            }
        } catch (error) {
            console.error('Ошибка сети:', error);
        }
    };
}

// 7. Функции модального окна
function openAddInstallerModal() {
    const modal = document.getElementById('addInstallerModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddInstallerModal() {
    const modal = document.getElementById('addInstallerModal');
    if (modal) modal.style.display = 'none';
}