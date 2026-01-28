document.addEventListener('DOMContentLoaded', function() {
    // Функция форматирования и показа кнопок
    function handlePhoneInput(input) {
        let value = input.value.replace(/\D/g, ''); // Только цифры
        
        // Всегда принудительно начинаем с 8
        if (value.length > 0 && value[0] !== '8') {
            value = '8' + value;
        } else if (value.length === 0) {
            value = '8';
        }

        // Маска: 8 (999) 000-00-00
        let formatted = '8';
        if (value.length > 1) formatted += ' (' + value.substring(1, 4);
        if (value.length > 4) formatted += ') ' + value.substring(4, 7);
        if (value.length > 7) formatted += '-' + value.substring(7, 9);
        if (value.length > 9) formatted += '-' + value.substring(9, 11);
        
        input.value = formatted;

        // Логика кнопок
        const callBtn = document.getElementById('call_' + input.id);
        const tgBtn = document.getElementById('tg_' + input.id);

        if (value.length === 11) {
            const cleanNumber = '7' + value.substring(1);
            if (callBtn) {
                callBtn.href = 'tel:+' + cleanNumber;
                callBtn.classList.remove('hidden');
            }
            if (tgBtn) {
                tgBtn.href = 'https://t.me/+' + cleanNumber;
                tgBtn.classList.remove('hidden');
            }
        } else {
            if (callBtn) callBtn.classList.add('hidden');
            if (tgBtn) tgBtn.classList.add('hidden');
        }
    }

    // Слушаем ввод во всех полях с классом phone-mask
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('phone-mask')) {
            handlePhoneInput(e.target);
        }
    });

    // Инициализация при загрузке (если номер уже есть в базе)
    document.querySelectorAll('.phone-mask').forEach(input => {
        if (input.value) handlePhoneInput(input);
    });
});

// Замени свой блок инициализации на этот:
    function initAllPhones() {
        document.querySelectorAll('.phone-mask').forEach(input => {
            if (input.value && input.value.length > 1) {
                handlePhoneInput(input);
            }
        });
    }

    // Запуск сразу
    initAllPhones();
    
    // Запуск через полсекунды (когда fetch-запросы обычно успевают дойти)
    setTimeout(initAllPhones, 500);