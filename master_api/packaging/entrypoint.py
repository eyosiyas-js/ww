"""
CIMS Backend Entry Point (for Nuitka compilation)

This is the compiled entry point. It reads config from environment variables
(loaded from /etc/cims/cims.env by systemd) and starts the uvicorn server.
"""
import os
import sys
import uvicorn

def main():
    host = os.environ.get("CIMS_BACKEND_HOST", "127.0.0.1")
    port = int(os.environ.get("CIMS_BACKEND_PORT", "8000"))

    # Ensure the uploads directory exists
    os.makedirs("uploads", exist_ok=True)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=1,
        log_level="info",
        access_log=True,
    )

if __name__ == "__main__":
    main()
