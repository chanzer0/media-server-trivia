"""Utility functions for the media server trivia app."""
from flask import jsonify
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def handle_trivia_response(result, error_message="No media found"):
    """Standardized response handler for trivia endpoints."""
    if not result:
        return jsonify({"error": error_message}), 404
    if isinstance(result, dict) and "error" in result:
        return jsonify(result), 404
    return jsonify(result)

def with_error_handling(func):
    """Decorator for consistent error handling across endpoints."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {e}")
            return jsonify({"error": "An unexpected error occurred"}), 500
    return wrapper

def safe_video_capture(video_path):
    """Context manager for safe video capture handling."""
    import cv2
    
    class VideoCaptureContext:
        def __init__(self, path):
            self.path = path
            self.cap = None
            
        def __enter__(self):
            self.cap = cv2.VideoCapture(self.path)
            return self.cap
            
        def __exit__(self, exc_type, exc_val, exc_tb):
            if self.cap and self.cap.isOpened():
                self.cap.release()
                
    return VideoCaptureContext(video_path)