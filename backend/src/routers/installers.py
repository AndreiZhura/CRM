from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import psycopg2
from psycopg2.errors import UniqueViolation
from psycopg2.extras import RealDictCursor
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

app = FastAPI(title="Олег-Холод ERP")
templates = Jinja2Templates(directory="frontend")

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
        cur.close()
        conn.close()


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
        raise HTTPException(
            status_code=400, detail="Мастер с таким телефоном уже существует!")
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


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
        cur.close()
        conn.close()

# Удаление
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

