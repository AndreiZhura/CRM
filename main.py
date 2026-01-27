from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import psycopg2.extras # Нужно для получения данных в виде словаря

app = FastAPI(title="Олег-Холод ERP")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

def get_db_connection():
    try:
        return psycopg2.connect(
            host="db", database="crm_lumen", user="admin", password="password",
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"Ошибка БД: {e}")
        return None

# РАСШИРЕННАЯ МОДЕЛЬ КАРТОЧКИ (под твой план)
class OrderCreate(BaseModel):
    fio: str
    phone: str
    address: str
    service_date: Optional[str] = None
    appointment_date: Optional[str] = None
    delivery_date: Optional[str] = None
    warehouse: Optional[str] = "Основной"
    seller_name: Optional[str] = "Олег"
    ac_model_interest: Optional[str] = None
    promises: Optional[str] = None
    buy_price: float = 0.0
    sell_price_ac: float = 0.0
    price_install: float = 0.0
    my_commission: float = 0.0
    is_money_returned: bool = False
    status: str = "Новая заявка"
    installer_id: Optional[int] = None
    installer_opinion: Optional[str] = None
    doubt_reason: Optional[str] = None
    
class InstallerCreate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = "Монтаж"
    base_price: Optional[float] = 0.0
    dossier: Optional[str] = None

# СТРАНИЦЫ
@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/journal", response_class=HTMLResponse)
async def read_journal(request: Request):
    return templates.TemplateResponse("journal.html", {"request": request})

# API: СОЗДАНИЕ КАРТОЧКИ
@app.post("/add_order")
def create_full_order(order: OrderCreate):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="БД недоступна")
    cur = conn.cursor()
    try:
        # 1. Клиент
        cur.execute(
            "INSERT INTO clients (fio, phone, address) VALUES (%s, %s, %s) "
            "ON CONFLICT (phone) DO UPDATE SET address = EXCLUDED.address RETURNING id",
            (order.fio, order.phone, order.address)
        )
        client_id = cur.fetchone()['id']

        # 2. Заказ (все 16 полей!)
        cur.execute(
            """INSERT INTO orders 
               (client_id, service_date, appointment_date, delivery_date, warehouse, 
                seller_name, installer_id, promises, buy_price, sell_price_ac, 
                price_install, is_money_returned, status, comments, installer_opinion, 
                doubt_reason, my_commission) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (
                client_id, order.service_date, order.appointment_date, order.delivery_date,
                order.warehouse, order.seller_name, order.installer_id, order.promises,
                order.buy_price, order.sell_price_ac, order.price_install, 
                order.is_money_returned, order.status, order.ac_model_interest,
                order.installer_opinion, order.doubt_reason, order.my_commission
            )
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        print(f"SQL Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# API: ПОЛУЧЕНИЕ ДАННЫХ ДЛЯ ЖУРНАЛА
@app.get("/orders")
def get_orders():
    conn = get_db_connection()
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
    return rows # Теперь здесь летят и даты, и цены, и статус

# В main.py (FastAPI)
@app.get("/order_page/{order_id}", response_class=HTMLResponse)
async def get_order_page(request: Request, order_id: int):
    # Эта команда берет твой новый order_detail.html с инклудами и показывает его
    return templates.TemplateResponse("order_detail.html", {
        "request": request, 
        "order_id": order_id
    })
    
import psycopg2.extras # Нужно для получения данных в виде словаря

@app.get("/api/order/{order_id}")
def get_order_api(order_id: int):
    conn = get_db_connection()
    # Используем RealDictCursor, чтобы ключи JSON совпадали с именами полей в БД
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    cur.execute("""
        SELECT o.*, c.fio, c.phone, c.address 
        FROM orders o 
        JOIN clients c ON o.client_id = c.id 
        WHERE o.id = %s
    """, (order_id,))
    
    order = cur.fetchone()
    cur.close()
    conn.close()
    
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")
    return order

# Добавь это в main.py
@app.put("/api/order/{order_id}")
def update_order(order_id: int, data: dict): # Используем dict для гибкости
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE orders SET 
                service_date = %s, appointment_date = %s, delivery_date = %s,
                warehouse = %s, seller_name = %s, buy_price = %s, 
                sell_price_ac = %s, price_install = %s, my_commission = %s,
                is_money_returned = %s, status = %s, promises = %s, comments = %s
            WHERE id = %s
        """, (
            data.get('service_date'), data.get('appointment_date'), data.get('delivery_date'),
            data.get('warehouse'), data.get('seller_name'), data.get('buy_price'),
            data.get('sell_price_ac'), data.get('price_install'), data.get('my_commission'),
            data.get('is_money_returned'), data.get('status'), data.get('promises'), 
            data.get('comments'), order_id
        ))
        
        # Также обновим данные клиента, если они изменились
        cur.execute("""
            UPDATE clients SET fio = %s, phone = %s, address = %s
            WHERE id = (SELECT client_id FROM orders WHERE id = %s)
        """, (data.get('fio'), data.get('phone'), data.get('address'), order_id))
        
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
        
@app.delete("/api/order/{order_id}")
def delete_order(order_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Сначала удаляем заказ, клиента пока оставим в базе (или тоже удали по желанию)
        cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        return {"status": "deleted"}
    finally:
        cur.close()
        conn.close()

# 1. Маршрут для самой страницы (HTML)
# 1. Страница СПИСКА (все мастера)
@app.get("/installers", response_class=HTMLResponse)
async def get_installers_page(request: Request):
    return templates.TemplateResponse("installers.html", {"request": request})

# 2. Страница КАРТОЧКИ (конкретный мастер)
# Добавляем префикс /profile/, чтобы путь /installers/1 не конфликтовал со списком
@app.get("/installers/profile/{installer_id}", response_class=HTMLResponse)
async def get_installer_page(request: Request, installer_id: int):
    return templates.TemplateResponse("installer_detail.html", {"request": request, "id": installer_id})

# 3. API для получения данных одного мастера (JSON)
@app.get("/api/installers/{installer_id}")
def get_installer_details(installer_id: int):
    conn = get_db_connection()
    if not conn: raise HTTPException(status_code=500, detail="БД недоступна")
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        cur.execute("SELECT * FROM installers WHERE id = %s", (installer_id,))
        installer = cur.fetchone()
        
        cur.execute("""
            SELECT o.id, o.status, c.fio as client_name, o.address
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.installer_id = %s
            ORDER BY o.id DESC
        """, (installer_id,))
        orders = cur.fetchall()
        
        return {"info": installer, "orders": orders}
    finally:
        cur.close()
        conn.close()