/**
 * 1. ГЛОБАЛЬНЫЕ ФУНКЦИИ (вынесены за пределы любых скобок)
 * Теперь их видят и события, и таймеры, и другие скрипты.
 */
function handlePhoneInput(input) {
    if (!input) return;
    
    let value = input.value.replace(/\D/g, ''); // Оставляем только цифры

    // Принудительно начинаем с 8
    if (value.length > 0 && value[0] !== '8') {
        value = '8' + value;
    } else if (value.length === 0) {
        value = '8';
    }

    // Формируем маску: 8 (999) 000-00-00
    let formatted = '8';
    if (value.length > 1) formatted += ' (' + value.substring(1, 4);
    if (value.length > 4) formatted += ') ' + value.substring(4, 7);
    if (value.length > 7) formatted += '-' + value.substring(7, 9);
    if (value.length > 9) formatted += '-' + value.substring(9, 11);

    input.value = formatted;

    // Кнопки связи (Call/TG)
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

/**
 * 2. ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
 */
function initAllPhones() {
    console.log("Система: Инициализация масок телефона...");
    document.querySelectorAll('.phone-mask').forEach(input => {
        if (input.value && input.value.length > 0) {
            handlePhoneInput(input);
        }
    });
}

/**
 * 3. ОБРАБОТЧИКИ СОБЫТИЙ
 */
document.addEventListener('DOMContentLoaded', function () {
    // Слушаем ввод во всех полях с классом phone-mask (делегирование)
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('phone-mask')) {
            handlePhoneInput(e.target);
        }
    });

    // Запуск сразу при загрузке страницы
    initAllPhones();
    
    // Повторный запуск через 500мс (когда данные из БД Mac mini подгрузятся в инпуты)
    setTimeout(initAllPhones, 500);
});