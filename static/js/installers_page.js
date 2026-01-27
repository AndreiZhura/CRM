async function loadInstallers() {
    const tableBody = document.getElementById('installersTableBody');
    if (!tableBody) return;

    try {
        const response = await fetch('/api/installers');
        if (!response.ok) throw new Error('Ошибка сервера');
        
        const installers = await response.json();
        
        if (installers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Мастера еще не добавлены</td></tr>';
            return;
        }

        tableBody.innerHTML = installers.map(inst => `
            <tr class="orders-table__row">
                <td class="orders-table__td"><strong>${inst.fio}</strong></td>
                <td class="orders-table__td">${inst.phone || '—'}</td>
                <td class="orders-table__td">${inst.specialization || 'Монтаж'}</td>
                <td class="orders-table__td">⭐ ${inst.rating || 5}</td>
                <td class="orders-table__td">0 ₽</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Ошибка:', error);
        tableBody.innerHTML = '<tr><td colspan="5" style="color:red;">Не удалось загрузить список мастеров</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', loadInstallers);