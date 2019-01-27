(function() {
	angular.module('starter')
		.controller('HomeCtrl', [ '$rootScope', '$scope', '$ionicBackdrop', '$ionicPopup', '$ionicPlatform', '$timeout', '$state', '$translate', 'ShareScr', 'SweetAlert', 'localStorageService', homeCtrl ]);

	function homeCtrl($rootScope, $scope, $backdrop, $popup, $platform, $timeout, $state, $translate, shareScr, SweetAlert, $localStorage) {
		console.log("Home ctrl running ...");

		var vm = this;

		init();

		function init() {
			vm.isSharing = false;
			vm.allowViewHistory = true;

			vm.onVShare = onVShare;
			vm.onVHistory = onVHistory;
			vm.onVBack = onVBack;
			vm.onVInfo = onVInfo;

			$platform.ready(function() {
				if (!window.plugins) return;
				MobileAccessibility.usePreferredTextZoom(false);
			});

			$rootScope.$on('$stateChangeSuccess', onStateChanged);
		}

		function showRPMGaugeImage() {
			// Set imageMask width/height to fit current canvas
			var canvas = document.getElementById('rpm-gauge');
			var img = canvas.toDataURL("image/png");

			// var copycatHolder = document.getElementById('copycat-holder');
			// copycatHolder.style.display = 'inline';

			var copycat = document.getElementById('copycat');
			copycat.src = img;
			copycat.style.display = '';

			// copycat.offsetWidth = canvas.offsetWidth;
			// copycat.offsetHeight = canvas.offsetHeight;
			// copycat.offsetLeft = canvas.offsetLeft;
			// copycat.offsetTop = canvas.offsetTop;

			// imageMask.classList.add('image-mask');

			// imageMask.src = img;
			// imageMask.offsetWidth = canvas.offsetWidth;
			// imageMask.offsetHeight = canvas.offsetHeight;
			// imageMask.offsetLeft = canvas.offsetLeft;
			// imageMask.height = canvas.height;
			// imageMask.width = canvas.width;
			// imageMask.clientWidth = canvas.clientWidth;
			// imageMask.clientHeight = canvas.clientHeight;
			// imageMask.clientLeft = canvas.clientLeft;
			// imageMask.clientTop = canvas.clientTop;

			console.log("canvas origianl display: " +canvas.style.display);
			canvas.style.display = "none";
		}

		function hideRPMGaugeImage() {
			var canvas = document.getElementById('rpm-gauge');
			if (canvas)
				canvas.style.display = "";

			var copycat = document.getElementById('copycat');
			if (copycat) {
				copycat.src = "";
				copycat.style.display = 'none';
			}
		}

		function shareScreen() {
			shareScr.share(50, function() {
				console.log("share screen done");
				$timeout(function() {
					vm.isSharing = false;
					StatusBar.backgroundColorByHexString("#0d7cd5"); // restore

					if ($state.current.name == 'workout') {
						$timeout(function() {
							hideRPMGaugeImage();
						}, 2000);
					}
				}, 100);
			});
		}

		function isHidden(el) {
			var style = window.getComputedStyle(el);
			return (style.display === 'none')
		}

		function onVShare() {
			console.log("home, vshare");

			if (vm.isSharing) return;
			vm.isSharing = true;

			if (window.plugins)
				StatusBar.backgroundColorByHexString("#ffffff");

			if ($state.current.name == 'workout') {
				showRPMGaugeImage();

				var runningDiv = document.getElementById('workout-running-layout');
				if (!runningDiv || isHidden(runningDiv)) {
					if (!window.plugins) {
						vm.isSharing = false;
						return;
					}

					$timeout(function() {
						shareScreen();
					}, 750);
					return;
				}

				var userName = $localStorage.get('userName');
				var userMsg = $localStorage.get('userMsg');

				vm.nameHint = $translate.instant('Name');
				vm.msgHint = $translate.instant('Thoughts');
				vm.shareMsg = {
					userName : userName,
					userMsg : userMsg,
				};

				if (ionic.Platform.isIOS() && window.plugins)
					cordova.plugins.Keyboard.disableScroll(false);

				vm.shareMsgAnswered = false;
				var myPopup = $popup.show({
					templateUrl: "templates/share-msg.html",
					title: $translate.instant('Screenshot Message'),
					subTitle: $translate.instant('This will appear on your shared screenshot.'),
					scope: $scope,
					buttons: [
						{
							text: $translate.instant('Cancel'),
							onTap: function(e) {
								console.log("sharemsg, CANCEL");
								vm.shareMsgAnswered = true;

								if (ionic.Platform.isIOS() && window.plugins)
									cordova.plugins.Keyboard.disableScroll(true);

								vm.isSharing = false;
							}
						},
						{
							text: $translate.instant('OK'),
							type: 'button-positive',
							onTap: function(e) {
								console.log("sharemsg, OK");
								vm.shareMsgAnswered = true;

								if (ionic.Platform.isIOS() && window.plugins)
									cordova.plugins.Keyboard.disableScroll(true);

								$localStorage.set("userName", vm.shareMsg.userName);
								$localStorage.set("userMsg", vm.shareMsg.userMsg);

								var signalData = {
									userName : vm.shareMsg.userName,
									msg : vm.shareMsg.userMsg,
								};
								emitSignal("home:screenshot", signalData);

								if (!window.plugins) {
									vm.isSharing = false;
									return;
								}

								$timeout(function() {
									shareScreen();
								}, 750);
							}
						}
					]
				});

				myPopup.then(function(res) {
					console.log("sharemsg, myPopup, res=" +res +" answered=" +vm.shareMsgAnswered);
					if (!vm.shareMsgAnswered) {
						console.log("  -> dismissed");
						vm.isSharing = false;
					}
				});

				return;

				swal.withForm({
					title: $translate.instant('Screenshot Message'),
					text: $translate.instant('This will appear on your shared screenshot.'),
					showCancelButton: true,
					confirmButtonColor: '#DD6B55',
					confirmButtonText: $translate.instant('OK'),
					cancelButtonText: $translate.instant('Cancel'),
					closeOnConfirm: true,
					formFields: [
						{ id: 'name', placeholder:$translate.instant('Name'), value: userName },
						{ id: 'msg', type: 'textarea', placeholder:$translate.instant('Thoughts'), value: userMsg },
					]
				}, function(isConfirm) {
					// do whatever you want with the form data
					console.log(this.swalForm); // { name: 'user name', nickname: 'what the user sends' }

					if (!isConfirm) {
						vm.isSharing = false;
					} else {
						$localStorage.set("userName", this.swalForm.name);
						$localStorage.set("userMsg", this.swalForm.msg);

						var signalData = {
							userName : this.swalForm.name,
							msg : this.swalForm.msg
						};
						emitSignal("home:screenshot", signalData);

						if (!window.plugins) {
							vm.isSharing = false;
							return;
						}

						$timeout(function() {
							shareScreen();
						}, 750);
					}

				});
			} else {
				if (!window.plugins) {
					vm.isSharing = false;
					return;
				}

				$timeout(function() {
					shareScreen();
				}, 750);
			}
		}

		function onVHistory() {
			console.log("home, onVHistory()");
			$state.go("history");
		}

		function onVBack() {
			console.log("home, onVBack()");
			emitSignal("home:logo", null);
		}

		function emitSignal(signal, data) {
			// console.log("acc, emitSignal " +signal + " "+data);
			$rootScope.$emit(signal, data);
		}

		function onStateChanged(event, toState, toParams, fromState, fromParams) {
			console.log("/// HOME State changed : " +fromState.name + " -> " +toState.name);
			if (toState.name == 'dash')
				vm.allowViewHistory = true;
			else
				vm.allowViewHistory = false;
		}

		function onVInfo($event) {
			$state.go('info');
		}
        function onVSignin($event) {
			$state.go('signin');
		}
        function onVSignup($event) {
			$state.go('signup');
		}
	}
}())

