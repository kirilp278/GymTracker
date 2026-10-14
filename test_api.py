import json
import sys

import requests


# ============================================================
# CONFIG
# ============================================================

BASE_URL = "http://127.0.0.1:8000"

USERNAME = "kiko"
PASSWORD = "kiko1234"

# Ако го направиш True, workout-ът ще бъде изтрит
# след успешното приключване на всички тестове.
#
# Засега препоръчвам False, за да можеш после
# да го разгледаш през API-то.
CLEANUP_AT_END = False


# ============================================================
# HTTP SESSION
# ============================================================

session = requests.Session()


# ============================================================
# HELPERS
# ============================================================

def pretty(data):
    print(
        json.dumps(
            data,
            indent=2,
            ensure_ascii=False,
        )
    )


def api_request(
    method,
    path,
    *,
    payload=None,
    expected=(200,),
):
    url = f"{BASE_URL}{path}"

    print()
    print("=" * 70)
    print(f"{method} {path}")

    if payload is not None:
        print("Payload:")
        pretty(payload)

    response = session.request(
        method=method,
        url=url,
        json=payload,
        timeout=10,
    )

    print(
        f"Status: {response.status_code}"
    )

    if response.content:
        try:
            data = response.json()
        except ValueError:
            data = response.text
    else:
        data = None

    if response.status_code not in expected:
        print()
        print("ERROR RESPONSE:")

        if isinstance(data, (dict, list)):
            pretty(data)
        else:
            print(data)

        raise AssertionError(
            f"{method} {path} returned "
            f"{response.status_code}, "
            f"expected {expected}"
        )

    return data


def get_list(data):
    """
    Поддържа както normal list response:

        [...]

    така и DRF pagination:

        {
            "count": ...,
            "results": [...]
        }
    """

    if isinstance(data, list):
        return data

    if (
        isinstance(data, dict)
        and "results" in data
    ):
        return data["results"]

    raise AssertionError(
        f"Expected a list response, got: {data}"
    )


def assert_order(items, field):
    actual = [
        item[field]
        for item in items
    ]

    expected = list(
        range(
            1,
            len(items) + 1,
        )
    )

    assert actual == expected, (
        f"Invalid order for {field}.\n"
        f"Expected: {expected}\n"
        f"Actual:   {actual}"
    )

    print(
        f"✓ {field} order is correct: {actual}"
    )


def find_by_id(items, object_id):
    for item in items:
        if item["id"] == object_id:
            return item

    raise AssertionError(
        f"Object with id={object_id} not found."
    )


def success(message):
    print()
    print(f"✓ {message}")


# ============================================================
# LOGIN
# ============================================================

def login():
    print()
    print("#" * 70)
    print("LOGIN")
    print("#" * 70)

    data = api_request(
        "POST",
        "/api/v1/auth/login/",
        payload={
            "username": USERNAME,
            "password": PASSWORD,
        },
        expected=(200,),
    )

    success(
        f"Logged in as {USERNAME}"
    )

    cookie_names = list(
        session.cookies.get_dict().keys()
    )

    print(
        f"Cookies received: {cookie_names}"
    )

    return data


# ============================================================
# EXERCISE CATALOG
# ============================================================

def get_catalog_exercises():
    print()
    print("#" * 70)
    print("EXERCISE CATALOG")
    print("#" * 70)

    data = api_request(
        "GET",
        "/api/v1/exercise-catalog/",
        expected=(200,),
    )

    exercises = get_list(data)

    if len(exercises) < 6:
        raise AssertionError(
            "The test requires at least 6 exercises "
            "in /api/v1/exercise-catalog/."
        )

    print()
    print("Exercises used by the test:")

    for exercise in exercises[:6]:
        print(
            f"  {exercise['id']}: "
            f"{exercise['name']}"
        )

    return exercises[:6]


# ============================================================
# CREATE COMPLEX WORKOUT
# ============================================================

