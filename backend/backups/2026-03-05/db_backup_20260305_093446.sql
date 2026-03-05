--
-- PostgreSQL database dump
--

\restrict aFIlII6VQf2XSf1HVECO6p6IOD2C2j6p2tRZwjddPmeZTwqGQxuBqd7mFe0DRJA

-- Dumped from database version 15.15
-- Dumped by pg_dump version 18.2 (Ubuntu 18.2-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: claim_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.claim_status AS ENUM (
    'open',
    'in_progress',
    'closed',
    'rejected'
);


ALTER TYPE public.claim_status OWNER TO admin;

--
-- Name: cost_covered_by; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.cost_covered_by AS ENUM (
    'manufacturer',
    'installer',
    'oleg'
);


ALTER TYPE public.cost_covered_by OWNER TO admin;

--
-- Name: fault_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.fault_type AS ENUM (
    'manufacturer',
    'installer',
    'other'
);


ALTER TYPE public.fault_type OWNER TO admin;

--
-- Name: item_type; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.item_type AS ENUM (
    'product',
    'service'
);


ALTER TYPE public.item_type OWNER TO admin;

--
-- Name: order_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.order_status AS ENUM (
    'Новый',
    'Ждет установщика',
    'В работе',
    'Выполнен',
    'Отменен'
);


ALTER TYPE public.order_status OWNER TO admin;

--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.payment_status AS ENUM (
    'Не оплачен',
    'Частично',
    'Оплачен'
);


ALTER TYPE public.payment_status OWNER TO admin;

--
-- Name: log_order_status_change(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.log_order_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO order_status_history (order_id, status, changed_at)
        VALUES (NEW.id, NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_order_status_change() OWNER TO admin;

--
-- Name: recalc_all_quality_scores(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.recalc_all_quality_scores() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE installers SET quality_score = 
        CASE 
            WHEN total_orders > 0 
            THEN (total_orders - poor_work_count - warranty_visits_count)::NUMERIC / total_orders::NUMERIC
            ELSE 10.0 
        END;
END;
$$;


ALTER FUNCTION public.recalc_all_quality_scores() OWNER TO admin;

--
-- Name: recalc_order_finance(integer); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.recalc_order_finance(p_order_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
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

    -- Выплаты монтажникам: суммируем base_payment из order_installers
    SELECT COALESCE(SUM(base_payment), 0) INTO v_installer_payments
    FROM order_installers
    WHERE order_id = p_order_id;

    -- Добавляем выплаты из order_item_installers
    SELECT v_installer_payments + COALESCE(SUM(payment_amount), 0) INTO v_installer_payments
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
$$;


ALTER FUNCTION public.recalc_order_finance(p_order_id integer) OWNER TO admin;

--
-- Name: trigger_recalc_finance(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.trigger_recalc_finance() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.trigger_recalc_finance() OWNER TO admin;

--
-- Name: update_installer_stats_from_claims(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.update_installer_stats_from_claims() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_installer_stats_from_claims() OWNER TO admin;

--
-- Name: update_installer_total_orders(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.update_installer_total_orders() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.update_installer_total_orders() OWNER TO admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: address_cache; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.address_cache (
    address text NOT NULL,
    lat numeric(10,7) NOT NULL,
    lon numeric(10,7) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.address_cache OWNER TO admin;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT admins_password_hash_check CHECK ((length(password_hash) >= 60))
);


ALTER TABLE public.admins OWNER TO admin;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_id_seq OWNER TO admin;

--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    full_name text NOT NULL,
    phone character varying(20) NOT NULL,
    backup_phone character varying(20),
    address text NOT NULL,
    coordinates point,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_contact timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    comments text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


ALTER TABLE public.clients OWNER TO admin;

--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO admin;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: finance; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.finance (
    id integer NOT NULL,
    order_id integer NOT NULL,
    revenue numeric(10,2) DEFAULT 0,
    cost_of_goods numeric(10,2) DEFAULT 0,
    installer_payments numeric(10,2) DEFAULT 0,
    expenses numeric(10,2) DEFAULT 0,
    warranty_costs_oleg numeric(10,2) DEFAULT 0,
    warranty_costs_installer numeric(10,2) DEFAULT 0,
    profit numeric(10,2) GENERATED ALWAYS AS (((((revenue - cost_of_goods) - installer_payments) - expenses) - warranty_costs_oleg)) STORED,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.finance OWNER TO admin;

--
-- Name: TABLE finance; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.finance IS 'Финансовая сводка по заказу';


--
-- Name: finance_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.finance_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.finance_id_seq OWNER TO admin;

--
-- Name: finance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.finance_id_seq OWNED BY public.finance.id;


--
-- Name: installers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.installers (
    id integer NOT NULL,
    full_name text NOT NULL,
    nickname text,
    phone character varying(20) NOT NULL,
    backup_phone character varying(20),
    specialization text[] NOT NULL,
    rating numeric(3,1) DEFAULT 10.0,
    base_price numeric(10,2) DEFAULT 0,
    is_debtor boolean DEFAULT false,
    comments text,
    is_active boolean DEFAULT true,
    is_in_funnel boolean DEFAULT true,
    total_orders integer DEFAULT 0,
    poor_work_count integer DEFAULT 0,
    warranty_visits_count integer DEFAULT 0,
    last_incident_date timestamp without time zone,
    quality_score numeric(4,2) GENERATED ALWAYS AS (
CASE
    WHEN (total_orders > 0) THEN ((((total_orders - poor_work_count) - warranty_visits_count))::numeric / (total_orders)::numeric)
    ELSE 10.0
END) STORED,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    CONSTRAINT installers_base_price_check CHECK ((base_price >= (0)::numeric)),
    CONSTRAINT installers_poor_work_count_check CHECK ((poor_work_count >= 0)),
    CONSTRAINT installers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (10)::numeric))),
    CONSTRAINT installers_total_orders_check CHECK ((total_orders >= 0)),
    CONSTRAINT installers_warranty_visits_count_check CHECK ((warranty_visits_count >= 0))
);


ALTER TABLE public.installers OWNER TO admin;

--
-- Name: TABLE installers; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.installers IS 'Монтажники, включая рейтинг и статистику брака/гарантии';


--
-- Name: COLUMN installers.poor_work_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.installers.poor_work_count IS 'Количество заказов с некачественной установкой (брак/переделка)';


--
-- Name: COLUMN installers.warranty_visits_count; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.installers.warranty_visits_count IS 'Количество гарантийных выездов (не по вине монтажника)';


--
-- Name: COLUMN installers.quality_score; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.installers.quality_score IS 'Доля успешных заказов (без брака и гарантии)';


--
-- Name: installers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.installers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.installers_id_seq OWNER TO admin;

--
-- Name: installers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.installers_id_seq OWNED BY public.installers.id;


--
-- Name: order_expenses; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_expenses (
    id integer NOT NULL,
    order_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    description text,
    expense_date date DEFAULT CURRENT_DATE NOT NULL,
    category character varying(50) DEFAULT 'other'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_expenses_amount_check CHECK ((amount >= (0)::numeric))
);


ALTER TABLE public.order_expenses OWNER TO admin;

--
-- Name: TABLE order_expenses; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_expenses IS 'Непредвиденные расходы по заказу';


--
-- Name: order_expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_expenses_id_seq OWNER TO admin;

--
-- Name: order_expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_expenses_id_seq OWNED BY public.order_expenses.id;


--
-- Name: order_installers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_installers (
    id integer NOT NULL,
    order_id integer NOT NULL,
    installer_id integer NOT NULL,
    role character varying(50) NOT NULL,
    base_payment numeric(10,2) DEFAULT 0 NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_installers_base_payment_check CHECK ((base_payment >= (0)::numeric))
);


ALTER TABLE public.order_installers OWNER TO admin;

--
-- Name: TABLE order_installers; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_installers IS 'Монтажники, задействованные в заказе';


--
-- Name: order_installers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_installers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_installers_id_seq OWNER TO admin;

--
-- Name: order_installers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_installers_id_seq OWNED BY public.order_installers.id;


--
-- Name: order_item_installers; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_item_installers (
    id integer NOT NULL,
    order_item_id integer NOT NULL,
    installer_id integer NOT NULL,
    payment_amount numeric(10,2) DEFAULT 0 NOT NULL,
    work_description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_item_installers_payment_amount_check CHECK ((payment_amount >= (0)::numeric))
);


ALTER TABLE public.order_item_installers OWNER TO admin;

--
-- Name: TABLE order_item_installers; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_item_installers IS 'Связь позиций с конкретными монтажниками (детализация работ и оплаты)';


--
-- Name: order_item_installers_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_item_installers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_item_installers_id_seq OWNER TO admin;

--
-- Name: order_item_installers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_item_installers_id_seq OWNED BY public.order_item_installers.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer NOT NULL,
    item_type public.item_type NOT NULL,
    name text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    purchase_price numeric(10,2) DEFAULT 0 NOT NULL,
    sale_price numeric(10,2) DEFAULT 0 NOT NULL,
    warranty_manufacturer integer DEFAULT 0 NOT NULL,
    warranty_master integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT order_items_purchase_price_check CHECK ((purchase_price >= (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_sale_price_check CHECK ((sale_price >= (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO admin;

--
-- Name: TABLE order_items; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.order_items IS 'Позиции заказа (товары и услуги)';


--
-- Name: COLUMN order_items.warranty_manufacturer; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_items.warranty_manufacturer IS 'Гарантия производителя (лет), только для товаров';


--
-- Name: COLUMN order_items.warranty_master; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.order_items.warranty_master IS 'Гарантия мастера (лет), только для услуг';


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO admin;

--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: order_status_history; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.order_status_history (
    id integer NOT NULL,
    order_id integer,
    status public.order_status NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.order_status_history OWNER TO admin;

--
-- Name: order_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.order_status_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_status_history_id_seq OWNER TO admin;

--
-- Name: order_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.order_status_history_id_seq OWNED BY public.order_status_history.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    client_id integer,
    status public.order_status DEFAULT 'Новый'::public.order_status,
    warehouse text,
    service_datetime timestamp without time zone NOT NULL,
    delivery_datetime timestamp without time zone,
    promise text,
    marker_color character varying(10),
    address_id text,
    address_text text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.orders OWNER TO admin;

--
-- Name: COLUMN orders.address_text; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.orders.address_text IS 'Денормализованный адрес для сохранения при очистке кэша';


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO admin;

--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    order_id integer NOT NULL,
    payment_type character varying(20) NOT NULL,
    installer_id integer,
    amount numeric(10,2) NOT NULL,
    payment_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT payments_payment_type_check CHECK (((payment_type)::text = ANY ((ARRAY['client'::character varying, 'installer'::character varying])::text[])))
);


ALTER TABLE public.payments OWNER TO admin;

--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.payments IS 'Платежи от клиента и монтажникам';


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payments_id_seq OWNER TO admin;

--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: warranty_claims; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.warranty_claims (
    id integer NOT NULL,
    order_item_id integer NOT NULL,
    claim_date date NOT NULL,
    description text,
    fault_type public.fault_type NOT NULL,
    responsible_installer_id integer,
    resolution text,
    resolving_installer_id integer,
    cost numeric(10,2) DEFAULT 0 NOT NULL,
    cost_covered_by public.cost_covered_by DEFAULT 'oleg'::public.cost_covered_by NOT NULL,
    status public.claim_status DEFAULT 'open'::public.claim_status,
    closed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.warranty_claims OWNER TO admin;

--
-- Name: TABLE warranty_claims; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON TABLE public.warranty_claims IS 'Гарантийные случаи, привязанные к позициям заказа';


--
-- Name: COLUMN warranty_claims.fault_type; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warranty_claims.fault_type IS 'Тип вины: manufacturer (производитель), installer (монтажник), other';


--
-- Name: COLUMN warranty_claims.cost_covered_by; Type: COMMENT; Schema: public; Owner: admin
--

COMMENT ON COLUMN public.warranty_claims.cost_covered_by IS 'Кто покрывает расходы: manufacturer, installer, oleg';


--
-- Name: warranty_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.warranty_claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warranty_claims_id_seq OWNER TO admin;

--
-- Name: warranty_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.warranty_claims_id_seq OWNED BY public.warranty_claims.id;


--
-- Name: weather; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.weather (
    id integer NOT NULL,
    date date NOT NULL,
    location character varying(100) NOT NULL,
    lat numeric(10,7),
    lon numeric(10,7),
    temperature_avg numeric(4,1),
    temperature_min numeric(4,1),
    temperature_max numeric(4,1),
    humidity integer,
    pressure integer,
    wind_speed numeric(4,1),
    precipitation numeric(5,2),
    weather_condition character varying(50),
    source character varying(20) DEFAULT 'open-meteo'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.weather OWNER TO admin;

--
-- Name: weather_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.weather_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weather_id_seq OWNER TO admin;

--
-- Name: weather_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.weather_id_seq OWNED BY public.weather.id;


--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: finance id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.finance ALTER COLUMN id SET DEFAULT nextval('public.finance_id_seq'::regclass);


--
-- Name: installers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.installers ALTER COLUMN id SET DEFAULT nextval('public.installers_id_seq'::regclass);


--
-- Name: order_expenses id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_expenses ALTER COLUMN id SET DEFAULT nextval('public.order_expenses_id_seq'::regclass);


--
-- Name: order_installers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_installers ALTER COLUMN id SET DEFAULT nextval('public.order_installers_id_seq'::regclass);


--
-- Name: order_item_installers id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_item_installers ALTER COLUMN id SET DEFAULT nextval('public.order_item_installers_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: order_status_history id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_status_history ALTER COLUMN id SET DEFAULT nextval('public.order_status_history_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: warranty_claims id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warranty_claims ALTER COLUMN id SET DEFAULT nextval('public.warranty_claims_id_seq'::regclass);


--
-- Name: weather id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weather ALTER COLUMN id SET DEFAULT nextval('public.weather_id_seq'::regclass);


--
-- Data for Name: address_cache; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.address_cache (address, lat, lon, updated_at) FROM stdin;
Московская область, г. Мытищи, ул. Мира, д. 8, офис 302	55.9124610	37.7335090	2026-02-28 10:30:25.150276
Россия, Москва, Ленинский проспект, 15, подъезд 3, кв. 78	55.7202000	37.6002080	2026-03-01 14:06:21.146517
Россия, Московская область, Мытищи, улица Мира, 8	55.9124610	37.7335090	2026-03-01 14:07:17.830603
Россия, Москва, улица Академика Королёва, 10, подъезд 2, этаж 6, кв. 55	55.8228780	37.6198630	2026-03-01 14:32:54.162656
Россия, Москва, улица Новый Арбат, 24	55.7530830	37.5876230	2026-03-01 14:46:33.764076
Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	55.6448410	37.5259080	2026-03-01 15:01:43.924601
Москва, ул. Тверская, д. 12, кв. 45	55.7633050	37.6093710	2026-03-02 11:25:49.552057
\.


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.admins (id, username, password_hash, created_at) FROM stdin;
1	zhura2296@yandex.ru	$2b$12$aX5KZyRJeENoQKJqqCQ9f.ajTpektMruBAx6xbK8JiyMNgLb92PDm	2026-02-28 09:21:01.990457
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.clients (id, full_name, phone, backup_phone, address, coordinates, created_at, last_contact, comments, updated_at, deleted_at) FROM stdin;
1	Смирнов Алексей Викторович	+79031234567	+79039876543	Москва, ул. Тверская, д. 12, кв. 45	\N	2026-02-28 10:16:26.321112	2026-02-28 10:16:26.321112		\N	\N
2	ООО "Ромашка" (контакт: Елена)	+74951234567	+74959876543	Россия, Московская область, Мытищи, улица Мира, 8	\N	2026-02-28 10:30:25.01176	2026-02-28 10:30:25.01176		\N	\N
3	Кузнецов Дмитрий Андреевич	+79161112233	+79162223344	Россия, Москва, Ленинский проспект, 15, подъезд 3, кв. 78	\N	2026-03-01 14:02:49.725327	2026-03-01 14:02:49.725327	Вход через арку, второй подъезд, код домофона 78В	\N	\N
4	Петров Пётр Петрович	+79262223344		Россия, Москва, Ленинский проспект, 15, подъезд 3, кв. 78	\N	2026-03-01 14:07:17.717734	2026-03-01 14:07:17.717734		\N	\N
5	Фёдоров Игорь Николаевич	+79068887744	+79067778833	Россия, Москва, улица Академика Королёва, 10, подъезд 2, этаж 6, кв. 55	\N	2026-03-01 14:32:54.039823	2026-03-01 14:32:54.039823		\N	\N
6	ИП Смирнова Елена Викторовна	+74991234567	+74999876543	Россия, Москва, улица Новый Арбат, 24	\N	2026-03-01 14:46:33.641408	2026-03-01 14:46:33.641408	Офис работает, просьба не шуметь	\N	\N
7	Соколов Дмитрий Иванович	+79168887755	+79167778844	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	\N	2026-03-01 14:57:37.957812	2026-03-01 14:57:37.957812		\N	\N
8	Соколов Дмитрий Иванович	+79168887755	+79167778844	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	\N	2026-03-01 15:01:43.743695	2026-03-01 15:01:43.743695		\N	\N
\.


--
-- Data for Name: finance; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.finance (id, order_id, revenue, cost_of_goods, installer_payments, expenses, warranty_costs_oleg, warranty_costs_installer, created_at, updated_at) FROM stdin;
1	1	42000.00	25000.00	0.00	0.00	0.00	0.00	2026-02-28 10:16:26.626515	2026-02-28 10:16:26.665546
3	2	115000.00	60000.00	13000.00	3500.00	0.00	0.00	2026-02-28 10:30:25.227486	2026-02-28 11:09:15.194393
9	8	39000.00	22000.00	0.00	0.00	0.00	0.00	2026-03-01 15:01:44.060549	2026-03-02 08:45:08.542825
\.


--
-- Data for Name: installers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.installers (id, full_name, nickname, phone, backup_phone, specialization, rating, base_price, is_debtor, comments, is_active, is_in_funnel, total_orders, poor_work_count, warranty_visits_count, last_incident_date, updated_at, created_at, deleted_at) FROM stdin;
2	Петров Пётр Петрович	Ветер	+79262223344		{подъём,монтаж}	8.0	3000.00	f	Молодой специалист, физически сильный	t	t	0	0	0	\N	2026-02-28 09:35:02.134752	2026-02-28 09:35:02.134752	\N
3	Сидоров Сидор Сидорович	Высота	+79374445566		{"высотные работы",альпинизм}	9.0	6000.00	f	Работает на фасадах любой сложности	t	t	0	0	0	\N	2026-02-28 09:40:12.487833	2026-02-28 09:40:12.487833	\N
4	Козлов Дмитрий Сергеевич	Мастер	+79258887766		{установка,ремонт,заправка,диагностика}	9.8	5500.00	f	Опытный, всегда на связи	t	t	0	0	0	\N	2026-03-01 14:26:30.022491	2026-03-01 14:26:30.022491	\N
5	Николаев Андрей Владимирович	Ток	+79167778899		{электрика,подключение}	9.2	4500.00	f	Специализируется на сложных схемах	t	t	0	0	0	\N	2026-03-01 14:30:04.55625	2026-03-01 14:30:04.55625	\N
1	Иванов Иван Иванович	Мороз	+79161112233	+79163334455	{установка,ремонт,заправка}	9.5	5000.00	f	Опытный мастер, работаем с 2018 года	t	t	1	0	0	\N	2026-03-02 11:25:49.670598	2026-02-28 09:26:12.479096	\N
\.


--
-- Data for Name: order_expenses; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_expenses (id, order_id, amount, description, expense_date, category, created_at, updated_at) FROM stdin;
1	2	3500.00	Аренда автовышки	2026-03-06	transport	2026-02-28 10:31:05.33047	2026-02-28 10:31:05.33047
\.


--
-- Data for Name: order_installers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_installers (id, order_id, installer_id, role, base_payment, is_primary, created_at, updated_at) FROM stdin;
1	1	1	ведущий	5000.00	t	2026-02-28 10:16:26.665546	2026-02-28 10:16:26.665546
2	2	1	ведущий	7000.00	t	2026-02-28 10:30:25.259729	2026-02-28 10:30:25.259729
3	2	3	альпинист	6000.00	f	2026-02-28 10:30:25.266618	2026-02-28 10:30:25.266618
4	8	2		0.00	f	2026-03-02 08:45:08.542825	2026-03-02 08:45:08.542825
\.


--
-- Data for Name: order_item_installers; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_item_installers (id, order_item_id, installer_id, payment_amount, work_description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_items (id, order_id, item_type, name, quantity, purchase_price, sale_price, warranty_manufacturer, warranty_master, sort_order, created_at, updated_at) FROM stdin;
1	1	product	Кондиционер Haier AS25H	1	25000.00	42000.00	3	0	0	2026-02-28 10:16:26.626515	2026-02-28 10:16:26.626515
2	2	product	Mitsubishi Heavy	2	30000.00	50000.00	5	0	0	2026-02-28 10:30:25.227486	2026-02-28 10:30:25.227486
3	2	service	Монтаж с подъёмом	1	0.00	15000.00	1	0	1	2026-02-28 10:30:25.238316	2026-02-28 10:30:25.238316
4	8	product	Hisense	1	22000.00	39000.00	3	0	0	2026-03-01 15:01:44.060549	2026-03-01 15:01:44.060549
\.


--
-- Data for Name: order_status_history; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.order_status_history (id, order_id, status, changed_at) FROM stdin;
1	1	Ждет установщика	2026-03-02 10:37:24.068076
2	1	Выполнен	2026-03-02 11:25:49.670598
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.orders (id, client_id, status, warehouse, service_datetime, delivery_datetime, promise, marker_color, address_id, address_text, created_at, updated_at) FROM stdin;
2	2	Новый	Основной	2026-03-07 07:00:00	2026-03-06 06:00:00	нужна срочная установка	red	Россия, Московская область, Мытищи, улица Мира, 8	Россия, Московская область, Мытищи, улица Мира, 8	2026-02-28 10:30:25.206441	2026-02-28 11:10:22.027617
3	3	Новый	Основной	2026-03-15 14:00:00	2026-03-14 11:00:00	Позвонить за 2 часа, не опаздывать	\N	Россия, Москва, Ленинский проспект, 15, подъезд 3, кв. 78	Россия, Москва, Ленинский проспект, 15, подъезд 3, кв. 78	2026-03-01 14:02:49.842548	2026-03-01 14:02:49.842548
4	4	Новый	Основной	2026-03-01 14:07:17.725	\N		\N	Россия, Московская область, Мытищи, улица Мира, 8	Россия, Московская область, Мытищи, улица Мира, 8	2026-03-01 14:07:17.909309	2026-03-01 14:07:17.909309
5	5	Новый	Основной	2026-03-10 08:00:00	2026-03-09 12:00:00	Просьба не звонить в обед (13:00-14:00)	\N	Россия, Москва, улица Академика Королёва, 10, подъезд 2, этаж 6, кв. 55	Россия, Москва, улица Академика Королёва, 10, подъезд 2, этаж 6, кв. 55	2026-03-01 14:32:54.16609	2026-03-01 14:32:54.16609
6	6	Новый	Основной	2026-03-12 06:00:00	2026-03-11 09:00:00	Въезд по пропускам, заказать пропуск заранее\nУстановка за один день	\N	Россия, Москва, улица Новый Арбат, 24	Россия, Москва, улица Новый Арбат, 24	2026-03-01 14:46:33.768208	2026-03-01 14:46:33.768208
7	7	Новый	Основной	2026-03-05 11:00:00	2026-03-04 07:00:00	Позвонить за час\nУстановка до 16:00	\N	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	2026-03-01 14:57:38.122565	2026-03-01 14:57:38.122565
8	8	Новый	Основной	2026-03-05 11:00:00	2026-03-04 07:00:00	Позвонить за час\nУстановка до 16:00	\N	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	Россия, Москва, Профсоюзная улица, 100, подъезд 1, этаж 8, кв. 25	2026-03-01 15:01:44.009975	2026-03-01 15:01:44.009975
1	1	Выполнен	Основной	2026-03-22 11:00:00	2026-03-19 07:00:00		green	Москва, ул. Тверская, д. 12, кв. 45	Москва, ул. Тверская, д. 12, кв. 45	2026-02-28 10:16:26.593866	2026-03-02 11:25:49.670598
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.payments (id, order_id, payment_type, installer_id, amount, payment_date, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: warranty_claims; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.warranty_claims (id, order_item_id, claim_date, description, fault_type, responsible_installer_id, resolution, resolving_installer_id, cost, cost_covered_by, status, closed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: weather; Type: TABLE DATA; Schema: public; Owner: admin
--

COPY public.weather (id, date, location, lat, lon, temperature_avg, temperature_min, temperature_max, humidity, pressure, wind_speed, precipitation, weather_condition, source, created_at, updated_at) FROM stdin;
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.admins_id_seq', 1, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.clients_id_seq', 8, true);


--
-- Name: finance_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.finance_id_seq', 10, true);


--
-- Name: installers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.installers_id_seq', 5, true);


--
-- Name: order_expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_expenses_id_seq', 1, true);


--
-- Name: order_installers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_installers_id_seq', 4, true);


--
-- Name: order_item_installers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_item_installers_id_seq', 1, false);


--
-- Name: order_items_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_items_id_seq', 4, true);


--
-- Name: order_status_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.order_status_history_id_seq', 2, true);


--
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.orders_id_seq', 8, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.payments_id_seq', 1, false);


--
-- Name: warranty_claims_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.warranty_claims_id_seq', 1, false);


--
-- Name: weather_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.weather_id_seq', 1, false);


--
-- Name: address_cache address_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.address_cache
    ADD CONSTRAINT address_cache_pkey PRIMARY KEY (address);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_username_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_username_key UNIQUE (username);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: finance finance_order_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_order_id_key UNIQUE (order_id);


--
-- Name: finance finance_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_pkey PRIMARY KEY (id);


--
-- Name: installers installers_phone_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.installers
    ADD CONSTRAINT installers_phone_key UNIQUE (phone);


--
-- Name: installers installers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.installers
    ADD CONSTRAINT installers_pkey PRIMARY KEY (id);


--
-- Name: order_expenses order_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_expenses
    ADD CONSTRAINT order_expenses_pkey PRIMARY KEY (id);


--
-- Name: order_installers order_installers_order_id_installer_id_role_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_installers
    ADD CONSTRAINT order_installers_order_id_installer_id_role_key UNIQUE (order_id, installer_id, role);


--
-- Name: order_installers order_installers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_installers
    ADD CONSTRAINT order_installers_pkey PRIMARY KEY (id);


--
-- Name: order_item_installers order_item_installers_order_item_id_installer_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_item_installers
    ADD CONSTRAINT order_item_installers_order_item_id_installer_id_key UNIQUE (order_item_id, installer_id);


--
-- Name: order_item_installers order_item_installers_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_item_installers
    ADD CONSTRAINT order_item_installers_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: order_status_history order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: warranty_claims warranty_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_pkey PRIMARY KEY (id);


--
-- Name: weather weather_date_location_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weather
    ADD CONSTRAINT weather_date_location_key UNIQUE (date, location);


--
-- Name: weather weather_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.weather
    ADD CONSTRAINT weather_pkey PRIMARY KEY (id);


--
-- Name: idx_order_expenses_order; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_expenses_order ON public.order_expenses USING btree (order_id);


--
-- Name: idx_order_installers_order; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_installers_order ON public.order_installers USING btree (order_id);


--
-- Name: idx_order_item_installers_installer; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_item_installers_installer ON public.order_item_installers USING btree (installer_id);


--
-- Name: idx_order_item_installers_item; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_item_installers_item ON public.order_item_installers USING btree (order_item_id);


--
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- Name: idx_payments_installer; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_payments_installer ON public.payments USING btree (installer_id);


--
-- Name: idx_payments_order; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);


--
-- Name: idx_warranty_claims_order_item; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warranty_claims_order_item ON public.warranty_claims USING btree (order_item_id);


--
-- Name: idx_warranty_claims_resolving; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warranty_claims_resolving ON public.warranty_claims USING btree (resolving_installer_id);


--
-- Name: idx_warranty_claims_responsible; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warranty_claims_responsible ON public.warranty_claims USING btree (responsible_installer_id);


--
-- Name: idx_warranty_claims_status; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_warranty_claims_status ON public.warranty_claims USING btree (status);


--
-- Name: address_cache trg_address_cache_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_address_cache_updated_at BEFORE UPDATE ON public.address_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: finance trg_finance_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_finance_updated_at BEFORE UPDATE ON public.finance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warranty_claims trg_installer_stats_from_claims; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_installer_stats_from_claims AFTER INSERT OR DELETE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.update_installer_stats_from_claims();


--
-- Name: installers trg_installers_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_installers_updated_at BEFORE UPDATE ON public.installers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders trg_order_completed; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_completed AFTER INSERT OR UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_installer_total_orders();


--
-- Name: order_expenses trg_order_expenses_recalc_finance; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_expenses_recalc_finance AFTER INSERT OR DELETE OR UPDATE ON public.order_expenses FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_finance();


--
-- Name: order_expenses trg_order_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_expenses_updated_at BEFORE UPDATE ON public.order_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_installers trg_order_installers_recalc_finance; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_installers_recalc_finance AFTER INSERT OR DELETE OR UPDATE ON public.order_installers FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_finance();


--
-- Name: order_installers trg_order_installers_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_installers_updated_at BEFORE UPDATE ON public.order_installers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_item_installers trg_order_item_installers_recalc_finance; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_item_installers_recalc_finance AFTER INSERT OR DELETE OR UPDATE ON public.order_item_installers FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_finance();


--
-- Name: order_item_installers trg_order_item_installers_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_item_installers_updated_at BEFORE UPDATE ON public.order_item_installers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: order_items trg_order_items_recalc_finance; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_items_recalc_finance AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_finance();


--
-- Name: order_items trg_order_items_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_items_updated_at BEFORE UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: orders trg_order_status_history; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_order_status_history AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();


--
-- Name: orders trg_orders_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments trg_payments_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: warranty_claims trg_warranty_claims_recalc_finance; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_warranty_claims_recalc_finance AFTER INSERT OR DELETE OR UPDATE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_finance();


--
-- Name: warranty_claims trg_warranty_claims_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_warranty_claims_updated_at BEFORE UPDATE ON public.warranty_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: weather trg_weather_updated_at; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trg_weather_updated_at BEFORE UPDATE ON public.weather FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: finance finance_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.finance
    ADD CONSTRAINT finance_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_expenses order_expenses_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_expenses
    ADD CONSTRAINT order_expenses_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_installers order_installers_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_installers
    ADD CONSTRAINT order_installers_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES public.installers(id) ON DELETE CASCADE;


--
-- Name: order_installers order_installers_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_installers
    ADD CONSTRAINT order_installers_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_item_installers order_item_installers_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_item_installers
    ADD CONSTRAINT order_item_installers_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES public.installers(id) ON DELETE CASCADE;


--
-- Name: order_item_installers order_item_installers_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_item_installers
    ADD CONSTRAINT order_item_installers_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_status_history order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.order_status_history
    ADD CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: orders orders_address_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.address_cache(address) ON DELETE RESTRICT;


--
-- Name: orders orders_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT;


--
-- Name: payments payments_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_installer_id_fkey FOREIGN KEY (installer_id) REFERENCES public.installers(id) ON DELETE SET NULL;


--
-- Name: payments payments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: warranty_claims warranty_claims_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: warranty_claims warranty_claims_resolving_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_resolving_installer_id_fkey FOREIGN KEY (resolving_installer_id) REFERENCES public.installers(id) ON DELETE SET NULL;


--
-- Name: warranty_claims warranty_claims_responsible_installer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.warranty_claims
    ADD CONSTRAINT warranty_claims_responsible_installer_id_fkey FOREIGN KEY (responsible_installer_id) REFERENCES public.installers(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict aFIlII6VQf2XSf1HVECO6p6IOD2C2j6p2tRZwjddPmeZTwqGQxuBqd7mFe0DRJA

