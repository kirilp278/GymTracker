(function () {

    "use strict";


    // =============================================
    // CONFIG
    // =============================================

    const SAFE_METHODS =
        new Set([
            "GET",
            "HEAD",
            "OPTIONS",
            "TRACE",
        ]);


    /*
     * Запазваме истинския browser fetch,
     * преди да wrapper-нем window.fetch.
     */
    const originalFetch =
        window.fetch.bind(
            window
        );


    // =============================================
    // CSRF TOKEN
    // =============================================

    function getCsrfToken() {

        const input =
            document.querySelector(
                "#csrf-token-holder "
                + "input[name='csrfmiddlewaretoken']"
            );


        if (!input) {
            return null;
        }


        return input.value;
    }


    // =============================================
    // REQUEST HELPERS
    // =============================================

    function getRequestMethod(
        input,
        options,
    ) {

        if (
            options
            && options.method
        ) {

            return options.method
                .toUpperCase();
        }


        if (
            input instanceof Request
        ) {

            return input.method
                .toUpperCase();
        }


        return "GET";
    }


    function getRequestUrl(
        input
    ) {

        if (
            input instanceof Request
        ) {

            return input.url;
        }


        return String(
            input
        );
    }


    function isSameOrigin(
        input
    ) {

        try {

            const url =
                new URL(
                    getRequestUrl(
                        input
                    ),
                    window.location.href
                );


            return (
                url.origin
                ===
                window.location.origin
            );

        }
        catch (error) {

            console.error(
                "Could not parse fetch URL:",
                error
            );


            return false;
        }
    }


    // =============================================
    // GLOBAL FETCH WRAPPER
    // =============================================

    window.fetch =
        function csrfProtectedFetch(
            input,
            options = {},
        ) {

            const method =
                getRequestMethod(
                    input,
                    options
                );


            /*
             * GET / HEAD / OPTIONS / TRACE
             *
             * не се нуждаят от CSRF token.
             */
            if (
                SAFE_METHODS.has(
                    method
                )
            ) {

                return originalFetch(
                    input,
                    options
                );
            }


            /*
             * Никога не изпращаме нашия
             * CSRF token към друг domain.
             */
            if (
                !isSameOrigin(
                    input
                )
            ) {

                return originalFetch(
                    input,
                    options
                );
            }


            const csrfToken =
                getCsrfToken();


            if (!csrfToken) {

                return Promise.reject(
                    new Error(
                        "CSRF token is missing."
                    )
                );
            }


            /*
             * Запазваме всички headers,
             * които оригиналният request има.
             */
            const headers =
                new Headers(
                    options.headers
                    ||
                    (
                        input instanceof Request
                            ? input.headers
                            : undefined
                    )
                );


            /*
             * Ако някой request изрично е
             * сложил собствен CSRF token,
             * не го презаписваме.
             */
            if (
                !headers.has(
                    "X-CSRFToken"
                )
            ) {

                headers.set(
                    "X-CSRFToken",
                    csrfToken
                );
            }


            const nextOptions = {
                ...options,

                headers,
            };


            /*
             * JWT cookies трябва да бъдат
             * изпращани само към нашия origin.
             */
            if (
                nextOptions.credentials
                === undefined
            ) {

                nextOptions.credentials =
                    "same-origin";
            }


            return originalFetch(
                input,
                nextOptions
            );
        };


    /*
     * Ако в бъдеще предпочетем изричното:
     *
     * apiFetch(...)
     *
     * вместо fetch(...),
     * вече имаме и този alias.
     */
    window.apiFetch =
        window.fetch;

})();
