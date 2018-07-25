var SMZ = (!window.SMZ)?{}:window.SMZ
SMZ.translationselectors = {
    "staticSelectors" : [
        "#translatehook" // /*  TO DO until "content" is translated dynamically this puts the toggle checkbox in the header */
    ],
    "dynamicSelectors": [
        "#descText",
        ".lotusTable H4 A",
        ".forumPostTitle",
        ".entry-content",
        //wiki
        "#wikiPageHeader",
        "#wikiContentDiv",
        // files
        ".lconnBreadcrumbitem",
        ".node .title",
        ".card-back .title",
        ".card-front .summary .text",
        ".lconnTabBody .lotusBreakWord"
    ]
};