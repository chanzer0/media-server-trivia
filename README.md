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

## Requirements
- Python 3.11 (for development) or Docker
- A Plex API token and the base URL of your Plex server

## Configuration
The application reads two environment variables:

```
PLEX_BASE_URL=<http://your.plex.ip:port>
PLEX_TOKEN=<your_plex_token>
```

These can be supplied in `docker-compose.yml` or directly in your environment.

## Running with Docker

```
docker compose up --build
```

The web interface will be available on `http://localhost:8080` by default.

## Development

Install dependencies and run the Flask development server:


```
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export PLEX_BASE_URL=http://your.plex.ip:port
export PLEX_TOKEN=your_token
flask --app app:create_app run
```

or, alternative on Windows:

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
set PLEX_BASE_URL=http://your.plex.ip:port
set PLEX_TOKEN=your_token
flask --app app:create_app run
```

## License

This project is licensed under the MIT License.

