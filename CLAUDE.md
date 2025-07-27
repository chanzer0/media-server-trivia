# Media Server Trivia - Claude Development Guide

## Project Overview

A Flask-based web application that generates trivia games from Plex media libraries. Features include cast guessing, release year challenges, poster identification, and frame color analysis using OpenCV computer vision.

## Architecture

### Core Components

- **Flask Application** (`app/__init__.py`): Factory pattern with service injection
- **Services Layer**: 
  - `PlexService`: Plex API wrapper for media retrieval
  - `TMDbService`: The Movie Database API integration for metadata
  - `TriviaEngine`: Core game logic and computer vision processing
- **Routes** (`routes.py`): API endpoints and page rendering
- **Frontend**: Vanilla JavaScript with modern CSS, no frameworks

### Key Technologies

- **Backend**: Flask, PlexAPI, TMDb API, OpenCV, NumPy
- **Computer Vision**: OpenCV for video frame extraction and color analysis
- **Containerization**: Docker with Unraid template support
- **Frontend**: Vanilla JS, CSS Grid/Flexbox, SVG icons

## File Structure

```
app/
├── __init__.py          # Flask app factory
├── plex_service.py      # Plex API wrapper
├── tmdb_service.py      # TMDb API wrapper  
├── trivia.py           # Core trivia engine with CV
├── routes.py           # Flask routes and API endpoints
├── static/             # Frontend assets
│   ├── *.js           # Game-specific JavaScript
│   └── style.css      # Modern CSS with dark/light themes
└── templates/          # Jinja2 HTML templates
    ├── base.html      # Base template with navigation
    └── game_*.html    # Individual game pages
```

## Development Guidelines

### Implementations
- **Brevity**: Do not introduce more code than necessary.
- **Efficiency**: Use the most efficient code possible.

### Code Style
- **Type hints**: Use modern Python typing (`str | None` not `Union[str, None]`)
- **Error handling**: Use `@with_error_handling` decorator and `handle_trivia_response()` helper
- **Logging**: Use Python `logger` instead of print statements
- **No comments**: Code should be self-documenting
- **Service pattern**: Dependency injection in routes
- **Constants**: All magic numbers in `constants.py`
- **Resource management**: Use context managers (e.g., `safe_video_capture()`)

### Environment Variables
- `PLEX_BASE_URL`: Plex server URL
- `PLEX_TOKEN`: Plex authentication token
- `TMDB_API_KEY`: Optional TMDb API key
- `MEDIA_PATH`: Path to media files (container internal: `/data/media`)

### Docker & Unraid
- **Volume mapping critical**: Host media path → `/data/media` (read-only)
- **Don't use MEDIA_PATH env var** in Unraid - use volume mapping
- **Unraid template**: `unraid-template.xml` for easy deployment
- **Path resolution**: Smart path mapping handles various mount scenarios

### Computer Vision Features
- **Frame extraction**: OpenCV with FFmpeg backend
- **Caching system**: 
  - Frame data: JSON cache in `cache/frame_data/` (persists forever)
  - TMDb data: JSON cache in `cache/tmdb_data/` (persists forever)
  - Cache key based on file modification time for frames
  - Cache invalidation only via manual API call
- **Session management**: Async processing with progress tracking, proper thread cleanup
- **Error suppression**: Comprehensive codec error filtering
- **Resource safety**: Context managers for VideoCapture objects

### API Design
- **RESTful endpoints**: `/api/trivia/*` for game data
- **Progressive enhancement**: Works without JavaScript
- **Error responses**: Consistent JSON error format
- **Session tracking**: For long-running CV operations

### Frontend Patterns
- **No frameworks**: Vanilla JavaScript with modern patterns
- **CSS variables**: For theming and consistent design
- **Progressive enhancement**: Server-rendered with JS enhancements
- **Responsive design**: Mobile-first approach

## Common Development Tasks

### Adding New Game Types
1. Add method to `TriviaEngine` class
2. Create API endpoint in `routes.py`
3. Add frontend JavaScript file
4. Create game template
5. Update navigation in `base.html`

### Debugging Media Access
- Check Docker logs for path resolution details
- Verify volume mapping in container
- Test with `docker exec -it container ls /data/media`
- Path mapping logic in `_get_mapped_paths()`

### Testing OpenCV Features
- Use `/api/performance/opencv` endpoint for diagnostics
- Check cache directory for processed data
- Monitor session progress via `/api/trivia/frame/progress/<id>`

### Deployment
- **Development**: `python run.py` with `.env` file
- **Production**: Docker with proper volume mounts
- **Unraid**: Use provided template for automatic setup

## Known Issues & Solutions

### HEVC Codec Warnings
- Suppressed via comprehensive logging configuration in `trivia.py`
- Harmless FFmpeg messages during video processing

### Path Resolution
- Complex path mapping handles Docker/NAS mount scenarios
- Fallback patterns for common NAS configurations
- Debug logging shows path resolution attempts

### Cache Management
- **Persistence**: All cache files persist forever (no automatic cleanup)
- **Frame cache**: Keyed by file path + size + mtime + sample rate
- **TMDb cache**: Keyed by movie ID, stores API responses indefinitely
- **Invalidation**: Frame cache auto-invalidates on file modification
- **Manual clearing**: `/api/cache/clear` clears both frame and TMDb caches
- **Cache info**: `/api/cache/info` shows cache statistics

## Recent Refactoring (Phase 1 Complete)

### Completed Improvements
- ✅ **Resource leak fixes**: VideoCapture with context managers
- ✅ **Thread cleanup**: Proper thread joining in session cleanup
- ✅ **Error handling**: Standardized with decorators and helpers
- ✅ **Logging**: Replaced print statements with logger
- ✅ **Constants**: Magic numbers moved to `constants.py`
- ✅ **Cache persistence**: Removed automatic cleanup per requirements

### New Files Added
- `app/utils.py`: Helper functions and decorators
- `app/constants.py`: All magic numbers and configuration
- `app/static/game-base.js`: Base class for frontend games
- `app/tmdb_cache.py`: TMDb API response caching layer

## Testing Commands

```bash
# Local development
python run.py

# Docker build
docker build -t media-server-trivia .

# Check media access
docker exec -it container ls -la /data/media

# View logs
docker logs container-name

# Cache management
curl http://localhost:5054/api/cache/info          # View cache statistics
curl -X POST http://localhost:5054/api/cache/clear # Clear all caches
```

## Performance Considerations

- **OpenCV optimization**: Adaptive sample rates for large videos
- **Caching strategy**: Persistent frame data to avoid reprocessing
- **Async processing**: Background threads for long-running operations
- **Memory management**: Cleanup of OpenCV VideoCapture objects