from __future__ import annotations

from themoviedb import TMDb


class TMDbService:
    """Simple wrapper around the TMDb API client."""

    def __init__(self, api_key: str | None):
        self.api_key = api_key
        self.client = TMDb(key=api_key) if api_key else None
        # Base URL for constructing image links. This matches the default
        # path structure provided by TMDb. The image sizes vary but a medium
        # size works well for our trivia UI.
        self.image_base = "https://image.tmdb.org/t/p/"

    def get_movie_details(self, movie_id: int):
        """Return details for a movie by TMDb id."""
        if not self.client:
            return None
        try:
            return self.client.movie(movie_id).details()
        except Exception as e:
            print(f"Failed to fetch movie details: {e}")
            return None

    def search_movies(self, query: str):
        """Search for movies by text query."""
        if not self.client:
            return []
        try:
            return self.client.search().movies(query=query).get("results", [])
        except Exception as e:
            print(f"Failed to search movies: {e}")
            return []

    def get_movie_credits(self, movie_id: int):
        """Return cast/crew credits for a movie."""
        if not self.client:
            return None
        try:
            return self.client.movie(movie_id).credits()
        except Exception as e:
            print(f"Failed to fetch movie credits: {e}")
            return None

    def build_image_url(self, path: str | None, size: str = "w342") -> str | None:
        """Return a full image URL for the given TMDb image path."""
        if not path:
            return None
        return f"{self.image_base}{size}{path}"
