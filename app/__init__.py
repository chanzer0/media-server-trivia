from flask import Flask
import os
from dotenv import load_dotenv
from .plex_service import PlexService
from .tmdb_service import TMDbService
from .routes import init_routes


def create_app():
    # Load environment variables from .env file. When developing locally we want
    # values from the .env file to override any existing environment variables so
    # that users do not unexpectedly inherit other values from their shell.
    if os.path.exists(".env"):
        load_dotenv(override=True)

    app = Flask(__name__)

    plex_base_url = os.getenv("PLEX_BASE_URL")
    plex_token = os.getenv("PLEX_TOKEN")
    tmdb_key = os.getenv("TMDB_API_KEY")

    plex_service = PlexService(base_url=plex_base_url, token=plex_token)
    tmdb_service = TMDbService(api_key=tmdb_key)

    init_routes(app, plex_service, tmdb_service)

    return app
