from plexapi.server import PlexServer


class PlexService:
    """Wrapper around the Plex API for retrieving media."""

    def __init__(self, base_url: str | None, token: str | None):
        self.base_url = base_url
        self.token = token
        self.server = None
        if base_url and token:
            try:
                self.server = PlexServer(base_url, token)
            except Exception as e:
                # Fail silently; the routes will handle missing connection
                print(f"Failed to connect to Plex: {e}")
                self.server = None

    def get_movies(self):
        if not self.server:
            return []
        return [movie.title for movie in self.server.library.section("Movies").all()]

    def get_shows(self):
        if not self.server:
            return []
        return [show.title for show in self.server.library.section("TV Shows").all()]
