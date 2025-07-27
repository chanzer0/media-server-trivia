"""TMDb caching layer for long-lived API response storage."""
import json
import time
import logging
from pathlib import Path
from threading import Lock
import hashlib

logger = logging.getLogger(__name__)

class TMDbCache:
    """Cache for TMDb API responses with indefinite persistence."""
    
    def __init__(self, cache_dir="cache/tmdb_data"):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_lock = Lock()
        
    def _get_cache_key(self, cache_type, item_id):
        """Generate a cache key for TMDb data."""
        cache_data = f"{cache_type}:{item_id}"
        return hashlib.md5(cache_data.encode()).hexdigest()
    
    def get_movie_details(self, movie_id):
        """Get cached movie details."""
        cache_key = self._get_cache_key("movie_details", movie_id)
        return self._get_cached_data(cache_key)
    
    def set_movie_details(self, movie_id, data):
        """Cache movie details."""
        cache_key = self._get_cache_key("movie_details", movie_id)
        self._cache_data(cache_key, data)
    
    def get_movie_cast(self, movie_id):
        """Get cached movie cast."""
        cache_key = self._get_cache_key("movie_cast", movie_id)
        return self._get_cached_data(cache_key)
    
    def set_movie_cast(self, movie_id, data):
        """Cache movie cast."""
        cache_key = self._get_cache_key("movie_cast", movie_id)
        self._cache_data(cache_key, data)
    
    def _get_cached_data(self, cache_key):
        """Retrieve cached data if it exists."""
        if not cache_key:
            return None
            
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            with self.cache_lock:
                if cache_file.exists():
                    with open(cache_file, 'r') as f:
                        cached_data = json.load(f)
                    logger.debug(f"TMDb cache hit for key: {cache_key}")
                    return cached_data.get('data')
        except Exception as e:
            logger.error(f"Error reading TMDb cache file {cache_file}: {e}")
            # Remove corrupted cache file
            try:
                cache_file.unlink()
            except:
                pass
        
        return None
    
    def _cache_data(self, cache_key, data):
        """Store data in cache with timestamp."""
        if not cache_key or data is None:
            return
            
        cache_file = self.cache_dir / f"{cache_key}.json"
        
        try:
            with self.cache_lock:
                cache_entry = {
                    'data': data,
                    'timestamp': time.time()
                }
                with open(cache_file, 'w') as f:
                    json.dump(cache_entry, f, separators=(',', ':'))
                logger.debug(f"Cached TMDb data with key: {cache_key}")
        except Exception as e:
            logger.error(f"Error writing TMDb cache file {cache_file}: {e}")
    
    def clear_cache(self):
        """Clear all TMDb cache files."""
        try:
            with self.cache_lock:
                for cache_file in self.cache_dir.glob("*.json"):
                    try:
                        cache_file.unlink()
                        logger.info(f"Removed TMDb cache file: {cache_file.name}")
                    except Exception as e:
                        logger.error(f"Error removing TMDb cache file {cache_file}: {e}")
        except Exception as e:
            logger.error(f"Error during TMDb cache cleanup: {e}")