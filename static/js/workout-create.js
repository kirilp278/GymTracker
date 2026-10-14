document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("workout-form");

    if (!form) {
        return;
    }

    if (!window.WorkoutCreateTemplate) {
        console.error("WorkoutCreateTemplate is not loaded.");
        return;
    }

    const nameInput = document.getElementById("workout-name");
    const blocksContainer = document.getElementById("exercise-blocks");
    const submitButton = document.getElementById("create-workout-button");
    const errorElement = document.getElementById("workout-error");

    const CREATE_URL = form.dataset.createUrl;
    const CATALOG_URL = form.dataset.catalogUrl;
    const SUCCESS_URL = form.dataset.successUrl;

    const submitButtonDefaultText = submitButton.textContent.trim();

    const workout = {
        name: "",
        exercise_blocks: [],
    };

    const searchTimers = new Map();
    const searchControllers = new Map();


    function createSet(order) {
        return {
            order_in_set_block: order,
            reps: null,
            weight: null,
        };
    }


    function createSetBlock(order) {
        return {
            order_in_exercise: order,
            drop_down: false,
            sets: [
                createSet(1),
            ],
        };
    }


    function createExercise(order) {
        return {
            exercise_name: null,
            _exercise_label: "",
            _search_query: "",
            order_in_block: order,
            set_blocks: [
                createSetBlock(1),
            ],
        };
    }


    function createExerciseBlock(order) {
        return {
            order,
            super_set: false,
            exercises: [],
        };
    }


    function reindexWorkout() {
        workout.exercise_blocks.forEach(
            (block, blockIndex) => {
                block.order = blockIndex + 1;

                block.exercises.forEach(
                    (exercise, exerciseIndex) => {
                        exercise.order_in_block = exerciseIndex + 1;

                        exercise.set_blocks.forEach(
                            (setBlock, setBlockIndex) => {
                                setBlock.order_in_exercise = setBlockIndex + 1;

                                setBlock.sets.forEach(
                                    (set, setIndex) => {
                                        set.order_in_set_block = setIndex + 1;
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }


    function render() {
        reindexWorkout();

        blocksContainer.innerHTML =
            window.WorkoutCreateTemplate.render(workout);
    }


    function getBlock(element) {
        return workout.exercise_blocks[
            Number(element.dataset.block)
        ];
    }


    function getExercise(element) {
        const block = getBlock(element);

        return block.exercises[
            Number(element.dataset.exercise)
        ];
    }


    function getSetBlock(element) {
        const exercise = getExercise(element);

        return exercise.set_blocks[
            Number(element.dataset.setBlock)
        ];
    }


    function getSet(element) {
        const setBlock = getSetBlock(element);

        return setBlock.sets[
            Number(element.dataset.set)
        ];
    }


    blocksContainer.addEventListener(
        "click",
        (event) => {
            const button = event.target.closest(
                "button[data-action]"
            );

            if (!button) {
                return;
            }

            const action = button.dataset.action;


            if (action === "add-block") {
                workout.exercise_blocks.push(
                    createExerciseBlock(
                        workout.exercise_blocks.length + 1
                    )
                );

                render();
                return;
            }


            if (action === "add-exercise") {
                const block = getBlock(button);

                if (
                    !block.super_set
                    && block.exercises.length >= 1
                ) {
                    return;
                }

                block.exercises.push(
                    createExercise(
                        block.exercises.length + 1
                    )
                );

                render();
                return;
            }


            if (action === "remove-block") {
                workout.exercise_blocks.splice(
                    Number(button.dataset.block),
                    1
                );

                render();
                return;
            }


            if (action === "remove-exercise") {
                const block = getBlock(button);

                block.exercises.splice(
                    Number(button.dataset.exercise),
                    1
                );

                render();
                return;
            }


            if (action === "add-set-block") {
                const exercise = getExercise(button);

                exercise.set_blocks.push(
                    createSetBlock(
                        exercise.set_blocks.length + 1
                    )
                );

                render();
                return;
            }


            if (action === "remove-set-block") {
                const exercise = getExercise(button);

                exercise.set_blocks.splice(
                    Number(button.dataset.setBlock),
                    1
                );

                render();
                return;
            }


            if (action === "add-set") {
                const setBlock = getSetBlock(button);

                if (
                    !setBlock.drop_down
                    && setBlock.sets.length >= 1
                ) {
                    return;
                }

                setBlock.sets.push(
                    createSet(
                        setBlock.sets.length + 1
                    )
                );

                render();
                return;
            }


            if (action === "remove-set") {
                const setBlock = getSetBlock(button);

                setBlock.sets.splice(
                    Number(button.dataset.set),
                    1
                );

                render();
                return;
            }


            if (action === "select-exercise") {
                const exercise = getExercise(button);
                const exerciseName = button.dataset.exerciseName;

                exercise.exercise_name = Number(
                    button.dataset.exerciseId
                );

                exercise._exercise_label = exerciseName;
                exercise._search_query = exerciseName;

                const input = document.querySelector(
                    `.exercise-search-input[data-block="${button.dataset.block}"][data-exercise="${button.dataset.exercise}"]`
                );

                if (input) {
                    input.value = exerciseName;
                    input.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }

                const dropdown = document.querySelector(
                    `[data-dropdown-block="${button.dataset.block}"][data-dropdown-exercise="${button.dataset.exercise}"]`
                );

                if (dropdown) {
                    dropdown.innerHTML = "";
                }
            }
        }
    );


    blocksContainer.addEventListener(
        "change",
        (event) => {
            const element = event.target;


            if (
                element.dataset.action
                === "toggle-superset"
            ) {
                const block = getBlock(element);

                if (
                    !element.checked
                    && block.exercises.length > 1
                ) {
                    alert(
                        "Remove the extra exercises before disabling Superset."
                    );

                    element.checked = true;
                    return;
                }

                block.super_set = element.checked;
                render();
                return;
            }


            if (
                element.dataset.action
                === "toggle-dropset"
            ) {
                const setBlock = getSetBlock(element);

                if (
                    !element.checked
                    && setBlock.sets.length > 1
                ) {
                    alert(
                        "Remove the extra sets before disabling Drop set."
                    );

                    element.checked = true;
                    return;
                }

                setBlock.drop_down = element.checked;
                render();
            }
        }
    );


    blocksContainer.addEventListener(
        "input",
        (event) => {
            const element = event.target;


            if (element.dataset.field === "weight") {
                const set = getSet(element);

                set.weight =
                    element.value === ""
                        ? null
                        : element.value;

                return;
            }


            if (element.dataset.field === "reps") {
                const set = getSet(element);

                set.reps =
                    element.value === ""
                        ? null
                        : element.value;

                return;
            }


            if (
                element.classList.contains(
                    "exercise-search-input"
                )
            ) {
                const blockIndex = Number(
                    element.dataset.block
                );

                const exerciseIndex = Number(
                    element.dataset.exercise
                );

                const exercise =
                    workout.exercise_blocks[
                        blockIndex
                    ].exercises[
                        exerciseIndex
                    ];

                exercise.exercise_name = null;
                exercise._exercise_label = "";
                exercise._search_query = element.value;

                element.setAttribute(
                    "aria-expanded",
                    "true"
                );

                scheduleExerciseSearch(
                    element.value,
                    blockIndex,
                    exerciseIndex
                );
            }
        }
    );


    blocksContainer.addEventListener(
        "focusin",
        (event) => {
            const input = event.target;

            if (
                !input.classList.contains(
                    "exercise-search-input"
                )
            ) {
                return;
            }

            input.setAttribute(
                "aria-expanded",
                "true"
            );

            loadExerciseOptions(
                input.value,
                Number(input.dataset.block),
                Number(input.dataset.exercise)
            );
        }
    );


    function scheduleExerciseSearch(
        query,
        blockIndex,
        exerciseIndex
    ) {
        const key = `${blockIndex}:${exerciseIndex}`;
        const oldTimer = searchTimers.get(key);

        if (oldTimer) {
            clearTimeout(oldTimer);
        }

        const timer = setTimeout(
            () => {
                loadExerciseOptions(
                    query,
                    blockIndex,
                    exerciseIndex
                );
            },
            250
        );

        searchTimers.set(key, timer);
    }


    async function loadExerciseOptions(
        query,
        blockIndex,
        exerciseIndex
    ) {
        const key = `${blockIndex}:${exerciseIndex}`;
        const oldController = searchControllers.get(key);

        if (oldController) {
            oldController.abort();
        }

        const controller = new AbortController();
        searchControllers.set(key, controller);

        const url = new URL(
            CATALOG_URL,
            window.location.origin
        );

        if (query.trim()) {
            url.searchParams.set(
                "search",
                query.trim()
            );
        }

        url.searchParams.set(
            "ordering",
            "name"
        );

        try {
            const response = await fetch(
                url,
                {
                    credentials: "same-origin",
                    signal: controller.signal,
                }
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();

            const exercises =
                Array.isArray(data)
                    ? data
                    : data.results ?? [];

            const dropdown = document.querySelector(
                `[data-dropdown-block="${blockIndex}"][data-dropdown-exercise="${exerciseIndex}"]`
            );

            if (!dropdown) {
                return;
            }

            dropdown.innerHTML = "";

            if (exercises.length === 0) {
                dropdown.innerHTML = `
                    <div class="exercise-no-results">
                        No exercises found
                    </div>
                `;

                return;
            }

            exercises
                .slice(0, 10)
                .forEach(
                    (exercise) => {
                        const button = document.createElement(
                            "button"
                        );

                        button.type = "button";
                        button.className = "exercise-dropdown-item";
                        button.dataset.action = "select-exercise";
                        button.dataset.block = blockIndex;
                        button.dataset.exercise = exerciseIndex;
                        button.dataset.exerciseId = exercise.id;
                        button.dataset.exerciseName = exercise.name;

                        const name = document.createElement(
                            "span"
                        );

                        name.className = "exercise-dropdown-name";
                        name.textContent = exercise.name;

                        const muscleGroup = document.createElement(
                            "span"
                        );

                        muscleGroup.className = "exercise-dropdown-muscle";
                        muscleGroup.textContent = exercise.muscle_group;

                        button.append(
                            name,
                            muscleGroup
                        );

                        dropdown.appendChild(button);
                    }
                );

        }
        catch (error) {
            if (error.name !== "AbortError") {
                console.error(
                    "Exercise search failed:",
                    error
                );
            }
        }
    }


    document.addEventListener(
        "click",
        (event) => {
            if (
                event.target.closest(
                    ".exercise-combobox"
                )
            ) {
                return;
            }

            document
                .querySelectorAll(
                    ".exercise-dropdown"
                )
                .forEach(
                    (dropdown) => {
                        dropdown.innerHTML = "";
                    }
                );

            document
                .querySelectorAll(
                    ".exercise-search-input"
                )
                .forEach(
                    (input) => {
                        input.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                );
        }
    );


    nameInput.addEventListener(
        "input",
        () => {
            workout.name = nameInput.value;
        }
    );


    function isValidWeight(value) {
        return /^\d+(\.\d{1,2})?$/.test(
            String(value).trim()
        );
    }


    function isValidReps(value) {
        return /^\d+$/.test(
            String(value).trim()
        );
    }


    function validateWorkout() {
        if (!workout.name.trim()) {
            return "Workout name is required.";
        }

        if (workout.exercise_blocks.length === 0) {
            return "Add at least one exercise block.";
        }

        for (const block of workout.exercise_blocks) {
            if (block.exercises.length === 0) {
                return `Block ${block.order} must contain an exercise.`;
            }

            if (
                block.super_set
                && block.exercises.length < 2
            ) {
                return (
                    `Block ${block.order} is marked as a superset `
                    + "but contains fewer than two exercises."
                );
            }

            if (
                !block.super_set
                && block.exercises.length !== 1
            ) {
                return (
                    `Block ${block.order} must contain exactly one `
                    + "exercise when Superset is disabled."
                );
            }

            for (const exercise of block.exercises) {
                if (!exercise.exercise_name) {
                    return `Select an exercise in block ${block.order}.`;
                }

                if (exercise.set_blocks.length === 0) {
                    return "Every exercise must contain at least one Set Block.";
                }

                for (const setBlock of exercise.set_blocks) {
                    if (setBlock.sets.length === 0) {
                        return "Every Set Block must contain at least one Set.";
                    }

                    if (
                        setBlock.drop_down
                        && setBlock.sets.length < 2
                    ) {
                        return "A Drop Set must contain at least two Sets.";
                    }

                    if (
                        !setBlock.drop_down
                        && setBlock.sets.length !== 1
                    ) {
                        return "A normal Set Block must contain exactly one Set.";
                    }

                    for (const set of setBlock.sets) {
                        if (
                            set.weight !== null
                            && set.weight !== ""
                            && !isValidWeight(set.weight)
                        ) {
                            return "Weight must be a valid positive number.";
                        }

                        if (
                            set.reps !== null
                            && set.reps !== ""
                            && !isValidReps(set.reps)
                        ) {
                            return "Reps must be a whole positive number.";
                        }
                    }
                }
            }
        }

        return null;
    }


    function buildPayload() {
        return {
            name: workout.name.trim(),

            exercise_blocks: workout.exercise_blocks.map(
                (block) => ({
                    order: block.order,
                    super_set: block.super_set,

                    exercises: block.exercises.map(
                        (exercise) => ({
                            exercise_name: exercise.exercise_name,
                            order_in_block: exercise.order_in_block,

                            set_blocks: exercise.set_blocks.map(
                                (setBlock) => ({
                                    order_in_exercise: setBlock.order_in_exercise,
                                    drop_down: setBlock.drop_down,

                                    sets: setBlock.sets.map(
                                        (set) => ({
                                            order_in_set_block:
                                                set.order_in_set_block,

                                            weight:
                                                set.weight === null
                                                || set.weight === ""
                                                    ? null
                                                    : String(set.weight).trim(),

                                            reps:
                                                set.reps === null
                                                || set.reps === ""
                                                    ? null
                                                    : Number(set.reps),
                                        })
                                    ),
                                })
                            ),
                        })
                    ),
                })
            ),
        };
    }


    function formatApiError(data) {
        if (!data) {
            return "Workout creation failed.";
        }

        if (data.detail) {
            return data.detail;
        }

        if (typeof data === "string") {
            return data;
        }

        return JSON.stringify(data);
    }


    form.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();

            errorElement.textContent = "";
            reindexWorkout();

            const validationError = validateWorkout();

            if (validationError) {
                errorElement.textContent = validationError;
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = "Creating...";

            try {
                const response = await fetch(
                    CREATE_URL,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        credentials: "same-origin",
                        body: JSON.stringify(
                            buildPayload()
                        ),
                    }
                );

                let data = null;

                try {
                    data = await response.json();
                }
                catch {
                    data = null;
                }

                if (!response.ok) {
                    errorElement.textContent = formatApiError(data);
                    return;
                }

                window.location.href = SUCCESS_URL;
            }
            catch (error) {
                console.error(error);
                errorElement.textContent = "Could not connect to the server.";
            }
            finally {
                submitButton.disabled = false;
                submitButton.textContent = submitButtonDefaultText;
            }
        }
    );


    render();

});
