(function() {
	angular.module('starter')
	.config(['$translateProvider', configTranslations]);

	function configTranslations($translateProvider) {
		console.log("Configuration translations...");
		// console.log($translateProvider);

		$translateProvider.useSanitizeValueStrategy(null);

		for (var i = 0; i < transLocaleArray.length; i++) {
			var item = transLocaleArray[i];

			if (typeof item.lang === 'string')
				$translateProvider.translations(item.lang, item.messages);
			else {
				/* assume it's an array */
				for (var j = 0; j < item.lang.length; j++) {
					$translateProvider.translations(item.lang[j], item.messages);
				}
			}
		}

		$translateProvider.preferredLanguage('en-US');
		// $translateProvider.preferredLanguage('zh-CN');
		// $translateProvider.preferredLanguage('zh-TW');
	}
})();

(function() {
	angular.module('starter')
	.factory('LangUpdateSrv', ['$translate', langUpdateSrv]);

	function langUpdateSrv($translate) {
		console.log("Language update srv init");

		var ret = {
			updateLanguage: updateLanguage,
		};
		return ret;

		function updateLanguage() {
			console.log("### updateLanguage");
			if (typeof navigator.globalization === 'undefined') {
				$translate.use('en-US');
				return;
			}

			navigator.globalization.getPreferredLanguage(function(language) {
				var lang = getLanguage(language.value);
				console.log('language: ' +lang + '(' +language.value +')');
				$translate.use(lang);
			}, function () {
				console.log('Error getting language');
			});
		}

		function isLangMatched(full, shorthand) {
			if (!strncmp(full, shorthand, shorthand.length))
				return true;
			else
				return false;
		}

		function getLanguage(alias) {
			for (var i = 0; i < transLocaleArray.length; i++) {
				var item = transLocaleArray[i];

				if (typeof item.lang === 'string') {
					if (isLangMatched(alias, item.lang)) {
						return item.lang;
					}
				}
				else {
					/* assume it's an array */
					for (var j = 0; j < item.lang.length; j++) {
						if (isLangMatched(alias, item.lang[j])) {
							return item.lang[j];
						}
					}
				}
			}

			return 'en-US'; /* default */
		}
	}
})();


