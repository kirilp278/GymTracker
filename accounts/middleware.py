from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError

from .authentication import CookieJWTAuthentication


class CookieJWTMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.jwt_authentication = CookieJWTAuthentication()

    def __call__(self, request):
        try:
            auth_result = self.jwt_authentication.authenticate(request)

            if auth_result is not None:
                user, token = auth_result

                request.user = user
                request.auth = token

        except (AuthenticationFailed, TokenError):
            pass

        return self.get_response(request)
