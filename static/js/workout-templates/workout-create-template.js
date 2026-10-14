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


    function renderSet(
        set,
        blockIndex,
        exerciseIndex,
        setBlockIndex,
        setIndex
    ) {
        return `
            <div class="set-row-compact">
                <span class="set-number">
                    Set ${set.order_in_set_block}
                </span>

                <div class="set-value-expression">
                    <input
                        type="text"
                        inputmode="decimal"
                        class="builder-input set-value-input"
                        placeholder="Weight"
                        value="${escapeHtml(set.weight ?? "")}"
                        data-field="weight"
                        data-block="${blockIndex}"
                        data-exercise="${exerciseIndex}"
                        data-set-block="${setBlockIndex}"
                        data-set="${setIndex}"
                    >

                    <span class="set-times">×</span>

                    <input
                        type="text"
                        inputmode="numeric"
                        class="builder-input set-value-input"
                        placeholder="Reps"
                        value="${escapeHtml(set.reps ?? "")}"
                        data-field="reps"
                        data-block="${blockIndex}"
                        data-exercise="${exerciseIndex}"
                        data-set-block="${setBlockIndex}"
                        data-set="${setIndex}"
                    >
                </div>

                <button
                    type="button"
                    class="remove-x-button remove-set-button"
                    aria-label="Remove set"
                    data-action="remove-set"
                    data-block="${blockIndex}"
                    data-exercise="${exerciseIndex}"
                    data-set-block="${setBlockIndex}"
                    data-set="${setIndex}"
                >
                    ×
                </button>
            </div>
        `;
    }


    function renderSetBlock(
        setBlock,
        blockIndex,
        exerciseIndex,
        setBlockIndex
    ) {
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

                    <button
                        type="button"
                        class="remove-x-button"
                        aria-label="Remove set block"
                        data-action="remove-set-block"
                        data-block="${blockIndex}"
                        data-exercise="${exerciseIndex}"
                        data-set-block="${setBlockIndex}"
                    >
                        ×
                    </button>
                </div>

                <div class="set-block-options">
                    <label class="toggle-field">
                        <input
                            type="checkbox"
                            data-action="toggle-dropset"
                            data-block="${blockIndex}"
                            data-exercise="${exerciseIndex}"
                            data-set-block="${setBlockIndex}"
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
                                blockIndex,
                                exerciseIndex,
                                setBlockIndex,
                                setIndex
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
                            data-block="${blockIndex}"
                            data-exercise="${exerciseIndex}"
                            data-set-block="${setBlockIndex}"
                        >
                            + Add Set
                        </button>
                    `
                    : ""}
            </section>
        `;
    }


    function renderExercise(
        exercise,
        blockIndex,
        exerciseIndex
    ) {
        const inputValue =
            exercise._search_query
            || exercise._exercise_label
            || "";

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
                                ${exercise._exercise_label
                                    ? escapeHtml(exercise._exercise_label)
                                    : "Select an exercise"}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="remove-x-button"
                        aria-label="Remove exercise"
                        data-action="remove-exercise"
                        data-block="${blockIndex}"
                        data-exercise="${exerciseIndex}"
                    >
                        ×
                    </button>
                </div>

                <div class="exercise-combobox">
                    <label class="field-label">
                        Exercise
                    </label>

                    <div class="combobox-wrapper">
                        <input
                            type="search"
                            class="builder-input exercise-search-input"
                            value="${escapeHtml(inputValue)}"
                            placeholder="Search exercise..."
                            autocomplete="off"
                            role="combobox"
                            aria-expanded="false"
                            aria-autocomplete="list"
                            data-block="${blockIndex}"
                            data-exercise="${exerciseIndex}"
                        >

                        <div
                            class="exercise-dropdown"
                            data-dropdown-block="${blockIndex}"
                            data-dropdown-exercise="${exerciseIndex}"
                        ></div>
                    </div>
                </div>

                <div class="exercise-set-blocks">
                    ${(exercise.set_blocks ?? [])
                        .map(
                            (setBlock, setBlockIndex) => renderSetBlock(
                                setBlock,
                                blockIndex,
                                exerciseIndex,
                                setBlockIndex
                            )
                        )
                        .join("")}
                </div>

                <button
                    type="button"
                    class="secondary-button add-child-button"
                    data-action="add-set-block"
                    data-block="${blockIndex}"
                    data-exercise="${exerciseIndex}"
                >
                    + Add Set Block
                </button>
            </article>
        `;
    }


    function renderBlock(block, blockIndex) {
        const exercises = block.exercises ?? [];
        const canAddExercise = block.super_set || exercises.length === 0;

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

                    <button
                        type="button"
                        class="remove-x-button"
                        aria-label="Remove exercise block"
                        data-action="remove-block"
                        data-block="${blockIndex}"
                    >
                        ×
                    </button>
                </div>

                <div class="block-options">
                    <label class="toggle-field">
                        <input
                            type="checkbox"
                            data-action="toggle-superset"
                            data-block="${blockIndex}"
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
                                blockIndex,
                                exerciseIndex
                            )
                        )
                        .join("")}
                </div>

                ${canAddExercise
                    ? `
                        <button
                            type="button"
                            class="secondary-button add-child-button"
                            data-action="add-exercise"
                            data-block="${blockIndex}"
                        >
                            + Add Exercise
                        </button>
                    `
                    : ""}
            </section>
        `;
    }


    function render(workout) {
        if (!workout) {
            return "";
        }

        return `
            <div class="workout-create-template">
                <div class="workout-create-template-blocks">
                    ${(workout.exercise_blocks ?? [])
                        .map(renderBlock)
                        .join("")}
                </div>

                <div class="add-block-section">
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


    window.WorkoutCreateTemplate = {
        render,
    };

})();
