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
        try:
            cast = [actor.tag for actor in movie.actors][:7]
        except Exception:
            cast = []

        tmdb = self._get_tmdb_details(movie)
        return {"title": movie.title, "cast": cast, "tmdb": tmdb}

    def guess_year(self):
        """Return the title and year for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None
        tmdb = self._get_tmdb_details(movie)
        return {"title": movie.title, "year": movie.year, "summary": movie.summary, "tmdb": tmdb}

    def poster_reveal(self):
        """Return poster and summary information for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None

        poster = None
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
            "tmdb": self._get_tmdb_details(movie),
        }
