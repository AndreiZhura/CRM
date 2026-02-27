#!/bin/bash

# Имя лога с временной меткой
LOG_FILE="lumen_audit_$(date +%Y%m%d_%H%M%S).log"

echo "=== LUMEN ALPHA AUDIT SCRIPT (ПОЛНАЯ КАРТИНА) ==="
echo "Вывод будет сохранён в: $LOG_FILE"
echo "============================================================================"

# Функция для безопасного вывода одного файла
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

# Функция для рекурсивного вывода всех файлов с заданным расширением в директории
safe_find_cat() {
    local dir="$1"
    local ext="$2"
    if [[ -d "$dir" ]]; then
        find "$dir" -type f -name "*.$ext" | sort | while read -r f; do
            safe_cat "$f"
        done
    else
        echo "--- $dir ---"
        echo "[Директория не найдена]"
        echo ""
    fi
}

# Основной сбор данных
{
    echo "=== 1. СТРУКТУРА ПРОЕКТА (деревья) ==="
    echo "--- Корень проекта ---"
    tree -I 'venv|__pycache__|node_modules|.git|site-packages|*.log|*.pyc|*.egg-info|build|dist' -L 3
    
    echo "--- backend/src ---"
    tree backend/src -I '__pycache__|*.pyc' -L 3
    
    echo "--- frontend/src ---"
    tree frontend/src -I 'node_modules' -L 3

    echo "=== 2. ИНФОРМАЦИЯ О ВЕРСИЯХ И ЗАВИСИМОСТЯХ ==="
    echo "--- Python зависимости (pip list) ---"
    pip list 2>/dev/null || echo "pip не найден или не в виртуальном окружении"
    echo ""
    echo "--- Node зависимости (npm list --depth=0) ---"
    if [[ -d frontend ]]; then
        (cd frontend && npm list --depth=0 2>/dev/null) || echo "npm list не удался"
    else
        echo "Папка frontend не найдена"
    fi
    echo ""

    echo "=== 3. КОНФИГУРАЦИОННЫЕ ФАЙЛЫ ==="
    safe_cat .gitignore
    safe_cat docker-compose.yml
    safe_cat Dockerfile
    safe_cat install-protection.sh
    safe_cat requirements.txt
    safe_cat frontend/package.json
    safe_cat frontend/package-lock.json
    safe_cat pgagent.sql
    safe_cat test_compatibility.py

    echo "=== 4. БЭКЕНД: ЯДРО И НАСТРОЙКИ ==="
    safe_find_cat "backend/src/core" "py"
    safe_cat backend/src/main.py
    safe_cat backend/src/auth.py

    echo "=== 5. БЭКЕНД: МОДЕЛИ БД (SQLAlchemy) ==="
    safe_find_cat "backend/src/models" "py"

    echo "=== 6. БЭКЕНД: API-ЭНДПОИНТЫ (роутеры) ==="
    safe_find_cat "backend/src/routers" "py"

    echo "=== 7. БЭКЕНД: БИЗНЕС-ЛОГИКА (сервисы) ==="
    safe_find_cat "backend/src/services" "py"

    echo "=== 8. БЭКЕНД: СХЕМЫ PYDANTIC ==="
    safe_find_cat "backend/src/schemas" "py"

    echo "=== 9. БЭКЕНД: ML-СЕРВИС ==="
    safe_find_cat "backend/ml_service" "py"
    safe_cat backend/ml_service/requirements_ml.txt
    safe_cat backend/ml_service/Dockerfile.ml

    echo "=== 10. ФРОНТЕНД: ОСНОВНЫЕ КОМПОНЕНТЫ ==="
    safe_cat frontend/src/App.js
    safe_find_cat "frontend/src/components" "jsx"
    safe_find_cat "frontend/src/components" "js"

    echo "=== 11. ФРОНТЕНД: СТРАНИЦЫ ==="
    safe_find_cat "frontend/src/pages" "jsx"
    safe_find_cat "frontend/src/pages" "js"

    echo "=== 12. ФРОНТЕНД: API-ИНТЕГРАЦИЯ ==="
    safe_find_cat "frontend/src/services" "js"

    echo "=== 13. ФРОНТЕНД: СТИЛИ И КОНТЕКСТЫ ==="
    safe_find_cat "frontend/src/styles" "css"
    safe_find_cat "frontend/src/contexts" "js"

    echo "=== 14. БАЗА ДАННЫХ: СХЕМА ==="
    safe_cat database/init.sql

    echo "=== 15. ДОКУМЕНТАЦИЯ ==="
    safe_find_cat "docs" "md"
    safe_cat README.md

    echo "=== 16. ЛОГИ (последние 50 строк последнего файла) ==="
    last_log=$(ls -t backend/logs/app_*.log 2>/dev/null | head -1)
    if [[ -n "$last_log" ]]; then
        echo "--- Последний лог: $last_log ---"
        tail -n 50 "$last_log"
    else
        echo "[Логи не найдены]"
    fi

} | tee "$LOG_FILE"

echo "============================================================================"
echo "Анализ завершён. Полный вывод сохранён в: $LOG_FILE"