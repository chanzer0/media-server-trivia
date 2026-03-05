from __future__ import annotations

from themoviedb import TMDb
import logging
from .tmdb_cache import TMDbCache

logger = logging.getLogger(__name__)


class TMDbService:
    """Simple wrapper around the TMDb API client with caching."""

    def __init__(self, api_key: str | None):
        self.api_key = api_key
        self.client = TMDb(key=api_key) if api_key else None
        self._config = None
        self.cache = TMDbCache()

    def _get_configuration(self):
        """Get TMDb configuration with image base URLs and sizes."""
        if self._config is None and self.client:
            try:
                config_obj = self.client.configuration().details()
                # Convert to dict format for easier access
                self._config = {
                    "images": {
                        "base_url": config_obj.images.base_url,
                        "profile_sizes": config_obj.images.profile_sizes,
                        "poster_sizes": config_obj.images.poster_sizes,
                    }
                }
            except Exception as e:
                logger.error(f"Failed to fetch TMDb configuration: {e}")
                # Fallback to default configuration
                self._config = {
                    "images": {
                        "base_url": "https://image.tmdb.org/t/p/",
                        "profile_sizes": ["w45", "w185", "h632", "original"],
                        "poster_sizes": ["w92", "w154", "w185", "w342", "w500", "w780", "original"],
                    }
                }
        return self._config

    def _build_image_url(self, file_path: str, size: str = "w185") -> str:
        """Build a complete image URL from TMDb configuration."""
        if not file_path:
            return None

        config = self._get_configuration()
        if not config:
            return None

        base_url = config["images"]["base_url"]
        return f"{base_url}{size}{file_path}"

    @staticmethod
    def _field(obj, key, default=None):
        """Read a field from either dict-like or attribute-like objects."""
        if obj is None:
            return default
        if isinstance(obj, dict):
            return obj.get(key, default)
        return getattr(obj, key, default)

    def get_poster_url(self, poster_path: str, size: str = "w500") -> str:
        """Get a properly formatted poster URL.

        Common poster sizes:
        - w92, w154, w185, w342, w500, w780, original
        """
        return self._build_image_url(poster_path, size)

    def get_profile_url(self, profile_path: str, size: str = "w185") -> str:
        """Get a properly formatted profile image URL.

        Common profile sizes:
        - w45, w185, h632, original
        """
        return self._build_image_url(profile_path, size)

    def get_movie_details(self, movie_id: int):
        """Return details for a movie by TMDb id with credits included."""
        if not self.client:
            return None

        # Check cache first
        cached_data = self.cache.get_movie_details(movie_id)
        if cached_data is not None:
            return cached_data

        # Fetch from API if not cached
        try:
            # Request details with credits appended
            details = self.client.movie(movie_id).details(append_to_response="credits")
            logger.info(f"Fetched movie details for {movie_id}, has credits: {hasattr(details, 'credits')}")
            # Cache the result
            self.cache.set_movie_details(movie_id, details)
            return details
        except Exception as e:
            logger.error(f"Failed to fetch movie details: {e}")
            return None

    def get_movie_cast(self, movie_id: int):
        """Return cast details with photos for a movie by TMDb id."""
        if not self.client:
            return None
        
        # Check cache first
        cached_data = self.cache.get_movie_cast(movie_id)
        if cached_data is not None:
            return cached_data
        
        # Fetch from API if not cached
        try:
            credits = self.client.movie(movie_id).credits()
            cast_with_photos = []
            credits_cast = self._field(credits, "cast", []) or []

            for actor in credits_cast[:12]:  # Limit to top 12 cast members
                profile_path = self._field(actor, "profile_path")
                actor_data = {
                    "name": self._field(actor, "name"),
                    "character": self._field(actor, "character"),
                    "profile_path": None,
                }

                # Build proper image URL using TMDb configuration
                if profile_path:
                    # Use w185 for profile images (good balance of quality and performance)
                    actor_data["profile_path"] = self.get_profile_url(
                        profile_path, "w185"
                    )

                cast_with_photos.append(actor_data)

            # Cache the result
            self.cache.set_movie_cast(movie_id, cast_with_photos)
            return cast_with_photos
        except Exception as e:
            logger.error(f"Failed to fetch movie cast: {e}")
            return None

    def get_movie_cast_extended(self, movie_id: int):
        """Return top-billed cast with ranking and profile metadata."""
        if not self.client:
            return None

        cached_data = self.cache.get_movie_cast_extended(movie_id)
        if cached_data is not None:
            return cached_data

        try:
            credits = self.client.movie(movie_id).credits()
            cast_data = []
            credits_cast = self._field(credits, "cast", []) or []

            for index, actor in enumerate(credits_cast[:12]):
                profile_path = self._field(actor, "profile_path")
                actor_data = {
                    "id": self._field(actor, "id"),
                    "name": self._field(actor, "name"),
                    "character": self._field(actor, "character"),
                    "order": self._field(actor, "order", index),
                    "popularity": self._field(actor, "popularity"),
                    "profile_path": self.get_profile_url(profile_path, "w185") if profile_path else None,
                }
                cast_data.append(actor_data)

            self.cache.set_movie_cast_extended(movie_id, cast_data)
            return cast_data
        except Exception as e:
            logger.error(f"Failed to fetch extended movie cast: {e}")
            return None

    def get_person_details(self, person_id: int):
        """Return person details used for cast hint generation."""
        if not self.client:
            return None

        cached_data = self.cache.get_person_details(person_id)
        if cached_data is not None:
            return cached_data

        try:
            person_api = self.client.person(person_id)
            person_obj = None

            try:
                person_obj = person_api.details(append_to_response="movie_credits")
            except TypeError:
                person_obj = person_api.details()
            except Exception:
                person_obj = person_api.details()

            movie_credits_obj = self._field(person_obj, "movie_credits")
            if not movie_credits_obj:
                movie_credits_method = getattr(person_api, "movie_credits", None)
                if callable(movie_credits_method):
                    try:
                        movie_credits_obj = movie_credits_method()
                    except Exception:
                        movie_credits_obj = None

            known_for_titles = []
            cast_credits = self._field(movie_credits_obj, "cast", []) or []
            for movie in cast_credits:
                title = self._field(movie, "title")
                if title and title not in known_for_titles:
                    known_for_titles.append(title)
                if len(known_for_titles) >= 8:
                    break

            payload = {
                "id": person_id,
                "name": self._field(person_obj, "name"),
                "birthday": self._field(person_obj, "birthday"),
                "known_for_titles": known_for_titles,
            }
            self.cache.set_person_details(person_id, payload)
            return payload
        except Exception as e:
            logger.error(f"Failed to fetch person details for {person_id}: {e}")
            return None

    def search_movies(self, query: str):
        """Search for movies by text query."""
        if not self.client:
            return []
        try:
            search_result = self.client.search().movies(query=query)
            return search_result.results if hasattr(search_result, 'results') else []
        except Exception as e:
            logger.error(f"Failed to search movies: {e}")
            return []
