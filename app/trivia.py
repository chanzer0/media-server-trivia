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
        from .constants import FRAMED_CACHE_DIR, CAST_MATCH_CACHE_DIR
        self.framed_cache_dir = Path(FRAMED_CACHE_DIR)
        self.framed_cache_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"Framed cache directory initialized: {self.framed_cache_dir.absolute()}")

        # Cast Match cache setup
        self.cast_match_cache_dir = Path(CAST_MATCH_CACHE_DIR)
        self.cast_match_cache_dir.mkdir(parents=True, exist_ok=True)
        self._actor_index = None
        self._director_list = None
        logger.info(f"Cast Match cache directory initialized: {self.cast_match_cache_dir.absolute()}")

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
        return {"question": question, "answer": movie}

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

        return {
            "title": movie.title,
            "cast": cast_with_photos[:12],  # Limit to 12 for the game
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
        }

    def _get_actor_index(self):
        """Get or build actor-to-movies index with persistent caching."""
        movies = self.plex.get_movies()
        if not movies:
            return None

        library_size = len(movies)
        cache_file = self.cast_match_cache_dir / "actor_index.json"
        metadata_file = self.cast_match_cache_dir / "actor_index_metadata.json"

        if cache_file.exists() and metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)

                if metadata.get('library_size') == library_size:
                    logger.info(f"Using cached actor index for {library_size} movies")
                    with open(cache_file, 'r') as f:
                        cached_index = json.load(f)

                    actor_index = {}
                    for actor_name, movie_titles in cached_index.items():
                        actor_index[actor_name] = [
                            m for m in movies if m.title in movie_titles
                        ]

                    self._actor_index = actor_index
                    return actor_index
                else:
                    logger.info(f"Library size changed ({metadata.get('library_size')} -> {library_size}), rebuilding index")
            except Exception as e:
                logger.error(f"Error reading cached actor index: {e}")

        logger.info(f"Building new actor index for {library_size} movies...")
        actor_movies = {}

        for movie in movies:
            try:
                for actor in getattr(movie, 'actors', []):
                    actor_name = actor.tag
                    if actor_name not in actor_movies:
                        actor_movies[actor_name] = []
                    actor_movies[actor_name].append(movie)
            except Exception:
                continue

        cache_data = {
            actor: [m.title for m in movie_list]
            for actor, movie_list in actor_movies.items()
        }

        try:
            with open(cache_file, 'w') as f:
                json.dump(cache_data, f, separators=(',', ':'))

            with open(metadata_file, 'w') as f:
                json.dump({'library_size': library_size}, f)

            logger.info(f"Cached actor index with {len(actor_movies)} actors")
        except Exception as e:
            logger.error(f"Error caching actor index: {e}")

        self._actor_index = actor_movies
        return actor_movies

    def get_all_directors(self):
        """Get list of all unique directors from library with caching."""
        movies = self.plex.get_movies()
        if not movies:
            return []

        library_size = len(movies)
        cache_file = self.cast_match_cache_dir / "director_list.json"
        metadata_file = self.cast_match_cache_dir / "director_list_metadata.json"

        if cache_file.exists() and metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)

                if metadata.get('library_size') == library_size:
                    logger.info(f"Using cached director list for {library_size} movies")
                    with open(cache_file, 'r') as f:
                        self._director_list = json.load(f)
                    return self._director_list
                else:
                    logger.info(f"Library size changed ({metadata.get('library_size')} -> {library_size}), rebuilding director list")
            except Exception as e:
                logger.error(f"Error reading cached director list: {e}")

        logger.info(f"Building director list for {library_size} movies...")
        directors = set()

        for movie in movies:
            tmdb_id = None
            for guid in getattr(movie, "guids", []):
                try:
                    gid = getattr(guid, "id", "")
                    if isinstance(gid, str) and gid.startswith("tmdb://"):
                        tmdb_id = int(gid.split("tmdb://", 1)[1])
                        break
                except Exception:
                    continue

            if tmdb_id and self.tmdb:
                tmdb_data = self._get_tmdb_details(movie)
                if tmdb_data and hasattr(tmdb_data, 'credits'):
                    crew = getattr(tmdb_data.credits, 'crew', [])
                    for person in crew:
                        if hasattr(person, 'job') and person.job == 'Director':
                            directors.add(person.name)

        self._director_list = sorted(list(directors))

        try:
            with open(cache_file, 'w') as f:
                json.dump(self._director_list, f)

            with open(metadata_file, 'w') as f:
                json.dump({'library_size': library_size}, f)

            logger.info(f"Cached {len(self._director_list)} unique directors")
        except Exception as e:
            logger.error(f"Error caching director list: {e}")

        return self._director_list

    def cast_match(self):
        """Generate Cast Match game - find the actor that appears in multiple movies."""
        from .constants import CAST_MATCH_ROUNDS, CAST_MATCH_MIN_MOVIES, CAST_MATCH_MAX_MOVIES

        actor_movies = self._get_actor_index()
        if not actor_movies:
            return {"error": "No movies in library"}

        eligible_actors = {
            actor: movie_list
            for actor, movie_list in actor_movies.items()
            if CAST_MATCH_MIN_MOVIES <= len(movie_list) <= CAST_MATCH_MAX_MOVIES
        }

        if not eligible_actors:
            return {"error": "No actors found with multiple movies in library"}

        answer_actor = random.choice(list(eligible_actors.keys()))
        actor_movie_list = eligible_actors[answer_actor]

        movie_data = []
        for movie in actor_movie_list:
            logger.info(f"Processing movie: {movie.title}")

            tmdb_id = None
            for guid in getattr(movie, "guids", []):
                try:
                    gid = getattr(guid, "id", "")
                    if isinstance(gid, str) and gid.startswith("tmdb://"):
                        tmdb_id = int(gid.split("tmdb://", 1)[1])
                        break
                except Exception:
                    continue

            logger.info(f"TMDb ID for {movie.title}: {tmdb_id}")

            tmdb_data = self._get_tmdb_details(movie) if tmdb_id else None
            logger.info(f"TMDb data retrieved for {movie.title}: {bool(tmdb_data)}")

            if tmdb_data:
                logger.info(f"TMDb data attributes: {dir(tmdb_data)}")
                if hasattr(tmdb_data, 'credits'):
                    logger.info(f"Credits available: {bool(tmdb_data.credits)}")
                    logger.info(f"Credits attributes: {dir(tmdb_data.credits)}")

            director = None
            if tmdb_data and hasattr(tmdb_data, 'credits'):
                crew = getattr(tmdb_data.credits, 'crew', [])
                logger.info(f"Crew count for {movie.title}: {len(crew) if crew else 0}")
                for person in crew:
                    if hasattr(person, 'job') and person.job == 'Director':
                        director = person.name
                        logger.info(f"Found director for {movie.title}: {director}")
                        break
                if not director:
                    logger.warning(f"No director found in crew for {movie.title}")

            cast = []
            if tmdb_id and self.tmdb:
                all_cast = self.tmdb.get_movie_cast(tmdb_id) or []
                logger.info(f"Cast count for {movie.title}: {len(all_cast)}")
                cast = [c for c in all_cast if c["name"] != answer_actor][:5]
                logger.info(f"Filtered cast (excluding {answer_actor}): {[c['name'] for c in cast]}")

            poster = None
            if tmdb_data and hasattr(tmdb_data, "poster_path") and tmdb_data.poster_path and self.tmdb:
                poster = self.tmdb.get_poster_url(tmdb_data.poster_path, "w500")
                logger.info(f"TMDb poster URL for {movie.title}: {poster}")
            elif hasattr(movie, "thumbUrl"):
                poster = movie.thumbUrl
                logger.info(f"Plex thumbUrl for {movie.title}: {poster}")
            elif self.plex.server:
                try:
                    poster = self.plex.server.url(movie.thumb)
                    logger.info(f"Plex server thumb URL for {movie.title}: {poster}")
                except Exception as e:
                    logger.error(f"Error getting poster for {movie.title}: {e}")
                    poster = None

            overview = None
            rating = None
            genres = []
            if tmdb_data:
                logger.info(f"Available TMDb attributes for {movie.title}: overview={hasattr(tmdb_data, 'overview')}, vote_average={hasattr(tmdb_data, 'vote_average')}, genres={hasattr(tmdb_data, 'genres')}")

                if hasattr(tmdb_data, 'overview') and tmdb_data.overview:
                    overview = tmdb_data.overview
                    logger.info(f"Overview for {movie.title}: {overview[:100]}...")

                if hasattr(tmdb_data, 'vote_average') and tmdb_data.vote_average:
                    rating = tmdb_data.vote_average
                    logger.info(f"Rating for {movie.title}: {rating}")

                if hasattr(tmdb_data, 'genres') and tmdb_data.genres:
                    genres = [g.name if hasattr(g, 'name') else str(g) for g in tmdb_data.genres]
                    logger.info(f"Genres for {movie.title}: {genres}")

            movie_dict = {
                "title": movie.title,
                "year": getattr(movie, "year", None),
                "director": director,
                "cast": cast,
                "poster": poster,
                "overview": overview,
                "rating": rating,
                "genres": genres
            }
            logger.info(f"Final movie data for {movie.title}: {movie_dict}")
            movie_data.append(movie_dict)

        return {
            "answer": answer_actor,
            "movies": movie_data,
            "total_rounds": CAST_MATCH_ROUNDS,
            "movie_count": len(movie_data)
        }

    def _prioritize_subtitle_file(self, subtitle_files):
        """Prioritize English and SDH subtitle files."""
        if not subtitle_files:
            return None

        # Priority patterns (case-insensitive)
        priority_patterns = [
            r'\.eng?\.sdh\.srt$',      # English SDH (highest priority)
            r'\.en\.sdh\.srt$',
            r'\.sdh\.srt$',
            r'\.eng?\.forced\.srt$',   # English forced
            r'\.en\.forced\.srt$',
            r'\.eng?\.srt$',           # English
            r'\.en\.srt$',
            r'\.english\.srt$',
        ]

        logger.info(f"[Quote] Found {len(subtitle_files)} subtitle files:")
        for sf in subtitle_files:
            logger.info(f"[Quote]   - {sf.name}")

        # Try each priority pattern
        import re
        for pattern in priority_patterns:
            for subtitle_file in subtitle_files:
                if re.search(pattern, subtitle_file.name, re.IGNORECASE):
                    logger.info(f"[Quote] Selected subtitle file (pattern: {pattern}): {subtitle_file.name}")
                    return subtitle_file

        # Fallback to first file
        logger.info(f"[Quote] No priority match, using first file: {subtitle_files[0].name}")
        return subtitle_files[0]

    def _parse_srt_file(self, subtitle_path):
        """Parse SRT subtitle file and extract dialogue lines with timestamps."""
        import re

        logger.info(f"[Quote] Parsing SRT file: {subtitle_path}")

        try:
            with open(subtitle_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            # Split by double newlines to get subtitle blocks
            blocks = re.split(r'\n\s*\n', content)
            quotes = []

            for idx, block in enumerate(blocks):
                lines = block.strip().split('\n')
                if len(lines) >= 3:
                    # Extract timestamp from line[1]
                    timestamp_line = lines[1] if len(lines) > 1 else "00:00:00,000"
                    # Parse start time from "HH:MM:SS,mmm --> HH:MM:SS,mmm"
                    timestamp_match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})', timestamp_line)
                    timestamp = timestamp_match.group(1) if timestamp_match else "00:00:00,000"

                    # Skip the sequence number and timestamp, get the text
                    text = ' '.join(lines[2:]).strip()

                    # Clean up HTML tags and formatting
                    text = re.sub(r'<[^>]+>', '', text)
                    text = re.sub(r'\[.*?\]', '', text)
                    text = re.sub(r'\(.*?\)', '', text)
                    text = re.sub(r'[♪\-]', '', text)
                    text = text.strip()

                    if text and not text.isupper():  # Avoid sound effects
                        quotes.append({
                            'text': text,
                            'timestamp': timestamp
                        })

            logger.info(f"[Quote] Parsed {len(quotes)} valid dialogue lines from {len(blocks)} subtitle blocks")
            return quotes
        except Exception as e:
            logger.error(f"[Quote] Error parsing subtitle file {subtitle_path}: {e}")
            return []

    def _parse_timestamp_to_seconds(self, timestamp):
        """Convert SRT timestamp (HH:MM:SS,mmm) to seconds."""
        try:
            import re
            match = re.match(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', timestamp)
            if match:
                hours, minutes, seconds, milliseconds = map(int, match.groups())
                return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000.0
            return 0
        except Exception:
            return 0

    def quote_game(self):
        """Generate Quote Game - guess movie from subtitle quotes."""
        from .constants import (
            QUOTE_ROUNDS, QUOTE_MIN_LENGTH, QUOTE_MAX_LENGTH,
            QUOTE_BLOCK_SIZE_MIN, QUOTE_BLOCK_SIZE_MAX, QUOTE_MAX_TIME_GAP_SECONDS
        )

        # Try up to 10 movies to find one with valid dialogue blocks
        for attempt in range(10):
            movie = self._random_movie()
            if not movie:
                continue

            video_path = self._get_video_file_path(movie)
            if not video_path:
                logger.info(f"[Quote] Attempt {attempt + 1}: Could not find video file for {movie.title}")
                continue

            # Look for subtitle files (.srt) in the same directory
            video_dir = Path(video_path).parent
            subtitle_files = list(video_dir.glob("*.srt"))

            if not subtitle_files:
                logger.info(f"[Quote] Attempt {attempt + 1}: No subtitle files found for {movie.title}")
                continue

            logger.info(f"[Quote] Attempt {attempt + 1}: Processing {movie.title}")

            # Prioritize English/SDH subtitle files
            subtitle_path = self._prioritize_subtitle_file(subtitle_files)

            quotes = self._parse_srt_file(subtitle_path)
            if not quotes or len(quotes) < QUOTE_ROUNDS * 3:
                logger.info(f"[Quote] Attempt {attempt + 1}: Not enough quotes ({len(quotes) if quotes else 0}) for {movie.title}")
                continue

            logger.info(f"[Quote] Total quotes extracted: {len(quotes)}")

            # Filter quotes by length
            filtered_quotes = [
                q for q in quotes
                if QUOTE_MIN_LENGTH <= len(q['text']) <= QUOTE_MAX_LENGTH
            ]

            logger.info(f"[Quote] Quotes after length filter ({QUOTE_MIN_LENGTH}-{QUOTE_MAX_LENGTH} chars): {len(filtered_quotes)}")

            if len(filtered_quotes) < QUOTE_ROUNDS * 3:
                logger.info(f"[Quote] Not enough quotes in ideal range, relaxing to minimum length only")
                filtered_quotes = [q for q in quotes if len(q['text']) >= QUOTE_MIN_LENGTH]
                logger.info(f"[Quote] Quotes after relaxed filter (>={QUOTE_MIN_LENGTH} chars): {len(filtered_quotes)}")

            if len(filtered_quotes) < QUOTE_ROUNDS * QUOTE_BLOCK_SIZE_MIN:
                logger.info(f"[Quote] Attempt {attempt + 1}: Still not enough quotes ({len(filtered_quotes)}) for {movie.title}")
                continue

            # Create dialogue blocks with time-gap checking to avoid scene changes
            dialogue_blocks = []
            i = 0
            while i < len(filtered_quotes) - QUOTE_BLOCK_SIZE_MIN:
                block_size = random.randint(QUOTE_BLOCK_SIZE_MIN, min(QUOTE_BLOCK_SIZE_MAX, len(filtered_quotes) - i))

                # Check if all quotes in this block are within the time gap threshold
                block_candidate = filtered_quotes[i:i + block_size]
                is_valid_block = True

                for j in range(len(block_candidate) - 1):
                    time1 = self._parse_timestamp_to_seconds(block_candidate[j]['timestamp'])
                    time2 = self._parse_timestamp_to_seconds(block_candidate[j + 1]['timestamp'])
                    time_gap = time2 - time1

                    if time_gap > QUOTE_MAX_TIME_GAP_SECONDS or time_gap < 0:
                        is_valid_block = False
                        logger.debug(f"[Quote] Rejecting block at index {i}: time gap {time_gap:.1f}s between quotes")
                        break

                if is_valid_block:
                    dialogue_blocks.append(block_candidate)
                    logger.debug(f"[Quote] Valid block found at index {i} with {block_size} lines")

                i += 1

            logger.info(f"[Quote] Created {len(dialogue_blocks)} valid dialogue blocks (time-gap filtered)")

            if len(dialogue_blocks) < QUOTE_ROUNDS:
                logger.info(f"[Quote] Attempt {attempt + 1}: Not enough dialogue blocks ({len(dialogue_blocks)}) for {movie.title}")
                continue

            # Select random dialogue blocks
            selected_quotes = random.sample(dialogue_blocks, QUOTE_ROUNDS)

            logger.info(f"[Quote] Selected {len(selected_quotes)} dialogue blocks for {movie.title}")

            # Log the actual selected dialogue blocks for debugging
            for idx, block in enumerate(selected_quotes):
                logger.info(f"[Quote] Round {idx + 1} dialogue block ({len(block)} lines):")
                for line_idx, quote_obj in enumerate(block):
                    text = quote_obj['text']
                    timestamp = quote_obj['timestamp']
                    logger.info(f"[Quote]   [{timestamp}] Line {line_idx + 1}: {text[:70]}{'...' if len(text) > 70 else ''}")

                # Log time span of the block
                if len(block) > 1:
                    start_time = self._parse_timestamp_to_seconds(block[0]['timestamp'])
                    end_time = self._parse_timestamp_to_seconds(block[-1]['timestamp'])
                    time_span = end_time - start_time
                    logger.info(f"[Quote]   Time span: {time_span:.1f} seconds")

            # Get TMDb data
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

            # Concatenate dialogue lines into single text blocks with ellipsis
            selected_quotes_text = ['... ' + ' '.join([q['text'] for q in block]) + ' ...' for block in selected_quotes]

            return {
                "title": movie.title,
                "year": getattr(movie, "year", None),
                "quotes": selected_quotes_text,
                "total_rounds": QUOTE_ROUNDS,
            }

        # If we get here, all 10 attempts failed
        logger.error("[Quote] Failed to find a movie with valid dialogue blocks after 10 attempts")
        return {"error": "Could not find a movie with suitable dialogue blocks. Please try again."}

    def timeline_challenge(self):
        """Timeline Challenge - combined cast + year guessing game."""
        logger.info("[Timeline] Starting timeline challenge")

        movie = self._random_movie()
        if not movie:
            logger.error("[Timeline] No movie found")
            return {"error": "No movie found"}

        logger.info(f"[Timeline] Selected movie: {movie.title} ({movie.year})")

        tmdb_id = None
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    tmdb_id = int(gid.split("tmdb://", 1)[1])
                    break
            except Exception as e:
                logger.warning(f"[Timeline] Error parsing guid: {e}")
                continue

        logger.info(f"[Timeline] TMDb ID: {tmdb_id}")

        cast_with_photos = []
        if tmdb_id and self.tmdb:
            logger.info("[Timeline] Fetching cast from TMDb")
            cast_with_photos = self.tmdb.get_movie_cast(tmdb_id) or []
            logger.info(f"[Timeline] Got {len(cast_with_photos)} cast members from TMDb")

        if not cast_with_photos:
            logger.info("[Timeline] No TMDb cast, falling back to Plex actors")
            try:
                cast_names = [actor.tag for actor in movie.actors][:12]
                cast_with_photos = [
                    {"name": name, "profile_path": None} for name in cast_names
                ]
                logger.info(f"[Timeline] Got {len(cast_with_photos)} actors from Plex")
            except Exception as e:
                logger.error(f"[Timeline] Error getting Plex actors: {e}")
                cast_with_photos = []

        logger.info("[Timeline] Fetching TMDb details for director")
        tmdb = self._get_tmdb_details(movie) if tmdb_id else None
        logger.info(f"[Timeline] TMDb details fetched: {tmdb is not None}, has credits: {hasattr(tmdb, 'credits') if tmdb else False}")

        director = None
        if tmdb and hasattr(tmdb, 'credits'):
            crew = getattr(tmdb.credits, 'crew', [])
            logger.info(f"[Timeline] Searching {len(crew)} crew members for director")
            for person in crew:
                if hasattr(person, 'job') and person.job == 'Director':
                    director = person.name
                    logger.info(f"[Timeline] Found director: {director}")
                    break

        if not director:
            logger.warning(f"[Timeline] No director found for {movie.title}")

        result = {
            "title": movie.title,
            "year": movie.year,
            "summary": getattr(movie, "summary", "No summary available"),
            "cast": cast_with_photos[:12],
            "director": director,
        }

        logger.info(f"[Timeline] Returning result with {len(result['cast'])} cast members, director: {director}")
        return result
