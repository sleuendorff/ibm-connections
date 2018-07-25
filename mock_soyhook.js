
        if (!window.SMZ) {window.SMZ = {}; }
        SMZ.multidoc = {
            settings: {
                currentUserNativeLanguage: '{$currentUserLocaleCode}',
                autotranslateEnabled: '{$translationsEnabled}',
                autotranslateDefault: '{$translateDefault}',
                rememberSettings: '{$rememberSettings}',
                availableTargetLangsCSV: '{$availableTargetLangs}',
                autoRedirect: '{$autoRedirect}',
                searchTranslateDefault: '{$searchTranslateDefault}',

                provider: {
                    name: '{$translationProvider}',
                    url: '{$translationUrl}',
                    key: '{$translationKey}',
                    getTokenActionUrl : 'smz-get-accesstoken.jspa',
                    maxSnippetLength:'{$maxSnippetLength}',
                    about: '{i18nText('smz.multidoc.autotranslate.provider.about')} '
                },
                
                translatedSelectors: {
                    staticSelectors: [{$staticSelectors|noAutoescape}],
                    dynamicSelectors: [{$dynamicSelectors|noAutoescape}]
                },
                
                checkboxLabel: '{i18nText('smz.multidoc.autotranslate.translate.label')} ' + '{$currentUserLocaleCode}',                
                checkboxLocation: ''
            }
        };