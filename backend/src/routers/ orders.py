from fastapi import APIRouter, Request, HTTPException
from ..schemas.orders import OrderCreate, OrderUpdate
from ..services.orders import (
    get_orders,
    get_order_by_id,
    create_order,
    update_order,
    delete_order
)

router = APIRouter(prefix="/api/orders", tags=["Orders"])

@router.get("/")
def api_get_orders():
    try:
        return get_orders()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{order_id}")
def api_get_order(order_id: int):
    try:
        order = get_order_by_id(order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        return order
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
def api_create_order(order: OrderCreate):
    try:
        return create_order(order)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{order_id}")
def api_update_order(order_id: int, order: OrderUpdate):
    try:
        result = update_order(order_id, order)
        if not result:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{order_id}")
def api_delete_order(order_id: int):
    try:
        result = delete_order(order_id)
        if not result:
            raise HTTPException(status_code=404, detail="Заказ не найден")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
