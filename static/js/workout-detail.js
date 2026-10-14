document.addEventListener("DOMContentLoaded", () => {
    const headerActions =
      document.querySelector(
          ".template-header-actions"
      );
    const app = document.getElementById("workout-detail-app");

    if (!app) {
        return;
    }

    if (!window.WorkoutReadTemplate) {
        console.error("WorkoutReadTemplate is not loaded.");
        return;
    }

    if (!window.WorkoutEditTemplate) {
        console.error("WorkoutEditTemplate is not loaded.");
        return;
    }

    const structure = document.getElementById("workout-detail-structure");
    const titleArea = document.getElementById("template-title-area");
    const editButton = document.getElementById("edit-workout-button");
    const startButton = document.getElementById("start-workout-button");
    const message = document.getElementById("detail-message");

    const workoutId = Number(app.dataset.workoutId);
    const detailUrl = app.dataset.detailUrl;
    const startUrl = app.dataset.startUrl;
    const catalogUrl = app.dataset.catalogUrl;
    const inProgressUrl = app.dataset.inProgressUrl;

    const API_BASE = "/api/v1";

    const state = {
        workout: null,
        editMode: false,
        addingExerciseToBlock: null,
        searchTimer: null,
        searchController: null,
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


    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatDateTime(value) {

        if (!value) {
            return "—";
        }


        return new Intl.DateTimeFormat(
            undefined,
            {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }
        ).format(
            new Date(value)
        );
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


    async function loadWorkout() {
        try {
            state.workout = await api(detailUrl);
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
        state.workout = await api(detailUrl);
        render();
    }


    function renderHeader() {

        if (!state.workout) {
            return;
        }


        const status =
            state.workout.status;


        const isTemplate =
            status === "template";


        const isEnded =
            status === "ended";


        // =============================================
        // TEMPLATE EDIT MODE
        // =============================================

        if (
            isTemplate
            && state.editMode
        ) {

            titleArea.innerHTML = `
                <div class="detail-name-edit">

                    <label>
                        Template name
                    </label>


                    <div class="detail-name-edit-row">

                        <input
                            type="text"

                            id="edit-template-name"

                            class="builder-input"

                            value="${escapeHtml(
                                state.workout.name
                            )}"
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

            return;
        }


        // =============================================
        // TEMPLATE READ MODE
        // =============================================

        if (isTemplate) {

            titleArea.innerHTML = `
                <span class="detail-template-label">
                    Template
                </span>
            `;

            return;
        }


        // =============================================
        // COMPLETED WORKOUT
        // =============================================

        if (isEnded) {

            titleArea.innerHTML = `
                <div class="completed-workout-heading">

                    <span class="detail-template-label">
                        Completed Workout
                    </span>


                    <div class="completed-workout-ended">

                        <span>
                            Ended
                        </span>

                        <strong>
                            ${escapeHtml(
                                formatDateTime(
                                    state.workout.ended_at
                                )
                            )}
                        </strong>

                    </div>

                </div>
            `;

            return;
        }


        // =============================================
        // FALLBACK
        // =============================================

        titleArea.innerHTML = `
            <span class="detail-template-label">
                Workout
            </span>
        `;
    }

    function render() {

        if (!state.workout) {
            return;
        }


        const isTemplate =
            state.workout.status
            === "template";


        if (!isTemplate) {

            state.editMode =
                false;


            state.addingExerciseToBlock =
                null;
        }


        renderHeader();


        /*
         * Цялата action зона няма смисъл
         * при completed workout.
         */
        headerActions.hidden =
            !isTemplate;


        editButton.hidden =
            !isTemplate;


        startButton.hidden =
            !isTemplate
            || state.editMode;


        if (isTemplate) {

            editButton.textContent =
                state.editMode
                    ? "Done"
                    : "Edit";
        }


        if (
            isTemplate
            && state.editMode
        ) {

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
            window.WorkoutReadTemplate.render(
                state.workout,
                {
                    showHeader: true,

                    wrapperClass:
                        "calendar-workout-detail",
                }
            );
    }

    editButton.addEventListener(
        "click",
        () => {
            if (
                !state.workout
                || state.workout.status !== "template"
            ) {
                return;
            }

            state.editMode = !state.editMode;
            state.addingExerciseToBlock = null;
            clearMessage();
            render();
        }
    );


    startButton.addEventListener(
        "click",
        async () => {
            if (!state.workout) {
                return;
            }

            clearMessage();
            startButton.disabled = true;
            startButton.textContent = "Starting...";

            try {
                await api(
                    startUrl,
                    jsonOptions(
                        "POST",
                        {}
                    )
                );

                window.location.href = inProgressUrl;
            }
            catch (error) {
                showMessage(
                    error.message,
                    "error"
                );

                startButton.disabled = false;
                startButton.textContent = "Start Workout";
            }
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
                        "edit-template-name"
                    );

                    const name = input.value.trim();

                    if (!name) {
                        showMessage(
                            "Template name is required.",
                            "error"
                        );

                        return;
                    }

                    await api(
                        detailUrl,
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
                        `${API_BASE}/workouts/${workoutId}/exercise-blocks/`,
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
        async (event) => {
            const element = event.target;

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
                    return;
                }


                if (
                    element.classList.contains(
                        "workout-edit-set-input"
                    )
                ) {
                    await saveSetInput(element);
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

            const exercises =
                Array.isArray(data)
                    ? data
                    : data.results ?? [];

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


    loadWorkout();

});
