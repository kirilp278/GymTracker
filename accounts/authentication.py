from django.conf import settings

from rest_framework_simplejwt.authentication import (
    JWTAuthentication,
)

from .csrf import enforce_csrf


class CookieJWTAuthentication(
    JWTAuthentication
):

    def authenticate(
        self,
        request,
    ):
        # =============================================
        # 1. AUTHORIZATION HEADER
        # =============================================
        #
        # Ако API клиент изпрати:
        #
        # Authorization: Bearer <token>
        #
        # token-ът не се изпраща автоматично
        # от browser-а, затова CSRF не е нужен.
        #

        header = self.get_header(
            request
        )

        if header is not None:

            raw_token = self.get_raw_token(
                header
            )

            if raw_token is None:
                return None

            validated_token = (
                self.get_validated_token(
                    raw_token
                )
            )

            user = self.get_user(
                validated_token
            )

            return (
                user,
                validated_token,
            )


        # =============================================
        # 2. ACCESS TOKEN COOKIE
        # =============================================
        #
        # Browser-ът изпраща cookie-то
        # автоматично.
        #
        # Затова cookie authentication трябва
        # да бъде CSRF protected.
        #

        raw_token = request.COOKIES.get(
            settings.AUTH_COOKIE_ACCESS_NAME
        )

        if raw_token is None:
            return None


        validated_token = (
            self.get_validated_token(
                raw_token
            )
        )

        user = self.get_user(
            validated_token
        )


        # =============================================
        # 3. CSRF CHECK
        # =============================================

        enforce_csrf(
            request
        )


        return (
            user,
            validated_token,
        )
