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
- **Error handling**: Graceful degradation, print statements for debugging
- **No comments**: Code should be self-documenting
- **Service pattern**: Dependency injection in routes

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
- **Caching system**: JSON cache in `cache/frame_data/` directory
- **Session management**: Async processing with progress tracking
- **Error suppression**: Comprehensive codec error filtering

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
- Automatic cleanup of old cache files
- Cache invalidation based on file modification
- Manual cache clearing via `/api/cache/clear`

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

# Clear cache
curl -X POST http://localhost:5054/api/cache/clear
```

## Performance Considerations

- **OpenCV optimization**: Adaptive sample rates for large videos
- **Caching strategy**: Persistent frame data to avoid reprocessing
- **Async processing**: Background threads for long-running operations
- **Memory management**: Cleanup of OpenCV VideoCapture objects