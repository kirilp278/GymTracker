from django.urls import path

from .csrf import (
    csrf_protected_api_view,
)

from .views import (
    LoginView,
    LogoutView,
    RefreshView,
    RegisterView,
)


urlpatterns = [

    path(
        "register/",
        csrf_protected_api_view(
            RegisterView.as_view()
        ),
        name="register",
    ),

    path(
        "login/",
        csrf_protected_api_view(
            LoginView.as_view()
        ),
        name="login",
    ),

    path(
        "refresh/",
        csrf_protected_api_view(
            RefreshView.as_view()
        ),
        name="refresh",
    ),

    path(
        "logout/",
        csrf_protected_api_view(
            LogoutView.as_view()
        ),
        name="logout",
    ),

]
