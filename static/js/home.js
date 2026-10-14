document.addEventListener(
    "DOMContentLoaded",
    () => {

        const tabs =
            document.querySelectorAll(
                "[data-home-tab]"
            );


        const panels =
            document.querySelectorAll(
                "[data-home-panel]"
            );


        tabs.forEach(
            (tab) => {

                tab.addEventListener(
                    "click",
                    () => {

                        const target =
                            tab.dataset.homeTab;


                        // =================================
                        // ACTIVE TAB
                        // =================================

                        tabs.forEach(
                            (item) => {

                                item.classList.toggle(
                                    "active",
                                    item === tab
                                );
                            }
                        );


                        // =================================
                        // ACTIVE PANEL
                        // =================================

                        panels.forEach(
                            (panel) => {

                                panel.hidden =
                                    panel.dataset.homePanel
                                    !== target;
                            }
                        );
                    }
                );
            }
        );

    }
);
