(function () {

    "use strict";


    // =====================================================
    // HELPERS
    // =====================================================

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


    function getExerciseId(exercise) {
        const catalogExercise = exercise.exercise_name;

        if (
            catalogExercise
            && typeof catalogExercise === "object"
        ) {
            return Number(catalogExercise.id);
        }

        const id = Number(catalogExercise);

        return Number.isFinite(id)
            ? id
            : null;
    }


    function findByOrder(items, field, order) {
        return (items ?? []).find(
            (item) => Number(item[field]) === Number(order)
        ) ?? null;
    }


    /*
     * Nested rows are cloned when a workout starts, so their DB IDs are
     * different from the IDs in the previous workout.
     *
     * We therefore match the previous Set by workout structure:
     * block order -> exercise catalog ID -> set-block order -> set order.
     */
    function findPreviousSet(
        previousWorkout,
        block,
        exercise,
        setBlock,
        set
    ) {
        if (!previousWorkout) {
            return null;
        }

        const previousBlock = findByOrder(
            previousWorkout.exercise_blocks,
            "order",
            block.order
        );

        if (!previousBlock) {
            return null;
        }

        const exerciseId = getExerciseId(exercise);

        let previousExercise = (previousBlock.exercises ?? []).find(
            (item) => (
                Number(item.order_in_block) === Number(exercise.order_in_block)
                && getExerciseId(item) === exerciseId
            )
        ) ?? null;

        /*
         * Small fallback for a moved exercise: if there is exactly one
         * occurrence of the same catalog exercise in the previous block,
         * it is safe to use it.
         */
        if (!previousExercise && exerciseId !== null) {
            const sameExercises = (previousBlock.exercises ?? []).filter(
                (item) => getExerciseId(item) === exerciseId
            );

            if (sameExercises.length === 1) {
                previousExercise = sameExercises[0];
            }
        }

        if (!previousExercise) {
            return null;
        }

        const previousSetBlock = findByOrder(
            previousExercise.set_blocks,
            "order_in_exercise",
            setBlock.order_in_exercise
        );

        if (!previousSetBlock) {
            return null;
        }

        return findByOrder(
            previousSetBlock.sets,
            "order_in_set_block",
            set.order_in_set_block
        );
    }


    function renderPreviousHint(previousSet) {
        if (!previousSet) {
            return "";
        }

        const hasReps = (
            previousSet.reps !== null
            && previousSet.reps !== undefined
            && previousSet.reps !== ""
        );

        const hasWeight = (
            previousSet.weight !== null
            && previousSet.weight !== undefined
            && previousSet.weight !== ""
        );

        if (!hasReps && !hasWeight) {
            return "";
        }

        return `
            <div class="in-progress-previous-hint">
                <span>Previous</span>

                <strong>
                    ${escapeHtml(hasReps ? previousSet.reps : "—")}
                    ×
                    ${escapeHtml(hasWeight ? previousSet.weight : "—")}
                </strong>
            </div>
        `;
    }


    function renderEditableValues(set, previousSet) {
        return `
            <div class="in-progress-set-editor">

                ${renderPreviousHint(previousSet)}

                <div class="in-progress-set-inputs">
                    <input
                        type="text"
                        inputmode="numeric"
                        class="builder-input in-progress-read-input in-progress-set-input"
                        placeholder="Reps"
                        value="${escapeHtml(set.reps ?? "")}"
                        data-field="reps"
                        data-id="${set.id}"
                    >
                    

                    <span class="in-progress-set-times">
                        ×
                    </span>

                    <input
                        type="text"
                        inputmode="decimal"
                        class="builder-input in-progress-read-input in-progress-set-input"
                        placeholder="Weight"
                        value="${escapeHtml(set.weight ?? "")}"
                        data-field="weight"
                        data-id="${set.id}"
                    >
                </div>

            </div>
        `;
    }


    // =====================================================
    // SET BLOCKS
    // =====================================================

    function renderStandardSetBlock(
        setBlock,
        block,
        exercise,
        previousWorkout
    ) {
        const set = setBlock.sets?.[0] ?? null;

        if (!set) {
            return `
                <div class="history-set-block history-standard-set-block">
                    <div class="history-standard-set-row">
                        <strong>
                            ${setBlock.order_in_exercise} Set Block
                        </strong>

                        <span class="readonly-empty-value">
                            No set
                        </span>
                    </div>
                </div>
            `;
        }

        const previousSet = findPreviousSet(
            previousWorkout,
            block,
            exercise,
            setBlock,
            set
        );

        return `
            <div class="history-set-block history-standard-set-block">
                <div class="history-standard-set-row in-progress-standard-set-row">
                    <strong>
                        ${setBlock.order_in_exercise} Set 
                    </strong>

                    ${renderEditableValues(
                        set,
                        previousSet
                    )}
                </div>
            </div>
        `;
    }


    function renderDropSetBlock(
        setBlock,
        block,
        exercise,
        previousWorkout
    ) {
        const sets = setBlock.sets ?? [];

        return `
            <div class="history-set-block history-drop-set-block">
                <div class="history-drop-set-heading">
                    <strong>
                        ${setBlock.order_in_exercise} Set
                    </strong>

                    <span class="detail-badge">
                        Drop set
                    </span>
                </div>

                <div class="history-sets">
                    ${sets
                        .map(
                            (set) => {
                                const previousSet = findPreviousSet(
                                    previousWorkout,
                                    block,
                                    exercise,
                                    setBlock,
                                    set
                                );

                                return `
                                    <div class="history-set-row in-progress-drop-set-row">
                                        <span>
                                            Set ${set.order_in_set_block}
                                        </span>

                                        ${renderEditableValues(
                                            set,
                                            previousSet
                                        )}
                                    </div>
                                `;
                            }
                        )
                        .join("")}
                </div>
            </div>
        `;
    }


    function renderSetBlock(
        setBlock,
        block,
        exercise,
        previousWorkout
    ) {
        if (setBlock.drop_down) {
            return renderDropSetBlock(
                setBlock,
                block,
                exercise,
                previousWorkout
            );
        }

        return renderStandardSetBlock(
            setBlock,
            block,
            exercise,
            previousWorkout
        );
    }


    // =====================================================
    // EXERCISE
    // =====================================================

    function renderExercise(
        exercise,
        block,
        previousWorkout
    ) {
        return `
            <div class="history-exercise">
                <strong class="history-exercise-name">
                    ${escapeHtml(
                        getExerciseName(exercise)
                    )}
                </strong>

                <div class="history-set-blocks">
                    ${(exercise.set_blocks ?? [])
                        .map(
                            (setBlock) => renderSetBlock(
                                setBlock,
                                block,
                                exercise,
                                previousWorkout
                            )
                        )
                        .join("")}
                </div>
            </div>
        `;
    }


    // =====================================================
    // EXERCISE BLOCK
    // =====================================================

    function renderBlock(
        block,
        previousWorkout
    ) {
        return `
            <section class="history-workout-block">
                <div class="history-component-heading">
                    <strong>
                        ${block.order}. Exercise Block
                    </strong>

                    ${block.super_set
                        ? `
                            <span class="detail-badge">
                                Superset
                            </span>
                        `
                        : ""}
                </div>

                <div class="history-exercises ${block.super_set ? "superset-exercises" : ""}">
                    ${(block.exercises ?? [])
                        .map(
                            (exercise) => renderExercise(
                                exercise,
                                block,
                                previousWorkout
                            )
                        )
                        .join("")}
                </div>
            </section>
        `;
    }


    // =====================================================
    // WORKOUT
    // =====================================================

    function render(
        workout,
        options = {}
    ) {
        if (!workout) {
            return "";
        }

        const previousWorkout = (
            options.previousWorkout
            ?? null
        );

        return `
            <div class="workout-in-progress-template workout-read-template">
                <div class="calendar-workout-tree">
                    ${(workout.exercise_blocks ?? [])
                        .map(
                            (block) => renderBlock(
                                block,
                                previousWorkout
                            )
                        )
                        .join("")}
                </div>
            </div>
        `;
    }


    window.WorkoutInProgressTemplate = {
        render,
    };

})();
