from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.errors import UniqueViolation
from psycopg2.extras import RealDictCursor
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

# --- КОНФИГУРАЦИЯ И ПОДКЛЮЧЕНИЕ ---

app = FastAPI(title="Олег-Холод ERP")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="static")

def get_db_connection():
    """Системное подключение к PostgreSQL на Mac mini"""
    try:
        return psycopg2.connect(
            host="db", database="crm_lumen", user="admin", password="password",
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"ОШИБКА ПОДКЛЮЧЕНИЯ К БД: {e}")
        return None

# --- МОДЕЛИ ДАННЫХ ---

class InstallerCreate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    rating: int = 10
    dossier: Optional[str] = None
    is_debtor: bool = False
    debt_amount: float = 0.0  # Финансы
    base_price: float = 0.0
    status: str = "Новый"

class InstallerUpdate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    rating: int = 10
    dossier: Optional[str] = None
    is_debtor: bool = False   # Позволяет менять статус долга
    debt_amount: float = 0.0  # Позволяет менять сумму долга
    base_price: float = 0.0
    status: str = "В работе"

class OrderCreate(BaseModel):
    fio: str
    phone: str
    address: str
    buy_price: float = 0.0
    sell_price_ac: float = 0.0
    price_install: float = 0.0
    my_commission: float = 0.0
    is_money_returned: bool = False
    status: Optional[str] = "Новая заявка"
    promises: Optional[str] = ""
    installer_opinion: Optional[str] = ""
    installer_id: Optional[int] = None
    
class OrderUpdate(BaseModel):
    fio: str
    phone: str
    address: str
    buy_price: float = 0.0
    sell_price_ac: float = 0.0
    price_install: float = 0.0
    my_commission: float = 0.0
    is_money_returned: bool = False
    status: Optional[str] = "Новая заявка"
    promises: Optional[str] = ""
    installer_opinion: Optional[str] = ""
    installer_id: Optional[int] = None

# --- СТРАНИЦЫ FRONTEND ---

@app.get("/", response_class=HTMLResponse)
async def read_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/journal", response_class=HTMLResponse)
async def read_journal(request: Request):
    return templates.TemplateResponse("journal.html", {"request": request})

@app.get("/order_page/{order_id}", response_class=HTMLResponse)
async def get_order_page(request: Request, order_id: int):
    return templates.TemplateResponse("order_detail.html", {"request": request, "order_id": order_id})

@app.get("/installers", response_class=HTMLResponse)
@app.get("/installers_page", response_class=HTMLResponse)
async def get_installers_page(request: Request):
    return templates.TemplateResponse("installers.html", {"request": request})

@app.get("/installers/add", response_class=HTMLResponse)
async def add_installer_page(request: Request):
    return templates.TemplateResponse("installer_add.html", {"request": request})

@app.get("/installers/profile/{installer_id}", response_class=HTMLResponse)
async def get_installer_profile_page(request: Request, installer_id: int):
    return templates.TemplateResponse("installer_detail.html", {"request": request, "id": installer_id})

# --- API: ЗАКАЗЫ ---

@app.get("/orders")
def get_orders():
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    cur.execute("""
        SELECT o.*, c.fio, c.phone, c.address 
        FROM orders o 
        JOIN clients c ON o.client_id = c.id
        ORDER BY o.id DESC
    """)
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows

@app.get("/api/order/{order_id}")
def get_order_api(order_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT o.*, c.fio, c.phone, c.address 
        FROM orders o 
        JOIN clients c ON o.client_id = c.id 
        WHERE o.id = %s
    """, (order_id,))
    order = cur.fetchone()
    cur.close(); conn.close()
    return order

@app.post("/add_order")
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()
        
@app.put("/api/order/{order_id}")
def update_order(order_id: int, order: OrderUpdate):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к БД")
    cur = conn.cursor()
    try:
        # 1. Обновляем данные клиента (так как они в другой таблице)
        cur.execute("""
            UPDATE clients 
            SET fio = %s, phone = %s, address = %s 
            WHERE id = (SELECT client_id FROM orders WHERE id = %s)
        """, (order.fio, order.phone, order.address, order_id))

        # 2. Обновляем сам заказ
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
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

# --- API: МОНТАЖНИКИ ---

@app.get("/api/installers")
def api_get_installers():
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    cur.execute("SELECT * FROM installers ORDER BY id DESC")
    data = cur.fetchall()
    cur.close(); conn.close()
    return data

@app.get("/api/installers/{installer_id}")
def api_get_installer_detail(installer_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM installers WHERE id = %s", (installer_id,))
        installer = cur.fetchone()
        cur.execute("""
            SELECT o.id, o.status, c.fio as client_name, c.address 
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.installer_id = %s
        """, (installer_id,))
        orders = cur.fetchall()
        return {"info": dict(installer), "orders": [dict(row) for row in orders]}
    finally:
        cur.close(); conn.close()

@app.post("/api/installers")
def api_create_installer(inst: InstallerCreate):
    """Регистрация с учетом долга"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO installers (
                fio, nickname, phone, specialization, rating, 
                dossier, is_debtor, debt_amount, base_price, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (inst.fio, inst.nickname, inst.phone, inst.specialization, inst.rating,
             inst.dossier, inst.is_debtor, inst.debt_amount, inst.base_price, inst.status)
        )
        conn.commit()
        return {"status": "success"}
    except UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Мастер с таким телефоном уже существует!")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

@app.put("/api/installers/{installer_id}")
def update_installer(installer_id: int, data: InstallerUpdate):
    """Полное обновление профиля, включая финансы"""
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE installers 
            SET fio = %s, nickname = %s, phone = %s, specialization = %s, 
                rating = %s, dossier = %s, is_debtor = %s, 
                debt_amount = %s, base_price = %s, status = %s
            WHERE id = %s
        """, (data.fio, data.nickname, data.phone, data.specialization, 
              data.rating, data.dossier, data.is_debtor, 
              data.debt_amount, data.base_price, data.status, installer_id))
        conn.commit()
        return {"status": "success"}
    finally:
        cur.close(); conn.close()

@app.delete("/api/installers/{installer_id}")
def api_delete_installer(installer_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("UPDATE orders SET installer_id = NULL WHERE installer_id = %s", (installer_id,))
        cur.execute("DELETE FROM installers WHERE id = %s", (installer_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        cur.close(); conn.close()