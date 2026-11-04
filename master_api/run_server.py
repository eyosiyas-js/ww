import os
import sys
import threading
import time
import webbrowser
from dotenv import load_dotenv

# Set working directory to the folder containing the executable / script
if getattr(sys, "frozen", False):
    base_dir = os.path.dirname(sys.executable)
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

os.chdir(base_dir)
if base_dir not in sys.path:
    sys.path.insert(0, base_dir)

# Load configuration from .env in the app directory
env_path = os.path.join(base_dir, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path, override=True)
else:
    # Check packaging/config/cims.env as fallback if .env not yet created
    cims_env = os.path.join(base_dir, "config", "cims.env")
    if os.path.exists(cims_env):
        load_dotenv(cims_env, override=True)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

import uvicorn
from app.main import app

def open_browser_after_start(host: str, port: int):
    time.sleep(1.8)
    # If host is 0.0.0.0, browse to localhost
    display_host = "localhost" if host in ("0.0.0.0", "127.0.0.1") else host
    url = f"http://{display_host}:{port}"
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"[Warning] Failed to open browser automatically: {e}")

def main():
    host = os.environ.get("CIMS_BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("CIMS_BACKEND_PORT", "8000"))
    auto_open = os.environ.get("AUTO_OPEN_BROWSER", "true").strip().lower() in ("true", "1", "yes")

    print("=" * 60)
    print("  CIMS Surveillance & Safety System")
    print("=" * 60)
    print(f"  * Server listening at: http://{host}:{port}")
    print(f"  * Database server:    {os.environ.get('POSTGRES_SERVER', 'localhost')}")
    print(f"  * Database name:      {os.environ.get('POSTGRES_DB', 'backend')}")
    print(f"  * Working directory:  {base_dir}")
    print("=" * 60)
    print("  Press Ctrl+C to stop the server.\n")
    # Automatically verify and initialize database tables and seed data
    print("  * Checking and initializing database schema and seed data...")
    try:
        from app.db.init_db import auto_init_database
        auto_init_database()
        print("  * Database schema and initial data verified successfully.\n")
    except Exception as e:
        print(f"  [Warning] Automatic database initialization error: {e}\n")

    if auto_open:
        threading.Thread(target=open_browser_after_start, args=(host, port), daemon=True).start()

    uvicorn.run(
        app,
        host=host,
        port=port,
        access_log=True,
    )

if __name__ == "__main__":
    main()
