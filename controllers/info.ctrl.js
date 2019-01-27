(function() {
	angular.module('starter')
		.controller('InfoCtrl', [ '$rootScope', '$scope', '$ionicHistory', '$translate', '$state', infoCtrl ]);

	function infoCtrl($rootScope, $scope, $history, $translate, $state) {
		console.log("Info Ctrl init...");

		var vm = this;
		var sys = {};

		init();

		function init() {
			vm.creditsVisible = false;
			vm.helpVisible = false;

			fmtSWVersion();

			initAckItems();
			initHelpItems();
			initRootEventHandlers();
			initVHandlers();
		}

		function initVHandlers() {
			vm.onVToggleHelp = onVToggleHelp;
			vm.onVToggleCredits = onVToggleCredits;
            vm.onVToggleVideo = onVToggleVideo;
		}

		function fmtSWVersion() {
			vm.swVersion = $translate.instant('APP Version');
			vm.swVersion += ' : ' + APP_VERSION;
		}

		function initAckItems() {
			vm.ackItems = [];

			addSimpleItem(vm.ackItems, 'Ionic Framework/Cordova', 'Thanks for such a wonderful App framework to work with!');
			addSimpleItem(vm.ackItems, 'Freepik', 'Icon made by Freepik from www.flaticon.com');
			addSimpleItem(vm.ackItems, 'Smashicons', 'Icon made by Smashicons from www.flaticon.com');
			addSimpleItem(vm.ackItems, 'gauge.js', '100% native and cool looking animated JavaScript/CoffeeScript gauge from http://bernii.github.io/gauge.js/');
			addSimpleItem(vm.ackItems, 'Chart.js', 'Simple yet flexible JavaScript charting for designers & developers from http://www.chartjs.org/');
		}

		function addSimpleItem(arr, name, desc) {
			var item = {
				name: name,
				desc: desc,
			};

			arr.push(item);
		}

		function initHelpItems() {
			var desc;

			vm.helpItems = [];

			desc = '<div style="margin-left:10px; border-left:1px solid #ccc; padding-left:10px;">';
			desc += $translate.instant('<b>Startup</b>: <b style="color:red;">RED LED</b> will be on for a couple of seconds. It will then wait for connection.');
			desc += '<br><br>';
			desc += $translate.instant('<b>Waiting for connection</b>: <b style="color:green;">GREEN LED</b> will flash <b>once</b> per second.');
			desc += '<br><br>';
			desc += $translate.instant('<b>Connected</b>: <b style="color:green;">GREEN LED</b> will flash <b>twice</b> per second.');
			desc += '<br><br>';
			desc += $translate.instant('<b>Connected and Transmitting Data</b>: <b style="color:green;">GREEN LED</b> will flash <b>three times</b> per second.');
			desc += '<br><br>';
			desc += $translate.instant('<b>Sleep</b>: No LEDs');
			desc += '</div>';
			addSimpleItem(vm.helpItems, $translate.instant('Motion Monitor Status LEDs'), desc);

			addSimpleItem(vm.helpItems, $translate.instant('Wake up from sleep'), $translate.instant('Shake the motion monitor a bit.'));
		}

    function initRootEventHandlers() {
			sys.rootEvHandlers = [];
			var handler;

			console.log("//////////////////////////////////////////");
			console.log("info.ctrl, initializing root event handlers");
			console.log("//////////////////////////////////////////");

			// handler = $rootScope.$on("home:screenshot", onHomeScreenshotInfo);
			// sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("home:logo", onHomeLogoClicked);
			sys.rootEvHandlers.push(handler);

			$scope.$on('$destroy', function() {
				for (var i = 0; i < sys.rootEvHandlers.length; i++) {
					sys.rootEvHandlers[i]();
				}
				sys.rootEvHandlers = [];
			});
    }

		function onHomeLogoClicked(event, info) {
			$state.go("tab.dash");
		}

		function onVToggleCredits() {
			vm.creditsVisible = !vm.creditsVisible;
		}
		function onVToggleHelp() {
			vm.helpVisible = !vm.helpVisible;
		}
        function onVToggleVideo() {
			vm.videoVisible = !vm.videoVisible;
		}
	}
}());

