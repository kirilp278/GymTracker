from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware
from rest_framework.exceptions import PermissionDenied


class CSRFCheck(CsrfViewMiddleware):
    """
    Позволява ни да използваме Django CSRF проверката
    ръчно от DRF authentication class.
    """

    def _reject(self, request, reason):
        return reason


def get_csrf_failure_reason(request):
    """
    Връща None при валиден CSRF request.

    При невалиден request връща причината,
    дадена от Django.
    """

    def dummy_get_response(request):
        return None

    check = CSRFCheck(
        dummy_get_response
    )

    check.process_request(
        request
    )

    return check.process_view(
        request,
        None,
        (),
        {},
    )


def enforce_csrf(request):
    """
    Използва се вътре в DRF authentication.

    Ако CSRF проверката не мине,
    DRF връща 403 Forbidden.
    """

    reason = get_csrf_failure_reason(
        request
    )

    if reason:
        raise PermissionDenied(
            f"CSRF Failed: {reason}"
        )


def csrf_protected_api_view(view):
    """
    Wrapper за anonymous API endpoints като:

    login
    register
    refresh
    logout

    Те трябва да бъдат CSRF protected,
    въпреки че authentication class-ът
    не винаги ще бъде изпълнен.
    """

    def wrapped_view(
        request,
        *args,
        **kwargs,
    ):
        reason = get_csrf_failure_reason(
            request
        )

        if reason:
            return JsonResponse(
                {
                    "detail":
                        f"CSRF Failed: {reason}"
                },
                status=403,
            )

        return view(
            request,
            *args,
            **kwargs,
        )

    return wrapped_view
