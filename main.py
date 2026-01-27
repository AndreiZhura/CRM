from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
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
        print(f"ОШИБКА БД: {e}")
        return None

# --- МОДЕЛИ ---
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

# --- API ДЛЯ ЗАКАЗОВ ---

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
    cur.execute("SELECT o.*, c.fio, c.phone, c.address FROM orders o JOIN clients c ON o.client_id = c.id WHERE o.id = %s", (order_id,))
    order = cur.fetchone()
    cur.close(); conn.close()
    return order

# --- API ДЛЯ МОНТАЖНИКОВ ---

@app.get("/api/installers")
def api_get_installers():
    """Эндпоинт для получения списка всех мастеров"""
    conn = get_db_connection()
    if not conn: return []
    cur = conn.cursor()
    cur.execute("SELECT * FROM installers ORDER BY id DESC")
    data = cur.fetchall()
    cur.close(); conn.close()
    return data

@app.post("/api/installers")
def api_create_installer(inst: InstallerCreate):
    """Сохранение нового мастера со всеми новыми полями"""
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
    except Exception as e:
        conn.rollback()
        print(f"ОШИБКА: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

@app.get("/api/installers/{installer_id}")
def api_get_installer_detail(installer_id: int):
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM installers WHERE id = %s", (installer_id,))
    info = cur.fetchone()
    if not info: raise HTTPException(status_code=404, detail="Мастер не найден")
    
    cur.execute("""
        SELECT o.id, o.status, c.fio as client_name, o.address 
        FROM orders o 
        JOIN clients c ON o.client_id = c.id 
        WHERE o.installer_id = %s
        ORDER BY o.id DESC
    """, (installer_id,))
    orders = cur.fetchall()
    cur.close(); conn.close()
    return {"info": info, "orders": orders}

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