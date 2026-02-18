#!/bin/bash

# Имя лога с временной меткой
LOG_FILE="lumen_audit_$(date +%Y%m%d_%H%M%S).log"


echo "=== LUMEN ALPHA AUDIT SCRIPT ==="
echo "Вывод будет сохранён в: $LOG_FILE"
echo "============================================================================"


# Функция для безопасного вывода файла (если существует)
safe_cat() {
    local file="$1"
    if [[ -f "$file" ]]; then
        echo "--- $file ---"
        cat "$file"
        echo ""
    else
        echo "--- $file ---"
        echo "[Файл не найден]"
        echo ""
    fi
}

# Основной сбор данных
{
    echo "=== 1. СТРУКТУРА ПРОЕКТА ==="
    tree -I 'venv|__pycache__|node_modules|.git|site-packages'
    
    echo "=== 2. БЭКЕНД: ОСНОВНЫЕ КОНФИГУРАЦИИ ==="
    safe_cat backend/src/core/config.py
    safe_cat backend/src/core/db.py
    safe_cat backend/src/main.py

    echo "=== 3. БЭКЕНД: МОДЕЛИ БД (SQLAlchemy) ==="
    safe_cat backend/src/models/clients.py
    safe_cat backend/src/models/orders.py
    safe_cat backend/src/models/finance.py
    safe_cat backend/src/models/installers.py
    safe_cat backend/src/models/address_cache.py
    safe_cat backend/src/models/weather.py

    echo "=== 4. БЭКЕНД: API-ЭНДПОИНТЫ (роутеры) ==="
    safe_cat backend/src/routers/clients.py
    safe_cat backend/src/routers/orders.py
    safe_cat backend/src/routers/finance.py
    safe_cat backend/src/routers/auth.py
    safe_cat backend/src/routers/installers.py
    safe_cat backend/src/routers/reminders.py

    echo "=== 5. БЭКЕНД: БИЗНЕС-ЛОГИКА (сервисы) ==="
    safe_cat backend/src/services/clients.py
    safe_cat backend/src/services/orders.py
    safe_cat backend/src/services/finance.py
    safe_cat backend/src/services/geocoding.py
    safe_cat backend/src/services/weather_service.py
    safe_cat backend/src/services/reminder_service.py

    echo "=== 6. ФРОНТЕНД: ОСНОВНЫЕ КОМПОНЕНТЫ ==="
    safe_cat frontend/src/App.js
    safe_cat frontend/src/components/Header.jsx
    safe_cat frontend/src/components/Footer.jsx
    safe_cat frontend/src/components/OrderMap.jsx

    echo "=== 7. ФРОНТЕНД: СТРАНИЦЫ (ключевые) ==="
    safe_cat frontend/src/pages/Login.jsx
    safe_cat frontend/src/pages/Dashboard.jsx
    safe_cat frontend/src/pages/OrdersList.jsx
    safe_cat frontend/src/pages/NewOrder.jsx
    safe_cat frontend/src/pages/InstallersList.jsx


    echo "=== 8. ФРОНТЕНД: API-ИНТЕГРАЦИЯ ==="
    safe_cat frontend/src/services/api.js


    echo "=== 9. БАЗА ДАННЫХ: СХЕМА ==="
    safe_cat database/init.sql

    echo "=== 10. ИНФРАСТРУКТУРА: ДОКЕР И ДЕПЛОЙ ==="
    safe_cat docker-compose.yml
    safe_cat Dockerfile


    echo "=== 11. ML-СЕРВИС: ОСНОВНЫЕ МОДУЛИ ==="
    safe_cat backend/ml_service/app.py
    safe_cat backend/ml_service/train.py
    safe_cat backend/ml_service/run_weather.py
    safe_cat backend/ml_service/build_features.py

    echo "=== 12. ЛОГИ (последний файл) ==="
    last_log=$(ls -t backend/src/logs/app_*.log 2>/dev/null | head -1)
    if [[ -n "$last_log" ]]; then
        cat "$last_log"
    else
        echo "[Логи не найдены]"
    fi

} | tee "$LOG_FILE"

echo "============================================================================"
echo "Анализ завершён. Полный вывод сохранён в: $LOG_FILE"
