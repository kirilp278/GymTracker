from django.shortcuts import render

# Create your views here.
from django.conf import settings

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    EmptySerializer,
    LoginSerializer,
    RegisterSerializer,
)
from rest_framework.throttling import (
    ScopedRateThrottle,
)


def set_access_cookie(response, token):
    response.set_cookie(
        key=settings.AUTH_COOKIE_ACCESS_NAME,
        value=token,
        max_age=int(
            settings.SIMPLE_JWT[
                "ACCESS_TOKEN_LIFETIME"
            ].total_seconds()
        ),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/",
    )


def set_refresh_cookie(response, token):
    response.set_cookie(
        key=settings.AUTH_COOKIE_REFRESH_NAME,
        value=token,
        max_age=int(
            settings.SIMPLE_JWT[
                "REFRESH_TOKEN_LIFETIME"
            ].total_seconds()
        ),
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        path="/api/v1/auth/",
    )


def delete_auth_cookies(response):
    response.delete_cookie(
        settings.AUTH_COOKIE_ACCESS_NAME,
        path="/",
    )

    response.delete_cookie(
        settings.AUTH_COOKIE_REFRESH_NAME,
        path="/api/v1/auth/",
    )


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [
        permissions.AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]

    throttle_scope = "register"


class LoginView(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [
        permissions.AllowAny,
    ]
    authentication_classes = []

    throttle_classes = [
        ScopedRateThrottle,
    ]

    throttle_scope = "login"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        access_token = str(
            refresh.access_token
        )

        refresh_token = str(
            refresh
        )

        response = Response(
            {
                "id": user.id,
                "username": user.username,
            },
            status=status.HTTP_200_OK,
        )

        set_access_cookie(
            response,
            access_token,
        )

        set_refresh_cookie(
            response,
            refresh_token,
        )

        return response


class RefreshView(generics.GenericAPIView):
    serializer_class = EmptySerializer
    permission_classes = [
        permissions.AllowAny,
    ]
    authentication_classes = []

    throttle_classes = [
        ScopedRateThrottle,
    ]

    throttle_scope = "refresh"

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(
            settings.AUTH_COOKIE_REFRESH_NAME
        )

        if refresh_token is None:
            return Response(
                {
                    "detail": "Refresh token is missing."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(
                refresh_token
            )

            access_token = str(
                refresh.access_token
            )

        except TokenError:
            response = Response(
                {
                    "detail": "Refresh token is invalid or expired."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

            delete_auth_cookies(response)

            return response

        response = Response(
            {
                "detail": "Access token refreshed."
            },
            status=status.HTTP_200_OK,
        )

        set_access_cookie(
            response,
            access_token,
        )

        return response


class LogoutView(generics.GenericAPIView):
    serializer_class = EmptySerializer
    permission_classes = [
        permissions.AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]

    throttle_scope = "logout"

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get(
            settings.AUTH_COOKIE_REFRESH_NAME
        )

        if refresh_token:
            try:
                token = RefreshToken(
                    refresh_token
                )

                token.blacklist()

            except TokenError:
                pass

        response = Response(
            status=status.HTTP_204_NO_CONTENT
        )

        delete_auth_cookies(response)

        return response