def create_workout(catalog):
    print()
    print("#" * 70)
    print("CREATE NESTED WORKOUT")
    print("#" * 70)

    ex1 = catalog[0]["id"]
    ex2 = catalog[1]["id"]
    ex3 = catalog[2]["id"]
    ex4 = catalog[3]["id"]

    payload = {
        "name": "API TEST - Complex Workout",
        "exercise_blocks": [

            # =================================================
            # BLOCK 1
            # Normal exercise block
            # =================================================

            {
                "order": 1,
                "super_set": False,
                "exercises": [
                    {
                        "exercise_name": ex1,
                        "order_in_block": 1,
                        "set_blocks": [

                            # Normal set block with 2 sets
                            {
                                "order_in_exercise": 1,
                                "drop_down": False,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 10,
                                        "weight": "60.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 8,
                                        "weight": "65.00",
                                    },
                                ],
                            },

                            # Drop set with 3 sets
                            {
                                "order_in_exercise": 2,
                                "drop_down": True,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 8,
                                        "weight": "70.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 8,
                                        "weight": "55.00",
                                    },
                                    {
                                        "order_in_set_block": 3,
                                        "reps": 10,
                                        "weight": "40.00",
                                    },
                                ],
                            },
                        ],
                    }
                ],
            },

            # =================================================
            # BLOCK 2
            # SUPERSET
            # =================================================

            {
                "order": 2,
                "super_set": True,
                "exercises": [

                    # First exercise in superset
                    {
                        "exercise_name": ex2,
                        "order_in_block": 1,
                        "set_blocks": [
                            {
                                "order_in_exercise": 1,
                                "drop_down": False,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 12,
                                        "weight": "20.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 10,
                                        "weight": "22.50",
                                    },
                                ],
                            },
                            {
                                "order_in_exercise": 2,
                                "drop_down": True,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 10,
                                        "weight": "22.50",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 10,
                                        "weight": "17.50",
                                    },
                                    {
                                        "order_in_set_block": 3,
                                        "reps": 12,
                                        "weight": "12.50",
                                    },
                                ],
                            },
                        ],
                    },

                    # Second exercise in superset
                    {
                        "exercise_name": ex3,
                        "order_in_block": 2,
                        "set_blocks": [
                            {
                                "order_in_exercise": 1,
                                "drop_down": False,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 15,
                                        "weight": "10.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 12,
                                        "weight": "12.50",
                                    },
                                ],
                            },
                            {
                                "order_in_exercise": 2,
                                "drop_down": False,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 12,
                                        "weight": "12.50",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 10,
                                        "weight": "15.00",
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },

            # =================================================
            # BLOCK 3
            # Another normal block with drop sets
            # =================================================

            {
                "order": 3,
                "super_set": False,
                "exercises": [
                    {
                        "exercise_name": ex4,
                        "order_in_block": 1,
                        "set_blocks": [
                            {
                                "order_in_exercise": 1,
                                "drop_down": True,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 10,
                                        "weight": "50.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 10,
                                        "weight": "40.00",
                                    },
                                    {
                                        "order_in_set_block": 3,
                                        "reps": 12,
                                        "weight": "30.00",
                                    },
                                ],
                            },
                            {
                                "order_in_exercise": 2,
                                "drop_down": False,
                                "sets": [
                                    {
                                        "order_in_set_block": 1,
                                        "reps": 10,
                                        "weight": "45.00",
                                    },
                                    {
                                        "order_in_set_block": 2,
                                        "reps": 8,
                                        "weight": "50.00",
                                    },
                                ],
                            },
                        ],
                    }
                ],
            },
        ],
    }

    data = api_request(
        "POST",
        "/api/v1/workouts/",
        payload=payload,
        expected=(201,),
    )

    workout_id = data["id"]

    success(
        f"Workout created with id={workout_id}"
    )

    return workout_id


# ============================================================
# READ AND VALIDATE WORKOUT
# ============================================================

def get_workout(workout_id):
    return api_request(
        "GET",
        f"/api/v1/workouts/{workout_id}/",
        expected=(200,),
    )


def validate_initial_workout(workout_id):
    print()
    print("#" * 70)
    print("VALIDATE NESTED WORKOUT")
    print("#" * 70)

    workout = get_workout(
        workout_id
    )

    blocks = workout["exercise_blocks"]

    assert len(blocks) == 3
    assert_order(
        blocks,
        "order",
    )

    assert (
        blocks[1]["super_set"]
        is True
    )

    success(
        "Superset block exists"
    )

    drop_blocks = []

    for block in blocks:
        assert_order(
            block["exercises"],
            "order_in_block",
        )

        for exercise in block["exercises"]:
            set_blocks = exercise["set_blocks"]

            assert_order(
                set_blocks,
                "order_in_exercise",
            )

            for set_block in set_blocks:
                sets = set_block["sets"]

                # User requirement:
                # more than one Set in every SetBlock
                assert len(sets) > 1

                assert_order(
                    sets,
                    "order_in_set_block",
                )

                if set_block["drop_down"]:
                    drop_blocks.append(
                        set_block
                    )

    assert len(drop_blocks) >= 2

    success(
        "Multiple drop sets exist"
    )

    success(
        "Every SetBlock contains more than one Set"
    )


