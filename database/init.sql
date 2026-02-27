-- =====================================================
-- ПРОЕКТ LUMEN ALPHA: ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ (HVAC CRM)
-- Версия: 6.0 (МУЛЬТИ-ПОЗИЦИИ, НЕСКОЛЬКО МОНТАЖНИКОВ, ГАРАНТИИ, ФИНАНСЫ)
-- Режим: Идемпотентный — безопасен для повторного запуска
-- =====================================================

BEGIN;

-- -----------------------------------------------------------------
-- 1. ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ (создаём, если не существуют)
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM ('Новый', 'Ждет установщика', 'В работе', 'Выполнен', 'Отменен');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('Не оплачен', 'Частично', 'Оплачен');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'item_type') THEN
        CREATE TYPE item_type AS ENUM ('product', 'service');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fault_type') THEN
        CREATE TYPE fault_type AS ENUM ('manufacturer', 'installer', 'other');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cost_covered_by') THEN
        CREATE TYPE cost_covered_by AS ENUM ('manufacturer', 'installer', 'oleg');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'claim_status') THEN
        CREATE TYPE claim_status AS ENUM ('open', 'in_progress', 'closed', 'rejected');
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 2. ТАБЛИЦА АДМИНИСТРАТОРОВ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL CHECK (LENGTH(password_hash) >= 60),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- 3. ТАБЛИЦА МОНТАЖНИКОВ (с расширенной статистикой качества)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installers (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    nickname TEXT,
    phone VARCHAR(20) UNIQUE NOT NULL,
    backup_phone VARCHAR(20),
    specialization TEXT[] NOT NULL,
    rating NUMERIC(3,1) DEFAULT 10.0 CHECK (rating >= 0 AND rating <= 10),
    base_price NUMERIC(10,2) DEFAULT 0 CHECK (base_price >= 0),
    is_debtor BOOLEAN DEFAULT FALSE,
    comments TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_in_funnel BOOLEAN DEFAULT TRUE,
    total_orders INTEGER DEFAULT 0 CHECK (total_orders >= 0),
    poor_work_count INTEGER DEFAULT 0 CHECK (poor_work_count >= 0),
    warranty_visits_count INTEGER DEFAULT 0 CHECK (warranty_visits_count >= 0),
    last_incident_date TIMESTAMP,
    quality_score NUMERIC(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_orders > 0 
            THEN (total_orders - poor_work_count - warranty_visits_count)::NUMERIC / total_orders::NUMERIC
            ELSE 10.0
        END
    ) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- -----------------------------------------------------------------
-- 4. ТАБЛИЦА КЛИЕНТОВ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    backup_phone VARCHAR(20),
    address TEXT NOT NULL,
    coordinates POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- -----------------------------------------------------------------
-- 5. ТАБЛИЦА ГЕОДАННЫХ (КЭШ ДЛЯ ЯНДЕКС.КАРТ)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS address_cache (
    address TEXT PRIMARY KEY,
    lat NUMERIC(10,7) NOT NULL,
    lon NUMERIC(10,7) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- 6. ТАБЛИЦА ЗАКАЗОВ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE RESTRICT,
    status order_status DEFAULT 'Новый',
    warehouse TEXT,
    service_datetime TIMESTAMP NOT NULL,
    delivery_datetime TIMESTAMP,
    promise TEXT,
    marker_color VARCHAR(10),
    address_id TEXT REFERENCES address_cache(address) ON DELETE RESTRICT,
    address_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN orders.address_text IS 'Денормализованный адрес для сохранения при очистке кэша';

-- -----------------------------------------------------------------
-- 7. ИСТОРИЯ СТАТУСОВ ЗАКАЗОВ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =================================================================
-- НОВЫЕ ТАБЛИЦЫ ДЛЯ МУЛЬТИ-ПОЗИЦИОННЫХ ЗАКАЗОВ, НЕСКОЛЬКИХ МОНТАЖНИКОВ И ФИНАНСОВ
-- =================================================================

-- -----------------------------------------------------------------
-- 8. ТАБЛИЦА ПОЗИЦИЙ ЗАКАЗА
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type item_type NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    sale_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    warranty_manufacturer INTEGER NOT NULL DEFAULT 0,
    warranty_master INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN order_items.warranty_manufacturer IS 'Гарантия производителя (лет), только для товаров';
COMMENT ON COLUMN order_items.warranty_master IS 'Гарантия мастера (лет), только для услуг';

-- -----------------------------------------------------------------
-- 9. ТАБЛИЦА СВЯЗИ ЗАКАЗОВ И МОНТАЖНИКОВ (РОЛИ, БАЗОВАЯ ОПЛАТА)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_installers (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    installer_id INTEGER NOT NULL REFERENCES installers(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    base_payment NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_payment >= 0),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_id, installer_id, role)
);

COMMENT ON TABLE order_installers IS 'Монтажники, задействованные в заказе, с их ролями и базовой оплатой';

-- -----------------------------------------------------------------
-- 10. ТАБЛИЦА СВЯЗИ ПОЗИЦИЙ ЗАКАЗА С МОНТАЖНИКАМИ (ДЕТАЛИЗАЦИЯ РАБОТ)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_item_installers (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    installer_id INTEGER NOT NULL REFERENCES installers(id) ON DELETE CASCADE,
    payment_amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (payment_amount >= 0),
    work_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(order_item_id, installer_id)
);

COMMENT ON TABLE order_item_installers IS 'Привязка конкретных позиций к монтажникам (кто что делал и сколько получил)';

CREATE INDEX IF NOT EXISTS idx_order_item_installers_item ON order_item_installers(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_item_installers_installer ON order_item_installers(installer_id);

-- -----------------------------------------------------------------
-- 11. ТАБЛИЦА НЕПРЕДВИДЕННЫХ РАСХОДОВ ПО ЗАКАЗУ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_expenses (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) DEFAULT 'other',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- 12. ТАБЛИЦА ГАРАНТИЙНЫХ СЛУЧАЕВ
-- -----------------------------------------------------------------
DROP TABLE IF EXISTS installer_incidents CASCADE;

CREATE TABLE IF NOT EXISTS warranty_claims (
    id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    claim_date DATE NOT NULL,
    description TEXT,
    fault_type fault_type NOT NULL,
    responsible_installer_id INTEGER REFERENCES installers(id) ON DELETE SET NULL,
    resolution TEXT,
    resolving_installer_id INTEGER REFERENCES installers(id) ON DELETE SET NULL,
    cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    cost_covered_by cost_covered_by NOT NULL DEFAULT 'oleg',
    status claim_status DEFAULT 'open',
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN warranty_claims.fault_type IS 'Тип вины: manufacturer (производитель), installer (монтажник), other';
COMMENT ON COLUMN warranty_claims.cost_covered_by IS 'Кто покрывает расходы: manufacturer, installer, oleg';

CREATE INDEX IF NOT EXISTS idx_warranty_claims_order_item ON warranty_claims(order_item_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_responsible ON warranty_claims(responsible_installer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_resolving ON warranty_claims(resolving_installer_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status ON warranty_claims(status);

-- -----------------------------------------------------------------
-- 13. ТАБЛИЦА ПОГОДЫ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(100) NOT NULL,
    lat NUMERIC(10,7),
    lon NUMERIC(10,7),
    temperature_avg NUMERIC(4,1),
    temperature_min NUMERIC(4,1),
    temperature_max NUMERIC(4,1),
    humidity INTEGER,
    pressure INTEGER,
    wind_speed NUMERIC(4,1),
    precipitation NUMERIC(5,2),
    weather_condition VARCHAR(50),
    source VARCHAR(20) DEFAULT 'open-meteo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(date, location)
);

-- -----------------------------------------------------------------
-- 14. ТАБЛИЦА ПЛАТЕЖЕЙ (ОТ КЛИЕНТА И МОНТАЖНИКАМ)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('client', 'installer')),
    installer_id INTEGER REFERENCES installers(id) ON DELETE SET NULL,
    amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payments IS 'Платежи: от клиента (оплата заказа) и монтажникам (выплаты)';

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_installer ON payments(installer_id);

-- =================================================================
-- ТАБЛИЦА FINANCE (расширенная)
-- =================================================================
CREATE TABLE IF NOT EXISTS finance (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    revenue NUMERIC(10,2) DEFAULT 0,                     -- выручка от продаж (sale_price * quantity)
    cost_of_goods NUMERIC(10,2) DEFAULT 0,                -- себестоимость товаров (purchase_price * quantity)
    installer_payments NUMERIC(10,2) DEFAULT 0,           -- выплаты монтажникам (из order_item_installers и order_installers)
    expenses NUMERIC(10,2) DEFAULT 0,                     -- непредвиденные расходы
    warranty_costs_oleg NUMERIC(10,2) DEFAULT 0,          -- гарантийные расходы за счёт Олега
    warranty_costs_installer NUMERIC(10,2) DEFAULT 0,     -- гарантийные расходы, отнесённые на монтажников
    profit NUMERIC(10,2) GENERATED ALWAYS AS (
        revenue - cost_of_goods - installer_payments - expenses - warranty_costs_oleg
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_installers_order ON order_installers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_expenses_order ON order_expenses(order_id);

-- -----------------------------------------------------------------
-- 15. ФУНКЦИЯ ДЛЯ АВТООБНОВЛЕНИЯ updated_at
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------
-- 16. ТРИГГЕРЫ updated_at для всех таблиц
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_installers_updated_at') THEN
        CREATE TRIGGER trg_installers_updated_at BEFORE UPDATE ON installers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
        CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
        CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_finance_updated_at') THEN
        CREATE TRIGGER trg_finance_updated_at BEFORE UPDATE ON finance FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_address_cache_updated_at') THEN
        CREATE TRIGGER trg_address_cache_updated_at BEFORE UPDATE ON address_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_weather_updated_at') THEN
        CREATE TRIGGER trg_weather_updated_at BEFORE UPDATE ON weather FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_items_updated_at') THEN
        CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_installers_updated_at') THEN
        CREATE TRIGGER trg_order_installers_updated_at BEFORE UPDATE ON order_installers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_item_installers_updated_at') THEN
        CREATE TRIGGER trg_order_item_installers_updated_at BEFORE UPDATE ON order_item_installers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_expenses_updated_at') THEN
        CREATE TRIGGER trg_order_expenses_updated_at BEFORE UPDATE ON order_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_warranty_claims_updated_at') THEN
        CREATE TRIGGER trg_warranty_claims_updated_at BEFORE UPDATE ON warranty_claims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payments_updated_at') THEN
        CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 17. ФУНКЦИЯ И ТРИГГЕР ДЛЯ ПОДСЧЁТА total_orders (через order_installers)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_installer_total_orders()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Выполнен' AND (OLD.status IS DISTINCT FROM 'Выполнен' OR TG_OP = 'INSERT') THEN
        UPDATE installers SET total_orders = total_orders + 1
        WHERE id IN (SELECT installer_id FROM order_installers WHERE order_id = NEW.id);
    END IF;
    IF OLD.status = 'Выполнен' AND NEW.status != 'Выполнен' THEN
        UPDATE installers SET total_orders = total_orders - 1
        WHERE id IN (SELECT installer_id FROM order_installers WHERE order_id = OLD.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_completed') THEN
        CREATE TRIGGER trg_order_completed
            AFTER INSERT OR UPDATE OF status ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_installer_total_orders();
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 18. ФУНКЦИЯ И ТРИГГЕР ДЛЯ СТАТИСТИКИ ИНЦИДЕНТОВ (с учётом привязки к монтажникам)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_installer_stats_from_claims()
RETURNS TRIGGER AS $$
DECLARE
    v_installer_id INTEGER;
    v_order_id INTEGER;
BEGIN
    -- Получаем order_id через order_item
    SELECT order_id INTO v_order_id FROM order_items WHERE id = NEW.order_item_id;

    IF TG_OP = 'INSERT' THEN
        IF NEW.fault_type = 'installer' THEN
            UPDATE installers SET 
                poor_work_count = poor_work_count + 1,
                last_incident_date = NEW.claim_date
            WHERE id = NEW.responsible_installer_id;
        ELSE
            -- Для гарантийного выезда (не по вине монтажника) увеличиваем счётчик у монтажников,
            -- которые выполняли эту позицию (через order_item_installers)
            UPDATE installers SET 
                warranty_visits_count = warranty_visits_count + 1,
                last_incident_date = NEW.claim_date
            WHERE id IN (
                SELECT installer_id FROM order_item_installers WHERE order_item_id = NEW.order_item_id
            );
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.fault_type = 'installer' THEN
            UPDATE installers SET poor_work_count = poor_work_count - 1
            WHERE id = OLD.responsible_installer_id;
        ELSE
            UPDATE installers SET warranty_visits_count = warranty_visits_count - 1
            WHERE id IN (
                SELECT installer_id FROM order_item_installers WHERE order_item_id = OLD.order_item_id
            );
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_installer_stats_from_claims') THEN
        CREATE TRIGGER trg_installer_stats_from_claims
            AFTER INSERT OR DELETE ON warranty_claims
            FOR EACH ROW
            EXECUTE FUNCTION update_installer_stats_from_claims();
    END IF;
END $$;
-- -----------------------------------------------------------------
-- 19. ФУНКЦИЯ ДЛЯ ПЕРЕСЧЁТА РЕЙТИНГА КАЧЕСТВА (РЕГЛАМЕНТНАЯ)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalc_all_quality_scores()
RETURNS VOID AS $$
BEGIN
    UPDATE installers SET quality_score = 
        CASE 
            WHEN total_orders > 0 
            THEN (total_orders - poor_work_count - warranty_visits_count)::NUMERIC / total_orders::NUMERIC
            ELSE 10.0 
        END;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------
-- 20. ФУНКЦИЯ И ТРИГГЕР ДЛЯ ИСТОРИИ СТАТУСОВ
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, changed_at)
        VALUES (NEW.id, NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_status_history') THEN
        CREATE TRIGGER trg_order_status_history
            AFTER UPDATE OF status ON orders
            FOR EACH ROW
            EXECUTE FUNCTION log_order_status_change();
    END IF;
END $$;

-- -----------------------------------------------------------------
-- 21. ФУНКЦИЯ ДЛЯ ПЕРЕСЧЁТА АГРЕГАТОВ FINANCE (расширенная)
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalc_order_finance(p_order_id INTEGER)
RETURNS VOID AS $$
DECLARE
    v_revenue NUMERIC(10,2);
    v_cost_of_goods NUMERIC(10,2);
    v_installer_payments NUMERIC(10,2);
    v_expenses NUMERIC(10,2);
    v_warranty_oleg NUMERIC(10,2);
    v_warranty_installer NUMERIC(10,2);
BEGIN
    -- Выручка и себестоимость товаров
    SELECT COALESCE(SUM(sale_price * quantity), 0),
           COALESCE(SUM(purchase_price * quantity), 0)
    INTO v_revenue, v_cost_of_goods
    FROM order_items
    WHERE order_id = p_order_id;

    -- Выплаты монтажникам (суммируем base_payment из order_installers + payment_amount из order_item_installers)
    SELECT COALESCE(SUM(base_payment), 0) INTO v_installer_payments
    FROM order_installers
    WHERE order_id = p_order_id;

    SELECT COALESCE(SUM(payment_amount), 0) INTO v_installer_payments
    FROM order_item_installers oii
    JOIN order_items oi ON oii.order_item_id = oi.id
    WHERE oi.order_id = p_order_id;

    -- Непредвиденные расходы
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM order_expenses
    WHERE order_id = p_order_id;

    -- Гарантийные расходы
    SELECT COALESCE(SUM(cost), 0) INTO v_warranty_oleg
    FROM warranty_claims wc
    JOIN order_items oi ON wc.order_item_id = oi.id
    WHERE oi.order_id = p_order_id AND wc.cost_covered_by = 'oleg';

    SELECT COALESCE(SUM(cost), 0) INTO v_warranty_installer
    FROM warranty_claims wc
    JOIN order_items oi ON wc.order_item_id = oi.id
    WHERE oi.order_id = p_order_id AND wc.cost_covered_by = 'installer';

    -- Вставляем или обновляем запись в finance
    INSERT INTO finance (
        order_id, revenue, cost_of_goods, installer_payments, expenses,
        warranty_costs_oleg, warranty_costs_installer
    ) VALUES (
        p_order_id, v_revenue, v_cost_of_goods, v_installer_payments, v_expenses,
        v_warranty_oleg, v_warranty_installer
    )
    ON CONFLICT (order_id) DO UPDATE SET
        revenue = EXCLUDED.revenue,
        cost_of_goods = EXCLUDED.cost_of_goods,
        installer_payments = EXCLUDED.installer_payments,
        expenses = EXCLUDED.expenses,
        warranty_costs_oleg = EXCLUDED.warranty_costs_oleg,
        warranty_costs_installer = EXCLUDED.warranty_costs_installer,
        updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического пересчёта finance
CREATE OR REPLACE FUNCTION trigger_recalc_finance()
RETURNS TRIGGER AS $$
DECLARE
    affected_order_id INTEGER;
BEGIN
    -- Определяем, из какой таблицы пришёл вызов
    IF TG_TABLE_NAME = 'warranty_claims' THEN
        -- Для гарантийных случаев order_id получаем через order_items
        IF TG_OP = 'DELETE' THEN
            SELECT order_id INTO affected_order_id FROM order_items WHERE id = OLD.order_item_id;
        ELSE
            SELECT order_id INTO affected_order_id FROM order_items WHERE id = NEW.order_item_id;
        END IF;
    ELSE
        -- Для остальных таблиц есть прямое поле order_id
        IF TG_OP = 'DELETE' THEN
            affected_order_id := OLD.order_id;
        ELSE
            affected_order_id := NEW.order_id;
        END IF;
    END IF;

    PERFORM recalc_order_finance(affected_order_id);
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_items_recalc_finance') THEN
        CREATE TRIGGER trg_order_items_recalc_finance
            AFTER INSERT OR UPDATE OR DELETE ON order_items
            FOR EACH ROW EXECUTE FUNCTION trigger_recalc_finance();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_installers_recalc_finance') THEN
        CREATE TRIGGER trg_order_installers_recalc_finance
            AFTER INSERT OR UPDATE OR DELETE ON order_installers
            FOR EACH ROW EXECUTE FUNCTION trigger_recalc_finance();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_item_installers_recalc_finance') THEN
        CREATE TRIGGER trg_order_item_installers_recalc_finance
            AFTER INSERT OR UPDATE OR DELETE ON order_item_installers
            FOR EACH ROW EXECUTE FUNCTION trigger_recalc_finance();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_expenses_recalc_finance') THEN
        CREATE TRIGGER trg_order_expenses_recalc_finance
            AFTER INSERT OR UPDATE OR DELETE ON order_expenses
            FOR EACH ROW EXECUTE FUNCTION trigger_recalc_finance();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_warranty_claims_recalc_finance') THEN
        CREATE TRIGGER trg_warranty_claims_recalc_finance
            AFTER INSERT OR UPDATE OR DELETE ON warranty_claims
            FOR EACH ROW EXECUTE FUNCTION trigger_recalc_finance();
    END IF;
END $$;
-- -----------------------------------------------------------------
-- 22. КОММЕНТАРИИ
-- -----------------------------------------------------------------
COMMENT ON TABLE installers IS 'Монтажники, включая рейтинг и статистику брака/гарантии';
COMMENT ON COLUMN installers.poor_work_count IS 'Количество заказов с некачественной установкой (брак/переделка)';
COMMENT ON COLUMN installers.warranty_visits_count IS 'Количество гарантийных выездов (не по вине монтажника)';
COMMENT ON COLUMN installers.quality_score IS 'Доля успешных заказов (без брака и гарантии)';
COMMENT ON TABLE warranty_claims IS 'Гарантийные случаи, привязанные к позициям заказа';
COMMENT ON TABLE order_items IS 'Позиции заказа (товары и услуги)';
COMMENT ON TABLE order_expenses IS 'Непредвиденные расходы по заказу';
COMMENT ON TABLE order_installers IS 'Монтажники, задействованные в заказе';
COMMENT ON TABLE order_item_installers IS 'Связь позиций с конкретными монтажниками (детализация работ и оплаты)';
COMMENT ON TABLE payments IS 'Платежи от клиента и монтажникам';
COMMENT ON TABLE finance IS 'Финансовая сводка по заказу';

COMMIT;
-- =====================================================
-- ГОТОВО: СХЕМА ПОЛНОСТЬЮ РАЗВЁРНУТА
-- =====================================================