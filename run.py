#!/usr/bin/env python3
import os
from app import create_app

if __name__ == "__main__":
    app = create_app()
    
    # Development settings
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    port = int(os.getenv("FLASK_RUN_PORT", 5054))
    host = os.getenv("FLASK_RUN_HOST", "127.0.0.1")
    
    app.run(host=host, port=port, debug=debug)