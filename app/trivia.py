import random


class TriviaEngine:
    """Generates trivia questions from Plex media and TMDb metadata."""

    def __init__(self, plex_service, tmdb_service=None):
        self.plex = plex_service
        self.tmdb = tmdb_service

    def _get_tmdb_details(self, movie):
        """Return (metadata, tmdb_id) for the given Plex movie."""
        if not self.tmdb:
            return None, None

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
            details = self.tmdb.get_movie_details(tmdb_id)
            return details, tmdb_id
        return None, None

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
        tmdb, _ = self._get_tmdb_details(movie)
        return {"question": question, "answer": movie, "tmdb": tmdb}

    def cast_reveal(self):
        """Return the top few cast members for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None
        tmdb, tmdb_id = self._get_tmdb_details(movie)
        cast = []
        if tmdb_id:
            credits = self.tmdb.get_movie_credits(tmdb_id)
            if credits:
                for c in credits.get("cast", [])[:7]:
                    cast.append({
                        "name": c.get("name"),
                        "profile": self.tmdb.image_url(c.get("profile_path"), "w185"),
                    })
        if not cast:
            try:
                cast = [{"name": actor.tag, "profile": None} for actor in movie.actors][:7]
            except Exception:
                cast = []

        poster = self.tmdb.image_url(tmdb.get("poster_path")) if tmdb else None
        tagline = tmdb.get("tagline") if tmdb else None
        return {
            "title": movie.title,
            "cast": cast,
            "poster": poster,
            "tagline": tagline,
        }

    def guess_year(self):
        """Return the title and year for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None
        tmdb, _ = self._get_tmdb_details(movie)
        poster = self.tmdb.image_url(tmdb.get("poster_path")) if tmdb else None
        tagline = tmdb.get("tagline") if tmdb else None
        return {
            "title": movie.title,
            "year": movie.year,
            "summary": movie.summary,
            "poster": poster,
            "tagline": tagline,
        }

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

        tmdb, _ = self._get_tmdb_details(movie)
        if not poster and tmdb:
            poster = self.tmdb.image_url(tmdb.get("poster_path"))
        tagline = tmdb.get("tagline") if tmdb else None
        return {
            "title": movie.title,
            "poster": poster,
            "summary": movie.summary,
            "tagline": tagline,
        }
