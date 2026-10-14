from django.db import transaction, IntegrityError
from django.db.models import Prefetch
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from .guards import ensure_workout_writable

from .services import (
    ActiveWorkoutExistsError,
    InvalidWorkoutTemplateError,
    WorkoutNotInProgressError,
    end_workout,
    start_workout_from_template,
)

from .models import (
    Exercise,
    ExerciseBlock,
    ExerciseList,
    Set as WorkoutSet,
    SetBlock,
    Workout,
)

from .serializers import (
    # Exercise catalogue
    ExerciseListListSerializer,
    ExerciseListReadSerializer,
    ExerciseListWriteSerializer,

    # Set
    SetListSerializer,
    SetReadSerializer,
    SetWriteSerializer,

    # SetBlock
    SetBlockListSerializer,
    SetBlockReadSerializer,
    SetBlockWriteSerializer,

    # Exercise
    ExerciseListSerializer,
    ExerciseReadSerializer,
    ExerciseWriteSerializer,

    # ExerciseBlock
    ExerciseBlockListSerializer,
    ExerciseBlockReadSerializer,
    ExerciseBlockWriteSerializer,

    # Workout
    WorkoutListSerializer,
    WorkoutReadSerializer,
    WorkoutCreateSerializer,
    WorkoutWriteSerializer,
)

# =========================================================
# WORKOUT START / END
# =========================================================


