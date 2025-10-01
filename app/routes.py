from flask import Blueprint, Flask, render_template, jsonify, send_from_directory
from .plex_service import PlexService
from .tmdb_service import TMDbService
from .trivia import TriviaEngine
from .utils import handle_trivia_response, with_error_handling
from pathlib import Path


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

    @bp.route("/game/framed")
    def framed_game_page():
        return render_template("game_framed.html")

    @bp.route("/game/cast-match")
    def cast_match_game_page():
        return render_template("game_cast_match.html")

    @bp.route("/api/trivia")
    @with_error_handling
    def api_trivia():
        q = trivia.random_question()
        return handle_trivia_response(q)

    @bp.route("/api/trivia/cast")
    @with_error_handling
    def api_trivia_cast():
        q = trivia.cast_reveal()
        return handle_trivia_response(q)

    @bp.route("/api/trivia/year")
    @with_error_handling
    def api_trivia_year():
        q = trivia.guess_year()
        return handle_trivia_response(q)

    @bp.route("/api/trivia/poster")
    @with_error_handling
    def api_trivia_poster():
        q = trivia.poster_reveal()
        return handle_trivia_response(q)

    @bp.route("/api/trivia/framed")
    @with_error_handling
    def api_trivia_framed():
        if not plex_service.server:
            return jsonify({"error": "Plex server not connected"}), 500

        movies = plex_service.get_movies()
        if not movies:
            return jsonify({"error": "No movies found in Plex library"}), 404

        result = trivia.framed()
        return handle_trivia_response(result, "Could not generate Framed game")

    @bp.route("/api/trivia/cast-match")
    @with_error_handling
    def api_trivia_cast_match():
        result = trivia.cast_match()
        return handle_trivia_response(result, "Could not generate Cast Match game")

    @bp.route("/api/framed/frames/<filename>")
    def serve_framed_frame(filename):
        from .constants import FRAMED_CACHE_DIR
        import logging
        import os
        logger = logging.getLogger(__name__)

        cache_dir = Path(FRAMED_CACHE_DIR).resolve()
        file_path = cache_dir / filename

        logger.info(f"Serving frame request: {filename}")
        logger.info(f"Cache dir (absolute): {cache_dir}")
        logger.info(f"Full path: {file_path}")
        logger.info(f"File exists: {file_path.exists()}")

        if not file_path.exists():
            logger.error(f"File not found: {file_path}")
            if cache_dir.exists():
                logger.info(f"Cache dir contents: {list(cache_dir.glob('*.jpg'))[:5]}")
            return jsonify({"error": "Frame not found"}), 404

        return send_from_directory(str(cache_dir), filename)

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

    @bp.route("/api/actors")
    def api_actors():
        actor_index = trivia._get_actor_index()
        if not actor_index:
            return jsonify({"actors": []})

        actors = sorted(actor_index.keys())
        return jsonify({"actors": actors})

    @bp.route("/api/cache/clear", methods=["POST"])
    def api_clear_cache():
        try:
            # Clear Framed game cache
            framed_cache_count = 0
            for cache_file in trivia.framed_cache_dir.glob("*"):
                cache_file.unlink()
                framed_cache_count += 1

            # Clear Cast Match cache
            cast_match_cache_count = 0
            for cache_file in trivia.cast_match_cache_dir.glob("*"):
                cache_file.unlink()
                cast_match_cache_count += 1
            trivia._actor_index = None

            # Clear TMDb cache
            tmdb_cache_count = len(list(tmdb_service.cache.cache_dir.glob("*.json")))
            tmdb_service.cache.clear_cache()

            total_count = framed_cache_count + cast_match_cache_count + tmdb_cache_count
            return jsonify({
                "status": "success",
                "message": f"Cleared {total_count} cache files ({framed_cache_count} framed, {cast_match_cache_count} cast match, {tmdb_cache_count} TMDb)"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/cache/info")
    def api_cache_info():
        try:
            # Framed game cache info
            framed_cache_files = list(trivia.framed_cache_dir.glob("*"))
            framed_total_size = sum(f.stat().st_size for f in framed_cache_files)

            # Cast Match cache info
            cast_match_cache_files = list(trivia.cast_match_cache_dir.glob("*"))
            cast_match_total_size = sum(f.stat().st_size for f in cast_match_cache_files)

            # TMDb cache info
            tmdb_cache_dir = tmdb_service.cache.cache_dir
            tmdb_cache_files = list(tmdb_cache_dir.glob("*.json"))
            tmdb_total_size = sum(f.stat().st_size for f in tmdb_cache_files)

            total_size = framed_total_size + cast_match_total_size + tmdb_total_size

            return jsonify({
                "framed_cache": {
                    "count": len(framed_cache_files),
                    "total_size_mb": round(framed_total_size / (1024 * 1024), 2),
                    "cache_dir": str(trivia.framed_cache_dir)
                },
                "cast_match_cache": {
                    "count": len(cast_match_cache_files),
                    "total_size_mb": round(cast_match_total_size / (1024 * 1024), 2),
                    "cache_dir": str(trivia.cast_match_cache_dir)
                },
                "tmdb_cache": {
                    "count": len(tmdb_cache_files),
                    "total_size_mb": round(tmdb_total_size / (1024 * 1024), 2),
                    "cache_dir": str(tmdb_cache_dir)
                },
                "total_cache_size_mb": round(total_size / (1024 * 1024), 2)
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/performance/opencv")
    def api_opencv_performance():
        try:
            import cv2
            info = {
                "opencv_version": cv2.__version__,
                "optimizations_enabled": cv2.useOptimized(),
                "cpu_threads": cv2.getNumberOfCPUs(),
                "build_info": cv2.getBuildInformation()
            }
            return jsonify(info)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    app.register_blueprint(bp)
