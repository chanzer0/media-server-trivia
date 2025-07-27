from flask import Blueprint, Flask, render_template, jsonify
from .plex_service import PlexService
from .tmdb_service import TMDbService
from .trivia import TriviaEngine
from .utils import handle_trivia_response, with_error_handling


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

    @bp.route("/api/trivia/frame")
    @with_error_handling
    def api_trivia_frame():
        # Check if Plex is connected
        if not plex_service.server:
            return jsonify({"error": "Plex server not connected"}), 500
        
        # Check if there are movies available
        movies = plex_service.get_movies()
        if not movies:
            return jsonify({"error": "No movies found in Plex library"}), 404
        
        result = trivia.frame_colors()
        return handle_trivia_response(result, "Could not process frame colors")

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
            # Clear frame cache
            frame_cache_count = len(list(trivia.cache_dir.glob("*.json")))
            trivia._cleanup_old_cache_files(max_age_days=0)  # Clear all frame cache files
            
            # Clear TMDb cache
            tmdb_cache_count = len(list(tmdb_service.cache.cache_dir.glob("*.json")))
            tmdb_service.cache.clear_cache()
            
            total_count = frame_cache_count + tmdb_cache_count
            return jsonify({
                "status": "success", 
                "message": f"Cleared {total_count} cache files ({frame_cache_count} frame, {tmdb_cache_count} TMDb)"
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @bp.route("/api/cache/info")
    def api_cache_info():
        try:
            # Frame cache info
            frame_cache_files = list(trivia.cache_dir.glob("*.json"))
            frame_total_size = sum(f.stat().st_size for f in frame_cache_files)
            
            # TMDb cache info
            tmdb_cache_dir = tmdb_service.cache.cache_dir
            tmdb_cache_files = list(tmdb_cache_dir.glob("*.json"))
            tmdb_total_size = sum(f.stat().st_size for f in tmdb_cache_files)
            
            return jsonify({
                "frame_cache": {
                    "count": len(frame_cache_files),
                    "total_size_mb": round(frame_total_size / (1024 * 1024), 2),
                    "cache_dir": str(trivia.cache_dir)
                },
                "tmdb_cache": {
                    "count": len(tmdb_cache_files),
                    "total_size_mb": round(tmdb_total_size / (1024 * 1024), 2),
                    "cache_dir": str(tmdb_cache_dir)
                },
                "total_cache_size_mb": round((frame_total_size + tmdb_total_size) / (1024 * 1024), 2)
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
