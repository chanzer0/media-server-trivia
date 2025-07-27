from flask import Blueprint, Flask, render_template, jsonify
from .plex_service import PlexService
from .tmdb_service import TMDbService
from .trivia import TriviaEngine


# kick build
def init_routes(app: Flask, plex_service: PlexService, tmdb_service: TMDbService):
    bp = Blueprint("main", __name__)
    trivia = TriviaEngine(plex_service, tmdb_service)

    @bp.route("/")
    def index():
        movies = plex_service.get_movies()
        shows = plex_service.get_shows()
        return render_template("index.html", movies=movies, shows=shows)

    @bp.route("/game/cast")
    def cast_game_page():
        return render_template("game_cast.html")

    @bp.route("/game/year")
    def year_game_page():
        return render_template("game_year.html")

    @bp.route("/game/poster")
    def poster_game_page():
        return render_template("game_poster.html")

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

    @bp.route("/api/library")
    def api_library():
        movies = []
        for m in plex_service.get_movies():
            if hasattr(m, 'year') and m.year:
                movies.append(f"{m.title} ({m.year})")
            else:
                movies.append(m.title)
        
        shows = []
        for s in plex_service.get_shows():
            if hasattr(s, 'year') and s.year:
                shows.append(f"{s.title} ({s.year})")
            else:
                shows.append(s.title)
        
        return jsonify({"movies": movies, "shows": shows})

    app.register_blueprint(bp)
