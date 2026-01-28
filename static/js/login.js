// login.js
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMessage');

    try {
        const response = await fetch('http://127.0.0.1:8000/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Если пароль верный, сохраняем токен в "память" браузера
            localStorage.setItem('access_token', data.access_token);
            // Перенаправляем на журнал заказов
            window.location.href = 'orders.html';
        } else {
            errorMsg.innerText = 'Доступ запрещен. Проверь данные.';
            errorMsg.style.display = 'block';
        }
    } catch (err) {
        console.error('Ошибка сети:', err);
        errorMsg.innerText = 'Сервер Python не отвечает';
        errorMsg.style.display = 'block';
    }
});