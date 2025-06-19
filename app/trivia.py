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
        question_type = random.choice(["year", "summary"])

        if question_type == "year":
            question = f"In what year was '{movie.title}' released?"
            answer = movie.year
        else:
            summary = getattr(movie, "summary", "").strip()
            if not summary:
                summary = "No summary available."
            question = f"Which movie fits this description: '{summary}'"
            answer = movie.title

        return {"question": question, "answer": answer}

