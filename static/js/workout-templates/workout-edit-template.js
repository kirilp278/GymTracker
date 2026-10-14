(function () {

    "use strict";


    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }


    function getExerciseName(exercise) {
        const catalogExercise = exercise.exercise_name;

        if (
            catalogExercise
            && typeof catalogExercise === "object"
        ) {
            return catalogExercise.name ?? "Exercise";
        }

        return `Exercise ${catalogExercise ?? ""}`.trim();
    }


    function renderMoveControls(action, id, order, count) {
        return `
            <div class="reorder-controls">
                <button
                    type="button"
                    class="reorder-button"
                    data-action="${action}"
                    data-id="${id}"
                    data-order="${order}"
                    data-direction="-1"
                    ${order <= 1 ? "disabled" : ""}
                >
                    ↑
                </button>

                <button
                    type="button"
                    class="reorder-button"
                    data-action="${action}"
                    data-id="${id}"
                    data-order="${order}"
                    data-direction="1"
                    ${order >= count ? "disabled" : ""}
                >
                    ↓
                </button>
            </div>
        `;
    }


    function renderSet(set, index, count) {
        return `
            <div class="set-row-compact">
                <span class="set-number">
                    Set ${set.order_in_set_block}
                </span>

                <div class="set-value-expression">
                    <input
                        type="text"
                        inputmode="decimal"
                        class="builder-input set-value-input workout-edit-set-input"
                        placeholder="Weight"
                        value="${escapeHtml(set.weight ?? "")}"
                        data-field="weight"
                        data-id="${set.id}"
                    >

                    <span class="set-times">×</span>

                    <input
                        type="text"
                        inputmode="numeric"
                        class="builder-input set-value-input workout-edit-set-input"
                        placeholder="Reps"
                        value="${escapeHtml(set.reps ?? "")}"
                        data-field="reps"
                        data-id="${set.id}"
                    >
                </div>

                <div class="detail-set-actions">
                    ${renderMoveControls(
                        "move-set",
                        set.id,
                        set.order_in_set_block,
                        count
                    )}

                    <button
                        type="button"
                        class="remove-x-button remove-set-button"
                        data-action="delete-set"
                        data-id="${set.id}"
                        aria-label="Delete set"
                    >
                        ×
                    </button>
                </div>
            </div>
        `;
    }


    function renderSetBlock(setBlock, index, count) {
        const sets = setBlock.sets ?? [];
        const canAddSet = setBlock.drop_down || sets.length === 0;

        return `
            <section class="hierarchy-set-block">
                <div class="component-header">
                    <div class="component-title">
                        <span class="component-number component-number-small">
                            ${setBlock.order_in_exercise}
                        </span>

                        <div>
                            <span class="component-label">
                                Set Block
                            </span>

                            <span class="component-description">
                                ${setBlock.drop_down ? "Drop set" : "Standard set"}
                            </span>
                        </div>
                    </div>

                    <div class="detail-component-actions">
                        ${renderMoveControls(
                            "move-set-block",
                            setBlock.id,
                            setBlock.order_in_exercise,
                            count
                        )}

                        <button
                            type="button"
                            class="remove-x-button"
                            data-action="delete-set-block"
                            data-id="${setBlock.id}"
                            aria-label="Delete set block"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div class="set-block-options">
                    <label class="toggle-field">
                        <input
                            type="checkbox"
                            data-action="toggle-dropset"
                            data-id="${setBlock.id}"
                            ${setBlock.drop_down ? "checked" : ""}
                        >

                        <span class="toggle-control"></span>

                        <span class="toggle-text">
                            Drop set
                        </span>
                    </label>
                </div>

                <div class="sets-list">
                    ${sets
                        .map(
                            (set, setIndex) => renderSet(
                                set,
                                setIndex,
                                sets.length
                            )
                        )
                        .join("")}
                </div>

                ${canAddSet
                    ? `
                        <button
                            type="button"
                            class="secondary-button add-child-button compact-add-button"
                            data-action="add-set"
                            data-id="${setBlock.id}"
                            data-next-order="${sets.length + 1}"
                        >
                            + Add Set
                        </button>
                    `
                    : ""}
            </section>
        `;
    }


    function renderExercise(exercise, index, count) {
        const setBlocks = exercise.set_blocks ?? [];
        const exerciseName = getExerciseName(exercise);

        return `
            <article class="hierarchy-exercise">
                <div class="component-header">
                    <div class="component-title">
                        <span class="component-number component-number-small">
                            ${exercise.order_in_block}
                        </span>

                        <div>
                            <span class="component-label">
                                Exercise
                            </span>

                            <span class="component-description">
                                ${escapeHtml(exerciseName)}
                            </span>
                        </div>
                    </div>

                    <div class="detail-component-actions">
                        ${renderMoveControls(
                            "move-exercise",
                            exercise.id,
                            exercise.order_in_block,
                            count
                        )}

                        <button
                            type="button"
                            class="remove-x-button"
                            data-action="delete-exercise"
                            data-id="${exercise.id}"
                            aria-label="Delete exercise"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div class="exercise-combobox">
                    <label class="field-label">
                        Exercise
                    </label>

                    <div class="combobox-wrapper">
                        <input
                            type="search"
                            class="builder-input workout-edit-exercise-search"
                            value="${escapeHtml(exerciseName)}"
                            autocomplete="off"
                            data-search-mode="replace"
                            data-exercise-id="${exercise.id}"
                        >

                        <div class="exercise-dropdown"></div>
                    </div>
                </div>

                <div class="exercise-set-blocks">
                    ${setBlocks
                        .map(
                            (setBlock, setBlockIndex) => renderSetBlock(
                                setBlock,
                                setBlockIndex,
                                setBlocks.length
                            )
                        )
                        .join("")}
                </div>

                <button
                    type="button"
                    class="secondary-button add-child-button"
                    data-action="add-set-block"
                    data-id="${exercise.id}"
                    data-next-order="${setBlocks.length + 1}"
                >
                    + Add Set Block
                </button>
            </article>
        `;
    }


    function renderAddExercise(block) {
        return `
            <div class="add-exercise-panel">
                <div class="add-exercise-panel-header">
                    <strong>
                        Add Exercise
                    </strong>

                    <button
                        type="button"
                        class="remove-x-button"
                        data-action="cancel-add-exercise"
                        aria-label="Cancel add exercise"
                    >
                        ×
                    </button>
                </div>

                <div class="combobox-wrapper">
                    <input
                        type="search"
                        class="builder-input workout-edit-exercise-search"
                        placeholder="Search exercise..."
                        autocomplete="off"
                        data-search-mode="add"
                        data-block-id="${block.id}"
                    >

                    <div class="exercise-dropdown"></div>
                </div>
            </div>
        `;
    }


    function renderBlock(block, index, count, options) {
        const exercises = block.exercises ?? [];
        const canAddExercise = block.super_set || exercises.length === 0;
        const addingExercise = options.addingExerciseToBlock === block.id;

        return `
            <section class="hierarchy-block">
                <div class="component-header">
                    <div class="component-title">
                        <span class="component-number">
                            ${block.order}
                        </span>

                        <div>
                            <span class="component-label">
                                Exercise Block
                            </span>

                            <span class="component-description">
                                ${block.super_set ? "Superset" : "Standard block"}
                            </span>
                        </div>
                    </div>

                    <div class="detail-component-actions">
                        ${renderMoveControls(
                            "move-block",
                            block.id,
                            block.order,
                            count
                        )}

                        <button
                            type="button"
                            class="remove-x-button"
                            data-action="delete-block"
                            data-id="${block.id}"
                            aria-label="Delete exercise block"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <div class="block-options">
                    <label class="toggle-field">
                        <input
                            type="checkbox"
                            data-action="toggle-superset"
                            data-id="${block.id}"
                            ${block.super_set ? "checked" : ""}
                        >

                        <span class="toggle-control"></span>

                        <span class="toggle-text">
                            Superset
                        </span>
                    </label>
                </div>

                <div class="block-exercises ${block.super_set ? "superset-exercises" : ""}">
                    ${exercises
                        .map(
                            (exercise, exerciseIndex) => renderExercise(
                                exercise,
                                exerciseIndex,
                                exercises.length
                            )
                        )
                        .join("")}
                </div>

                ${canAddExercise
                    ? `
                        <button
                            type="button"
                            class="secondary-button add-child-button"
                            data-action="show-add-exercise"
                            data-id="${block.id}"
                        >
                            + Add Exercise
                        </button>
                    `
                    : ""}

                ${addingExercise ? renderAddExercise(block) : ""}
            </section>
        `;
    }


    function render(workout, options = {}) {
        if (!workout) {
            return "";
        }

        const normalizedOptions = {
            addingExerciseToBlock: options.addingExerciseToBlock ?? null,
        };

        const blocks = workout.exercise_blocks ?? [];

        return `
            <div class="workout-edit-template">
                ${blocks
                    .map(
                        (block, blockIndex) => renderBlock(
                            block,
                            blockIndex,
                            blocks.length,
                            normalizedOptions
                        )
                    )
                    .join("")}

                <div class="detail-add-block">
                    <button
                        type="button"
                        class="secondary-button add-block-button"
                        data-action="add-block"
                    >
                        + Add Exercise Block
                    </button>
                </div>
            </div>
        `;
    }


    window.WorkoutEditTemplate = {
        render,
    };

})();
