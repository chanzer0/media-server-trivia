import random
import cv2
import os
import json
import hashlib
from pathlib import Path

# Suppress OpenCV/FFmpeg H.264 error messages
import logging
logging.getLogger('libav').setLevel(logging.CRITICAL)
logging.getLogger('ffmpeg').setLevel(logging.CRITICAL)

# Setup logger for this module
logger = logging.getLogger(__name__)

# Set OpenCV log level to reduce noise (try different attribute names for compatibility)
try:
    cv2.setLogLevel(cv2.LOG_LEVEL_ERROR)
except AttributeError:
    try:
        cv2.setLogLevel(3)  # 3 = ERROR level in OpenCV
    except:
        pass  # Ignore if not supported in this OpenCV version


class TriviaEngine:
    """Generates trivia questions from Plex media and TMDb metadata."""

    def __init__(self, plex_service, tmdb_service=None):
        self.plex = plex_service
        self.tmdb = tmdb_service

        # Framed game cache setup
        from .constants import FRAMED_CACHE_DIR
        self.framed_cache_dir = Path(FRAMED_CACHE_DIR)
        self.framed_cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Framed cache directory initialized: {self.framed_cache_dir.absolute()}")

    def _get_cache_key(self, video_path, sample_rate=200):
        """Generate a cache key based on video file path, size, and modification time."""
        try:
            stat = os.stat(video_path)
            # Include file path, size, modification time, and sample rate in hash
            cache_data = f"{video_path}:{stat.st_size}:{stat.st_mtime}:{sample_rate}"
            return hashlib.md5(cache_data.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Error generating cache key: {e}")
            return None

    def _get_tmdb_details(self, movie):
        """Return TMDb metadata for the given Plex movie."""
        if not self.tmdb:
            return None

        tmdb_id = None
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    tmdb_id = int(gid.split("tmdb://", 1)[1])
                    break
            except Exception:
                continue

        if tmdb_id:
            return self.tmdb.get_movie_details(tmdb_id)
        return None

    def _random_movie(self):
        """Return a random movie from the Plex library."""
        movies = self.plex.get_movies()
        if not movies:
            return None
        return random.choice(movies)

    def _get_random_movies(self, count=4, exclude_movie=None):
        """Return a list of random movies from the Plex library."""
        movies = self.plex.get_movies()
        if not movies:
            return []
        
        # Filter out the excluded movie if provided
        if exclude_movie:
            movies = [m for m in movies if m.title != exclude_movie.title]
        
        # If we don't have enough movies, return what we have
        if len(movies) < count:
            return movies
        
        return random.sample(movies, count)

    def random_question(self):
        movie = self._random_movie()
        if not movie:
            return None
        question = f"Which movie features '{movie}'?"
        tmdb = self._get_tmdb_details(movie)
        return {"question": question, "answer": movie, "tmdb": tmdb}

    def cast_reveal(self):
        """Return the top few cast members for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None

        # Get TMDb ID first to get cast with photos
        tmdb_id = None
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    tmdb_id = int(gid.split("tmdb://", 1)[1])
                    break
            except Exception:
                continue

        # Try to get cast with photos from TMDb
        cast_with_photos = []
        if tmdb_id and self.tmdb:
            cast_with_photos = self.tmdb.get_movie_cast(tmdb_id) or []

        # Fallback to Plex cast data if TMDb not available
        if not cast_with_photos:
            try:
                cast_names = [actor.tag for actor in movie.actors][:12]
                cast_with_photos = [
                    {"name": name, "profile_path": None} for name in cast_names
                ]
            except Exception:
                cast_with_photos = []

        tmdb = self._get_tmdb_details(movie) if tmdb_id else None
        return {
            "title": movie.title,
            "cast": cast_with_photos[:12],  # Limit to 12 for the game
            "tmdb": tmdb,
        }

    def guess_year(self):
        """Return the title and year for a random movie."""
        print("guess_year() called")
        movie = self._random_movie()
        if not movie:
            print("No movie returned from _random_movie()")
            return None

        print(f"Selected movie: {movie.title}")
        print(f"Movie year: {getattr(movie, 'year', 'No year attribute')}")
        print(
            f"Movie summary length: {len(getattr(movie, 'summary', '')) if hasattr(movie, 'summary') else 'No summary'}"
        )

        # Get TMDb ID first to get cast with photos
        tmdb_id = None
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    tmdb_id = int(gid.split("tmdb://", 1)[1])
                    break
            except Exception:
                continue

        # Try to get cast with photos from TMDb
        cast_with_photos = []
        if tmdb_id and self.tmdb:
            cast_with_photos = self.tmdb.get_movie_cast(tmdb_id) or []

        # Fallback to Plex cast data if TMDb not available
        if not cast_with_photos:
            try:
                cast_names = [actor.tag for actor in movie.actors][:4]
                cast_with_photos = [
                    {"name": name, "profile_path": None} for name in cast_names
                ]
            except Exception:
                cast_with_photos = []

        try:
            tmdb = self._get_tmdb_details(movie)
            print(f"TMDb details retrieved: {bool(tmdb)}")
        except Exception as e:
            print(f"Error getting TMDb details: {e}")
            tmdb = None

        result = {
            "title": movie.title,
            "year": movie.year,
            "summary": getattr(movie, "summary", "No summary available"),
            "cast": cast_with_photos[:4],  # Limit to top 4 for year game
            "tmdb": tmdb,
        }

        print(f"Cast data: {len(cast_with_photos)} actors")
        print(f"Returning result: {result}")
        return result

    def poster_reveal(self):
        """Return poster and summary information for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None

        # Try to get TMDb poster first
        poster = None
        tmdb_data = self._get_tmdb_details(movie)

        # Get TMDb poster URL if available
        if (
            tmdb_data
            and hasattr(tmdb_data, "poster_path")
            and tmdb_data.poster_path
            and self.tmdb
        ):
            poster = self.tmdb.get_poster_url(tmdb_data.poster_path, "w500")

        # Fallback to Plex poster
        if not poster:
            if hasattr(movie, "thumbUrl"):
                poster = movie.thumbUrl
            elif self.plex.server:
                try:
                    poster = self.plex.server.url(movie.thumb)
                except Exception:
                    poster = None

        return {
            "title": movie.title,
            "poster": poster,
            "summary": movie.summary,
            "tmdb": tmdb_data,
        }

    def _get_video_file_path(self, movie):
        """Get the actual video file path from a Plex movie object."""
        try:
            # Get the media parts for the movie
            if hasattr(movie, "media") and movie.media:
                for media in movie.media:
                    if hasattr(media, "parts") and media.parts:
                        for part in media.parts:
                            if hasattr(part, "file"):
                                file_path = part.file
                                logger.debug(f"Original Plex file path: {file_path}")
                                
                                # Try the original path first
                                if os.path.exists(file_path):
                                    logger.debug(f"Found file at original path: {file_path}")
                                    return file_path
                                
                                # Try alternative path mappings for Docker/container environments
                                logger.debug(f"Original path not found, trying mapped paths...")
                                mapped_paths = self._get_mapped_paths(file_path)
                                logger.debug(f"Trying {len(mapped_paths)} mapped paths: {mapped_paths}")
                                
                                for mapped_path in mapped_paths:
                                    logger.debug(f"Checking: {mapped_path}")
                                    if os.path.exists(mapped_path):
                                        logger.debug(f"Found file at mapped path: {mapped_path}")
                                        return mapped_path
                                
                                logger.warning(f"No valid file path found for {movie.title}")
            logger.warning(f"No media parts found for {movie.title}")
            return None
        except Exception as e:
            logger.error(f"Error getting video file path: {e}")
            return None

    def _get_mapped_paths(self, original_path):
        """Generate alternative file paths for different mount scenarios."""
        mapped_paths = []
        
        # Get media path from environment variable
        media_path = os.getenv("MEDIA_PATH", "/data/media")
        
        # Common Docker/NAS mount patterns
        common_mounts = [
            "/data/media",
            "/media", 
            "/mnt/media",
            "/volume1/media",  # Synology
            "/shares/media",   # Generic NAS
            "/mnt/user/media", # Unraid
        ]
        
        # Windows development scenario - convert Unix paths to Windows network shares
        if os.name == 'nt':  # Windows
            # Check if MEDIA_PATH is a Windows network path
            if media_path.startswith('\\\\') or (len(media_path) > 1 and media_path[1] == ':'):
                # For Windows development with network shares
                for mount in common_mounts:
                    if original_path.startswith(mount):
                        # Get the relative path after the mount point
                        relative_path = original_path[len(mount):].lstrip('/')
                        # Convert forward slashes to backslashes for Windows
                        relative_path = relative_path.replace('/', '\\')
                        # Combine with Windows media path
                        if media_path.endswith('\\'):
                            mapped_path = media_path + relative_path
                        else:
                            mapped_path = media_path + '\\' + relative_path
                        mapped_paths.append(mapped_path)
                        break  # Only need one Windows mapping per mount
            else:
                # Fallback: If on Windows but MEDIA_PATH looks like Unix path, 
                # try common Windows network share patterns
                fallback_patterns = [
                    "\\\\TOWER\\data\\media",
                    "\\\\NAS\\data\\media", 
                    "\\\\SERVER\\media",
                    "\\\\UNRAID\\data\\media"
                ]
                
                for fallback_path in fallback_patterns:
                    for mount in common_mounts:
                        if original_path.startswith(mount):
                            # Get the relative path after the mount point
                            relative_path = original_path[len(mount):].lstrip('/')
                            # Convert forward slashes to backslashes for Windows
                            relative_path = relative_path.replace('/', '\\')
                            # Combine with fallback Windows path
                            if fallback_path.endswith('\\'):
                                mapped_path = fallback_path + relative_path
                            else:
                                mapped_path = fallback_path + '\\' + relative_path
                            mapped_paths.append(mapped_path)
                            break
        
        # Unix/Linux path mappings (for production on NAS or when not Windows)
        # Only apply Unix mappings if not already handled by Windows logic or if not Windows
        if os.name != 'nt' or not (media_path.startswith('\\\\') or (len(media_path) > 1 and media_path[1] == ':')):
            # If the original path starts with any common mount, try replacing with our media path
            for mount in common_mounts:
                if original_path.startswith(mount):
                    # Replace the mount prefix with our configured media path
                    relative_path = original_path[len(mount):].lstrip('/')
                    # Use forward slashes for Unix paths
                    if media_path.startswith('/'):
                        mapped_path = media_path.rstrip('/') + '/' + relative_path
                    else:
                        mapped_path = os.path.join(media_path, relative_path)
                    mapped_paths.append(mapped_path)
            
            # Also try some common direct mappings for Unix systems
            if original_path.startswith("/data/"):
                # Map /data/xxx to /mnt/user/xxx (Unraid style)
                unraid_path = original_path.replace("/data/", "/mnt/user/", 1)
                mapped_paths.append(unraid_path)
                
                # Map /data/xxx to configured media path
                relative_path = original_path[6:]  # Remove "/data/"
                if media_path != "/data":
                    if media_path.startswith('/'):
                        direct_mapped = media_path.rstrip('/') + '/' + relative_path
                    else:
                        direct_mapped = os.path.join(media_path, relative_path)
                    mapped_paths.append(direct_mapped)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_paths = []
        for path in mapped_paths:
            if path not in seen:
                seen.add(path)
                unique_paths.append(path)
        
        return unique_paths

    def _extract_framed_frames(self, video_path, num_frames=7):
        """Extract random frames from video for Framed game with caching."""
        from .constants import FRAMED_FRAME_WIDTH, FRAMED_FRAME_HEIGHT
        from .utils import safe_video_capture

        cache_key = self._get_cache_key(video_path, sample_rate=num_frames)
        cache_file = self.framed_cache_dir / f"{cache_key}.json"

        if cache_file.exists():
            try:
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                logger.debug(f"Using cached frames for Framed game: {cache_key}")
                return cached_data
            except Exception as e:
                logger.error(f"Error reading cached frames: {e}")

        try:
            with safe_video_capture(video_path) as cap:
                total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                fps = cap.get(cv2.CAP_PROP_FPS)

                if total_frames < num_frames:
                    logger.warning(f"Video has fewer frames ({total_frames}) than requested ({num_frames})")
                    num_frames = total_frames

                frame_positions = sorted(random.sample(range(0, total_frames), num_frames))

                frames_data = []
                for frame_pos in frame_positions:
                    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
                    ret, frame = cap.read()

                    if ret and frame is not None:
                        resized = cv2.resize(frame, (FRAMED_FRAME_WIDTH, FRAMED_FRAME_HEIGHT))

                        frame_filename = f"{cache_key}_frame_{frame_pos}.jpg"
                        frame_path = self.framed_cache_dir / frame_filename

                        success = cv2.imwrite(str(frame_path), resized, [cv2.IMWRITE_JPEG_QUALITY, 85])

                        if success:
                            logger.info(f"Saved frame to: {frame_path}")
                        else:
                            logger.error(f"Failed to save frame to: {frame_path}")
                            continue

                        frames_data.append({
                            "frame_number": frame_pos,
                            "time": frame_pos / fps if fps > 0 else 0,
                            "filename": frame_filename
                        })

                with open(cache_file, 'w') as f:
                    json.dump(frames_data, f, separators=(',', ':'))

                return frames_data
        except Exception as e:
            logger.error(f"Error extracting frames for Framed game: {e}")
            return None

    def framed(self):
        """Generate Framed game data - 7 random frames from a random movie."""
        from .constants import FRAMED_ROUNDS

        movie = self._random_movie()
        if not movie:
            return {"error": "No movie found"}

        video_path = self._get_video_file_path(movie)
        if not video_path:
            return {"error": f"Could not find video file for: {movie.title}"}

        frames_data = self._extract_framed_frames(video_path, FRAMED_ROUNDS)
        if not frames_data:
            return {"error": f"Could not extract frames from: {movie.title}"}

        tmdb_id = None
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    tmdb_id = int(gid.split("tmdb://", 1)[1])
                    break
            except Exception:
                continue

        tmdb_data = self._get_tmdb_details(movie) if tmdb_id else None

        director = None
        if tmdb_data and hasattr(tmdb_data, 'credits'):
            crew = getattr(tmdb_data.credits, 'crew', [])
            for person in crew:
                if hasattr(person, 'job') and person.job == 'Director':
                    director = person.name
                    break

        cast = []
        if tmdb_id and self.tmdb:
            cast = (self.tmdb.get_movie_cast(tmdb_id) or [])[:5]

        awards = []
        if tmdb_data:
            if hasattr(tmdb_data, 'awards') and tmdb_data.awards:
                awards = tmdb_data.awards

        return {
            "title": movie.title,
            "year": getattr(movie, "year", None),
            "director": director,
            "cast": cast,
            "awards": awards,
            "frames": frames_data,
            "total_rounds": FRAMED_ROUNDS,
            "tmdb": tmdb_data
        }
