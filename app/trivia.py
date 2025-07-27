import random


class TriviaEngine:
    """Generates trivia questions from Plex media and TMDb metadata."""

    def __init__(self, plex_service, tmdb_service=None):
        self.plex = plex_service
        self.tmdb = tmdb_service

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
                cast_with_photos = [{"name": name, "profile_path": None} for name in cast_names]
            except Exception:
                cast_with_photos = []

        tmdb = self._get_tmdb_details(movie) if tmdb_id else None
        return {
            "title": movie.title, 
            "cast": cast_with_photos[:12],  # Limit to 12 for the game
            "tmdb": tmdb
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
        print(f"Movie summary length: {len(getattr(movie, 'summary', '')) if hasattr(movie, 'summary') else 'No summary'}")
        
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
                cast_with_photos = [{"name": name, "profile_path": None} for name in cast_names]
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
            "summary": getattr(movie, 'summary', 'No summary available'),
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
        if tmdb_data and hasattr(tmdb_data, 'poster_path') and tmdb_data.poster_path and self.tmdb:
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
