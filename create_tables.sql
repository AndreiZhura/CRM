-- 1. УДАЛЕНИЕ СУЩЕСТВУЮЩИХ ОБЪЕКТОВ (раскомментировать при необходимости)
-- DROP TABLE IF EXISTS finance, order_status_history, orders, address_cache, clients, installers, admins CASCADE;
-- DROP TYPE IF EXISTS order_status, payment_status;

-- 2. ПОЛЬЗОВАТЕЛЬСКИЕ ТИПЫ
CREATE TYPE order_status AS ENUM (
    'Новый', 'Ждет установщика', 'В работе', 'Выполнен', 'Отменен'
);
CREATE TYPE payment_status AS ENUM (
    'Не оплачен', 'Частично', 'Оплачен'
);

-- 3. ТАБЛИЦА АДМИНИСТРАТОРОВ
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL CHECK (LENGTH(password_hash) >= 60),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. ТАБЛИЦА МОНТАЖНИКОВ
CREATE TABLE installers (
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. ТАБЛИЦА КЛИЕНТОВ
CREATE TABLE clients (
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

-- 6. ТАБЛИЦА ГЕОДАННЫХ (КЭШ)
CREATE TABLE address_cache (
    address TEXT PRIMARY KEY,
    lat NUMERIC(10,7) NOT NULL,
    lon NUMERIC(10,7) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. ТАБЛИЦА ЗАКАЗОВ (с жёсткой связью к address_cache)
CREATE TABLE orders (
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
    -- Жёсткая связь с address_cache
    address_id TEXT NOT NULL REFERENCES address_cache(address) ON DELETE RESTRICT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. ИСТОРИЯ СТАТУСОВ ЗАКАЗОВ
CREATE TABLE order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    status order_status NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. ФИНАНСОВАЯ ТАБЛИЦА
CREATE TABLE finance (
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

-- 10. ИНДЕКСЫ
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(service_datetime);
CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_finance_payment ON finance(payment_state);
