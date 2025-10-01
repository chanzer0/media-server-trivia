# Media Server Trivia

An Unraid-ready Flask web application that transforms your Plex media library into an interactive trivia gaming experience. Test your knowledge of movies and shows with multiple game modes featuring progressive hints, intelligent caching, and real-time video frame analysis.

## Features

### 🎮 Five Engaging Game Modes

**Cast & Crew Challenge** *(Two-Phase Game)*
- **Phase 1:** Progressively reveals cast members (up to 12) with photos and character names
- **Phase 2:** Identify the director from autocomplete suggestions
- Decreasing point scoring: 500 → 400 → 300... (earlier guesses earn more)
- Skip functionality for both phases
- Total possible: 800 points (500 max movie + 300 director)

**Poster Reveal**
- Tile-based progressive reveal system (6×4 grid, 24 tiles total)
- 5 reveals, each uncovering 4 random tiles with smooth animations
- Score: 100 points per remaining reveal (500 max)
- Mobile-optimized with responsive grid layout

**Framed**
- Identify movies from individual frames extracted from actual video files
- 7 progressively revealed frames from different parts of the movie
- Scoring: 400 → 300 → 200 → 100 → 75 → 50 → 25 points
- Utilizes OpenCV for real-time frame extraction and caching

**Cast Match**
- Guess the actor/actress who appeared in all displayed films
- Progressive movie reveals (2-5 movies, 4 rounds)
- Scoring: 400 → 300 → 200 → 100 points per round
- Smart actor indexing with library-size-based cache invalidation

**Quote Game**
- Guess movies from actual subtitle dialogue blocks
- 3 rounds with 4-5 consecutive lines per block
- Time-gap filtering ensures quotes flow naturally (max 3 second gaps)
- Scoring: 500 → 300 → 100 points
- Prioritizes English/SDH subtitle files
- Parses SRT subtitle files directly from media

### 🚀 Technical Features
- **Smart Caching System:** Library-size-aware caching for actors, directors, and TMDb data
- **Real-time Video Processing:** OpenCV-powered frame extraction with persistent caching
- **TMDb Integration:** Enhanced metadata with cast photos, posters, and director information
- **Autocomplete Search:** Fast typeahead for movies, actors, and directors
- **Responsive Design:** Mobile-first UI with dark/light theme support
- **Docker Ready:** Optimized for Unraid with community template support

## Requirements
- **Python 3.11+** (for development) or Docker
- **Plex Server** with API token and base URL
- **TMDb API Key** (optional but recommended for enhanced metadata)
- **Media File Access** (required for Framed game - video frame extraction)

## Configuration
The application reads a few environment variables:

```
PLEX_BASE_URL=<http://your.plex.ip:port>
PLEX_TOKEN=<your_plex_token>
HOST_PORT=<port_for_web_ui>
TMDB_API_KEY=<your_tmdb_api_key>
MEDIA_PATH=<path_to_your_media_files>
```
These can be supplied in `docker-compose.yml` or directly in your environment. `HOST_PORT` controls which port the web interface listens on. `MEDIA_PATH` should point to the same media directory that your Plex server uses (required for Framed and Quote games).

## Running with Docker

The included `docker-compose.yml` pulls the prebuilt image from Docker Hub and
starts the container with your configured environment variables.

```
docker compose up
```

Ensure that `PLEX_BASE_URL`, `PLEX_TOKEN`, `HOST_PORT`, `TMDB_API_KEY`, and `MEDIA_PATH` are set in your environment or an `.env` file before starting the stack.
The web interface will be available on `http://localhost:${HOST_PORT}`. By default this is `5054`.

**Important for Framed Game:** The application needs direct access to your video files for frame extraction. Media access setup varies by platform:

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

## Game Details & Scoring

### Cast & Crew Challenge
- **Rounds:** 12 cast reveals max (Phase 1), 1 director guess (Phase 2)
- **Scoring:**
  - Movie guess: 500/400/300/200/150/100/75/50/40/30/20/10 (by round)
  - Director guess: 300 points (correct), 0 points (incorrect/skip)
  - Maximum total: 800 points
- **Features:**
  - Progressive cast member reveals with TMDb photos
  - Autocomplete for movie titles and directors
  - Skip option for both phases

### Poster Reveal
- **Rounds:** 5 reveals (1 automatic + 4 manual)
- **Scoring:** 100 points × remaining reveals (500 max)
- **Features:**
  - 24-tile grid (6×4) with random reveal pattern
  - Smooth fade animations
  - Wrong guesses automatically reveal more tiles

### Framed
- **Rounds:** 7 frame reveals
- **Scoring:** 400/300/200/100/75/50/25 points (by round)
- **Features:**
  - Extracts frames from actual video files using OpenCV
  - Smart frame caching with file modification tracking
  - Evenly distributed frames across movie duration

### Cast Match
- **Rounds:** 4 progressive movie reveals
- **Scoring:** 400/300/200/100 points (by round)
- **Features:**
  - Finds actors appearing in 2-5 movies from your library
  - Progressive movie poster reveals
  - Actor index cached with automatic library size validation

### Quote Game
- **Rounds:** 3 dialogue blocks
- **Scoring:** 500/300/100 points (by round)
- **Features:**
  - Each block contains 4-5 consecutive dialogue lines
  - Time-gap filtering (max 3 seconds between lines) prevents scene changes
  - Prioritizes English and SDH (hearing impaired) subtitle files
  - Parses SRT subtitle files from media directory
  - Concatenated display for natural reading flow
  - Extensive logging with timestamps for debugging

## Caching System

The application implements intelligent caching to optimize performance:

### TMDb Cache (`cache/tmdb_data/`)
- **Persists indefinitely** until manual clear
- Stores movie details, cast, and crew information
- Uses MD5 hashing for cache keys
- Automatic serialization/deserialization of TMDb objects

### Frame Cache (`cache/framed_frames/`)
- **Persists indefinitely** until manual clear or file modification
- Cache key based on: file path + size + modification time + sample rate
- Auto-invalidates when video files are modified
- Stores extracted frames as JPEG images

### Actor & Director Cache (`cache/cast_match/`)
- **Library-size-aware invalidation:** Rebuilds when movies added/removed
- Actor index: Maps actors to all their movies in your library
- Director list: Complete list of all directors with autocomplete
- Metadata files track library size for validation

### Cache Management
```bash
# View cache statistics
curl http://localhost:5054/api/cache/info

# Clear all caches
curl -X POST http://localhost:5054/api/cache/clear
```

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

