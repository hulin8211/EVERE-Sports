(function() {
	angular.module('starter')
	.controller('DashCtrl', [ '$rootScope', '$scope', '$ionicPlatform', '$ionicHistory', '$translate', '$ionicLoading', '$ionicModal', '$interval', '$timeout', '$state', 'WorkoutService', 'SFX', 'AccMeter', 'SysOptsService', 'LangUpdateSrv', 'SweetAlert', '$cordovaFacebook', dashCtrl ]);

	function dashCtrl($rootScope, $scope, $platform, $history, $translate, $loading, $modal, $interval, $timeout, $state, wos, sfx, accMeter, sysOpts, langUpdate, SweetAlert) {
		var vm = this;
		var currStateName = 'tab.dash';

		console.log("DashCtrl running...");

		init();

		function init() {
			vm.connState = 'OFF';
			vm.deviceListingMonitor = null;
			vm.lastDeviceListedSignalTimestamp = Date.now();
			vm.connectingDialogVisible = false;

			initNearbyEmmArray();
			initVHandlers();

			accMeter.init();
			initRootEventHandlers();
			initConnectingDialog();

			updateUnitSystem();
			// updateNumTodayStats();

			$platform.ready(function() {
				if (!window.plugins) return;

				langUpdate.updateLanguage();
				setBackgroundModeMsg();

				$platform.on('resume', function() {
					console.log("dash.ctrl, resume");
					langUpdate.updateLanguage();
					setBackgroundModeMsg();
				});

				if (ionic.Platform.isAndroid()) {
					checkExternalStorageReadPermission();
				}

				cordova.plugins.backgroundMode.on('activate', function() {
					console.log("dash.ctrl, bg mode, ACTIVATE");
				});
				cordova.plugins.backgroundMode.on('deactivate', function() {
					console.log("dash.ctrl, bg mode, DEACTIVATE");
				});
				cordova.plugins.backgroundMode.on('failure', function() {
					console.log("dash.ctrl, bg mode, FAILURE");
				});
			});
		}

		function initConnectingDialog() {
			$modal.fromTemplateUrl('templates/connecting-dialog.html', {
				scope: $scope,
				animation: 'slide-in-up',
				// hardwareBackButtonClose: false
			}).then(function(modal) {
				vm.connectingDialog = modal;
			});
		}

		function setBackgroundModeMsg() {
			cordova.plugins.backgroundMode.setDefaults({
				title: $translate.instant('X-Bike'),
				ticker: $translate.instant('Running in the background'),
				text: $translate.instant('Running in the background'),
			});
		}

		function checkExternalStorageReadPermission() {
			var permissions = cordova.plugins.permissions;
			permissions.hasPermission(permissions.READ_EXTERNAL_STORAGE, checkPermissionCallback, null);

			function checkPermissionCallback(status) {
				if (!status.hasPermission) {
					var errorCallback = function () {
						console.warn('Storage permission is not turned on');
					}
					permissions.requestPermission(
						permissions.READ_EXTERNAL_STORAGE,
						function (status) {
							if (!status.hasPermission) {
								errorCallback();
							} else {
								// continue with downloading/ Accessing operation 
								// $scope.downloadFile();
							}
						},
						errorCallback);
				}
			}
		}

		function initVHandlers() {
			vm.onVScan = onVScan;
			vm.onVConnectDev = onVConnectDev;
			vm.onVAbort = onVAbort;
			vm.onVPlay = onVPlay;
			vm.onVToggleUnits = onVToggleUnits;
		}

    function initRootEventHandlers() {
			vm.rootEvHandlers = [];
			var handler;

			handler = $rootScope.$on('acc:CONN', onAccEvConnection);
			vm.rootEvHandlers.push(handler);

			handler = $rootScope.$on('acc:LIST', onAccEvList);
			vm.rootEvHandlers.push(handler);

			handler = $rootScope.$on('wos-updated', onWosUpdated);
			vm.rootEvHandlers.push(handler);

			handler = $rootScope.$on('$stateChangeSuccess', onStateChanged);
			vm.rootEvHandlers.push(handler);

			handler = $rootScope.$on('sysOpts:UNIT', onUnitChanged);
			vm.rootEvHandlers.push(handler);

			$scope.$on('$destroy', function() {
				// keepScreenOn(false);
				// console.log("workout, destroy, unbind");
				// for (var i = 0; i < sys.rootEvHandlers.length; i++) {
				// 	sys.rootEvHandlers[i]();
				// }
				// sys.rootEvHandlers = [];
			});
    }

		function getEmptyEmm() {
			var emm = {
				name: null,
				rssi: '?',
			};
			return emm;
		}

		function idHash(id) {
			// var parts = id.split(':');
			// var hash;

			// var num;
			// for (var i = 0; i < parts.length; i++) {
			// 	num = parseInt(parts[i], 16);
			// 	console.log("num: " +num);
			// }
			// return hash;

			var hash = 0, i, chr;
			if (id.length === 0) return hash;
			for (i = 0; i < id.length; i++) {
				chr   = id.charCodeAt(i);
				hash  = ((hash << 5) - hash) + chr;
				hash |= 0; // Convert to 32bit integer
			}
			if (hash < 0) hash = -hash;
			return (hash % 10000);
		}

		function initNearbyEmmArray() {
			vm.nearbyEmms = [];
			vm.nearbyEmms.push(getEmptyEmm());
			vm.nearbyEmms.push(getEmptyEmm());
			vm.nearbyEmms.push(getEmptyEmm());
		}

		function onAccEvConnection(ev, type) {
			console.log("DASH, vm.connState=" + vm.connState +" acc ev, CONN=" +type);
            console.log("state.current.name=" +$state.current.name);
			switch (type) {
				case 'ON':
					// if (vm.connState == 'LINKING') {
					// 	start(sys.tmpGoal);
					// }
					if ($state.current.name == currStateName) {
                        console.log(" * dash, going into workout");
						vm.connState = 'ON';
						$state.go('workout');
						$timeout(function() {
							showMsg(null);
							playConnectedSound(true);
						}, 250);

						stopListingDevices();
					}
					break;
				case 'OFF':
				case 'NG':
					vm.connState = 'OFF';
					showMsg(null);
					accMeter.disconnect(); // just to be sure

					break;
			}
		}

		function onAccEvList(ev, devices) {
			if (devices !== null) {
				console.log("DASH, AccEvList, got " + devices.length + " motion monitors");
				console.log(JSON.stringify(devices));
			} else
				console.log("DASH, AccEvList, got NULL");

			if (devices && devices.length) {
				vm.lastDeviceListedSignalTimestamp = Date.now();

				var devs = cloneObj(devices);
				devs.sort(function(a, b) {
					return (b.rssi - a.rssi);
				});

				for (var i = 0; i < vm.nearbyEmms.length; i++) {
					if (i >= devs.length) {
						if (vm.nearbyEmms[i].name)
							vm.nearbyEmms[i] = getEmptyEmm();
						continue;
					}

					if (vm.nearbyEmms[i].name && (devs[i].id == vm.nearbyEmms[i].id)) {
						vm.nearbyEmms[i].rssi = devs[i].rssi;
					} else {
						vm.nearbyEmms[i].id = devs[i].id;
						// vm.nearbyEmms[i].name = '#' +(i+1);
						vm.nearbyEmms[i].name = '#' +idHash(devs[i].id);
						vm.nearbyEmms[i].rssi = devs[i].rssi;
					}
				}
			} else {
				for (var i = 0; i < vm.nearbyEmms.length; i++) {
						if (vm.nearbyEmms[i].name)
							vm.nearbyEmms[i] = getEmptyEmm();
						continue;
				}
			}

			console.log("DASH, AccEvList, connState=" +vm.connState);
			if (vm.connState != 'SCANNING') {
				stopListingDevices();
				accMeter.stopListing();
			}

			if (devices === null) {
				console.log("dash, end of scanning");
				onVAbort();
			}

			return;
			if (vm.connState == 'SCANNING') {
				$timeout(function() {
					startListingDevices();
				}, 1000);
			} else {
				stopListingDevices();
			}
		}

		function onVScan() {
			console.log("onVScan, connState=" +vm.connState);
			stopListingDevices();
			accMeter.listDevices(null);

			if (vm.connState != 'OFF')
				return;

			initNearbyEmmArray();

			vm.connState = 'SCANNING';
			startListingDevices();

			// accMeter.connect('emm');
			// showMsg("CONNECTING");
			showMsg("SCANNING");
		}

		function onVConnectDev(dev) {
			if ((!dev.name) || (!dev.id)) return;

			stopListingDevices();
			accMeter.listDevices(null);

			if (vm.connState != 'SCANNING')
				return;

			vm.connState = 'LINKING';

			accMeter.connectDirect(dev);
			showMsg("CONNECTING");
			// showMsg(null);
		}

		function onVAbort() {
			console.log("dash, onVAbort()");

			vm.connState = 'OFF';

			stopListingDevices();
			accMeter.stopListing();
			accMeter.disconnect();

			showMsg(null);
		}

		function showMsg(msg) {
			console.log("showMsg, msg=" +msg);

			if (msg) {
				vm.connectingMsg = $translate.instant(msg);
				if (!vm.connectingDialogVisible) {
					/* Reload only if it is not already visible */
					$loading.show({
						templateUrl: "templates/connecting-dialog.html",
						scope: $scope,
						delay: 250,
					});
					vm.connectingDialogVisible = true;
				}
			} else {
				$loading.hide();
				vm.connectingDialogVisible = false;
			}
		}

		function onWosUpdated(event) {
			console.log("dash, wos updated!");

			updateNumTodayStats();
		}

    function formatDuration(sec) {
			var h, m, s;

			h = Math.floor(sec/3600);
			sec = Math.floor(sec - h*3600);
			m = Math.floor(sec/60);
			s = sec%60;

			if (h > 0) {
				vm.vTodayDuration = sprintf("%d:%02d:%02d", h, m, s);
                vm.vDurationUnit = $translate.instant("hh:mm:ss");
			} else {
				vm.vTodayDuration = sprintf("%02d:%02d", m, s);
                vm.vDurationUnit = $translate.instant("mm:ss");
			}
    }

		function updateNumTodayStats() {
			vm.numTodayReps = wos.getNumTodayReps();
			vm.todayDuration = wos.getTodayDuration();
            vm.TodayCalories = wos.getTodayCalories();
			var dist = wos.getTodayDistance();

			if (vm.isImperialUnit)
				dist = km2miles(dist);

			vm.todayDistance = dist;

			vm.vNumTodayReps = numeral(vm.numTodayReps).format('0,0');
			vm.vTodayDistance = numeral(vm.todayDistance).format('0.00');
            vm.vTodayCalories = numeral(vm.TodayCalories).format('0.0');
			formatDuration(vm.todayDuration);
		}
        

		function playConnectedSound(force) {
			if (!force) {
				if ($state.current.name != currStateName)
					return;
			}
			sfx.play('conn-ok');
		}
		function playConnectedFailedSound() {
			if ($state.current.name != currStateName) return;
			sfx.play('conn-ng');
		}

		function keepScreenOn(on) {
			console.log("Keep Screen On: " + on);
			if (window.plugins && window.plugins.insomnia) {
				if (on)
					window.plugins.insomnia.keepAwake();
				else
					window.plugins.insomnia.allowSleepAgain();
			}
		}

		function onStateChanged(event, toState, toParams, fromState, fromParams) {
			console.log("/// State changed : " +fromState.name + " -> " +toState.name);
			if (toState.name == 'tab.dash') {
				console.log("Had gone back to dashboard!");

				if (window.cordova) {
					cordova.plugins.backgroundMode.disable();
					keepScreenOn(false);
				}

				accMeter.disconnect();
				vm.connState = 'OFF';

				updateNumTodayStats();

				// startListingDevices(); // NOTE: this will cause the App to FREEZE... don't know wy

				$timeout(function() {
					console.log(" clearing history");
					$history.clearHistory();
					$history.clearCache();
				}, 1);

				if (window.plugins && window.plugins.insomnia) {
					/* Allow sleep */
					window.plugins.insomnia.allowSleepAgain();
				}
			}
		}

		function onUnitChanged(event, isImperial) {
			console.log("dash, unit changed, isImperial=" +isImperial);

			updateUnitSystem();
			showUnitChangedMsg();
		}

		function stopListingDevices() {
			if (vm.deviceListingMonitor) {
				$interval.cancel(vm.deviceListingMonitor);
				vm.deviceListingMonitor = null;
			}
		}

		function startListingDevices() {
			stopListingDevices();

			accMeter.listDevices('emm');
			vm.lastDeviceListedSignalTimestamp = Date.now();

			vm.deviceListingMonitor = $interval(function() {
				var currTs = Date.now();
				var diffTs = currTs - vm.lastDeviceListedSignalTimestamp;

				console.log("dash.ctrl: listing monitor, diffTs=" +diffTs);
			}, 1000);
		}

		function onVPlay() {
			if (!window.cordova) return;
			VideoPlayer.play("file:///android_asset/www/img/video/duo-xbike-1333x750.mp4");
		}

		function onVToggleUnits() {
			console.log("dash, onVToggleUnits");
			var isImperial = !vm.isImperialUnit;

			if (isImperial)
				sysOpts.setImperialUnitSystem();
			else
				sysOpts.setMetricUnitSystem();
		}

		function updateUnitSystem() {
			vm.isImperialUnit = sysOpts.isImperialUnitSystem();
			if (vm.isImperialUnit)
				vm.vDistUnit = $translate.instant("MI");
			else
				vm.vDistUnit = $translate.instant("km");

			updateNumTodayStats();
		}

    function showUnitChangedMsg() {
			var title, msg;

			console.log("dash, showUnitChangedMsg, isImperialUnit=" +vm.isImperialUnit);

			title = $translate.instant('New Unit System');

			msg = '<p style="font-size:30px; font-family:Anton; color:rgba(0,0,0,0.5);">';
			if (vm.isImperialUnit)
				msg += $translate.instant("IMPERIAL");
			else
				msg += $translate.instant("METRIC");

			msg += '</p>';

			SweetAlert.swal({
				html: true,
				title: title,
        text: msg,
				showConfirmButton: true,
				confirmButtonColor: "#2196f3",
				confirmButtonText: $translate.instant('OK'),
				type: "success",
				timer: 5000,
			});
    }
        $scope.data = {};

  $scope.signupEmail = function(){  

    var ref = new Firebase("https://<YOUR-FIREBASE-APP>.firebaseio.com");

    ref.createUser({
      email    : $scope.data.email,
      password : $scope.data.password
    }, function(error, userData) {
      if (error) {
        console.log("Error creating user:", error);
      } else {
        console.log("Successfully created user account with uid:", userData.uid);
      }
    });

  };

  $scope.loginEmail = function(){

    var ref = new Firebase("https://<YOUR-FIREBASE-APP>.firebaseio.com");

    ref.authWithPassword({
      email    : $scope.data.email,
      password : $scope.data.password
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      } else {
        console.log("Authenticated successfully with payload:", authData);
      }
    });

  };
        
  

	}
}())

