import psycopg2
from psycopg2.extras import RealDictCursor
from ..core.db import get_db_connection  # Перенесите get_db_connection() сюда
from ..schemas.orders import OrderCreate, OrderUpdate


def get_orders():
    conn = get_db_connection()
    if not conn:
        return []
    cur = conn.cursor()
    cur.execute("""
        SELECT o.*, c.fio, c.phone, c.address
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        ORDER BY o.id DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows

def get_order_by_id(order_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT o.*, c.fio, c.phone, c.address
        FROM orders o
        JOIN clients c ON o.client_id = c.id
        WHERE o.id = %s
    """, (order_id,))
    order = cur.fetchone()
    cur.close()
    conn.close()
    return order

def create_order(order: OrderCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO clients (fio, phone, address) VALUES (%s, %s, %s) RETURNING id",
            (order.fio, order.phone, order.address)
        )
        client_id = cur.fetchone()['id']
        calculated_profit = order.sell_price_ac - order.buy_price - order.price_install
        cur.execute(
            """INSERT INTO orders (
                client_id, status, buy_price, sell_price_ac,
                price_install, my_commission, is_money_returned,
                promises, profit
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (client_id, order.status, order.buy_price, order.sell_price_ac,
             order.price_install, order.my_commission, order.is_money_returned,
             order.promises, calculated_profit)
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cur.close()
        conn.close()

def update_order(order_id: int, order: OrderUpdate):
    conn = get_db_connection()
    if not conn:
        return None
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE clients
            SET fio = %s, phone = %s, address = %s
            WHERE id = (SELECT client_id FROM orders WHERE id = %s)
        """, (order.fio, order.phone, order.address, order_id))

        calculated_profit = order.sell_price_ac - order.buy_price - order.price_install
        cur.execute("""
            UPDATE orders
            SET status = %s, buy_price = %s, sell_price_ac = %s,
                price_install = %s, my_commission = %s, is_money_returned = %s,
                promises = %s, installer_opinion = %s, installer_id = %s,
                profit = %s
            WHERE id = %s
        """, (order.status, order.buy_price, order.sell_price_ac,
              order.price_install, order.my_commission, order.is_money_returned,
              order.promises, order.installer_opinion, order.installer_id,
              calculated_profit, order_id))
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        print(f"Ошибка обновления заказа: {e}")
        return None
    finally:
        cur.close()
        conn.close()

def delete_order(order_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        return {"status": "success", "message": "Заказ удалён"}
    except Exception as e:
        conn.rollback()
        return {"status": "error", "message": str(e)}
    finally:
        cur.close()
        conn.close()
