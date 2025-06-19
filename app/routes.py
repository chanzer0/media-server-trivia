from flask import Blueprint, Flask, render_template, jsonify
from .plex_service import PlexService
from .trivia import TriviaEngine


def init_routes(app: Flask, plex_service: PlexService):
    bp = Blueprint("main", __name__)
    trivia = TriviaEngine(plex_service)

    @bp.route("/")
    def index():
        movies = plex_service.get_movies()
        shows = plex_service.get_shows()
        return render_template("index.html", movies=movies, shows=shows)

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

    app.register_blueprint(bp)
