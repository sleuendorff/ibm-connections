var $j = jQuery.noConflict();

if (!window.SMZ) {window.SMZ = {}; }
SMZ.multidoc = {
	settings: {
		currentUserNativeLanguage: 'en',
		autotranslateEnabled: 'true',
		autotranslateDefault: 'false',
		rememberSettings: 'true',
		availableTargetLangsCSV: 'de,en,fr',
		autoRedirect: 'true',
		searchTranslateDefault: 'true',

		provider: {
			name: 'GOOGLE',
			url: 'https://translation.googleapis.com/language/translate/v2',
			key: 'AIzaSyCW0mklASW5R-FLsAjh4nNGhwInHOM08dg',
			getTokenActionUrl : 'smz-get-accesstoken.jspa',
			maxSnippetLength:'null',
			about: ' ABOUT AUTOTRANS '
		},
		
		translatedSelectors: {
			staticSelectors: [null],
			dynamicSelectors: [null]
		},
		
		checkboxLabel: 'Translate to: ' + 'English',                
		checkboxLocation: '.tabNavInner'
	}
};