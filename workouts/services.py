from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import (
    Exercise,
    ExerciseBlock,
    Set as WorkoutSet,
    SetBlock,
    Workout,
)


User = get_user_model()


class ActiveWorkoutExistsError(Exception):
    pass


class InvalidWorkoutTemplateError(Exception):
    pass


class WorkoutNotInProgressError(Exception):
    pass


# =========================================================
# START WORKOUT
# =========================================================


@transaction.atomic
def start_workout_from_template(
    *,
    template_id,
    user,
):
    """
    Creates a complete independent copy of a Workout template.

    Copies:

    Workout
        -> ExerciseBlock
            -> Exercise
                -> SetBlock
                    -> Set

    ExerciseList objects are NOT copied.
    Exercise.exercise_name continues pointing to the same
    ExerciseList object.

    reps and weight are copied from the template so they can
    be used as example/default values during the real workout.
    """

    # Lock the user row while starting a workout.
    #
    # This prevents two simultaneous requests from both
    # successfully passing the "does an active workout exist?"
    # check on databases that support SELECT FOR UPDATE.
    User.objects.select_for_update().get(
        pk=user.pk
    )

    # -----------------------------------------------------
    # Only one active workout per user
    # -----------------------------------------------------

    active_workout_exists = Workout.objects.filter(
        creator=user,
        status=Workout.Status.IN_PROGRESS,
    ).exists()

    if active_workout_exists:
        raise ActiveWorkoutExistsError(
            "You already have a workout in progress."
        )

    # -----------------------------------------------------
    # Get and validate template
    # -----------------------------------------------------

    try:
        template = (
            Workout.objects
            .select_for_update()
            .prefetch_related(
                "exercise_blocks"
                "__exercises"
                "__set_blocks"
                "__sets"
            )
            .get(
                pk=template_id,
                creator=user,
                template__isnull=True,
                status=Workout.Status.TEMPLATE,
            )
        )

    except Workout.DoesNotExist:
        raise InvalidWorkoutTemplateError(
            "Workout template does not exist "
            "or does not belong to this user."
        )

    # Use exactly the same timestamp for the start.
    started_at = timezone.now()

    # -----------------------------------------------------
    # Create Workout instance
    # -----------------------------------------------------

    workout = Workout.objects.create(
        name=template.name,
        creator=user,
        template=template,
        status=Workout.Status.IN_PROGRESS,
        started_at=started_at,
        ended_at=None,
    )

    # -----------------------------------------------------
    # Clone ExerciseBlocks
    # -----------------------------------------------------

    for source_block in (
        template.exercise_blocks
        .all()
        .order_by("order")
    ):
        new_block = ExerciseBlock.objects.create(
            workout=workout,
            order=source_block.order,
            super_set=source_block.super_set,
        )

        # -------------------------------------------------
        # Clone Exercises
        # -------------------------------------------------

        for source_exercise in (
            source_block.exercises
            .all()
            .order_by("order_in_block")
        ):
            new_exercise = Exercise.objects.create(
                exercise_name=(
                    source_exercise.exercise_name
                ),
                exercise_block=new_block,
                order_in_block=(
                    source_exercise.order_in_block
                ),
            )

            # ---------------------------------------------
            # Clone SetBlocks
            # ---------------------------------------------

            for source_set_block in (
                source_exercise.set_blocks
                .all()
                .order_by("order_in_exercise")
            ):
                new_set_block = SetBlock.objects.create(
                    exercise=new_exercise,
                    order_in_exercise=(
                        source_set_block.order_in_exercise
                    ),
                    drop_down=(
                        source_set_block.drop_down
                    ),
                )

                # -----------------------------------------
                # Clone Sets
                # -----------------------------------------

                for source_set in (
                    source_set_block.sets
                    .all()
                    .order_by("order_in_set_block")
                ):
                    WorkoutSet.objects.create(
                        set_block=new_set_block,
                        order_in_set_block=(
                            source_set.order_in_set_block
                        ),

                        # Copy example values
                        reps=source_set.reps,
                        weight=source_set.weight,
                    )

    return workout


# =========================================================
# END WORKOUT
# =========================================================


@transaction.atomic
def end_workout(
    *,
    workout_id,
    user,
):
    """
    Ends an active Workout instance.

    Does not modify the original template.
    """

    try:
        workout = (
            Workout.objects
            .select_for_update()
            .get(
                pk=workout_id,
                creator=user,
            )
        )

    except Workout.DoesNotExist:
        raise WorkoutNotInProgressError(
            "Workout does not exist."
        )

    # A template itself cannot be ended.
    if workout.template_id is None:
        raise WorkoutNotInProgressError(
            "A workout template cannot be ended."
        )

    if (
        workout.status
        != Workout.Status.IN_PROGRESS
    ):
        raise WorkoutNotInProgressError(
            "This workout is not in progress."
        )

    workout.status = Workout.Status.ENDED
    workout.ended_at = timezone.now()

    workout.save(
        update_fields=[
            "status",
            "ended_at",
        ]
    )

    return workout
