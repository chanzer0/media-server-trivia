import random
import cv2
import numpy as np
import os
import threading
import time
import uuid
import json
import hashlib
from pathlib import Path


class TriviaEngine:
    """Generates trivia questions from Plex media and TMDb metadata."""

    def __init__(self, plex_service, tmdb_service=None):
        self.plex = plex_service
        self.tmdb = tmdb_service
        # Progress tracking for frame processing
        self.active_sessions = {}  # {session_id: {progress, status, cap, thread, created_at}}
        self.session_lock = threading.Lock()
        
        # Frame cache setup
        self.cache_dir = Path("cache/frame_data")
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_lock = threading.Lock()
        
        # Start cleanup timer for stale sessions and cache
        self._start_cleanup_timer()

    def _start_cleanup_timer(self):
        """Start a background timer to clean up stale sessions and cache."""
        def cleanup_stale_data():
            current_time = time.time()
            stale_sessions = []
            
            # Clean up stale sessions
            with self.session_lock:
                for session_id, session in self.active_sessions.items():
                    # Clean up sessions older than 10 minutes
                    if current_time - session.get('created_at', 0) > 600:
                        stale_sessions.append(session_id)
            
            for session_id in stale_sessions:
                print(f"Cleaning up stale session: {session_id}")
                self.cleanup_session(session_id)
            
            # Clean up old cache files (older than 7 days)
            self._cleanup_old_cache_files()
            
            # Schedule next cleanup in 5 minutes
            timer = threading.Timer(300, cleanup_stale_data)
            timer.daemon = True
            timer.start()
        
        # Start the first cleanup timer
        timer = threading.Timer(300, cleanup_stale_data)
        timer.daemon = True
        timer.start()

    def _get_cache_key(self, video_path, sample_rate=200):
        """Generate a cache key based on video file path, size, and modification time."""
        try:
            stat = os.stat(video_path)
            # Include file path, size, modification time, and sample rate in hash
            cache_data = f"{video_path}:{stat.st_size}:{stat.st_mtime}:{sample_rate}"
            return hashlib.md5(cache_data.encode()).hexdigest()
        except Exception as e:
            print(f"Error generating cache key: {e}")
            return None

    def _get_cached_frame_data(self, cache_key):
        """Retrieve cached frame data if it exists and is valid."""
        if not cache_key:
            return None
        
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            with self.cache_lock:
                if cache_file.exists():
                    with open(cache_file, 'r') as f:
                        cached_data = json.load(f)
                    print(f"Cache hit for key: {cache_key}")
                    return cached_data
        except Exception as e:
            print(f"Error reading cache file {cache_file}: {e}")
            # Remove corrupted cache file
            try:
                cache_file.unlink()
            except:
                pass
        
        return None

    def _cache_frame_data(self, cache_key, frame_data):
        """Store frame data in cache."""
        if not cache_key:
            return
        
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            with self.cache_lock:
                with open(cache_file, 'w') as f:
                    json.dump(frame_data, f, separators=(',', ':'))
                print(f"Cached frame data with key: {cache_key}")
        except Exception as e:
            print(f"Error writing cache file {cache_file}: {e}")

    def _cleanup_old_cache_files(self, max_age_days=7):
        """Remove cache files older than max_age_days."""
        try:
            current_time = time.time()
            max_age_seconds = max_age_days * 24 * 60 * 60
            
            with self.cache_lock:
                for cache_file in self.cache_dir.glob("*.json"):
                    try:
                        if current_time - cache_file.stat().st_mtime > max_age_seconds:
                            cache_file.unlink()
                            print(f"Removed old cache file: {cache_file.name}")
                    except Exception as e:
                        print(f"Error removing cache file {cache_file}: {e}")
        except Exception as e:
            print(f"Error during cache cleanup: {e}")

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
                                
                                # Try the original path first
                                if os.path.exists(file_path):
                                    return file_path
                                
                                # Try alternative path mappings for Docker/container environments
                                mapped_paths = self._get_mapped_paths(file_path)
                                for mapped_path in mapped_paths:
                                    if os.path.exists(mapped_path):
                                        return mapped_path
            return None
        except Exception as e:
            print(f"Error getting video file path: {e}")
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

    def create_session(self):
        """Create a new processing session with unique ID."""
        session_id = str(uuid.uuid4())
        with self.session_lock:
            self.active_sessions[session_id] = {
                'progress': 0,
                'total': 0,
                'status': 'initializing',
                'message': 'Preparing to process video...',
                'cap': None,
                'thread': None,
                'result': None,
                'error': None,
                'created_at': time.time()
            }
        return session_id

    def get_session_progress(self, session_id):
        """Get current progress for a session."""
        with self.session_lock:
            session = self.active_sessions.get(session_id, None)
            if session:
                # Return only JSON-serializable data, excluding VideoCapture and Thread objects
                return {
                    'progress': session.get('progress', 0),
                    'total': session.get('total', 0),
                    'status': session.get('status', 'unknown'),
                    'message': session.get('message', ''),
                    'result': session.get('result'),
                    'error': session.get('error')
                }
            return None

    def cleanup_session(self, session_id):
        """Clean up resources for a session."""
        with self.session_lock:
            if session_id in self.active_sessions:
                session = self.active_sessions[session_id]
                
                # Close video capture if open
                if session.get('cap'):
                    try:
                        session['cap'].release()
                        print(f"Video capture closed for session {session_id}")
                    except Exception as e:
                        print(f"Error closing video capture: {e}")
                
                # Clean up session data
                del self.active_sessions[session_id]
                print(f"Session {session_id} cleaned up")

    def cleanup_all_sessions(self):
        """Clean up all active sessions (for shutdown)."""
        with self.session_lock:
            for session_id in list(self.active_sessions.keys()):
                self.cleanup_session(session_id)

    def _calculate_optimal_sample_rate(self, total_frames, target_samples=300):
        """Calculate optimal sampling rate based on video length."""
        if total_frames <= target_samples:
            return 1  # Sample every frame for short videos
        return max(1, total_frames // target_samples)

    def _configure_opencv_performance(self):
        """Configure OpenCV for maximum performance."""
        cv2.useOptimized()
        cv2.setNumThreads(cv2.getNumberOfCPUs())

    def _get_optimal_backend(self, video_path):
        """Test different backends and return the fastest one."""
        backends = [
            (cv2.CAP_FFMPEG, "FFMPEG"),
            (cv2.CAP_ANY, "Default"),
        ]
        
        # Quick test - open and read a single frame
        fastest_backend = cv2.CAP_ANY
        fastest_time = float('inf')
        
        for backend, name in backends:
            try:
                start = time.time()
                cap = cv2.VideoCapture(video_path, backend)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret:
                        open_time = time.time() - start
                        if open_time < fastest_time:
                            fastest_time = open_time
                            fastest_backend = backend
                        print(f"Backend {name}: {open_time:.3f}s")
                    cap.release()
            except Exception as e:
                print(f"Backend {name} failed: {e}")
                continue
        
        return fastest_backend

    def _extract_frame_colors(self, video_path, sample_rate=200, session_id=None):
        """Extract average colors from video frames at specified sample rate with optimizations."""
        def update_progress(progress, total, message, status='processing'):
            if session_id:
                with self.session_lock:
                    if session_id in self.active_sessions:
                        self.active_sessions[session_id].update({
                            'progress': progress,
                            'total': total,
                            'message': message,
                            'status': status
                        })

        try:
            # Configure OpenCV for optimal performance
            self._configure_opencv_performance()
            
            # Performance tracking
            start_time = time.time()
            
            update_progress(0, 100, "Opening video file...", 'initializing')
            
            # Get optimal backend for this video file
            optimal_backend = self._get_optimal_backend(video_path)
            cap = cv2.VideoCapture(video_path, optimal_backend)

            if not cap.isOpened():
                # Fallback to default backend
                cap = cv2.VideoCapture(video_path)
                if not cap.isOpened():
                    update_progress(0, 100, "Failed to open video file", 'error')
                    return None

            # Store video capture in session for cleanup
            if session_id:
                with self.session_lock:
                    if session_id in self.active_sessions:
                        self.active_sessions[session_id]['cap'] = cap

            # Optimize capture properties
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            # Calculate optimal sample rate
            optimal_sample_rate = self._calculate_optimal_sample_rate(total_frames, 300)
            actual_sample_rate = max(sample_rate, optimal_sample_rate)
            estimated_samples = min(total_frames // actual_sample_rate, 300)

            update_progress(5, 100, f"Video: {total_frames} frames, {fps:.1f} FPS, {duration/60:.1f}min", 'processing')
            update_progress(8, 100, f"Using optimized sample rate: every {actual_sample_rate}th frame", 'processing')

            colors = []
            samples_extracted = 0
            target_size = (640, 360)  # Optimal size for color analysis

            update_progress(10, 100, f"Processing frames (every {actual_sample_rate}th frame)...", 'processing')

            # Use frame seeking for better performance instead of reading every frame
            frame_positions = list(range(0, total_frames, actual_sample_rate))[:300]  # Cap at 300 samples
            
            for i, frame_pos in enumerate(frame_positions):
                # Check if session was cancelled
                if session_id:
                    with self.session_lock:
                        if session_id not in self.active_sessions:
                            print("Session cancelled, stopping processing")
                            cap.release()
                            return None

                # Seek to specific frame position
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_pos)
                ret, frame = cap.read()
                
                if not ret:
                    continue

                try:
                    # Optimized resize using cv2.resize directly to target size
                    if frame.shape[:2] != target_size[::-1]:  # height, width vs width, height
                        frame_resized = cv2.resize(frame, target_size)
                    else:
                        frame_resized = frame

                    # Use OpenCV's optimized mean function (much faster than numpy)
                    avg_color_bgr = cv2.mean(frame_resized)[:3]  # Returns BGR values

                    # Convert BGR to RGB and to hex
                    hex_color = "#{:02x}{:02x}{:02x}".format(
                        int(avg_color_bgr[2]),  # R (from B in BGR)
                        int(avg_color_bgr[1]),  # G
                        int(avg_color_bgr[0])   # B (from R in BGR)
                    )

                    colors.append({
                        "frame": frame_pos,
                        "time": frame_pos / fps if fps > 0 else 0,
                        "color": hex_color,
                    })

                    samples_extracted += 1

                    # Update progress more efficiently (every 10 samples instead of every sample)
                    if samples_extracted % 10 == 0 or samples_extracted == len(frame_positions):
                        progress = 10 + int((samples_extracted / len(frame_positions)) * 80)  # 10-90%
                        update_progress(progress, 100, 
                                      f"Extracted {samples_extracted}/{len(frame_positions)} color samples", 
                                      'processing')

                except Exception as e:
                    print(f"Error processing frame {frame_pos}: {e}")
                    continue

            cap.release()

            if len(colors) > 0:
                # Performance metrics
                end_time = time.time()
                processing_time = end_time - start_time
                frames_per_second = samples_extracted / processing_time if processing_time > 0 else 0
                
                update_progress(95, 100, f"Processed {samples_extracted} samples in {processing_time:.1f}s ({frames_per_second:.1f} fps)", 'finishing')
                print(f"Frame extraction performance: {processing_time:.2f}s total, {frames_per_second:.2f} samples/sec")
                return colors
            else:
                update_progress(0, 100, "No color samples extracted", 'error')
                return None

        except Exception as e:
            update_progress(0, 100, f"Error: {str(e)}", 'error')
            if 'cap' in locals():
                cap.release()
            return None

    def frame_colors(self):
        """Generate frame color data for a random movie - returns session_id for progress tracking."""
        movie = self._random_movie()
        if not movie:
            return {"error": "No movie found"}

        # Get the actual video file path
        video_path = self._get_video_file_path(movie)
        if not video_path:
            return {"error": f"Could not find video file for: {movie.title}"}

        # Calculate optimal sample rate for caching
        try:
            # Quick video properties check for cache key
            temp_cap = cv2.VideoCapture(video_path)
            total_frames = int(temp_cap.get(cv2.CAP_PROP_FRAME_COUNT))
            temp_cap.release()
            
            optimal_sample_rate = self._calculate_optimal_sample_rate(total_frames, 300)
            sample_rate = max(200, optimal_sample_rate)  # Use at least 200, but adaptive if needed
        except:
            sample_rate = 200  # Fallback to default
            
        cache_key = self._get_cache_key(video_path, sample_rate)
        cached_data = self._get_cached_frame_data(cache_key)
        
        if cached_data:
            print(f"Using cached frame data for: {movie.title}")
            # Generate multiple choice options
            other_movies = self._get_random_movies(3, exclude_movie=movie)
            movie_options = [movie] + other_movies
            random.shuffle(movie_options)  # Randomize the order
            
            # Find the correct answer index
            correct_answer = next(i for i, m in enumerate(movie_options) if m.title == movie.title)
            
            # Format movie options for frontend
            options = []
            for m in movie_options:
                if hasattr(m, 'year') and m.year:
                    options.append(f"{m.title} ({m.year})")
                else:
                    options.append(m.title)
            
            # Return cached data immediately with movie metadata
            tmdb_data = self._get_tmdb_details(movie)
            result = {
                "title": movie.title,
                "year": getattr(movie, "year", None),
                "duration": getattr(movie, "duration", None),
                "frame_colors": cached_data,
                "total_samples": len(cached_data),
                "sample_rate": sample_rate,
                "tmdb": tmdb_data,
                "options": options,
                "correct_answer": correct_answer
            }
            return {
                "session_id": None,  # No session needed for cached data
                "movie_title": movie.title,
                "status": "completed",
                "result": result
            }

        # Create session for progress tracking if not cached
        session_id = self.create_session()
        
        # Start processing in background thread
        def process_video():
            try:
                with self.session_lock:
                    if session_id in self.active_sessions:
                        self.active_sessions[session_id]['status'] = 'processing'
                        self.active_sessions[session_id]['message'] = "Processing video frames..."

                # Extract frame colors with progress tracking
                frame_colors = self._extract_frame_colors(video_path, sample_rate=sample_rate, session_id=session_id)
                
                if frame_colors:
                    # Cache the frame data for future use
                    self._cache_frame_data(cache_key, frame_colors)
                    
                    # Generate multiple choice options
                    other_movies = self._get_random_movies(3, exclude_movie=movie)
                    movie_options = [movie] + other_movies
                    random.shuffle(movie_options)  # Randomize the order
                    
                    # Find the correct answer index
                    correct_answer = next(i for i, m in enumerate(movie_options) if m.title == movie.title)
                    
                    # Format movie options for frontend
                    options = []
                    for m in movie_options:
                        if hasattr(m, 'year') and m.year:
                            options.append(f"{m.title} ({m.year})")
                        else:
                            options.append(m.title)
                    
                    # Get TMDb data for additional metadata
                    tmdb_data = self._get_tmdb_details(movie)
                    
                    result = {
                        "title": movie.title,
                        "year": getattr(movie, "year", None),
                        "duration": getattr(movie, "duration", None),
                        "frame_colors": frame_colors,
                        "total_samples": len(frame_colors),
                        "sample_rate": sample_rate,
                        "tmdb": tmdb_data,
                        "options": options,
                        "correct_answer": correct_answer
                    }
                    
                    with self.session_lock:
                        if session_id in self.active_sessions:
                            self.active_sessions[session_id].update({
                                'status': 'completed',
                                'progress': 100,
                                'message': f'Successfully processed {len(frame_colors)} color samples',
                                'result': result
                            })
                else:
                    with self.session_lock:
                        if session_id in self.active_sessions:
                            self.active_sessions[session_id].update({
                                'status': 'error',
                                'message': 'Failed to extract frame colors',
                                'error': 'No frame colors extracted'
                            })
                            
            except Exception as e:
                with self.session_lock:
                    if session_id in self.active_sessions:
                        self.active_sessions[session_id].update({
                            'status': 'error',
                            'message': f'Error processing video: {str(e)}',
                            'error': str(e)
                        })

        # Start processing thread
        thread = threading.Thread(target=process_video, daemon=True)
        with self.session_lock:
            if session_id in self.active_sessions:
                self.active_sessions[session_id]['thread'] = thread
        
        thread.start()
        
        return {
            "session_id": session_id,
            "movie_title": movie.title,
            "status": "processing_started"
        }
