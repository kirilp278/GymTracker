"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path

from .views import (
    AboutView,
    HomeView,
    LoginPageView,
    RegisterPageView,
    UserWorkoutsPageView,
    WorkoutCreatePageView,
    WorkoutInProgressPageView,
    WorkoutTemplateDetailPageView,
    WorkoutRecordsPageView,
)


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    # Frontend
    path(
        "",
        HomeView.as_view(),
        name="home",
    ),

    path(
        "about/",
        AboutView.as_view(),
        name="about",
    ),

    path(
        "login/",
        LoginPageView.as_view(),
        name="login-page",
    ),

    path(
        "register/",
        RegisterPageView.as_view(),
        name="register-page",
    ),

    path(
        "api/v1/auth/",
        include("accounts.urls"),
    ),

    path(
        "api/v1/",
        include("workouts.urls"),
    ),
    path(
        "workouts/",
        UserWorkoutsPageView.as_view(),
        name="user-workouts",
    ),

    path(
        "workouts/create/",
        WorkoutCreatePageView.as_view(),
        name="workout-create-page",
    ),
    path(
        "workouts/in_progress/",
        WorkoutInProgressPageView.as_view(),
        name="workout-in-progress-page",
    ),

    path(
        "workouts/<int:workout_id>/",
        WorkoutTemplateDetailPageView.as_view(),
        name="workout-template-detail-page",
    ),
    path(
        "workouts/<int:workout_id>/records/",
        WorkoutRecordsPageView.as_view(),
        name="workout-records-page",
),
]
