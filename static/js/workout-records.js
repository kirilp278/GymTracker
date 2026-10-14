document.addEventListener(
    "DOMContentLoaded",
    () => {

        const app =
            document.getElementById(
                "records-app"
            );


        if (!app) {
            return;
        }


        const templateId =
            Number(
                app.dataset.templateId
            );


        const listUrl =
            app.dataset.listUrl;


        const templateUrl =
            app.dataset.templateUrl;


        const detailBase =
            app.dataset.detailBase;


        const templateName =
            document.getElementById(
                "records-template-name"
            );


        const instanceList =
            document.getElementById(
                "record-instance-list"
            );


        const message =
            document.getElementById(
                "records-page-message"
            );


        // =============================================
        // HELPERS
        // =============================================

        function escapeHtml(
            value
        ) {

            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;")
                .replaceAll("'", "&#039;");
        }


        function pad(
            value
        ) {

            return String(value)
                .padStart(
                    2,
                    "0"
                );
        }


        function formatDuration(
            startedAt,
            endedAt
        ) {

            if (
                !startedAt
                || !endedAt
            ) {
                return "—";
            }


            let seconds =
                Math.floor(
                    Math.max(
                        0,

                        new Date(
                            endedAt
                        ).getTime()

                        -

                        new Date(
                            startedAt
                        ).getTime()
                    )
                    / 1000
                );


            const hours =
                Math.floor(
                    seconds / 3600
                );


            seconds %= 3600;


            const minutes =
                Math.floor(
                    seconds / 60
                );


            seconds %= 60;


            return (
                pad(hours)
                + ":"
                + pad(minutes)
                + ":"
                + pad(seconds)
            );
        }


        async function fetchJson(
            url
        ) {

            const response =
                await fetch(
                    url,
                    {
                        credentials:
                            "same-origin",
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Request failed."
                );
            }


            return response.json();
        }


        async function fetchAllPages(
            url
        ) {

            let next =
                url instanceof URL
                    ? url.toString()
                    : url;


            const results = [];


            while (next) {

                const data =
                    await fetchJson(
                        next
                    );


                if (
                    Array.isArray(data)
                ) {

                    results.push(
                        ...data
                    );

                    break;
                }


                results.push(
                    ...(data.results ?? [])
                );


                next =
                    data.next;
            }


            return results;
        }


        // =============================================
        // LOAD
        // =============================================

        async function initialize() {

            try {

                /*
                 * Template name.
                 */
                const template =
                    await fetchJson(
                        templateUrl
                    );


                templateName.textContent =
                    template.name;


                /*
                 * Only COMPLETED instances.
                 */
                const url =
                    new URL(
                        listUrl,
                        window.location.origin
                    );


                url.searchParams.set(
                    "status",
                    "ended"
                );


                url.searchParams.set(
                    "template",
                    templateId
                );


                url.searchParams.set(
                    "ordering",
                    "-started_at"
                );


                const instances =
                    await fetchAllPages(
                        url
                    );


                renderInstances(
                    instances
                );

            }
            catch (error) {

                console.error(
                    error
                );


                message.textContent =
                    "Could not load record history.";
            }
        }


        // =============================================
        // RENDER
        // =============================================

        function renderInstances(
            instances
        ) {

            instanceList.innerHTML =
                "";


            if (
                instances.length === 0
            ) {

                message.textContent =
                    "No completed workouts for this template yet.";

                return;
            }


            message.textContent =
                "";


            instances.forEach(
                (workout) => {

                    const started =
                        workout.started_at
                            ? new Date(
                                workout.started_at
                            )
                            : null;


                    const date =
                        started
                            ? new Intl.DateTimeFormat(
                                undefined,
                                {
                                    weekday:
                                        "short",

                                    day:
                                        "numeric",

                                    month:
                                        "short",

                                    year:
                                        "numeric",
                                }
                            ).format(
                                started
                            )
                            : "Unknown date";


                    const time =
                        started
                            ? new Intl.DateTimeFormat(
                                undefined,
                                {
                                    hour:
                                        "2-digit",

                                    minute:
                                        "2-digit",
                                }
                            ).format(
                                started
                            )
                            : "";


                    const duration =
                        formatDuration(
                            workout.started_at,
                            workout.ended_at
                        );


                    const link =
                        document.createElement(
                            "a"
                        );


                    link.className =
                        "record-instance-card";


                    link.href =
                        `${detailBase}`
                        + `${workout.id}/`;


                    link.innerHTML = `
                        <div class="record-instance-main">

                            <span class="record-instance-label">
                                Completed Workout
                            </span>


                            <h3>
                                ${escapeHtml(
                                    workout.name
                                )}
                            </h3>


                            <span class="record-instance-date">
                                ${escapeHtml(
                                    date
                                )}

                                ${escapeHtml(
                                    time
                                )}
                            </span>

                        </div>


                        <div class="record-instance-duration">

                            <span>
                                Duration
                            </span>

                            <strong>
                                ${duration}
                            </strong>

                        </div>


                        <span class="record-instance-arrow">
                            →
                        </span>
                    `;


                    instanceList.appendChild(
                        link
                    );
                }
            );
        }


        initialize();

    }
);
