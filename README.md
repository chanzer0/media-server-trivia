# Media Server Trivia

A template for an Unraid-ready application that turns your Plex library into a trivia game. This project exposes a simple Flask web interface that connects to your Plex server and generates trivia questions from your media.

## Features
- Connects to a Plex server via API token
- Lists your movies and TV shows
- Generates several trivia games from your library:
  - Cast Reveal Game
  - Guess the Release Year
  - Poster Reveal Challenge
  - Frame Color Challenge (analyzes actual video frames)
- Dockerized for easy deployment on Unraid or any Docker host
- Retrieves additional metadata from TMDb using the TMDb GUIDs stored in your Plex library

## Requirements
- Python 3.11 (for development) or Docker
- A Plex API token and the base URL of your Plex server
- A TMDb API key

## Configuration
The application reads a few environment variables:

```
PLEX_BASE_URL=<http://your.plex.ip:port>
PLEX_TOKEN=<your_plex_token>
HOST_PORT=<port_for_web_ui>
TMDB_API_KEY=<your_tmdb_api_key>
MEDIA_PATH=<path_to_your_media_files>
```
These can be supplied in `docker-compose.yml` or directly in your environment. `HOST_PORT` controls which port the web interface listens on. `MEDIA_PATH` should point to the same media directory that your Plex server uses (required for Frame Color Challenge).

## Running with Docker

The included `docker-compose.yml` pulls the prebuilt image from Docker Hub and
starts the container with your configured environment variables.

```
docker compose up
```

Ensure that `PLEX_BASE_URL`, `PLEX_TOKEN`, `HOST_PORT`, `TMDB_API_KEY`, and `MEDIA_PATH` are set in your environment or an `.env` file before starting the stack.
The web interface will be available on `http://localhost:${HOST_PORT}`. By default this is `5054`.

**Important for Frame Color Challenge:** The application needs access to your media files for video frame analysis. Setup varies by platform:

### Unraid Setup (Recommended Method)

#### Option 1: Use Unraid Template (Easiest)
1. In Unraid, go to **Docker** tab → **Add Container**
2. In the template repository URL field, add:
   ```
   https://raw.githubusercontent.com/chanzer0/media-server-trivia/main/unraid-template.xml
   ```
3. Search for "media-server-trivia" and click the template
4. Configure the required settings:
   - **Plex Base URL:** `http://YOUR_UNRAID_IP:32400`
   - **Plex Token:** Your Plex authentication token
   - **Media Directory:** Path to your media files (usually `/mnt/user/media`)
   - **TMDb API Key:** (Optional) For enhanced metadata

#### Option 2: Manual Docker Setup
**DO NOT** set `MEDIA_PATH` as an environment variable in Unraid. Instead:

1. In the Unraid Docker UI, add a **Volume Mapping**:
   - **Container Path:** `/data/media`
   - **Host Path:** `/mnt/user/media` (or your actual media path)
   - **Access Mode:** Read Only

2. Your media structure should match your Plex library structure:
   ```
   /mnt/user/media/
   ├── movies/
   │   ├── Movie Name (Year)/
   │   │   └── Movie Name (Year).mkv
   └── tv/
       └── Show Name/
           └── Season 01/
               └── Episode.mkv
   ```

### Docker Compose Setup

For docker-compose users, ensure your media path is properly mounted:
```yaml
volumes:
  - "/your/host/media/path:/data/media:ro"
environment:
  - MEDIA_PATH=/data/media  # Container path, not host path
```

### Development Setup (Windows PC accessing NAS)

```bash
MEDIA_PATH=\\TOWER\data\media  # Windows network share
```

### Other NAS Platforms

- **Synology:** Mount `/volume1/media` to `/data/media` in container
- **Generic Docker:** Mount your media directory to `/data/media` in container

The application automatically detects the environment and tries multiple path patterns to locate your media files.

### Troubleshooting Media Access

If you're getting "Could not find video file" errors:

1. **Check Docker logs** for detailed path information:
   ```bash
   docker logs your-container-name
   ```

2. **Verify volume mapping** in Docker:
   - Container path should be `/data/media`
   - Host path should point to your actual media directory
   - Access mode should be "Read Only"

3. **Test file access** from within the container:
   ```bash
   docker exec -it your-container-name ls -la /data/media
   ```

4. **Common Unraid media paths:**
   - `/mnt/user/media` (most common)
   - `/mnt/disk1/media`
   - `/mnt/cache/media`

5. **Path structure verification:** Make sure your media follows this structure:
   ```
   Host: /mnt/user/media/movies/Movie (Year)/Movie.mkv
   Container: /data/media/movies/Movie (Year)/Movie.mkv
   ```

The application will show detailed path checking in the Docker logs to help diagnose issues.

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

