import random


class TriviaEngine:
    """Generates trivia questions from Plex media and TMDb metadata."""

    def __init__(self, plex_service, tmdb_service=None):
        self.plex = plex_service
        self.tmdb = tmdb_service

    def _get_tmdb_id(self, movie):
        """Extract the TMDb id from a Plex movie."""
        for guid in getattr(movie, "guids", []):
            try:
                gid = getattr(guid, "id", "")
                if isinstance(gid, str) and gid.startswith("tmdb://"):
                    return int(gid.split("tmdb://", 1)[1])
            except Exception:
                continue
        return None

    def _get_tmdb_details(self, movie):
        """Return TMDb metadata for the given Plex movie."""
        if not self.tmdb:
            return None

        tmdb_id = self._get_tmdb_id(movie)
        if tmdb_id:
            return self.tmdb.get_movie_details(tmdb_id)
        return None

    def _get_tmdb_credits(self, movie):
        if not self.tmdb:
            return None
        tmdb_id = self._get_tmdb_id(movie)
        if tmdb_id:
            return self.tmdb.get_movie_credits(tmdb_id)
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
            cast_names = [actor.tag for actor in movie.actors][:7]
        except Exception:
            cast_names = []

        tmdb_details = self._get_tmdb_details(movie)
        credits = self._get_tmdb_credits(movie)
        cast = []
        if credits and hasattr(credits, "cast"):
            for person in list(getattr(credits, "cast"))[:7]:
                name = getattr(person, "name", None) or getattr(person, "original_name", "")
                profile = self.tmdb.build_image_url(getattr(person, "profile_path", None), "w185") if self.tmdb else None
                cast.append({"name": name, "profile": profile})
        else:
            for n in cast_names:
                cast.append({"name": n, "profile": None})

        poster = None
        if tmdb_details and hasattr(tmdb_details, "poster_path"):
            poster = self.tmdb.build_image_url(getattr(tmdb_details, "poster_path", None))

        tagline = getattr(tmdb_details, "tagline", None) if tmdb_details else None

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
        tmdb_details = self._get_tmdb_details(movie)
        poster = None
        tagline = None
        if tmdb_details:
            poster = self.tmdb.build_image_url(getattr(tmdb_details, "poster_path", None)) if self.tmdb else None
            tagline = getattr(tmdb_details, "tagline", None)
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

        tmdb_details = self._get_tmdb_details(movie)
        if not poster and tmdb_details:
            poster = self.tmdb.build_image_url(getattr(tmdb_details, "poster_path", None)) if self.tmdb else None
        tagline = getattr(tmdb_details, "tagline", None) if tmdb_details else None
        return {
            "title": movie.title,
            "poster": poster,
            "summary": movie.summary,
            "tagline": tagline,
        }
