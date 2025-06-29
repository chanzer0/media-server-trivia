from __future__ import annotations

from dataclasses import asdict, is_dataclass
from themoviedb import TMDb


class TMDbService:
    """Simple wrapper around the TMDb API client."""

    def __init__(self, api_key: str | None):
        self.api_key = api_key
        self.client = TMDb(key=api_key) if api_key else None

    def get_movie_details(self, movie_id: int):
        """Return details for a movie by TMDb id."""
        if not self.client:
            return None
        try:
            data = self.client.movie(movie_id).details(
                options={"append_to_response": "credits"}
            )
            return self._to_dict(data)
        except Exception as e:
            print(f"Failed to fetch movie details: {e}")
            return None

    def _to_dict(self, obj):
        """Recursively convert TMDb dataclasses to plain dicts."""
        if is_dataclass(obj):
            return {k: self._to_dict(v) for k, v in asdict(obj).items()}
        if isinstance(obj, list):
            return [self._to_dict(v) for v in obj]
        if isinstance(obj, dict):
            return {k: self._to_dict(v) for k, v in obj.items()}
        return obj

    def search_movies(self, query: str):
        """Search for movies by text query."""
        if not self.client:
            return []
        try:
            return self.client.search().movies(query=query).get("results", [])
        except Exception as e:
            print(f"Failed to search movies: {e}")
            return []
