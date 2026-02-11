-- =====================================================
-- ПРОЕКТ LUMEN ALPHA: ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ (HVAC CRM)
-- Версия: 3.1 (ФИНАЛЬНАЯ, С ДОРАБОТКАМИ)
-- Режим: Идемпотентный — безопасен для повторного запуска
-- =====================================================

BEGIN;

-- -----------------------------------------------------------------
-- 1. ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ (создаём, если не существуют)
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
        CREATE TYPE order_status AS ENUM (
            'Новый', 'Ждет установщика', 'В работе', 'Выполнен', 'Отменен'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM (
            'Не оплачен', 'Частично', 'Оплачен'
        );
    END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_type') THEN
        CREATE TYPE incident_type AS ENUM (
            'poor_work',        -- некачественная работа (брак/переделка)
            'warranty_visit'    -- гарантийный выезд (любой)
        );
    END IF;
END
$$;

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
    quality_score NUMERIC(3,2) GENERATED ALWAYS AS (
        CASE 
            WHEN total_orders > 0 
            THEN (total_orders - poor_work_count - warranty_visits_count)::NUMERIC / total_orders::NUMERIC
            ELSE 10.0
        END
    ) STORED,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- 4. ТАБЛИЦА КЛИЕНТОВ
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    coordinates POINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_contact TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
-- 6. ТАБЛИЦА ЗАКАЗОВ (с денормализованным адресом)
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE RESTRICT,
    installer_id INTEGER REFERENCES installers(id) ON DELETE SET NULL,
    status order_status DEFAULT 'Новый',
    service_type VARCHAR(100) NOT NULL,
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

-- -----------------------------------------------------------------
-- 8. ФИНАНСОВАЯ ТАБЛИЦА
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS finance (
    id SERIAL PRIMARY KEY,
    order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
    sale_price_client NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (sale_price_client >= 0),
    installer_pay NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (installer_pay >= 0),
    my_commission NUMERIC(10,2) DEFAULT 0 CHECK (my_commission >= 0),
    profit NUMERIC(10,2) GENERATED ALWAYS AS (
        sale_price_client - purchase_price - installer_pay - my_commission
    ) STORED,
    installer_returned_money BOOLEAN DEFAULT FALSE,
    payment_state payment_status DEFAULT 'Не оплачен',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------
-- 9. ЖУРНАЛ ИНЦИДЕНТОВ (брак / гарантийные выезды) с аудитом
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS installer_incidents (
    id SERIAL PRIMARY KEY,
    installer_id INTEGER REFERENCES installers(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    incident_type incident_type NOT NULL,
    description TEXT,
    reported_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    updated_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    updated_at TIMESTAMP,
    resolved_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    CONSTRAINT unique_incident_per_order UNIQUE (order_id, incident_type)
);

-- -----------------------------------------------------------------
-- 10. ИНДЕКСЫ (с проверкой существования)
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_date') THEN
        CREATE INDEX idx_orders_date ON orders(service_datetime);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_clients_phone') THEN
        CREATE INDEX idx_clients_phone ON clients(phone);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_finance_payment') THEN
        CREATE INDEX idx_finance_payment ON finance(payment_state);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_orders_location') THEN
        CREATE INDEX idx_orders_location ON orders(address_id) INCLUDE (marker_color);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_installer') THEN
        CREATE INDEX idx_incidents_installer ON installer_incidents(installer_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_type') THEN
        CREATE INDEX idx_incidents_type ON installer_incidents(incident_type);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_incidents_date') THEN
        CREATE INDEX idx_incidents_date ON installer_incidents(created_at);
    END IF;
END
$$;

-- -----------------------------------------------------------------
-- 11. ФУНКЦИЯ ДЛЯ АВТООБНОВЛЕНИЯ updated_at
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------
-- 12. ТРИГГЕРЫ updated_at (с проверкой существования)
-- -----------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_installers_updated_at') THEN
        CREATE TRIGGER trg_installers_updated_at 
            BEFORE UPDATE ON installers
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_updated_at') THEN
        CREATE TRIGGER trg_clients_updated_at 
            BEFORE UPDATE ON clients
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_orders_updated_at') THEN
        CREATE TRIGGER trg_orders_updated_at 
            BEFORE UPDATE ON orders
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_finance_updated_at') THEN
        CREATE TRIGGER trg_finance_updated_at 
            BEFORE UPDATE ON finance
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_address_cache_updated_at') THEN
        CREATE TRIGGER trg_address_cache_updated_at 
            BEFORE UPDATE ON address_cache
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incidents_updated_at') THEN
        CREATE TRIGGER trg_incidents_updated_at
            BEFORE UPDATE ON installer_incidents
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- -----------------------------------------------------------------
-- 13. ФУНКЦИЯ И ТРИГГЕР ДЛЯ ПОДСЧЁТА total_orders
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_installer_total_orders()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Выполнен' AND (OLD.status IS DISTINCT FROM 'Выполнен' OR TG_OP = 'INSERT') THEN
        UPDATE installers SET total_orders = total_orders + 1
        WHERE id = NEW.installer_id;
    END IF;
    IF OLD.status = 'Выполнен' AND NEW.status != 'Выполнен' AND OLD.installer_id IS NOT NULL THEN
        UPDATE installers SET total_orders = total_orders - 1
        WHERE id = OLD.installer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_order_completed') THEN
        CREATE TRIGGER trg_order_completed
            AFTER INSERT OR UPDATE OF installer_id, status ON orders
            FOR EACH ROW
            EXECUTE FUNCTION update_installer_total_orders();
    END IF;
END
$$;

-- -----------------------------------------------------------------
-- 14. ФУНКЦИЯ И ТРИГГЕР ДЛЯ СТАТИСТИКИ ИНЦИДЕНТОВ
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_installer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.incident_type = 'poor_work' THEN
            UPDATE installers SET 
                poor_work_count = poor_work_count + 1,
                last_incident_date = NEW.created_at
            WHERE id = NEW.installer_id;
        ELSIF NEW.incident_type = 'warranty_visit' THEN
            UPDATE installers SET 
                warranty_visits_count = warranty_visits_count + 1,
                last_incident_date = NEW.created_at
            WHERE id = NEW.installer_id;
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN
        IF OLD.incident_type = 'poor_work' THEN
            UPDATE installers SET 
                poor_work_count = poor_work_count - 1
            WHERE id = OLD.installer_id;
        ELSIF OLD.incident_type = 'warranty_visit' THEN
            UPDATE installers SET 
                warranty_visits_count = warranty_visits_count - 1
            WHERE id = OLD.installer_id;
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incident_stats') THEN
        CREATE TRIGGER trg_incident_stats
            AFTER INSERT OR DELETE ON installer_incidents
            FOR EACH ROW
            EXECUTE FUNCTION update_installer_stats();
    END IF;
END
$$;

-- -----------------------------------------------------------------
-- 15. ФУНКЦИЯ ДЛЯ ПЕРЕСЧЁТА РЕЙТИНГА КАЧЕСТВА (РЕГЛАМЕНТНАЯ)
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
-- 16. ФУНКЦИЯ И ТРИГГЕР ДЛЯ ИСТОРИИ СТАТУСОВ
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
END
$$;

-- -----------------------------------------------------------------
-- 17. КОММЕНТАРИИ (ДОКУМЕНТИРОВАНИЕ)
-- -----------------------------------------------------------------
COMMENT ON TABLE installers IS 'Монтажники, включая рейтинг и статистику брака/гарантии';
COMMENT ON COLUMN installers.poor_work_count IS 'Количество заказов с некачественной установкой (брак/переделка)';
COMMENT ON COLUMN installers.warranty_visits_count IS 'Количество гарантийных выездов по вине монтажника';
COMMENT ON COLUMN installers.quality_score IS 'Доля успешных заказов (без брака и гарантии)';
COMMENT ON TABLE installer_incidents IS 'Журнал всех инцидентов: брак и гарантийные выезды с привязкой к заказу';
COMMENT ON COLUMN installer_incidents.incident_type IS 'poor_work — некачественная работа, warranty_visit — гарантийный выезд';

-- -----------------------------------------------------------------
COMMIT;
-- =====================================================
-- ГОТОВО: СХЕМА ПОЛНОСТЬЮ РАЗВЁРНУТА
-- =====================================================