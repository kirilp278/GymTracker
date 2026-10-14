from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView
from django.http import Http404


class CurrentUserPageMixin:
    """
    Позволява /<username>/... страниците да се отварят
    само от съответния логнат потребител.
    """

    def dispatch(self, request, *args, **kwargs):
        username = kwargs.get("username")

        if username != request.user.username:
            raise Http404

        return super().dispatch(
            request,
            *args,
            **kwargs,
        )

class WorkoutTemplateDetailPageView(
    LoginRequiredMixin,
    TemplateView,
):
    template_name = "workout_detail.html"

    def get_context_data(
        self,
        **kwargs,
    ):
        context = super().get_context_data(
            **kwargs,
        )

        context["workout_id"] = (
            self.kwargs["workout_id"]
        )

        return context


class WorkoutInProgressPageView(
    LoginRequiredMixin,
    TemplateView,
):
    template_name = "workout_in_progress.html"
class UserWorkoutsPageView(
    LoginRequiredMixin,
    TemplateView,
):
    template_name = "workouts.html"


class WorkoutCreatePageView(
    LoginRequiredMixin,
    TemplateView,
):
    template_name = "workout_create.html"


class WorkoutRecordsPageView(
    LoginRequiredMixin,
    TemplateView,
):
    template_name = "workout_records.html"

    def get_context_data(
        self,
        **kwargs,
    ):
        context = super().get_context_data(
            **kwargs,
        )

        context["workout_id"] = (
            self.kwargs["workout_id"]
        )

        return context


class LoginPageView(TemplateView):
    template_name = "login.html"


class RegisterPageView(TemplateView):
    template_name = "register.html"


class HomeView(LoginRequiredMixin, TemplateView):
    template_name = "home.html"


class AboutView(LoginRequiredMixin, TemplateView):
    template_name = "about.html"

