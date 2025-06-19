from flask import Blueprint, Flask, render_template, jsonify
from .plex_service import PlexService
from .trivia import TriviaEngine


def init_routes(app: Flask, plex_service: PlexService):
    bp = Blueprint("main", __name__)
    trivia = TriviaEngine(plex_service)

    @bp.route("/")
    def index():
        """Homepage with game selection."""
        return render_template("index.html")

    # ----- Game Pages -----

    @bp.route("/game/cast")
    def game_cast():
        """Full page Cast Reveal game."""
        return render_template("cast_game.html")

    @bp.route("/game/year")
    def game_year():
        """Full page Guess the Year game."""
        return render_template("year_game.html")

    @bp.route("/game/poster")
    def game_poster():
        """Full page Poster Reveal game."""
        return render_template("poster_game.html")

    @bp.route("/api/trivia")
    def api_trivia():
        q = trivia.random_question()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    @bp.route("/api/trivia/cast")
    def api_trivia_cast():
        q = trivia.cast_reveal()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    @bp.route("/api/trivia/year")
    def api_trivia_year():
        q = trivia.guess_year()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    @bp.route("/api/trivia/poster")
    def api_trivia_poster():
        q = trivia.poster_reveal()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    @bp.route("/api/titles")
    def api_titles():
        """Return a combined list of movie and show titles."""
        movie_titles = [m.title for m in plex_service.get_movies()]
        show_titles = [s.title for s in plex_service.get_shows()]
        return jsonify({"titles": movie_titles + show_titles})

    app.register_blueprint(bp)