# ============================================================
# WORKOUT LIST TEST
# ============================================================

def test_workout_lists(workout_id):
    print()
    print("#" * 70)
    print("WORKOUT LIST ENDPOINTS")
    print("#" * 70)

    own_data = api_request(
        "GET",
        "/api/v1/workouts/",
        expected=(200,),
    )

    own_workouts = get_list(
        own_data
    )

    assert any(
        workout["id"] == workout_id
        for workout in own_workouts
    )

    success(
        "Workout exists in current user's workout list"
    )

    all_data = api_request(
        "GET",
        "/api/v1/workouts/all/",
        expected=(200,),
    )

    all_workouts = get_list(
        all_data
    )

    assert any(
        workout["id"] == workout_id
        for workout in all_workouts
    )

    success(
        "Workout exists in all-workouts endpoint"
    )


# ============================================================
# EXERCISE BLOCK TESTS
# ============================================================

def test_exercise_blocks(workout_id):
    print()
    print("#" * 70)
    print("EXERCISE BLOCK CRUD + REORDER")
    print("#" * 70)

    path = (
        f"/api/v1/workouts/"
        f"{workout_id}/exercise-blocks/"
    )

    # --------------------------------------------------------
    # Initial
    # --------------------------------------------------------

    blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert_order(
        blocks,
        "order",
    )

    # --------------------------------------------------------
    # CREATE at position 2
    # --------------------------------------------------------

    created = api_request(
        "POST",
        path,
        payload={
            "order": 2,
            "super_set": False,
        },
        expected=(201,),
    )

    block_id = created["id"]

    blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(blocks) == 4

    assert_order(
        blocks,
        "order",
    )

    assert (
        find_by_id(
            blocks,
            block_id,
        )["order"]
        == 2
    )

    success(
        "ExerciseBlock inserted at position 2"
    )

    # --------------------------------------------------------
    # MOVE 2 -> 4
    # --------------------------------------------------------

    api_request(
        "PATCH",
        f"/api/v1/exercise-blocks/{block_id}/",
        payload={
            "order": 4,
            "super_set": True,
        },
        expected=(200,),
    )

    blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert_order(
        blocks,
        "order",
    )

    moved = find_by_id(
        blocks,
        block_id,
    )

    assert moved["order"] == 4
    assert moved["super_set"] is True

    success(
        "ExerciseBlock moved from position 2 to 4"
    )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    api_request(
        "DELETE",
        f"/api/v1/exercise-blocks/{block_id}/",
        expected=(204,),
    )

    blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(blocks) == 3

    assert_order(
        blocks,
        "order",
    )

    success(
        "ExerciseBlock deleted and order repaired"
    )


# ============================================================
# EXERCISE TESTS
# ============================================================

def test_exercises(
    workout_id,
    catalog,
):
    print()
    print("#" * 70)
    print("EXERCISE CRUD + REORDER")
    print("#" * 70)

    workout = get_workout(
        workout_id
    )

    # Find our superset block.
    superset_block = next(
        block
        for block in workout["exercise_blocks"]
        if block["super_set"]
    )

    block_id = superset_block["id"]

    path = (
        f"/api/v1/exercise-blocks/"
        f"{block_id}/exercises/"
    )

    exercises = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(exercises) == 2

    assert_order(
        exercises,
        "order_in_block",
    )

    # --------------------------------------------------------
    # CREATE at 2
    # --------------------------------------------------------

    created = api_request(
        "POST",
        path,
        payload={
            "exercise_name": catalog[4]["id"],
            "order_in_block": 2,
        },
        expected=(201,),
    )

    exercise_id = created["id"]

    exercises = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(exercises) == 3

    assert_order(
        exercises,
        "order_in_block",
    )

    assert (
        find_by_id(
            exercises,
            exercise_id,
        )["order_in_block"]
        == 2
    )

    success(
        "Exercise inserted at position 2"
    )

    # --------------------------------------------------------
    # MOVE to position 1
    # Also change ExerciseList reference.
    # --------------------------------------------------------

    api_request(
        "PATCH",
        f"/api/v1/exercises/{exercise_id}/",
        payload={
            "order_in_block": 1,
            "exercise_name": catalog[5]["id"],
        },
        expected=(200,),
    )

    exercises = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert_order(
        exercises,
        "order_in_block",
    )

    moved = find_by_id(
        exercises,
        exercise_id,
    )

    assert (
        moved["order_in_block"]
        == 1
    )

    assert (
        moved["exercise_name"]
        == catalog[5]["id"]
    )

    success(
        "Exercise moved to position 1 and updated"
    )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    api_request(
        "DELETE",
        f"/api/v1/exercises/{exercise_id}/",
        expected=(204,),
    )

    exercises = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(exercises) == 2

    assert_order(
        exercises,
        "order_in_block",
    )

    success(
        "Exercise deleted and order repaired"
    )


