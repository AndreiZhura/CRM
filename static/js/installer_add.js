document.getElementById('addInstallerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedSpecs = Array.from(document.querySelectorAll('input[name="spec"]:checked'))
                               .map(cb => cb.value);

    const formData = {
        fio: document.getElementById('fio').value,
        nickname: document.getElementById('nickname').value || "",
        phone: document.getElementById('phone').value || "",
        specialization: selectedSpecs.join(', ') || "Монтаж",
        rating: parseInt(document.getElementById('rating').value) || 10,
        dossier: document.getElementById('dossier').value || "",
        is_debtor: document.getElementById('is_debtor').value === "true",
        base_price: parseFloat(document.getElementById('base_price').value) || 0,
        status: document.getElementById('status').value
    };

    try {
        const response = await fetch('/api/installers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (response.ok) {
            window.location.href = '/installers';
        } else {
            const err = await response.json();
            alert("Ошибка: " + JSON.stringify(err.detail));
        }
    } catch (error) {
        alert("Сервер не отвечает");
    }
    const response = await fetch('/api/installers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
});

if (response.ok || response.status === 400) { 
    // Если 400 (уже существует) или 200 (создан) - всё равно идем в список
    window.location.href = '/installers';
} else {
    const err = await response.json();
    alert("Ошибка: " + err.detail);
}
});