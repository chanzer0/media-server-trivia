from flask import Blueprint, render_template, jsonify
from .trivia import TriviaEngine


def init_routes(app, plex_service):
    bp = Blueprint('main', __name__)
    trivia = TriviaEngine(plex_service)

    @bp.route('/')
    def index():
        movies = plex_service.get_movies()
        shows = plex_service.get_shows()
        return render_template('index.html', movies=movies, shows=shows)

    @bp.route('/api/trivia')
    def api_trivia():
        q = trivia.random_question()
        if not q:
            return jsonify({'error': 'No media found'}), 404
        return jsonify(q)

    app.register_blueprint(bp)

