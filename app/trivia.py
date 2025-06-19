import random


class TriviaEngine:
    """Generates trivia questions from Plex media."""

    def __init__(self, plex_service):
        self.plex = plex_service

    def random_question(self):
        movies = self.plex.get_movies()
        if not movies:
            return None
        movie = random.choice(movies)
        question = f"Which movie features '{movie}'?"
        return {"question": question, "answer": movie}

