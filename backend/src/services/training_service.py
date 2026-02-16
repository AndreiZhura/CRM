import subprocess
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def run_training():
    """
    Запускает скрипт train.py через subprocess.
    """
    script_path = Path(__file__).parent.parent / "ml_service" / "train.py"
    if not script_path.exists():
        logger.error(f"train.py not found at {script_path}")
        return False
    try:
        # Запускаем в отдельном процессе, чтобы не блокировать asyncio
        result = subprocess.run(
            ["python", str(script_path)],
            capture_output=True,
            text=True,
            check=True
        )
        logger.info(f"Training completed. Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Training failed: {e.stderr}")
        return False