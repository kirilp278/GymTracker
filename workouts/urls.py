from django.urls import path

from .views import (
    ExerciseBlockDetailView,
    ExerciseBlockListCreateView,
    ExerciseCatalogDetailView,
    ExerciseCatalogListCreateView,
    ExerciseDetailView,
    ExerciseListCreateView,
    SetBlockDetailView,
    SetBlockListCreateView,
    SetDetailView,
    SetListCreateView,
    WorkoutAllView,
    WorkoutDetailView,
    WorkoutListCreateView,
    EndWorkoutView,
    StartWorkoutView,
)


urlpatterns = [
    # =====================================================
    # Exercise Catalog
    # =====================================================

    path(
        "exercise-catalog/",
        ExerciseCatalogListCreateView.as_view(),
        name="exercise-catalog-list-create",
    ),

    path(
        "exercise-catalog/<int:pk>/",
        ExerciseCatalogDetailView.as_view(),
        name="exercise-catalog-detail",
    ),


    # =====================================================
    # Workouts
    # =====================================================

    path(
        "workouts/",
        WorkoutListCreateView.as_view(),
        name="workout-list-create",
    ),

    # path(
    #     "workouts/all/",
    #     WorkoutAllView.as_view(),
    #     name="workout-all",
    # ),

    path(
        "workouts/<int:pk>/",
        WorkoutDetailView.as_view(),
        name="workout-detail",
    ),


    # =====================================================
    # Exercise Blocks
    # =====================================================

    path(
        "workouts/<int:workout_id>/exercise-blocks/",
        ExerciseBlockListCreateView.as_view(),
        name="exercise-block-list-create",
    ),

    path(
        "exercise-blocks/<int:pk>/",
        ExerciseBlockDetailView.as_view(),
        name="exercise-block-detail",
    ),


    # =====================================================
    # Exercises
    # =====================================================

    path(
        "exercise-blocks/<int:block_id>/exercises/",
        ExerciseListCreateView.as_view(),
        name="exercise-list-create",
    ),

    path(
        "exercises/<int:pk>/",
        ExerciseDetailView.as_view(),
        name="exercise-detail",
    ),


    # =====================================================
    # Set Blocks
    # =====================================================

    path(
        "exercises/<int:exercise_id>/set-blocks/",
        SetBlockListCreateView.as_view(),
        name="set-block-list-create",
    ),

    path(
        "set-blocks/<int:pk>/",
        SetBlockDetailView.as_view(),
        name="set-block-detail",
    ),


    # =====================================================
    # Sets
    # =====================================================

    path(
        "set-blocks/<int:set_block_id>/sets/",
        SetListCreateView.as_view(),
        name="set-list-create",
    ),

    path(
        "sets/<int:pk>/",
        SetDetailView.as_view(),
        name="set-detail",
    ),
    
    # =====================================================
    # WORKOUT START/END 
    # =====================================================
    path(
        "workouts/<int:pk>/start/",
        StartWorkoutView.as_view(),
        name="workout-start",
    ),

    path(
        "workouts/<int:pk>/end/",
        EndWorkoutView.as_view(),
        name="workout-end",
    ),
]
