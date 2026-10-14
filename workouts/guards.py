from rest_framework.exceptions import PermissionDenied

from .models import Workout


def ensure_workout_writable(workout):
    """
    Completed workouts are historical records
    and cannot be modified.
    """

    if workout.status == Workout.Status.ENDED:
        raise PermissionDenied(
            "Completed workouts are read-only."
        )
