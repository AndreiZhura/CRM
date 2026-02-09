/**
 * 1. ГЛОБАЛЬНАЯ ФУНКЦИЯ ОБРАБОТКИ
 * Превращает ввод в формат +7 (999) 000-00-00
 */
function handlePhoneInput(input) {
    if (!input) return;

    // Шаг 1: Убираем всё лишнее, оставляем только цифры
    let digits = input.value.replace(/\D/g, '');

    // Шаг 2: Если пользователь ввел 8 в начале, меняем на 7 (наш стандарт)
    if (digits.startsWith('8')) {
        digits = '7' + digits.substring(1);
    }

    // Шаг 3: Если поле пустое, ставим 7 как фундамент
    if (digits.length === 0) {
        digits = '7';
    }

    // Шаг 4: Ограничиваем длину (11 цифр)
    if (digits.length > 11) {
        digits = digits.substring(0, 11);
    }
    if (digits.length === 11) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    } else if (digits.length > 1) {
        input.classList.add('invalid');
        input.classList.remove('valid');
    } else {
        input.classList.remove('valid', 'invalid');
    }

    // Шаг 5: Строим красивую маску для Олега
    let formatted = '+7'; // Всегда начинаем с +7
    if (digits.length > 1) {
        formatted += ' (' + digits.substring(1, 4); // Код города
    }
    if (digits.length > 4) {
        formatted += ') ' + digits.substring(4, 7); // Первая часть номера
    }
    if (digits.length > 7) {
        formatted += '-' + digits.substring(7, 9); // Хвост
    }
    if (digits.length > 9) {
        formatted += '-' + digits.substring(9, 11); // Финал
    }

    // Выводим результат в инпут
    input.value = formatted;

    // Шаг 6: Управление кнопками связи (Call/TG)
    const callBtn = document.getElementById('call_' + input.id);
    const tgBtn = document.getElementById('tg_' + input.id);

    if (digits.length === 11) {
        // Если номер полный, формируем ссылку и показываем кнопки
        const linkStr = '+' + digits;
        if (callBtn) {
            callBtn.href = 'tel:' + linkStr;
            callBtn.classList.remove('hidden');
        }
        if (tgBtn) {
            tgBtn.href = 'https://t.me/' + linkStr;
            tgBtn.classList.remove('hidden');
        }
    } else {
        // Если цифр мало — прячем кнопки, чтобы не спамить битыми ссылками
        if (callBtn) callBtn.classList.add('hidden');
        if (tgBtn) tgBtn.classList.add('hidden');
    }
    // Находим кнопку сохранения
    const saveBtn = document.getElementById('saveOrderBtn');

    if (saveBtn) {
        if (digits.length === 11) {
            // ФИНАЛ: Номер верный
            saveBtn.disabled = false;
            saveBtn.style.opacity = "1";
            saveBtn.innerText = "Сохранить заказ"; // Возвращаем текст
            saveBtn.style.backgroundColor = "#2563eb"; // Возвращаем основной цвет (пример)
        } else {
            // В ПРОЦЕССЕ: Номер неполный
            saveBtn.disabled = true;
            saveBtn.style.opacity = "0.5";
            saveBtn.innerText = "Введите номер..."; // Подсказка прямо на кнопке
            saveBtn.title = "Введите полный номер телефона (11 цифр)";
        }
    }
} // Конец функции handlePhoneInput


/**
 * 2. ИНИЦИАЛИЗАЦИЯ
 */
function initAllPhones() {
    document.querySelectorAll('.phone-mask').forEach(input => {
        handlePhoneInput(input);
    });
}

/**
 * 3. СОБЫТИЯ
 */
document.addEventListener('DOMContentLoaded', function () {
    // Живой ввод: маска накладывается в реальном времени
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('phone-mask')) {
            handlePhoneInput(e.target);
        }
    });

    // Авто-заполнение при фокусе: если поле пустое, сразу подставляем +7
    document.addEventListener('focusin', function (e) {
        if (e.target.classList.contains('phone-mask') && !e.target.value) {
            e.target.value = '+7';
        }
    });

    initAllPhones();
    setTimeout(initAllPhones, 500); // Страховка для подгрузки из Python
});