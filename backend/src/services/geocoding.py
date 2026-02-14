import aiohttp
from core.config import settings
import random

# Мок-координаты для разработки (центр Москвы, например)
MOCK_LAT = 55.7558
MOCK_LON = 37.6176

async def get_coordinates(address: str) -> tuple[float, float] | None:
    """
    Асинхронно получает координаты (lat, lon) для указанного адреса через API Яндекс.Карт.
    Если ключ не задан, возвращает мок-координаты.
    Возвращает None, если адрес пуст или не удалось найти.
    """
    if not address:
        return None

    # Если нет API-ключа, используем мок
    if not settings.YANDEX_API_KEY:
        # Для разнообразия можно генерировать случайное смещение, но для простоты фикс
        return (MOCK_LAT, MOCK_LON)

    # Формируем запрос к Яндекс.Геокодеру
    url = "https://geocode-maps.yandex.ru/1.x/"
    params = {
        "apikey": settings.YANDEX_API_KEY,
        "geocode": address,
        "format": "json",
        "results": 1
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as resp:
                if resp.status != 200:
                    return None
                data = await resp.json()
                # Парсим ответ
                try:
                    pos = data["response"]["GeoObjectCollection"]["featureMember"][0]["GeoObject"]["Point"]["pos"]
                    lon, lat = map(float, pos.split())
                    return (lat, lon)
                except (KeyError, IndexError, ValueError):
                    return None
    except Exception:
        return None