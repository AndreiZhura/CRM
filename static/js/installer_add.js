document.getElementById('addInstallerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 1. Собираем данные из полей (включая чекбокс и специализацию)
    const formData = {
        fio: document.getElementById('fio').value,
        nickname: document.getElementById('nickname').value || "",
        phone: document.getElementById('phone').value || "",
        // Напрямую берем текст, который вписал Олег (например, "Альпинист")
        specialization: document.getElementById('specialization').value || "Монтаж",
        rating: parseInt(document.getElementById('rating').value) || 10,
        dossier: document.getElementById('dossier').value || "",
        
        // ВНИМАНИЕ: Берем состояние чекбокса напрямую (checked - это true или false)
        is_debtor: document.getElementById('is_debtor').checked,
        // Сумма долга
        debt_amount: parseFloat(document.getElementById('debt_amount').value) || 0, 
        
        base_price: parseFloat(document.getElementById('base_price').value) || 0,
        status: document.getElementById('status').value
    };

    try {
        console.log("System: Отправка досье на сервер...", formData);

        const response = await fetch('/api/installers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        // 2. Обработка ответа
        if (response.ok || response.status === 400) { 
            // Перенаправляем на страницу списка
            window.location.href = '/installers_page'; 
        } else {
            const err = await response.json();
            alert("Ошибка сохранения: " + (err.detail || "Неизвестная ошибка"));
        }
    } catch (error) {
        console.error("Ошибка сети:", error);
        alert("Сервер Mac mini не отвечает. Проверь соединение.");
    }
});