class StartWorkoutView(
    generics.GenericAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = WorkoutReadSerializer

    def post(
        self,
        request,
        pk,
        *args,
        **kwargs,
    ):
        try:
            workout = start_workout_from_template(
                template_id=pk,
                user=request.user,
            )

        except ActiveWorkoutExistsError as exc:
            raise ValidationError(
                {
                    "detail": str(exc),
                }
            )

        except InvalidWorkoutTemplateError as exc:
            raise ValidationError(
                {
                    "detail": str(exc),
                }
            )

        except IntegrityError:
            # Database constraint is the final protection
            # against two simultaneous Start requests.
            #
            # Only convert it to the active-workout error
            # if an active workout actually exists.
            if Workout.objects.filter(
                creator=request.user,
                status=Workout.Status.IN_PROGRESS,
            ).exists():
                raise ValidationError(
                    {
                        "detail": (
                            "You already have a workout "
                            "in progress."
                        )
                    }
                )

            raise

        serializer = self.get_serializer(
            workout
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )


class EndWorkoutView(
    generics.GenericAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    serializer_class = WorkoutReadSerializer

    def post(
        self,
        request,
        pk,
        *args,
        **kwargs,
    ):
        try:
            workout = end_workout(
                workout_id=pk,
                user=request.user,
            )

        except WorkoutNotInProgressError as exc:
            raise ValidationError(
                {
                    "detail": str(exc),
                }
            )

        serializer = self.get_serializer(
            workout
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )


# =========================================================
# ORDER HELPERS
# =========================================================


def shift_for_insert(
    queryset,
    order_field,
    new_position,
):
    """
    Makes space for a new object.

    Example:

    Before:
        1
        2
        3
        4

    Insert at 2:

        1
        3
        4
        5

    Then the new object can safely use position 2.
    """

    count = queryset.count()

    max_allowed_position = count + 1

    if (
        new_position < 1
        or new_position > max_allowed_position
    ):
        raise ValidationError(
            {
                order_field: (
                    f"Position must be between 1 "
                    f"and {max_allowed_position}."
                )
            }
        )

    # We update from the end backwards.
    #
    # This is important because of our UniqueConstraints.
    #
    # Example:
    # 4 -> 5
    # 3 -> 4
    # 2 -> 3
    #
    # Doing it in the opposite direction could temporarily
    # create duplicate order values.

    objects = (
        queryset
        .select_for_update()
        .filter(
            **{
                f"{order_field}__gte": new_position
            }
        )
        .order_by(
            f"-{order_field}"
        )
    )

    for obj in objects:
        current_position = getattr(
            obj,
            order_field,
        )

        setattr(
            obj,
            order_field,
            current_position + 1,
        )

        obj.save(
            update_fields=[
                order_field,
            ]
        )


def shift_after_delete(
    queryset,
    order_field,
    deleted_position,
):
    """
    Closes the gap after deleting an object.

    Before:
        1
        2
        3
        4

    Delete 2:

        1
        3
        4

    Result:
        1
        2
        3
    """

    # Here we move from the beginning forward.
    #
    # 3 -> 2
    # 4 -> 3
    #
    # Position 2 is already free because the original
    # object has been deleted.

    objects = (
        queryset
        .select_for_update()
        .filter(
            **{
                f"{order_field}__gt": deleted_position
            }
        )
        .order_by(
            order_field
        )
    )

    for obj in objects:
        current_position = getattr(
            obj,
            order_field,
        )

        setattr(
            obj,
            order_field,
            current_position - 1,
        )

        obj.save(
            update_fields=[
                order_field,
            ]
        )


def move_ordered_object(
    instance,
    queryset,
    order_field,
    new_position,
):
    """
    Moves an existing object to another position.

    Example:

        1
        2  <- moving this
        3
        4

    Move 2 -> 4:

        1
        3 -> 2
        4 -> 3
        2 -> 4

    Final result:

        1
        2
        3
        4
    """

    current_position = getattr(
        instance,
        order_field,
    )

    if new_position == current_position:
        return

    count = queryset.count()

    if (
        new_position < 1
        or new_position > count
    ):
        raise ValidationError(
            {
                order_field: (
                    f"Position must be between "
                    f"1 and {count}."
                )
            }
        )

    # Lock the sibling rows.
    list(
        queryset.select_for_update()
    )

    highest_position = (
        queryset
        .order_by(
            f"-{order_field}"
        )
        .values_list(
            order_field,
            flat=True,
        )
        .first()
    )

    temporary_position = (
        highest_position + 1
    )

    # Temporarily move the object outside the normal
    # range so its old position becomes free.
    setattr(
        instance,
        order_field,
        temporary_position,
    )

    instance.save(
        update_fields=[
            order_field,
        ]
    )

    if new_position < current_position:
        # Moving UP.
        #
        # Example:
        # old = 4
        # new = 2
        #
        # 3 -> 4
        # 2 -> 3

        objects = (
            queryset
            .exclude(
                pk=instance.pk
            )
            .filter(
                **{
                    f"{order_field}__gte":
                        new_position,

                    f"{order_field}__lt":
                        current_position,
                }
            )
            .order_by(
                f"-{order_field}"
            )
        )

        for obj in objects:
            position = getattr(
                obj,
                order_field,
            )

            setattr(
                obj,
                order_field,
                position + 1,
            )

            obj.save(
                update_fields=[
                    order_field,
                ]
            )

    else:
        # Moving DOWN.
        #
        # Example:
        # old = 2
        # new = 4
        #
        # 3 -> 2
        # 4 -> 3

        objects = (
            queryset
            .exclude(
                pk=instance.pk
            )
            .filter(
                **{
                    f"{order_field}__gt":
                        current_position,

                    f"{order_field}__lte":
                        new_position,
                }
            )
            .order_by(
                order_field
            )
        )

        for obj in objects:
            position = getattr(
                obj,
                order_field,
            )

            setattr(
                obj,
                order_field,
                position - 1,
            )

            obj.save(
                update_fields=[
                    order_field,
                ]
            )

    setattr(
        instance,
        order_field,
        new_position,
    )

    instance.save(
        update_fields=[
            order_field,
        ]
    )


# =========================================================
# EXERCISE CATALOGUE
# ExerciseList model
# =========================================================


class ExerciseCatalogListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    search_fields = [
        "name",
        "note",
    ]

    filterset_fields = [
        "muscle_group",
    ]

    ordering_fields = [
        "id",
        "name",
        "muscle_group",
    ]

    ordering = [
        "name",
    ]

    def get_queryset(self):
        return ExerciseList.objects.all()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExerciseListWriteSerializer

        return ExerciseListListSerializer


class ExerciseCatalogDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return ExerciseList.objects.all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ExerciseListReadSerializer

        return ExerciseListWriteSerializer

    def perform_destroy(self, instance):
        try:
            instance.delete()

        except ProtectedError:
            raise ValidationError(
                {
                    "detail": (
                        "This exercise cannot be deleted "
                        "because it is already used in "
                        "one or more workouts."
                    )
                }
            )


# =========================================================
# WORKOUT
# =========================================================

class WorkoutAllView(
    generics.ListAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    filterset_fields = [
        "status",
        "template",
    ]

    search_fields = [
        "name",
    ]

    ordering_fields = [
        "id",
        "name",
        "started_at",
        "ended_at",
    ]

    ordering = [
        "-id",
    ]

    def get_queryset(self):
        return (
            Workout.objects
            .select_related(
                "creator",
                "template",
            )
        )

    def get_serializer_class(self):
        return WorkoutListSerializer


class WorkoutListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    filterset_fields = [
        "status",
        "template",
    ]

    search_fields = [
        "name",
    ]

    ordering_fields = [
        "id",
        "name",
        "started_at",
        "ended_at",
    ]

    ordering = [
        "-id",
    ]

    def get_queryset(self):
        return (
            Workout.objects
            .filter(
                creator=self.request.user
            )
            .select_related(
                "creator",
                "template",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return WorkoutCreateSerializer

        return WorkoutListSerializer


class WorkoutDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        # Sets
        sets_queryset = (
            WorkoutSet.objects
            .order_by(
                "order_in_set_block"
            )
        )

        # SetBlocks + Sets
        set_blocks_queryset = (
            SetBlock.objects
            .order_by(
                "order_in_exercise"
            )
            .prefetch_related(
                Prefetch(
                    "sets",
                    queryset=sets_queryset,
                )
            )
        )

        # Exercises + ExerciseList + SetBlocks
        exercises_queryset = (
            Exercise.objects
            .select_related(
                "exercise_name",
            )
            .order_by(
                "order_in_block"
            )
            .prefetch_related(
                Prefetch(
                    "set_blocks",
                    queryset=set_blocks_queryset,
                )
            )
        )

        # ExerciseBlocks + Exercises
        exercise_blocks_queryset = (
            ExerciseBlock.objects
            .order_by(
                "order"
            )
            .prefetch_related(
                Prefetch(
                    "exercises",
                    queryset=exercises_queryset,
                )
            )
        )

        return (
            Workout.objects
            .filter(
                creator=self.request.user
            )
            .select_related(
                "creator",
                "template",
            )
            .prefetch_related(
                Prefetch(
                    "exercise_blocks",
                    queryset=exercise_blocks_queryset,
                ),
                "instances",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return WorkoutReadSerializer

        return WorkoutWriteSerializer

    def perform_update(self, serializer):
        ensure_workout_writable(
            serializer.instance
        )

        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        ensure_workout_writable(
            instance
        )
        try:
            instance.delete()

        except ProtectedError:
            raise ValidationError(
                {
                    "detail": (
                        "This template cannot be deleted "
                        "because workout instances "
                        "reference it."
                    )
                }
            )


# =========================================================
# EXERCISE BLOCK
# =========================================================


class ExerciseBlockListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            ExerciseBlock.objects
            .filter(
                workout_id=self.kwargs["workout_id"],
                workout__creator=self.request.user,
            )
            .order_by(
                "order"
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExerciseBlockWriteSerializer

        return ExerciseBlockListSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        workout = get_object_or_404(
            Workout.objects
            .select_for_update()
            .filter(
                creator=self.request.user
            ),
            pk=self.kwargs["workout_id"],
        )
        ensure_workout_writable(
            workout
        )

        position = serializer.validated_data[
            "order"
        ]

        siblings = ExerciseBlock.objects.filter(
            workout=workout
        )

        shift_for_insert(
            queryset=siblings,
            order_field="order",
            new_position=position,
        )

        serializer.save(
            workout=workout
        )


class ExerciseBlockDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            ExerciseBlock.objects
            .filter(
                workout__creator=self.request.user
            )
            .select_related(
                "workout",
            )
            .prefetch_related(
                "exercises",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ExerciseBlockReadSerializer

        return ExerciseBlockWriteSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance


        ensure_workout_writable(
                instance.workout
        )

        # Lock the parent so multiple requests cannot
        # reorder the same workout at the same time.
        Workout.objects.select_for_update().get(
            pk=instance.workout_id
        )

        if "order" in serializer.validated_data:
            new_position = (
                serializer.validated_data["order"]
            )

            siblings = ExerciseBlock.objects.filter(
                workout_id=instance.workout_id
            )

            move_ordered_object(
                instance=instance,
                queryset=siblings,
                order_field="order",
                new_position=new_position,
            )

        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        ensure_workout_writable(
            instance.workout
        )

        Workout.objects.select_for_update().get(
            pk=instance.workout_id
        )

        workout_id = instance.workout_id
        deleted_position = instance.order

        instance.delete()

        siblings = ExerciseBlock.objects.filter(
            workout_id=workout_id
        )

        shift_after_delete(
            queryset=siblings,
            order_field="order",
            deleted_position=deleted_position,
        )


# =========================================================
# EXERCISE
# =========================================================


class ExerciseListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            Exercise.objects
            .filter(
                exercise_block_id=self.kwargs["block_id"],
                exercise_block__workout__creator=(
                    self.request.user
                ),
            )
            .order_by(
                "order_in_block"
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ExerciseWriteSerializer

        return ExerciseListSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        exercise_block = get_object_or_404(
            ExerciseBlock.objects
            .select_for_update()
            .filter(
                workout__creator=self.request.user
            ),
            pk=self.kwargs["block_id"],
        )
        ensure_workout_writable(
            exercise_block.workout
        )

        position = serializer.validated_data[
            "order_in_block"
        ]

        siblings = Exercise.objects.filter(
            exercise_block=exercise_block
        )

        shift_for_insert(
            queryset=siblings,
            order_field="order_in_block",
            new_position=position,
        )

        serializer.save(
            exercise_block=exercise_block
        )


class ExerciseDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            Exercise.objects
            .filter(
                exercise_block__workout__creator=(
                    self.request.user
                )
            )
            .select_related(
                "exercise_name",
                "exercise_block",
            )
            .prefetch_related(
                "set_blocks__sets",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ExerciseReadSerializer

        return ExerciseWriteSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance
        ensure_workout_writable(
            instance.exercise_block.workout
        )

        ExerciseBlock.objects.select_for_update().get(
            pk=instance.exercise_block_id
        )

        if (
            "order_in_block"
            in serializer.validated_data
        ):
            new_position = serializer.validated_data[
                "order_in_block"
            ]

            siblings = Exercise.objects.filter(
                exercise_block_id=(
                    instance.exercise_block_id
                )
            )

            move_ordered_object(
                instance=instance,
                queryset=siblings,
                order_field="order_in_block",
                new_position=new_position,
            )

        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        ExerciseBlock.objects.select_for_update().get(
            pk=instance.exercise_block_id
        )
        ensure_workout_writable(
            instance.exercise_block.workout
        )
        block_id = instance.exercise_block_id
        deleted_position = instance.order_in_block

        instance.delete()

        siblings = Exercise.objects.filter(
            exercise_block_id=block_id
        )

        shift_after_delete(
            queryset=siblings,
            order_field="order_in_block",
            deleted_position=deleted_position,
        )


# =========================================================
# SET BLOCK
# =========================================================


class SetBlockListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            SetBlock.objects
            .filter(
                exercise_id=self.kwargs["exercise_id"],
                exercise__exercise_block__workout__creator=(
                    self.request.user
                ),
            )
            .order_by(
                "order_in_exercise"
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SetBlockWriteSerializer

        return SetBlockListSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        exercise = get_object_or_404(
            Exercise.objects
            .select_for_update()
            .filter(
                exercise_block__workout__creator=(
                    self.request.user
                )
            ),
            pk=self.kwargs["exercise_id"],
        )
        ensure_workout_writable(
            exercise.exercise_block.workout
        )

        position = serializer.validated_data[
            "order_in_exercise"
        ]

        siblings = SetBlock.objects.filter(
            exercise=exercise
        )

        shift_for_insert(
            queryset=siblings,
            order_field="order_in_exercise",
            new_position=position,
        )

        serializer.save(
            exercise=exercise
        )


class SetBlockDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            SetBlock.objects
            .filter(
                exercise__exercise_block__workout__creator=(
                    self.request.user
                )
            )
            .select_related(
                "exercise",
            )
            .prefetch_related(
                "sets",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return SetBlockReadSerializer

        return SetBlockWriteSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance
        ensure_workout_writable(
            instance 
            .exercise
            .exercise_block
            .workout
        )

        Exercise.objects.select_for_update().get(
            pk=instance.exercise_id
        )

        if (
            "order_in_exercise"
            in serializer.validated_data
        ):
            new_position = serializer.validated_data[
                "order_in_exercise"
            ]

            siblings = SetBlock.objects.filter(
                exercise_id=instance.exercise_id
            )

            move_ordered_object(
                instance=instance,
                queryset=siblings,
                order_field="order_in_exercise",
                new_position=new_position,
            )

        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        Exercise.objects.select_for_update().get(
            pk=instance.exercise_id
        )
            
        ensure_workout_writable(
            instance
            .exercise
            .exercise_block
            .workout
        )

        exercise_id = instance.exercise_id
        deleted_position = (
            instance.order_in_exercise
        )

        instance.delete()

        siblings = SetBlock.objects.filter(
            exercise_id=exercise_id
        )

        shift_after_delete(
            queryset=siblings,
            order_field="order_in_exercise",
            deleted_position=deleted_position,
        )


# =========================================================
# SET
# =========================================================


class SetListCreateView(
    generics.ListCreateAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            WorkoutSet.objects
            .filter(
                set_block_id=self.kwargs["set_block_id"],
                set_block__exercise__exercise_block__workout__creator=(
                    self.request.user
                ),
            )
            .order_by(
                "order_in_set_block"
            )
        )

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SetWriteSerializer

        return SetListSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        set_block = get_object_or_404(
            SetBlock.objects
            .select_for_update()
            .filter(
                exercise__exercise_block__workout__creator=(
                    self.request.user
                )
            ),
            pk=self.kwargs["set_block_id"],
        )
        ensure_workout_writable(
            set_block
            .exercise
            .exercise_block
            .workout
        )

        position = serializer.validated_data[
            "order_in_set_block"
        ]

        siblings = WorkoutSet.objects.filter(
            set_block=set_block
        )

        shift_for_insert(
            queryset=siblings,
            order_field="order_in_set_block",
            new_position=position,
        )

        serializer.save(
            set_block=set_block
        )


class SetDetailView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [
        permissions.IsAuthenticated,
    ]

    def get_queryset(self):
        return (
            WorkoutSet.objects
            .filter(
                set_block__exercise__exercise_block__workout__creator=(
                    self.request.user
                )
            )
            .select_related(
                "set_block",
            )
        )

    def get_serializer_class(self):
        if self.request.method == "GET":
            return SetReadSerializer

        return SetWriteSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        instance = serializer.instance
        ensure_workout_writable(
            instance
            .set_block
            .exercise
            .exercise_block
            .workout
        )

        SetBlock.objects.select_for_update().get(
            pk=instance.set_block_id
        )

        if (
            "order_in_set_block"
            in serializer.validated_data
        ):
            new_position = serializer.validated_data[
                "order_in_set_block"
            ]

            siblings = WorkoutSet.objects.filter(
                set_block_id=instance.set_block_id
            )

            move_ordered_object(
                instance=instance,
                queryset=siblings,
                order_field="order_in_set_block",
                new_position=new_position,
            )

        serializer.save()

    @transaction.atomic
    def perform_destroy(self, instance):
        SetBlock.objects.select_for_update().get(
            pk=instance.set_block_id
        )

        set_block_id = instance.set_block_id
        deleted_position = (
            instance.order_in_set_block
        )

        instance.delete()

        siblings = WorkoutSet.objects.filter(
            set_block_id=set_block_id
        )

        shift_after_delete(
            queryset=siblings,
            order_field="order_in_set_block",
            deleted_position=deleted_position,
        )
