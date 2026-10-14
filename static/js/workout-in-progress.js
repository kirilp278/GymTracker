document.addEventListener("DOMContentLoaded", () => {

    const app = document.getElementById("in-progress-app");

    if (!app) {
        return;
    }

    if (!window.WorkoutInProgressTemplate) {
        console.error("WorkoutInProgressTemplate is not loaded.");
        return;
    }

    if (!window.WorkoutEditTemplate) {
        console.error("WorkoutEditTemplate is not loaded.");
        return;
    }

    const activeContent = document.getElementById("active-workout-content");
    const emptyState = document.getElementById("no-active-workout");
    const structure = document.getElementById("in-progress-structure");
    const titleArea = document.getElementById("in-progress-title-area");
    const stopwatchElement = document.getElementById("workout-stopwatch");
    const editButton = document.getElementById("edit-workout-button");
    const endButton = document.getElementById("end-workout-button");
    const message = document.getElementById("in-progress-message");

    const listUrl = app.dataset.listUrl;
    const catalogUrl = app.dataset.catalogUrl;
    const workoutsUrl = app.dataset.workoutsUrl;

    const API_BASE = "/api/v1";

    const state = {
        workout: null,
        previousWorkout: null,
        editMode: false,
        addingExerciseToBlock: null,
        searchTimer: null,
        searchController: null,
        stopwatchInterval: null,
        pendingSetSaves: new Set(),
    };


    async function api(url, options = {}) {
        const config = {
            credentials: "same-origin",
            ...options,
        };

        const response = await fetch(
            url,
            config
        );

        let data = null;

        if (response.status !== 204) {
            try {
                data = await response.json();
            }
            catch {
                data = null;
            }
        }

        if (!response.ok) {
            throw new Error(
                formatApiError(data)
            );
        }

        return data;
    }


    function jsonOptions(method, payload) {
        return {
            method,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        };
    }


    function formatApiError(data) {
        if (!data) {
            return "Request failed.";
        }

        if (typeof data === "string") {
            return data;
        }

        if (data.detail) {
            return data.detail;
        }

        return JSON.stringify(data);
    }


    function getList(data) {
        if (Array.isArray(data)) {
            return data;
        }

        return data.results ?? [];
    }


    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function showMessage(text, type = "") {
        message.textContent = text;
        message.className = "detail-message";

        if (type) {
            message.classList.add(type);
        }
    }


    function clearMessage() {
        showMessage("");
    }


    function workoutDetailUrl(workoutId) {
        return `${API_BASE}/workouts/${workoutId}/`;
    }


    function workoutEndUrl(workoutId) {
        return `${API_BASE}/workouts/${workoutId}/end/`;
    }


    function getTemplateId(workout) {
        if (!workout || !workout.template) {
            return null;
        }

        if (
            typeof workout.template === "object"
            && workout.template.id
        ) {
            return Number(workout.template.id);
        }

        const templateId = Number(
            workout.template
        );

        return Number.isFinite(templateId)
            ? templateId
            : null;
    }


    async function loadPreviousWorkout() {
        state.previousWorkout = null;

        const templateId = getTemplateId(
            state.workout
        );

        if (!templateId) {
            return;
        }

        try {
            const url = new URL(
                listUrl,
                window.location.origin
            );

            url.searchParams.set(
                "status",
                "ended"
            );

            url.searchParams.set(
                "template",
                String(templateId)
            );

            url.searchParams.set(
                "ordering",
                "-id"
            );

            const data = await api(url);
            const instances = getList(data);
            const latestInstance = instances[0];

            if (!latestInstance) {
                return;
            }

            state.previousWorkout = await api(
                workoutDetailUrl(
                    latestInstance.id
                )
            );
        }
        catch (error) {
            /*
             * Previous values are only a convenience.
             * A failed history request must never block
             * the active workout page.
             */
            console.warn(
                "Could not load previous workout:",
                error
            );

            state.previousWorkout = null;
        }
    }


    async function initialize() {
        try {
            const url = new URL(
                listUrl,
                window.location.origin
            );

            url.searchParams.set(
                "status",
                "in_progress"
            );

            const data = await api(url);
            const workouts = getList(data);

            if (workouts.length === 0) {
                showNoActiveWorkout();
                return;
            }

            state.workout = await api(
                workoutDetailUrl(
                    workouts[0].id
                )
            );

            await loadPreviousWorkout();

            showActiveWorkout();
            startStopwatch();
            render();
        }
        catch (error) {
            console.error(error);
            showMessage(
                error.message,
                "error"
            );
        }
    }


    async function reloadWorkout() {
        if (!state.workout) {
            return;
        }

        state.workout = await api(
            workoutDetailUrl(
                state.workout.id
            )
        );

        render();
    }


    function showNoActiveWorkout() {
        activeContent.hidden = true;
        emptyState.hidden = false;
        endButton.hidden = true;
        stopStopwatch();
    }


    function showActiveWorkout() {
        emptyState.hidden = true;
        activeContent.hidden = false;
        endButton.hidden = false;
    }


    function startStopwatch() {
        stopStopwatch();
        updateStopwatch();

        state.stopwatchInterval = setInterval(
            updateStopwatch,
            1000
        );
    }


    function stopStopwatch() {
        if (state.stopwatchInterval) {
            clearInterval(
                state.stopwatchInterval
            );

            state.stopwatchInterval = null;
        }
    }


    function updateStopwatch() {
        if (
            !state.workout
            || !state.workout.started_at
        ) {
            stopwatchElement.textContent = "00:00:00";
            return;
        }

        const startedAt = new Date(
            state.workout.started_at
        );

        const elapsed = Math.max(
            0,
            Date.now() - startedAt.getTime()
        );

        stopwatchElement.textContent = formatDuration(
            elapsed
        );
    }


    function formatDuration(milliseconds) {
        const totalSeconds = Math.floor(
            milliseconds / 1000
        );

        const hours = Math.floor(
            totalSeconds / 3600
        );

        const minutes = Math.floor(
            (totalSeconds % 3600) / 60
        );

        const seconds = totalSeconds % 60;

        return (
            String(hours).padStart(2, "0")
            + ":"
            + String(minutes).padStart(2, "0")
            + ":"
            + String(seconds).padStart(2, "0")
        );
    }


    function getWorkoutDuration(workout) {
        if (
            !workout.started_at
            || !workout.ended_at
        ) {
            return "00:00:00";
        }

        const started = new Date(
            workout.started_at
        );

        const ended = new Date(
            workout.ended_at
        );

        return formatDuration(
            Math.max(
                0,
                ended.getTime() - started.getTime()
            )
        );
    }


    function renderTitle() {
        if (!state.workout) {
            return;
        }

        if (!state.editMode) {
            titleArea.innerHTML = `
                <span class="in-progress-status">
                    In Progress
                </span>

                <h1>
                    ${escapeHtml(state.workout.name)}
                </h1>
            `;

            return;
        }

        titleArea.innerHTML = `
            <div class="detail-name-edit">
                <label>
                    Workout name
                </label>

                <div class="detail-name-edit-row">
                    <input
                        type="text"
                        id="edit-workout-name"
                        class="builder-input"
                        value="${escapeHtml(state.workout.name)}"
                    >

                    <button
                        type="button"
                        class="secondary-button"
                        data-action="save-name"
                    >
                        Save name
                    </button>
                </div>
            </div>
        `;
    }


    function render() {
        if (!state.workout) {
            return;
        }

        renderTitle();

        editButton.textContent = state.editMode
            ? "Done Editing"
            : "Edit";

        if (state.editMode) {
            structure.innerHTML =
                window.WorkoutEditTemplate.render(
                    state.workout,
                    {
                        addingExerciseToBlock:
                            state.addingExerciseToBlock,
                    }
                );

            return;
        }

        structure.innerHTML =
            window.WorkoutInProgressTemplate.render(
                state.workout,
                {
                    previousWorkout:
                        state.previousWorkout,
                }
            );
    }


    editButton.addEventListener(
        "click",
        () => {
            state.editMode = !state.editMode;
            state.addingExerciseToBlock = null;
            clearMessage();
            render();
        }
    );


    app.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest(
                "button[data-action]"
            );

            if (!button) {
                return;
            }

            const action = button.dataset.action;

            try {
                if (action === "save-name") {
                    const input = document.getElementById(
                        "edit-workout-name"
                    );

                    const name = input.value.trim();

                    if (!name) {
                        showMessage(
                            "Workout name is required.",
                            "error"
                        );

                        return;
                    }

                    await api(
                        workoutDetailUrl(
                            state.workout.id
                        ),
                        jsonOptions(
                            "PATCH",
                            { name }
                        )
                    );

                    await reloadWorkout();

                    showMessage(
                        "Name updated.",
                        "success"
                    );

                    return;
                }


                if (action === "add-block") {
                    const nextOrder =
                        state.workout.exercise_blocks.length + 1;

                    await api(
                        `${API_BASE}/workouts/${state.workout.id}/exercise-blocks/`,
                        jsonOptions(
                            "POST",
                            {
                                order: nextOrder,
                                super_set: false,
                            }
                        )
                    );

                    await reloadWorkout();
                    return;
                }


                if (action === "show-add-exercise") {
                    state.addingExerciseToBlock = Number(
                        button.dataset.id
                    );

                    render();
                    return;
                }


                if (action === "cancel-add-exercise") {
                    state.addingExerciseToBlock = null;
                    render();
                    return;
                }


                if (action === "add-set-block") {
                    const exerciseId = Number(
                        button.dataset.id
                    );

                    await api(
                        `${API_BASE}/exercises/${exerciseId}/set-blocks/`,
                        jsonOptions(
                            "POST",
                            {
                                order_in_exercise: Number(
                                    button.dataset.nextOrder
                                ),
                                drop_down: false,
                            }
                        )
                    );

                    await reloadWorkout();
                    return;
                }


                if (action === "add-set") {
                    const setBlockId = Number(
                        button.dataset.id
                    );

                    await api(
                        `${API_BASE}/set-blocks/${setBlockId}/sets/`,
                        jsonOptions(
                            "POST",
                            {
                                order_in_set_block: Number(
                                    button.dataset.nextOrder
                                ),
                                reps: null,
                                weight: null,
                            }
                        )
                    );

                    await reloadWorkout();
                    return;
                }


                const deleteMap = {
                    "delete-block": "exercise-blocks",
                    "delete-exercise": "exercises",
                    "delete-set-block": "set-blocks",
                    "delete-set": "sets",
                };

                if (deleteMap[action]) {
                    if (
                        !window.confirm(
                            "Delete this item?"
                        )
                    ) {
                        return;
                    }

                    await api(
                        `${API_BASE}/${deleteMap[action]}/${button.dataset.id}/`,
                        {
                            method: "DELETE",
                        }
                    );

                    await reloadWorkout();
                    return;
                }


                const moveConfig = {
                    "move-block": {
                        endpoint: "exercise-blocks",
                        field: "order",
                    },
                    "move-exercise": {
                        endpoint: "exercises",
                        field: "order_in_block",
                    },
                    "move-set-block": {
                        endpoint: "set-blocks",
                        field: "order_in_exercise",
                    },
                    "move-set": {
                        endpoint: "sets",
                        field: "order_in_set_block",
                    },
                };

                if (moveConfig[action]) {
                    const config = moveConfig[action];

                    const newOrder =
                        Number(button.dataset.order)
                        + Number(button.dataset.direction);

                    await api(
                        `${API_BASE}/${config.endpoint}/${button.dataset.id}/`,
                        jsonOptions(
                            "PATCH",
                            {
                                [config.field]: newOrder,
                            }
                        )
                    );

                    await reloadWorkout();
                    return;
                }


                if (action === "confirm-add-exercise") {
                    const blockId = Number(
                        button.dataset.blockId
                    );

                    const block = state.workout.exercise_blocks.find(
                        (item) => item.id === blockId
                    );

                    if (!block) {
                        return;
                    }

                    await api(
                        `${API_BASE}/exercise-blocks/${blockId}/exercises/`,
                        jsonOptions(
                            "POST",
                            {
                                exercise_name: Number(
                                    button.dataset.catalogId
                                ),
                                order_in_block:
                                    block.exercises.length + 1,
                            }
                        )
                    );

                    state.addingExerciseToBlock = null;
                    await reloadWorkout();
                    return;
                }


                if (action === "replace-exercise") {
                    const exerciseId = Number(
                        button.dataset.exerciseId
                    );

                    await api(
                        `${API_BASE}/exercises/${exerciseId}/`,
                        jsonOptions(
                            "PATCH",
                            {
                                exercise_name: Number(
                                    button.dataset.catalogId
                                ),
                            }
                        )
                    );

                    await reloadWorkout();
                }
            }
            catch (error) {
                console.error(error);

                showMessage(
                    error.message,
                    "error"
                );
            }
        }
    );


    app.addEventListener(
        "change",
        (event) => {
            const element = event.target;

            if (
                element.classList.contains(
                    "in-progress-set-input"
                )
                || element.classList.contains(
                    "workout-edit-set-input"
                )
            ) {
                trackSetSave(element);
                return;
            }

            handleStructuralChange(element);
        }
    );


    async function handleStructuralChange(element) {
        try {
            if (
                element.dataset.action
                === "toggle-superset"
            ) {
                const blockId = Number(
                    element.dataset.id
                );

                const block = state.workout.exercise_blocks.find(
                    (item) => item.id === blockId
                );

                if (
                    !element.checked
                    && block
                    && block.exercises.length > 1
                ) {
                    showMessage(
                        "Remove the extra exercises before disabling Superset.",
                        "error"
                    );

                    render();
                    return;
                }

                await api(
                    `${API_BASE}/exercise-blocks/${blockId}/`,
                    jsonOptions(
                        "PATCH",
                        {
                            super_set: element.checked,
                        }
                    )
                );

                await reloadWorkout();
                return;
            }


            if (
                element.dataset.action
                === "toggle-dropset"
            ) {
                const setBlockId = Number(
                    element.dataset.id
                );

                const target = findSetBlock(
                    setBlockId
                );

                if (
                    !element.checked
                    && target
                    && target.sets.length > 1
                ) {
                    showMessage(
                        "Remove the extra sets before disabling Drop set.",
                        "error"
                    );

                    render();
                    return;
                }

                await api(
                    `${API_BASE}/set-blocks/${setBlockId}/`,
                    jsonOptions(
                        "PATCH",
                        {
                            drop_down: element.checked,
                        }
                    )
                );

                await reloadWorkout();
            }
        }
        catch (error) {
            console.error(error);

            showMessage(
                error.message,
                "error"
            );
        }
    }


    function findSetBlock(setBlockId) {
        for (
            const block
            of state.workout.exercise_blocks
        ) {
            for (
                const exercise
                of block.exercises
            ) {
                const setBlock = exercise.set_blocks.find(
                    (item) => item.id === setBlockId
                );

                if (setBlock) {
                    return setBlock;
                }
            }
        }

        return null;
    }


    function findSet(setId) {
        for (
            const block
            of state.workout.exercise_blocks
        ) {
            for (
                const exercise
                of block.exercises
            ) {
                for (
                    const setBlock
                    of exercise.set_blocks
                ) {
                    const set = setBlock.sets.find(
                        (item) => item.id === setId
                    );

                    if (set) {
                        return set;
                    }
                }
            }
        }

        return null;
    }


    function trackSetSave(input) {
        const promise = saveSetInput(input)
            .catch(
                (error) => {
                    console.error(error);

                    showMessage(
                        error.message,
                        "error"
                    );
                }
            )
            .finally(
                () => {
                    state.pendingSetSaves.delete(promise);
                }
            );

        state.pendingSetSaves.add(promise);
    }


    async function saveSetInput(input) {
        clearMessage();

        const setId = Number(input.dataset.id);
        const field = input.dataset.field;
        const rawValue = input.value.trim();

        let value =
            rawValue === ""
                ? null
                : rawValue;

        if (
            field === "reps"
            && value !== null
        ) {
            if (!/^\d+$/.test(value)) {
                throw new Error(
                    "Reps must be a whole number."
                );
            }

            value = Number(value);
        }

        if (
            field === "weight"
            && value !== null
        ) {
            if (!/^\d+(\.\d{1,2})?$/.test(value)) {
                throw new Error(
                    "Weight must be a valid number."
                );
            }
        }

        const updated = await api(
            `${API_BASE}/sets/${setId}/`,
            jsonOptions(
                "PATCH",
                {
                    [field]: value,
                }
            )
        );

        const localSet = findSet(setId);

        if (localSet) {
            localSet[field] = updated[field];
        }
    }


    app.addEventListener(
        "input",
        (event) => {
            const input = event.target;

            if (
                !input.classList.contains(
                    "workout-edit-exercise-search"
                )
            ) {
                return;
            }

            clearTimeout(state.searchTimer);

            state.searchTimer = setTimeout(
                () => {
                    searchExercises(input);
                },
                250
            );
        }
    );


    app.addEventListener(
        "focusin",
        (event) => {
            const input = event.target;

            if (
                input.classList.contains(
                    "workout-edit-exercise-search"
                )
            ) {
                searchExercises(input);
            }
        }
    );


    async function searchExercises(input) {
        if (state.searchController) {
            state.searchController.abort();
        }

        const controller = new AbortController();
        state.searchController = controller;

        const url = new URL(
            catalogUrl,
            window.location.origin
        );

        const query = input.value.trim();

        if (query) {
            url.searchParams.set(
                "search",
                query
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
            const exercises = getList(data);

            const dropdown = input
                .closest(
                    ".combobox-wrapper"
                )
                .querySelector(
                    ".exercise-dropdown"
                );

            dropdown.innerHTML = "";

            if (exercises.length === 0) {
                dropdown.innerHTML = `
                    <div class="exercise-no-results">
                        No exercises found
                    </div>
                `;

                return;
            }

            const mode = input.dataset.searchMode;

            exercises
                .slice(0, 10)
                .forEach(
                    (exercise) => {
                        const button = document.createElement(
                            "button"
                        );

                        button.type = "button";
                        button.className = "exercise-dropdown-item";
                        button.dataset.catalogId = exercise.id;

                        if (mode === "add") {
                            button.dataset.action = "confirm-add-exercise";
                            button.dataset.blockId = input.dataset.blockId;
                        }
                        else {
                            button.dataset.action = "replace-exercise";
                            button.dataset.exerciseId = input.dataset.exerciseId;
                        }

                        const name = document.createElement(
                            "span"
                        );

                        name.className = "exercise-dropdown-name";
                        name.textContent = exercise.name;

                        const muscle = document.createElement(
                            "span"
                        );

                        muscle.className = "exercise-dropdown-muscle";
                        muscle.textContent = exercise.muscle_group;

                        button.append(
                            name,
                            muscle
                        );

                        dropdown.appendChild(button);
                    }
                );
        }
        catch (error) {
            if (error.name !== "AbortError") {
                console.error(error);
            }
        }
    }


    document.addEventListener(
        "click",
        (event) => {
            if (
                event.target.closest(
                    ".combobox-wrapper"
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
        }
    );


    endButton.addEventListener(
        "click",
        async () => {
            if (!state.workout) {
                return;
            }

            if (
                document.activeElement
                instanceof HTMLElement
            ) {
                document.activeElement.blur();
            }

            await Promise.resolve();

            if (state.pendingSetSaves.size > 0) {
                await Promise.all(
                    Array.from(
                        state.pendingSetSaves
                    )
                );
            }

            const confirmed = window.confirm(
                "End this workout?"
            );

            if (!confirmed) {
                return;
            }

            clearMessage();
            endButton.disabled = true;
            endButton.textContent = "Ending...";

            try {
                const endedWorkout = await api(
                    workoutEndUrl(
                        state.workout.id
                    ),
                    jsonOptions(
                        "POST",
                        {}
                    )
                );

                stopStopwatch();

                sessionStorage.setItem(
                    "completedWorkout",
                    JSON.stringify(
                        {
                            name: endedWorkout.name,
                            duration: getWorkoutDuration(
                                endedWorkout
                            ),
                        }
                    )
                );

                window.location.href = workoutsUrl;
            }
            catch (error) {
                console.error(error);

                showMessage(
                    error.message,
                    "error"
                );

                endButton.disabled = false;
                endButton.textContent = "End Workout";
            }
        }
    );


    initialize();

});
