document.getElementById('addInstallerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Собираем специализации в массив (Мойщик, Альпинист и т.д.)
    const selectedSpecs = Array.from(document.querySelectorAll('input[name="spec"]:checked'))
                               .map(cb => cb.value);

    // 2. Формируем объект данных точно по списку Олега
 // Внутри обработчика submit:
const formData = {
    fio: document.getElementById('fio').value,
    nickname: document.getElementById('nickname').value,
    phone: document.getElementById('phone').value,
    specialization: selectedSpecs.join(', '),
    rating: parseInt(document.getElementById('rating').value) || 10,
    dossier: document.getElementById('comments').value, // Из поля "comments" в ключ "dossier"
    is_debtor: document.getElementById('is_debtor').value === "true",
    base_price: parseFloat(document.getElementById('base_price').value) || 0,
    status: document.getElementById('status').value || "Новый"
};

    try {
        const response = await fetch('/api/installers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            alert('Мастер успешно внесен в базу!');
            window.location.href = '/installers'; 
        } else {
            const errorData = await response.json();
            alert('Ошибка сервера: ' + JSON.stringify(errorData.detail));
        }
    } catch (err) {
        console.error(err);
        alert('Связь с Mac Mini потеряна. Проверьте сервер.');
    }
});