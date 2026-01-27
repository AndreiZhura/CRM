from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.errors import UniqueViolation
from psycopg2.extras import RealDictCursor
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

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
        print(f"ОШИБКА ПОДКЛЮЧЕНИЯ К БД: {e}")
        return None

# --- МОДЕЛИ ДАННЫХ (Pydantic) ---

# Модель для МАСТЕРА


class InstallerCreate(BaseModel):
    fio: str
    nickname: Optional[str] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    rating: int = 10
    dossier: Optional[str] = None
    is_debtor: bool = False
    base_price: float = 0.0
    status: str = "Новый"

# Модель для ЗАКАЗА (Новая!)


class OrderCreate(BaseModel):
    fio: str       # Мы договорились использовать fio
    phone: str
    address: str
    price: float = 0.0
    cost: float = 0.0
    # Можно добавить другие поля, если нужно

# --- СТРАНИЦЫ (FRONTEND) ---


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
    cur.close()
    conn.close()
    return order

# !!! ЭТОГО НЕ ХВАТАЛО ДЛЯ СОЗДАНИЯ ЗАКАЗА !!!


@app.post("/add_order")
def create_order(order: OrderCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Вставляем клиента, используя поле fio
        cur.execute(
            "INSERT INTO clients (fio, phone, address) VALUES (%s, %s, %s) RETURNING id",
            (order.fio, order.phone, order.address)
        )
        client_id = cur.fetchone()['id']

        # Вставляем заказ
        cur.execute(
            """INSERT INTO orders (client_id, status, price, cost, profit) 
               VALUES (%s, 'Новая заявка', %s, %s, %s)""",
            (client_id, order.price, order.cost, (order.price - order.cost))
        )
        conn.commit()
        return {"status": "success"}
    except Exception as e:
        conn.rollback()
        print(f"DEBUG ERROR: {e}")  # Увидишь в docker logs
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# --- API: МОНТАЖНИКИ ---


@app.get("/api/installers")
def api_get_installers():
    conn = get_db_connection()
    if not conn:
        return []
    cur = conn.cursor()
    cur.execute("SELECT * FROM installers ORDER BY id DESC")
    data = cur.fetchall()
    cur.close()
    conn.close()
    return data


@app.post("/api/installers")
def api_create_installer(inst: InstallerCreate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO installers (fio, nickname, phone, specialization, rating, dossier, is_debtor, base_price, status) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            (inst.fio, inst.nickname, inst.phone, inst.specialization, inst.rating,
             inst.dossier, inst.is_debtor, inst.base_price, inst.status)
        )
        conn.commit()
        return {"status": "success"}
    except UniqueViolation:
        conn.rollback()
        # Специальная обработка, если такой телефон уже есть
        raise HTTPException(
            status_code=400, detail="Мастер с таким телефоном уже существует!")
    except Exception as e:
        conn.rollback()
        print(f"ОШИБКА: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@app.get("/api/installers/{installer_id}")
def api_get_installer_detail(installer_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Получаем данные самого мастера
        cur.execute("SELECT id, fio, phone, status, specialization, base_price FROM installers WHERE id = %s", (installer_id,))
        installer = cur.fetchone()
        
        # Получаем его заказы (исправленный c.address)
        cur.execute("""
            SELECT o.id, o.status, c.fio as client_name, c.address 
            FROM orders o
            JOIN clients c ON o.client_id = c.id
            WHERE o.installer_id = %s
        """, (installer_id,))
        orders = cur.fetchall()
        
        return {
            "info": dict(installer),
            "orders": [dict(row) for row in orders]
        }
    finally:
        cur.close(); conn.close()


@app.delete("/api/installers/{installer_id}")
def api_delete_installer(installer_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE orders SET installer_id = NULL WHERE installer_id = %s", (installer_id,))
        cur.execute("DELETE FROM installers WHERE id = %s", (installer_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        cur.close()
        conn.close()

# --- ДОБАВЬ ЭТОТ БЛОК В КОНЕЦ main.py ---

class InstallerUpdate(BaseModel):
    fio: str
    phone: Optional[str] = None
    specialization: Optional[str] = None
    base_price: float = 0.0

@app.put("/api/installers/{installer_id}")
def update_installer(installer_id: int, data: InstallerUpdate):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Ошибка подключения к базе")
    cur = conn.cursor()
    try:
        cur.execute("""
            UPDATE installers 
            SET fio = %s, phone = %s, specialization = %s, base_price = %s
            WHERE id = %s
        """, (data.fio, data.phone, data.specialization, data.base_price, installer_id))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Мастер не найден")
            
        conn.commit()
        return {"status": "success", "message": "Данные обновлены"}
    except Exception as e:
        conn.rollback()
        print(f"ОШИБКА UPDATE: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()