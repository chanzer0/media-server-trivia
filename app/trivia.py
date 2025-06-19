import random


class TriviaEngine:
    """Generates trivia questions from Plex media."""

    def __init__(self, plex_service):
        self.plex = plex_service

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
        return {"question": question, "answer": movie}

    def cast_reveal(self):
        """Return the top few cast members for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None
        try:
            cast = [actor.tag for actor in movie.actors][:7]
        except Exception:
            cast = []

        return {"title": movie.title, "cast": cast}

    def guess_year(self):
        """Return the title and year for a random movie."""
        movie = self._random_movie()
        if not movie:
            return None
        return {"title": movie.title, "year": movie.year, "summary": movie.summary}

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
        }