# ============================================================
# SET BLOCK TESTS
# ============================================================

def test_set_blocks(workout_id):
    print()
    print("#" * 70)
    print("SET BLOCK CRUD + REORDER")
    print("#" * 70)

    workout = get_workout(
        workout_id
    )

    # First exercise of first block already contains
    # two SetBlocks from the initial nested creation.
    exercise = (
        workout["exercise_blocks"][0]
        ["exercises"][0]
    )

    exercise_id = exercise["id"]

    path = (
        f"/api/v1/exercises/"
        f"{exercise_id}/set-blocks/"
    )

    set_blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(set_blocks) == 2

    assert_order(
        set_blocks,
        "order_in_exercise",
    )

    # --------------------------------------------------------
    # CREATE in the middle
    # --------------------------------------------------------

    created = api_request(
        "POST",
        path,
        payload={
            "order_in_exercise": 2,
            "drop_down": True,
        },
        expected=(201,),
    )

    set_block_id = created["id"]

    set_blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(set_blocks) == 3

    assert_order(
        set_blocks,
        "order_in_exercise",
    )

    assert (
        find_by_id(
            set_blocks,
            set_block_id,
        )["order_in_exercise"]
        == 2
    )

    success(
        "SetBlock inserted at position 2"
    )

    # --------------------------------------------------------
    # MOVE 2 -> 3
    # --------------------------------------------------------

    api_request(
        "PATCH",
        f"/api/v1/set-blocks/{set_block_id}/",
        payload={
            "order_in_exercise": 3,
            "drop_down": False,
        },
        expected=(200,),
    )

    set_blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert_order(
        set_blocks,
        "order_in_exercise",
    )

    moved = find_by_id(
        set_blocks,
        set_block_id,
    )

    assert (
        moved["order_in_exercise"]
        == 3
    )

    assert (
        moved["drop_down"]
        is False
    )

    success(
        "SetBlock moved from position 2 to 3"
    )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    api_request(
        "DELETE",
        f"/api/v1/set-blocks/{set_block_id}/",
        expected=(204,),
    )

    set_blocks = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(set_blocks) == 2

    assert_order(
        set_blocks,
        "order_in_exercise",
    )

    success(
        "SetBlock deleted and order repaired"
    )


# ============================================================
# SET TESTS
# ============================================================

