#!/bin/bash
# Скрипт для установки защиты от случайного docker-compose down -v

mkdir -p ~/bin

cat > ~/bin/docker-compose << 'EOF'
#!/bin/bash
for arg in "$@"; do
    if [[ "$arg" == "down" ]]; then
        if [[ "$*" == *"down -v"* ]] || [[ "$*" == *"down --volumes"* ]]; then
            echo -e "\033[31m🚨 ЗАПРЕЩЕНО: 'docker compose down -v' удалит ВСЕ ТВОИ ДАННЫЕ!\033[0m"
            echo -e "Если уверен, используй реальный бинарник: \033[33m/usr/bin/docker-compose\033[0m"
            exit 1
        fi
    fi
done
/usr/bin/docker-compose "$@"
EOF

chmod +x ~/bin/docker-compose

# Добавляем ~/bin в PATH, если ещё не добавлено
if ! grep -q 'export PATH="$HOME/bin:$PATH"' ~/.bashrc; then
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
fi

# Применяем изменения для текущей сессии
export PATH="$HOME/bin:$PATH"

echo "✅ Защита от docker-compose down -v установлена."