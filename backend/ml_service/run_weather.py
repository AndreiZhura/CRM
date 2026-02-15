import asyncio
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent / 'src'))
from services.weather_service import daily_weather_collection

asyncio.run(daily_weather_collection())
print("Сбор погоды завершён")