def test_sets(workout_id):
    print()
    print("#" * 70)
    print("SET CRUD + REORDER")
    print("#" * 70)

    workout = get_workout(
        workout_id
    )

    target_set_block = None

    # Find a SetBlock containing at least 3 sets.
    for block in workout["exercise_blocks"]:
        for exercise in block["exercises"]:
            for set_block in exercise["set_blocks"]:
                if len(set_block["sets"]) >= 3:
                    target_set_block = set_block
                    break

            if target_set_block:
                break

        if target_set_block:
            break

    assert target_set_block is not None

    set_block_id = target_set_block["id"]

    path = (
        f"/api/v1/set-blocks/"
        f"{set_block_id}/sets/"
    )

    sets = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    original_count = len(sets)

    assert original_count >= 3

    assert_order(
        sets,
        "order_in_set_block",
    )

    # --------------------------------------------------------
    # CREATE at position 2
    # --------------------------------------------------------

    created = api_request(
        "POST",
        path,
        payload={
            "order_in_set_block": 2,
            "reps": 99,
            "weight": "12.34",
        },
        expected=(201,),
    )

    set_id = created["id"]

    sets = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(sets) == original_count + 1

    assert_order(
        sets,
        "order_in_set_block",
    )

    created_set = find_by_id(
        sets,
        set_id,
    )

    assert (
        created_set["order_in_set_block"]
        == 2
    )

    success(
        "Set inserted at position 2"
    )

    # --------------------------------------------------------
    # MOVE TO LAST POSITION + CHANGE VALUES
    # --------------------------------------------------------

    last_position = len(sets)

    api_request(
        "PATCH",
        f"/api/v1/sets/{set_id}/",
        payload={
            "order_in_set_block": last_position,
            "reps": 7,
            "weight": "77.50",
        },
        expected=(200,),
    )

    sets = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert_order(
        sets,
        "order_in_set_block",
    )

    moved = find_by_id(
        sets,
        set_id,
    )

    assert (
        moved["order_in_set_block"]
        == last_position
    )

    assert moved["reps"] == 7

    # DecimalField usually serializes as a string.
    assert (
        str(moved["weight"])
        == "77.50"
    )

    success(
        f"Set moved to position {last_position} "
        "and reps/weight updated"
    )

    # --------------------------------------------------------
    # DETAIL GET
    # --------------------------------------------------------

    detail = api_request(
        "GET",
        f"/api/v1/sets/{set_id}/",
        expected=(200,),
    )

    assert detail["id"] == set_id
    assert detail["reps"] == 7

    success(
        "Set detail endpoint works"
    )

    # --------------------------------------------------------
    # DELETE
    # --------------------------------------------------------

    api_request(
        "DELETE",
        f"/api/v1/sets/{set_id}/",
        expected=(204,),
    )

    sets = get_list(
        api_request(
            "GET",
            path,
            expected=(200,),
        )
    )

    assert len(sets) == original_count

    assert_order(
        sets,
        "order_in_set_block",
    )

    success(
        "Set deleted and order repaired"
    )


# ============================================================
# FINAL WORKOUT VALIDATION
# ============================================================

def validate_final_workout(workout_id):
    print()
    print("#" * 70)
    print("FINAL WORKOUT VALIDATION")
    print("#" * 70)

    workout = get_workout(
        workout_id
    )

    blocks = workout[
        "exercise_blocks"
    ]

    assert_order(
        blocks,
        "order",
    )

    for block in blocks:
        assert_order(
            block["exercises"],
            "order_in_block",
        )

        for exercise in block["exercises"]:
            assert_order(
                exercise["set_blocks"],
                "order_in_exercise",
            )

            for set_block in exercise["set_blocks"]:
                assert_order(
                    set_block["sets"],
                    "order_in_set_block",
                )

    success(
        "Entire Workout tree has valid ordering"
    )


# ============================================================
# OPTIONAL CLEANUP
# ============================================================

def cleanup(workout_id):
    if not CLEANUP_AT_END:
        print()
        print(
            f"Workout {workout_id} was NOT deleted "
            "because CLEANUP_AT_END=False."
        )
        print(
            f"Inspect it at: "
            f"{BASE_URL}/api/v1/workouts/{workout_id}/"
        )
        return

    print()
    print("#" * 70)
    print("CLEANUP")
    print("#" * 70)

    api_request(
        "DELETE",
        f"/api/v1/workouts/{workout_id}/",
        expected=(204,),
    )

    success(
        f"Test Workout {workout_id} deleted"
    )


# ============================================================
# MAIN
# ============================================================

def main():
    workout_id = None

    try:
        login()

        catalog = get_catalog_exercises()

        workout_id = create_workout(
            catalog
        )

        validate_initial_workout(
            workout_id
        )

        test_workout_lists(
            workout_id
        )

        test_exercise_blocks(
            workout_id
        )

        test_exercises(
            workout_id,
            catalog,
        )

        test_set_blocks(
            workout_id
        )

        test_sets(
            workout_id
        )

        validate_final_workout(
            workout_id
        )

        print()
        print("#" * 70)
        print("ALL TESTS PASSED")
        print("#" * 70)

        cleanup(
            workout_id
        )

    except requests.ConnectionError:
        print()
        print("ERROR:")
        print(
            "Could not connect to Django."
        )
        print(
            "Make sure the server is running:"
        )
        print()
        print(
            "python manage.py runserver"
        )

        sys.exit(1)

    except Exception as exc:
        print()
        print("#" * 70)
        print("TEST FAILED")
        print("#" * 70)
        print()
        print(
            f"{type(exc).__name__}: {exc}"
        )

        if workout_id is not None:
            print()
            print(
                "The test workout was left in the "
                "database for debugging:"
            )
            print(
                f"{BASE_URL}/api/v1/workouts/"
                f"{workout_id}/"
            )

        raise


if __name__ == "__main__":
    main()
