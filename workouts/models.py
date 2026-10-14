from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Workout(models.Model):
    class Status(models.TextChoices):
        TEMPLATE = "template", "Template"
        IN_PROGRESS = "in_progress", "In progress"
        ENDED = "ended", "Ended"

    name = models.CharField(
        max_length=150,
    )

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="workouts",
    )

    template = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="instances",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TEMPLATE,
    )

    started_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    ended_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=(
                    (
                        Q(template__isnull=True)
                        & Q(status="template")
                    )
                    |
                    (
                        Q(template__isnull=False)
                        & ~Q(status="template")
                    )
                ),
                name="workout_template_status_consistent",
            ),
            models.UniqueConstraint(
                fields=[
                    "creator",
                ],
                condition=Q(
                    status="in_progress",
                ),
                name="unique_in_progress_workout_per_creator",
            ),
        ]

    def __str__(self):
        return self.name


class ExerciseList(models.Model):
    name = models.CharField(
        max_length=150,
    )

    muscle_group = models.CharField(
        max_length=100,
    )

    note = models.TextField(
        blank=True,
    )

    def __str__(self):
        return self.name


class ExerciseBlock(models.Model):
    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name="exercise_blocks",
    )

    order = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
        ],
    )

    super_set = models.BooleanField(
        default=False,
    )

    class Meta:
        ordering = [
            "order",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "workout",
                    "order",
                ],
                name="unique_block_order_per_workout",
            ),
        ]

    def __str__(self):
        return (
            f"{self.workout.name} "
            f"- Block {self.order}"
        )


class Exercise(models.Model):
    exercise_name = models.ForeignKey(
        ExerciseList,
        on_delete=models.PROTECT,
        related_name="exercises",
    )

    exercise_block = models.ForeignKey(
        ExerciseBlock,
        on_delete=models.CASCADE,
        related_name="exercises",
    )

    order_in_block = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
        ],
    )

    class Meta:
        ordering = [
            "order_in_block",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "exercise_block",
                    "order_in_block",
                ],
                name="unique_exercise_order_per_block",
            ),
        ]

    def __str__(self):
        return (
            f"{self.exercise_name.name} "
            f"- Position {self.order_in_block}"
        )


class SetBlock(models.Model):
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.CASCADE,
        related_name="set_blocks",
    )

    order_in_exercise = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
        ],
    )

    drop_down = models.BooleanField(
        default=False,
    )

    class Meta:
        ordering = [
            "order_in_exercise",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "exercise",
                    "order_in_exercise",
                ],
                name="unique_set_block_order_per_exercise",
            ),
        ]

    def __str__(self):
        return (
            f"{self.exercise.exercise_name.name} "
            f"- Set Block {self.order_in_exercise}"
        )


class Set(models.Model):
    set_block = models.ForeignKey(
        SetBlock,
        on_delete=models.CASCADE,
        related_name="sets",
    )

    order_in_set_block = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
        ],
    )

    reps = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    weight = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
    )

    class Meta:
        ordering = [
            "order_in_set_block",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "set_block",
                    "order_in_set_block",
                ],
                name="unique_set_order_per_set_block",
            ),
        ]

    def __str__(self):
        return (
            f"Set {self.order_in_set_block} "
            f"- {self.set_block.exercise.exercise_name.name}"
        )
