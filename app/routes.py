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

    @bp.route("/game/frame")
    def frame_game_page():
        return render_template("game_frame.html")

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
        try:
            print("Year trivia API called")
            q = trivia.guess_year()
            print(f"Trivia engine returned: {q}")
            if not q:
                print("No media found from trivia engine")
                return jsonify({"error": "No media found"}), 404
            print(f"Returning JSON: {q}")
            return jsonify(q)
        except Exception as e:
            print(f"Error in year trivia API: {e}")
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/trivia/poster")
    def api_trivia_poster():
        q = trivia.poster_reveal()
        if not q:
            return jsonify({"error": "No media found"}), 404
        return jsonify(q)

    @bp.route("/api/trivia/frame")
    def api_trivia_frame():
        try:
            result = trivia.frame_colors()
            if "error" in result:
                return jsonify(result), 404
            return jsonify(result)
        except Exception as e:
            print(f"Error in frame trivia API: {e}")
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/trivia/frame/progress/<session_id>")
    def api_frame_progress(session_id):
        try:
            progress = trivia.get_session_progress(session_id)
            if not progress:
                return jsonify({"error": "Session not found"}), 404
            return jsonify(progress)
        except Exception as e:
            print(f"Error getting progress: {e}")
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/trivia/frame/cancel/<session_id>", methods=["POST"])
    def api_frame_cancel(session_id):
        try:
            trivia.cleanup_session(session_id)
            return jsonify({"status": "cancelled"})
        except Exception as e:
            print(f"Error cancelling session: {e}")
            return jsonify({"error": str(e)}), 500

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

    @bp.route("/api/cache/clear", methods=["POST"])
    def api_clear_cache():
        try:
            cache_count = len(list(trivia.cache_dir.glob("*.json")))
            trivia._cleanup_old_cache_files(max_age_days=0)  # Clear all cache files
            return jsonify({"status": "success", "message": f"Cleared {cache_count} cache files"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/cache/info")
    def api_cache_info():
        try:
            cache_files = list(trivia.cache_dir.glob("*.json"))
            total_size = sum(f.stat().st_size for f in cache_files)
            return jsonify({
                "cache_count": len(cache_files),
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "cache_dir": str(trivia.cache_dir)
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
