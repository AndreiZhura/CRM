// 1. Функция загрузки списка мастеров
async function loadInstallers() {
    const tableBody = document.getElementById('installersTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/installers');
        if (!response.ok) throw new Error('Ошибка сервера');

        const installers = await response.json();

        if (installers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Мастера еще не добавлены</td></tr>';
            return;
        }

        tableBody.innerHTML = installers.map(inst => `
            <tr class="orders-table__row">
                <td class="orders-table__td">
                    <a href="/installers/${inst.id}" class="installer-link" style="text-decoration: underline; color: #2563eb;">
                        <strong>${inst.fio}</strong>
                    </a>
                    ${inst.nickname ? `<br><small style="color: #64748b;">(${inst.nickname})</small>` : ''}
                </td>
                <td class="orders-table__td">${inst.phone || '—'}</td>
                <td class="orders-table__td">${inst.specialization || 'Монтаж'}</td>
                <td class="orders-table__td">⭐ ${inst.rating || 10}</td>
                <td class="orders-table__td">
                    <span style="color: ${inst.is_debtor ? '#ef4444' : '#10b981'}; font-weight: bold;">
                        ${inst.is_debtor ? 'Должник' : 'Ок'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Ошибка подключения к серверу</td></tr>';
    }
}

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