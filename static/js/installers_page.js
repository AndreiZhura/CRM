// 1. Функция загрузки списка мастеров
async function loadInstallers() {
    const tableBody = document.getElementById('installersTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/installers');
        const installers = await response.json();

        if (!installers || installers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Мастеров нет</td></tr>';
            return;
        }

        tableBody.innerHTML = installers.map(inst => {
            // Подготовка номера для ссылок: убираем всё кроме цифр
            const rawPhone = inst.phone || '';
            const cleanNumber = rawPhone.replace(/\D/g, '');

            // Если номер начинается с 8, меняем на 7 для tel: и t.me
            const linkNumber = cleanNumber.startsWith('8')
                ? '7' + cleanNumber.substring(1)
                : cleanNumber;

            return `
                <tr class="orders-table__row">
                    <td class="orders-table__td">
                        <a href="/installers/profile/${inst.id}" style="text-decoration: none; color: #2563eb; font-weight: bold;">
                            ${inst.fio}
                        </a>
                        ${inst.nickname ? `<br><small style="color:gray">(${inst.nickname})</small>` : ''}
                    </td>
                  <td class="orders-table__td">
    <div class="table-phone-wrapper">
        <span style="font-weight: 500;">${rawPhone || '—'}</span>
        ${cleanNumber.length >= 10 ? `
            <div class="table-phone-actions">
                <a href="tel:+${linkNumber}" title="Позвонить">📞</a>
                <a href="https://t.me/+${linkNumber}" target="_blank" title="Telegram">✈️</a>
            </div>
        ` : ''}
    </div>
</td>
                    <td class="orders-table__td">${inst.specialization || 'Монтаж'}</td>
                    <td class="orders-table__td">⭐ ${inst.rating || 10}</td>
                    <td class="orders-table__td" style="color: ${inst.is_debtor ? 'red' : 'green'}">
                        ${inst.is_debtor ? 'Долг' : 'Ок'}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.error("Ошибка загрузки списка мастеров:", e);
    }
}
document.addEventListener('DOMContentLoaded', loadInstallers);

// 2. Обработка формы добавления
const installerForm = document.getElementById('installerForm');
if (installerForm) {
    installerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            fio: document.getElementById('inst_fio').value,
            nickname: document.getElementById('inst_nickname').value,
            phone: document.getElementById('inst_phone').value,
            specialization: document.getElementById('inst_spec').value,
            base_price: parseFloat(document.getElementById('inst_price').value) || 0
        };

        try {
            const response = await fetch('/api/installers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                alert('Мастер успешно добавлен!');
                closeAddInstallerModal();
                loadInstallers(); // Вместо перезагрузки всей страницы просто обновляем таблицу
            } else {
                alert('Ошибка при сохранении');
            }
        } catch (error) {
            console.error('Ошибка:', error);
        }
    });
}

// 3. Утилиты для модального окна
function openAddInstallerModal() {
    document.getElementById('addInstallerModal').style.display = 'flex';
}

function closeAddInstallerModal() {
    document.getElementById('addInstallerModal').style.display = 'none';
}


// Запуск при загрузке
document.addEventListener('DOMContentLoaded', loadInstallers);