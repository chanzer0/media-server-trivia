from flask import Flask
import os
from dotenv import load_dotenv
from .plex_service import PlexService
from .routes import init_routes


def create_app():
    # Load environment variables from .env file
    if os.path.exists(".env"):
        load_dotenv()

    app = Flask(__name__)

    plex_base_url = os.getenv("PLEX_BASE_URL")
    plex_token = os.getenv("PLEX_TOKEN")

    plex_service = PlexService(base_url=plex_base_url, token=plex_token)

    init_routes(app, plex_service)

    return app
