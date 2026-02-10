import psycopg2
from psycopg2.extras import RealDictCursor

def get_db_connection():
    try:
        return psycopg2.connect(
            host="db", database="lumen_db", user="admin", password="password",
            cursor_factory=RealDictCursor
        )
    except Exception as e:
        print(f"ОШИБКА ПОДКЛЮЧЕНИЯ К БД: {e}")
        return None
