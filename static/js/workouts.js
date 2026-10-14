document.addEventListener("DOMContentLoaded", () => {

    const app = document.getElementById("workouts-app");

    if (!app) {
        return;
    }

    if (!window.WorkoutReadTemplate) {
        console.error("WorkoutReadTemplate is not loaded.");
        return;
    }

    const listUrl = app.dataset.listUrl;
    const detailBase = app.dataset.detailBase;

    const API_BASE = "/api/v1";

    const templateList = document.getElementById("template-list");
    const templateMessage = document.getElementById("templates-message");
    const recordsTemplateList = document.getElementById("records-template-list");
    const recordsMessage = document.getElementById("records-message");

    const calendarGrid = document.getElementById("calendar-grid");
    const monthTitle = document.getElementById("calendar-month-title");
    const previousMonthButton = document.getElementById("previous-month");
    const nextMonthButton = document.getElementById("next-month");
    const selectedDayTitle = document.getElementById("selected-day-title");
    const selectedDayWorkouts = document.getElementById("selected-day-workouts");

    const today = new Date();
    const inProgressSection =
        document.getElementById(
            "workouts-in-progress-section"
        );


    const inProgressName =
        document.getElementById(
            "workouts-in-progress-name"
        );


    const inProgressStopwatch =
        document.getElementById(
            "workouts-in-progress-stopwatch"
        );

    const state = {
        templates: [],
        historyWorkouts: [],
        historyLoaded: false,
        workoutDetails: new Map(),
        calendarDate: new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        ),
        selectedDate: null,
        inProgressWorkout:
            null,

        inProgressTimer:
            null,
    };


    const completionBanner = document.getElementById(
        "workout-completion-banner"
    );

    const completionText = document.getElementById(
        "completion-text"
    );

    const closeCompletionButton = document.getElementById(
        "close-completion-banner"
    );


    function showCompletionMessage() {
        const raw = sessionStorage.getItem(
            "completedWorkout"
        );

        if (!raw) {
            return;
        }

        sessionStorage.removeItem(
            "completedWorkout"
        );

        try {
            const data = JSON.parse(raw);

            completionText.textContent =
                `${data.name} completed in ${data.duration}.`;

            completionBanner.hidden = false;
        }
        catch {
            completionBanner.hidden = true;
        }
    }


    closeCompletionButton?.addEventListener(
        "click",
        () => {
            completionBanner.hidden = true;
        }
    );


    async function fetchJson(url) {
        const response = await fetch(
            url,
            {
                credentials: "same-origin",
            }
        );

        if (!response.ok) {
            throw new Error(
                "Request failed."
            );
        }

        return response.json();
    }


    async function fetchAllPages(url) {
        let next =
            url instanceof URL
                ? url.toString()
                : url;

        const results = [];

        while (next) {
            const data = await fetchJson(next);

            if (Array.isArray(data)) {
                results.push(...data);
                break;
            }

            results.push(
                ...(data.results ?? [])
            );

            next = data.next;
        }

        return results;
    }


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


    function localDateKey(value) {
        const date =
            value instanceof Date
                ? value
                : new Date(value);

        return (
            date.getFullYear()
            + "-"
            + pad(date.getMonth() + 1)
            + "-"
            + pad(date.getDate())
        );
    }


    function formatSelectedDate(key) {
        const [year, month, day] = key
            .split("-")
            .map(Number);

        const date = new Date(
            year,
            month - 1,
            day
        );

        return new Intl.DateTimeFormat(
            undefined,
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            }
        ).format(date);
    }


    document
        .querySelectorAll(
            ".workout-tab"
        )
        .forEach(
            (tab) => {
                tab.addEventListener(
                    "click",
                    async () => {
                        const target = tab.dataset.tab;

                        document
                            .querySelectorAll(
                                ".workout-tab"
                            )
                            .forEach(
                                (item) => {
                                    item.classList.toggle(
                                        "active",
                                        item === tab
                                    );
                                }
                            );

                        document
                            .querySelectorAll(
                                ".workout-tab-panel"
                            )
                            .forEach(
                                (panel) => {
                                    const active =
                                        panel.dataset.panel
                                        === target;

                                    panel.hidden = !active;

                                    panel.classList.toggle(
                                        "active",
                                        active
                                    );
                                }
                            );

                        if (
                            target === "history"
                            && !state.historyLoaded
                        ) {
                            await loadHistory();
                        }
                    }
                );
            }
        );


    document
        .querySelectorAll(
            ".history-tab"
        )
        .forEach(
            (tab) => {
                tab.addEventListener(
                    "click",
                    () => {
                        const target =
                            tab.dataset.historyTab;

                        document
                            .querySelectorAll(
                                ".history-tab"
                            )
                            .forEach(
                                (item) => {
                                    item.classList.toggle(
                                        "active",
                                        item === tab
                                    );
                                }
                            );

                        document
                            .querySelectorAll(
                                ".history-panel"
                            )
                            .forEach(
                                (panel) => {
                                    const active =
                                        panel.dataset.historyPanel
                                        === target;

                                    panel.hidden = !active;

                                    panel.classList.toggle(
                                        "active",
                                        active
                                    );
                                }
                            );
                    }
                );
            }
        );
      // =================================================
    // IN PROGRESS WORKOUT
    // =================================================

    async function loadInProgressWorkout() {

        const url =
            new URL(
                listUrl,
                window.location.origin
            );


        url.searchParams.set(
            "status",
            "in_progress"
        );


        try {

            const workouts =
                await fetchAllPages(
                    url
                );


            if (
                workouts.length === 0
            ) {

                hideInProgressWorkout();

                return;
            }


            /*
             * DB constraint-ът ни гарантира,
             * че user-ът има максимум един
             * in_progress workout.
             */
            state.inProgressWorkout =
                workouts[0];


            showInProgressWorkout();

        }
        catch (error) {

            console.error(
                "Could not load in-progress workout:",
                error
            );


            hideInProgressWorkout();
        }
    }


    function showInProgressWorkout() {

        const workout =
            state.inProgressWorkout;


        if (!workout) {

            hideInProgressWorkout();

            return;
        }


        inProgressName.textContent =
            workout.name;


        inProgressSection.hidden =
            false;


        startInProgressStopwatch();
    }


    function hideInProgressWorkout() {

        state.inProgressWorkout =
            null;


        inProgressSection.hidden =
            true;


        stopInProgressStopwatch();
    }


    function startInProgressStopwatch() {

        stopInProgressStopwatch();


        updateInProgressStopwatch();


        state.inProgressTimer =
            setInterval(
                updateInProgressStopwatch,
                1000
            );
    }


    function stopInProgressStopwatch() {

        if (
            state.inProgressTimer
        ) {

            clearInterval(
                state.inProgressTimer
            );


            state.inProgressTimer =
                null;
        }
    }


    function updateInProgressStopwatch() {

        const workout =
            state.inProgressWorkout;


        if (
            !workout
            || !workout.started_at
        ) {

            inProgressStopwatch.textContent =
                "00:00:00";

            return;
        }


        const startedAt =
            new Date(
                workout.started_at
            );


        const milliseconds =
            Math.max(
                0,
                Date.now()
                - startedAt.getTime()
            );


        inProgressStopwatch.textContent =
            formatElapsedTime(
                milliseconds
            );
    }


    function formatElapsedTime(
        milliseconds
    ) {

        let totalSeconds =
            Math.floor(
                milliseconds / 1000
            );


        const hours =
            Math.floor(
                totalSeconds / 3600
            );


        totalSeconds %=
            3600;


        const minutes =
            Math.floor(
                totalSeconds / 60
            );


        const seconds =
            totalSeconds % 60;


        return (
            pad(hours)
            + ":"
            + pad(minutes)
            + ":"
            + pad(seconds)
        );
    }


    async function loadTemplates() {
        const url = new URL(
            listUrl,
            window.location.origin
        );

        url.searchParams.set(
            "status",
            "template"
        );

        url.searchParams.set(
            "ordering",
            "-id"
        );

        try {
            state.templates = await fetchAllPages(
                url
            );

            renderTemplates();
            renderRecordTemplates();
        }
        catch (error) {
            console.error(error);
            templateMessage.textContent =
                "Could not load templates.";
        }
    }


    function renderTemplates() {
        templateList.innerHTML = "";

        if (state.templates.length === 0) {
            templateMessage.textContent =
                "You do not have any templates yet.";

            return;
        }

        templateMessage.textContent = "";

        state.templates.forEach(
            (workout) => {
                const link = document.createElement(
                    "a"
                );

                link.className = "template-card";
                link.href = `${detailBase}${workout.id}/`;

                link.innerHTML = `
                    <div class="template-card-main">
                        <span class="template-card-label">
                            Template
                        </span>

                        <h3>
                            ${escapeHtml(workout.name)}
                        </h3>
                    </div>

                    <span class="template-card-arrow">
                        →
                    </span>
                `;

                templateList.appendChild(link);
            }
        );
    }


    function renderRecordTemplates() {
        recordsTemplateList.innerHTML = "";

        if (state.templates.length === 0) {
            recordsMessage.textContent =
                "You do not have any templates.";

            return;
        }

        recordsMessage.textContent = "";

        state.templates.forEach(
            (template) => {
                const link = document.createElement(
                    "a"
                );

                link.className = "template-card";
                link.href =
                    `${detailBase}${template.id}/records/`;

                link.innerHTML = `
                    <div class="template-card-main">
                        <span class="template-card-label">
                            Record History
                        </span>

                        <h3>
                            ${escapeHtml(template.name)}
                        </h3>
                    </div>

                    <span class="template-card-arrow">
                        →
                    </span>
                `;

                recordsTemplateList.appendChild(
                    link
                );
            }
        );
    }


    async function loadHistory() {
        const url = new URL(
            listUrl,
            window.location.origin
        );

        url.searchParams.set(
            "status",
            "ended"
        );

        url.searchParams.set(
            "ordering",
            "-started_at"
        );

        try {
            state.historyWorkouts = await fetchAllPages(
                url
            );

            state.historyLoaded = true;
            state.selectedDate = localDateKey(today);

            renderCalendar();
            await renderSelectedDay();
        }
        catch (error) {
            console.error(error);
            selectedDayTitle.textContent =
                "Could not load workout history.";
        }
    }


    function renderCalendar() {
        const year = state.calendarDate.getFullYear();
        const month = state.calendarDate.getMonth();

        monthTitle.textContent =
            new Intl.DateTimeFormat(
                undefined,
                {
                    month: "long",
                    year: "numeric",
                }
            ).format(
                state.calendarDate
            );

        calendarGrid.innerHTML = "";

        const nativeFirstDay = new Date(
            year,
            month,
            1
        ).getDay();

        const firstDay =
            (nativeFirstDay + 6) % 7;

        const numberOfDays = new Date(
            year,
            month + 1,
            0
        ).getDate();

        for (
            let i = 0;
            i < firstDay;
            i++
        ) {
            const blank = document.createElement(
                "div"
            );

            blank.className =
                "calendar-day calendar-day-empty";

            calendarGrid.appendChild(blank);
        }

        for (
            let day = 1;
            day <= numberOfDays;
            day++
        ) {
            const date = new Date(
                year,
                month,
                day
            );

            const key = localDateKey(date);

            const hasWorkout =
                state.historyWorkouts.some(
                    (workout) =>
                        workout.started_at
                        && localDateKey(
                            workout.started_at
                        ) === key
                );

            const isToday =
                key === localDateKey(today);

            const selected =
                key === state.selectedDate;

            const button = document.createElement(
                "button"
            );

            button.type = "button";
            button.className = "calendar-day";

            if (hasWorkout) {
                button.classList.add(
                    "has-workout"
                );
            }

            if (isToday) {
                button.classList.add(
                    "today"
                );
            }

            if (selected) {
                button.classList.add(
                    "selected"
                );
            }

            button.dataset.date = key;

            button.innerHTML = `
                <span class="calendar-day-number">
                    ${day}
                </span>

                ${hasWorkout
                    ? `
                        <span class="calendar-workout-dot"></span>
                    `
                    : ""}
            `;

            calendarGrid.appendChild(button);
        }
    }


    previousMonthButton.addEventListener(
        "click",
        () => {
            state.calendarDate = new Date(
                state.calendarDate.getFullYear(),
                state.calendarDate.getMonth() - 1,
                1
            );

            renderCalendar();
        }
    );


    nextMonthButton.addEventListener(
        "click",
        () => {
            state.calendarDate = new Date(
                state.calendarDate.getFullYear(),
                state.calendarDate.getMonth() + 1,
                1
            );

            renderCalendar();
        }
    );


    calendarGrid.addEventListener(
        "click",
        async (event) => {
            const button = event.target.closest(
                "[data-date]"
            );

            if (!button) {
                return;
            }

            state.selectedDate = button.dataset.date;

            renderCalendar();
            await renderSelectedDay();
        }
    );


    async function renderSelectedDay() {
        if (!state.selectedDate) {
            return;
        }

        selectedDayTitle.textContent =
            formatSelectedDate(
                state.selectedDate
            );

        const workouts = state.historyWorkouts.filter(
            (workout) =>
                workout.started_at
                && localDateKey(
                    workout.started_at
                ) === state.selectedDate
        );

        if (workouts.length === 0) {
            selectedDayWorkouts.innerHTML = `
                <div class="calendar-empty-day">
                    No workouts for this day.
                </div>
            `;

            return;
        }

        selectedDayWorkouts.innerHTML = `
            <p class="calendar-loading">
                Loading workouts...
            </p>
        `;

        try {
            const details = [];

            for (const workout of workouts) {
                let detail = state.workoutDetails.get(
                    workout.id
                );

                if (!detail) {
                    detail = await fetchJson(
                        `${API_BASE}/workouts/${workout.id}/`
                    );

                    state.workoutDetails.set(
                        workout.id,
                        detail
                    );
                }

                details.push(detail);
            }

            selectedDayWorkouts.innerHTML =
                details
                    .map(
                        (workout) =>
                            window.WorkoutReadTemplate.render(
                                workout,
                                {
                                    showHeader: true,
                                    wrapperClass: "calendar-workout-detail",
                                }
                            )
                    )
                    .join("");
        }
        catch (error) {
            console.error(error);

            selectedDayWorkouts.innerHTML = `
                <div class="calendar-empty-day">
                    Could not load workouts for this day.
                </div>
            `;
        }
    }


    showCompletionMessage();
    loadInProgressWorkout();
    loadTemplates();

});
