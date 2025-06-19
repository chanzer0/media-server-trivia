from flask import Blueprint, Flask, render_template, jsonify
from .plex_service import PlexService
from .trivia import TriviaEngine


def init_routes(app: Flask, plex_service: PlexService):
    bp = Blueprint("main", __name__)
    trivia = TriviaEngine(plex_service)

    @bp.route("/")
    def index():
        print("Index route called")
        movies = plex_service.get_movies()
        shows = plex_service.get_shows()

        # Print all properties of the first movie
        print(movies[0])
        print(movies[0].guids)

        return render_template("index.html", movies=movies, shows=shows)

    @bp.route("/api/trivia")
    def api_trivia():
        q = trivia.random_question()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    app.register_blueprint(bp)
