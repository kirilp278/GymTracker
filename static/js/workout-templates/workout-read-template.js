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


    function pad(value) {
        return String(value).padStart(2, "0");
    }


    function formatDuration(startedAt, endedAt) {
        if (!startedAt || !endedAt) {
            return "—";
        }

        let seconds = Math.floor(
            Math.max(
                0,
                new Date(endedAt).getTime() - new Date(startedAt).getTime()
            ) / 1000
        );

        const hours = Math.floor(seconds / 3600);
        seconds %= 3600;

        const minutes = Math.floor(seconds / 60);
        seconds %= 60;

        return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }


    function formatDateTime(value) {
        if (!value) {
            return "";
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
        ).format(new Date(value));
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


    function renderStandardSetBlock(setBlock) {
        const set = setBlock.sets?.[0] ?? null;
        const reps = set?.reps ?? "—";
        const weight = set?.weight ?? "—";

        return `
            <div class="history-set-block history-standard-set-block">
                <div class="history-standard-set-row">
                    <strong>
                        ${setBlock.order_in_exercise} Set Block
                    </strong>

                    <span class="history-standard-set-value">
                        <strong>${escapeHtml(reps)}</strong>
                        <span>×</span>
                        <strong>${escapeHtml(weight)}</strong>
                    </span>
                </div>
            </div>
        `;
    }


    function renderDropSetBlock(setBlock) {
        const sets = setBlock.sets ?? [];

        return `
            <div class="history-set-block history-drop-set-block">
                <div class="history-drop-set-heading">
                    <strong>
                        ${setBlock.order_in_exercise} Set Block
                    </strong>

                    <span class="detail-badge">
                        Drop set
                    </span>
                </div>

                <div class="history-sets">
                    ${sets
                        .map(
                            (set) => `
                                <div class="history-set-row">
                                    <span>
                                        Set ${set.order_in_set_block}
                                    </span>

                                    <strong>
                                        ${escapeHtml(set.reps ?? "—")}
                                        ×
                                        ${escapeHtml(set.weight ?? "—")}
                                    </strong>
                                </div>
                            `
                        )
                        .join("")}
                </div>
            </div>
        `;
    }


    function renderSetBlock(setBlock) {
        if (setBlock.drop_down) {
            return renderDropSetBlock(setBlock);
        }

        return renderStandardSetBlock(setBlock);
    }


    function renderExercise(exercise) {
        return `
            <div class="history-exercise">
                <strong class="history-exercise-name">
                    ${escapeHtml(getExerciseName(exercise))}
                </strong>

                <div class="history-set-blocks">
                    ${(exercise.set_blocks ?? [])
                        .map(renderSetBlock)
                        .join("")}
                </div>
            </div>
        `;
    }


    function renderBlock(block) {
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
                        .map(renderExercise)
                        .join("")}
                </div>
            </section>
        `;
    }


    function render(workout, options = {}) {
        if (!workout) {
            return "";
        }

        const isTemplate = workout.status === "template";
        const showHeader = options.showHeader !== false;
        const wrapperClass = options.wrapperClass ?? "calendar-workout-detail";

        return `
            <article class="${escapeHtml(wrapperClass)} workout-read-template">
                ${showHeader
                    ? `
                        <div class="calendar-workout-header">
                            <div>
                                <span class="calendar-workout-time">
                                    ${isTemplate
                                        ? "Template"
                                        : escapeHtml(formatDateTime(workout.started_at))}
                                </span>

                                <h3>
                                    ${escapeHtml(workout.name)}
                                </h3>
                            </div>

                            ${isTemplate
                                ? ""
                                : `
                                    <span class="calendar-workout-duration">
                                        ${formatDuration(
                                            workout.started_at,
                                            workout.ended_at
                                        )}
                                    </span>
                                `}
                        </div>
                    `
                    : ""}

                <div class="calendar-workout-tree">
                    ${(workout.exercise_blocks ?? [])
                        .map(renderBlock)
                        .join("")}
                </div>
            </article>
        `;
    }


    window.WorkoutReadTemplate = {
        render,
    };

})();
