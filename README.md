# Media Server Trivia

A template for an Unraid-ready application that turns your Plex library into a trivia game. This project exposes a simple Flask web interface that connects to your Plex server and generates trivia questions from your media.

## Features
- Connects to a Plex server via API token
- Lists your movies and TV shows
- Generates several trivia games from your library:
  - Cast Reveal Game
  - Guess the Release Year
  - Poster Reveal Challenge
- Dockerized for easy deployment on Unraid or any Docker host
- Retrieves additional metadata from TMDb using the TMDb GUIDs stored in your Plex library

## Requirements
- Python 3.11 (for development) or Docker
- A Plex API token and the base URL of your Plex server

## Configuration
The application reads a few environment variables:

```
PLEX_BASE_URL=<http://your.plex.ip:port>
PLEX_TOKEN=<your_plex_token>
HOST_PORT=<port_for_web_ui>
TMDB_API_KEY=<your_tmdb_api_key>
```
These can be supplied in `docker-compose.yml` or directly in your environment. `HOST_PORT` controls which port the web interface listens on.

## Running with Docker

The included `docker-compose.yml` pulls the prebuilt image from Docker Hub and
starts the container with your configured environment variables.

```
docker compose up
```

Ensure that `PLEX_BASE_URL`, `PLEX_TOKEN`, `HOST_PORT` and `TMDB_API_KEY` are set in your environment or an `.env` file before starting the stack.
The web interface will be available on `http://localhost:${HOST_PORT}`. By default this is `5054`.

## Docker Image

Every push to the `main` branch automatically builds a Docker image and publishes
it to Docker Hub as `chanzero/media-server-trivia:latest`. You can pull it
directly:

```bash
docker pull chanzero/media-server-trivia:latest
```

The image expects the same environment variables as the compose file.

## Development

Install dependencies and run the Flask development server:

### Option 1: Using run.py (Recommended)

```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export PLEX_BASE_URL=http://your.plex.ip:port
export PLEX_TOKEN=your_token
export TMDB_API_KEY=your_tmdb_api_key
python run.py
```

The app will run on http://localhost:5054 by default. You can change the port by setting `FLASK_RUN_PORT` environment variable.

### Option 2: Using Flask CLI

```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PLEX_BASE_URL=http://your.plex.ip:port
export PLEX_TOKEN=your_token
export HOST_PORT=5054
export TMDB_API_KEY=your_tmdb_api_key
flask --app app:create_app run --port $HOST_PORT
```

or, alternative on Windows:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set PLEX_BASE_URL=http://your.plex.ip:port
set PLEX_TOKEN=your_token
set HOST_PORT=5054
set TMDB_API_KEY=your_tmdb_api_key
flask --app app:create_app run --port %HOST_PORT%
```

## License

This project is licensed under the MIT License.

