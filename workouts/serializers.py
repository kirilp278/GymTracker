from rest_framework import serializers
from django.db import transaction
from .models import (
    Exercise,
    ExerciseBlock,
    ExerciseList,
    Set as WorkoutSet,
    SetBlock,
    Workout,
)


# =========================================================
# ExerciseList
# =========================================================


class ExerciseListListSerializer(serializers.ModelSerializer):
    """
    Minimal representation of an exercise from the global
    exercise catalogue.

    Used when listing many ExerciseList objects.
    """

    class Meta:
        model = ExerciseList
        fields = [
            "id",
            "name",
            "muscle_group",
        ]


class ExerciseListReadSerializer(serializers.ModelSerializer):
    """
    Full representation of one ExerciseList object.
    """

    class Meta:
        model = ExerciseList
        fields = [
            "id",
            "name",
            "muscle_group",
            "note",
        ]


class ExerciseListWriteSerializer(serializers.ModelSerializer):
    """
    Used for creating and updating ExerciseList objects.
    """

    class Meta:
        model = ExerciseList
        fields = [
            "id",
            "name",
            "muscle_group",
            "note",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# Set
# =========================================================


class SetListSerializer(serializers.ModelSerializer):
    """
    Minimal Set representation.

    In this case Set itself is already very small,
    so there is not much to remove.
    """

    class Meta:
        model = WorkoutSet
        fields = [
            "id",
            "set_block",
            "order_in_set_block",
            "reps",
            "weight",
        ]


class SetReadSerializer(serializers.ModelSerializer):
    """
    Full representation of one Set.
    """

    class Meta:
        model = WorkoutSet
        fields = [
            "id",
            "set_block",
            "order_in_set_block",
            "reps",
            "weight",
        ]


class SetWriteSerializer(serializers.ModelSerializer):
    """
    Creates or updates a Set.

    set_block is read-only because the parent will come
    from the URL/view:

    POST /set-blocks/<set_block_id>/sets/
    """

    set_block = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = WorkoutSet
        fields = [
            "id",
            "set_block",
            "order_in_set_block",
            "reps",
            "weight",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# SetBlock
# =========================================================


class SetBlockListSerializer(serializers.ModelSerializer):
    """
    Minimal representation used when listing SetBlocks.
    No nested Sets here.
    """

    class Meta:
        model = SetBlock
        fields = [
            "id",
            "exercise",
            "order_in_exercise",
            "drop_down",
        ]


class SetBlockReadSerializer(serializers.ModelSerializer):
    """
    Full SetBlock including its Sets.
    """

    sets = SetReadSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = SetBlock
        fields = [
            "id",
            "exercise",
            "order_in_exercise",
            "drop_down",
            "sets",
        ]


class SetBlockWriteSerializer(serializers.ModelSerializer):
    """
    Creates or updates only the SetBlock itself.

    Sets are intentionally NOT writable here.
    """

    exercise = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = SetBlock
        fields = [
            "id",
            "exercise",
            "order_in_exercise",
            "drop_down",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# Exercise
# =========================================================


class ExerciseListSerializer(serializers.ModelSerializer):
    """
    Minimal Exercise representation.

    exercise_name is represented by its ExerciseList PK.
    """

    class Meta:
        model = Exercise
        fields = [
            "id",
            "exercise_name",
            "exercise_block",
            "order_in_block",
        ]


class ExerciseReadSerializer(serializers.ModelSerializer):
    """
    Full Exercise representation.

    exercise_name becomes nested so the frontend receives
    the actual exercise information without another request.

    set_blocks are also nested.
    """

    exercise_name = ExerciseListReadSerializer(
        read_only=True,
    )

    set_blocks = SetBlockReadSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Exercise
        fields = [
            "id",
            "exercise_name",
            "exercise_block",
            "order_in_block",
            "set_blocks",
        ]


class ExerciseWriteSerializer(serializers.ModelSerializer):
    """
    Creates/updates one Exercise.

    exercise_name is writable and expects an ExerciseList ID.

    exercise_block is supplied by the view from the URL.
    """

    exercise_block = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = Exercise
        fields = [
            "id",
            "exercise_name",
            "exercise_block",
            "order_in_block",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# ExerciseBlock
# =========================================================


class ExerciseBlockListSerializer(serializers.ModelSerializer):
    """
    Minimal ExerciseBlock representation.
    """

    class Meta:
        model = ExerciseBlock
        fields = [
            "id",
            "workout",
            "order",
            "super_set",
        ]


class ExerciseBlockReadSerializer(serializers.ModelSerializer):
    """
    Full ExerciseBlock with nested Exercises.
    """

    exercises = ExerciseReadSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = ExerciseBlock
        fields = [
            "id",
            "workout",
            "order",
            "super_set",
            "exercises",
        ]


class ExerciseBlockWriteSerializer(serializers.ModelSerializer):
    """
    Creates/updates one ExerciseBlock.

    workout is supplied by the view from:

    POST /workouts/<workout_id>/exercise-blocks/
    """

    workout = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = ExerciseBlock
        fields = [
            "id",
            "workout",
            "order",
            "super_set",
        ]

        read_only_fields = [
            "id",
        ]


# =========================================================
# Workout
# =========================================================


class WorkoutListSerializer(serializers.ModelSerializer):
    """
    Minimal Workout representation.

    ForeignKeys remain IDs.

    Example:

    {
        "id": 5,
        "name": "Push Day",
        "creator": 1,
        "template": null,
        "status": "template"
    }
    """

    class Meta:
        model = Workout
        fields = [
            "id",
            "name",
            "creator",
            "template",
            "status",
            "started_at",
            "ended_at",
        ]


class WorkoutReadSerializer(serializers.ModelSerializer):
    """
    Full Workout representation.

    Returns the entire workout tree:

    Workout
        -> ExerciseBlock
            -> Exercise
                -> SetBlock
                    -> Set

    instances gives the workout history for a template,
    but uses WorkoutListSerializer to avoid recursion.
    """

    exercise_blocks = ExerciseBlockReadSerializer(
        many=True,
        read_only=True,
    )

    instances = WorkoutListSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Workout
        fields = [
            "id",
            "name",
            "creator",
            "template",
            "status",
            "started_at",
            "ended_at",
            "exercise_blocks",
            "instances",
        ]


class WorkoutWriteSerializer(serializers.ModelSerializer):
    """
    Creates and updates Workout itself.

    Nested ExerciseBlocks are intentionally NOT accepted.

    creator:
        supplied from request.user

    template:
        controlled by the backend when cloning a template

    status:
        controlled by backend workout lifecycle logic

    This means users cannot manually change the original
    template relationship through a normal PATCH request.
    """

    creator = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    template = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    status = serializers.CharField(
        read_only=True,
    )

    class Meta:
        model = Workout
        fields = [
            "id",
            "name",
            "creator",
            "template",
            "status",
            "started_at",
            "ended_at",
        ]

        read_only_fields = [
            "id",
        ]

    def validate(self, attrs):
        instance = self.instance

        started_at = attrs.get(
            "started_at",
            instance.started_at if instance else None,
        )

        ended_at = attrs.get(
            "ended_at",
            instance.ended_at if instance else None,
        )

        if (
            started_at is not None
            and ended_at is not None
            and ended_at < started_at
        ):
            raise serializers.ValidationError(
                {
                    "ended_at": (
                        "ended_at cannot be earlier "
                        "than started_at."
                    )
                }
            )

        return attrs

class SetCreateSerializer(SetWriteSerializer):
    """
    Used only when creating a complete Workout tree.
    """

    class Meta(SetWriteSerializer.Meta):
        fields = [
            "order_in_set_block",
            "reps",
            "weight",
        ]


class SetBlockCreateSerializer(SetBlockWriteSerializer):
    """
    Nested SetBlock creation with its Sets.
    """

    sets = SetCreateSerializer(
        many=True,
        required=False,
    )

    class Meta(SetBlockWriteSerializer.Meta):
        fields = [
            "order_in_exercise",
            "drop_down",
            "sets",
        ]


class ExerciseCreateSerializer(ExerciseWriteSerializer):
    """
    Nested Exercise creation with its SetBlocks.
    """

    set_blocks = SetBlockCreateSerializer(
        many=True,
        required=False,
    )

    class Meta(ExerciseWriteSerializer.Meta):
        fields = [
            "exercise_name",
            "order_in_block",
            "set_blocks",
        ]


class ExerciseBlockCreateSerializer(ExerciseBlockWriteSerializer):
    """
    Nested ExerciseBlock creation with its Exercises.
    """

    exercises = ExerciseCreateSerializer(
        many=True,
        required=False,
    )

    class Meta(ExerciseBlockWriteSerializer.Meta):
        fields = [
            "order",
            "super_set",
            "exercises",
        ]


class WorkoutCreateSerializer(serializers.ModelSerializer):
    """
    Creates a complete Workout template:

    Workout
        -> ExerciseBlock
            -> Exercise
                -> SetBlock
                    -> Set

    This serializer is ONLY for initial template creation.

    Later changes to an existing Workout tree should use
    the individual Write serializers/endpoints.
    """

    exercise_blocks = ExerciseBlockCreateSerializer(
        many=True,
        required=False,
    )

    class Meta:
        model = Workout
        fields = [
            "id",
            "name",
            "exercise_blocks",
        ]

        read_only_fields = [
            "id",
        ]

    @transaction.atomic
    def create(self, validated_data):
        exercise_blocks_data = validated_data.pop(
            "exercise_blocks",
            [],
        )

        request = self.context["request"]

        workout = Workout.objects.create(
            creator=request.user,
            status=Workout.Status.TEMPLATE,
            template=None,
            **validated_data,
        )

        for exercise_block_data in exercise_blocks_data:
            exercises_data = exercise_block_data.pop(
                "exercises",
                [],
            )

            exercise_block = ExerciseBlock.objects.create(
                workout=workout,
                **exercise_block_data,
            )

            for exercise_data in exercises_data:
                set_blocks_data = exercise_data.pop(
                    "set_blocks",
                    [],
                )

                exercise = Exercise.objects.create(
                    exercise_block=exercise_block,
                    **exercise_data,
                )

                for set_block_data in set_blocks_data:
                    sets_data = set_block_data.pop(
                        "sets",
                        [],
                    )

                    set_block = SetBlock.objects.create(
                        exercise=exercise,
                        **set_block_data,
                    )

                    for set_data in sets_data:
                        WorkoutSet.objects.create(
                            set_block=set_block,
                            **set_data,
                        )

        return workout
