(function() {
	angular.module('starter')
	.controller('WorkoutCtrl', [ '$rootScope', '$scope', '$ionicPlatform', '$ionicLoading', '$translate', '$stateParams', '$ionicHistory', '$state', '$interval', '$timeout', 'SweetAlert', 'WorkoutService', 'ShareScr', 'SFX', 'AccMeter', 'SysOptsService', 'localStorageService', workoutCtrl ]);

	function workoutCtrl($rootScope, $scope, $platform, $loading, $translate, $stateParams,  $history, $state, $interval, $timeout, SweetAlert, wos, shareScr, sfx, accMeter, sysOpts, $localStorage) {

		var PREV_SESSION_DATA_VERSION = 3;
		var vm = this;
		var sys = {};  /* private data */
		var currStateName = 'workout';

		console.log("Workout Ctrl init");

		init();

		function init() {
			vm.allowRestart = false;
			vm.timeGoalEnabled = false;
			vm.repsGoalEnabled = false;

			vm.isImperialUnit = sysOpts.isImperialUnitSystem();
			if (vm.isImperialUnit) {
				vm.vSpeedUnit = $translate.instant("MPH");
				vm.vDistUnit = $translate.instant("MI");
			} else {
				vm.vSpeedUnit = $translate.instant("km/h");
				vm.vDistUnit = $translate.instant("km");
			}
			vm.isAborting = false;
			vm.woIndex = 0;
			vm.wo = wos.getCurrWorkout();
      vm.runningTimer = null;
      vm.goalReached = false;
			vm.goalPBar = null;
			vm.goalMsg = "";

			vm.countUpdateTs = 0;
			vm.spmMovingAverage = 0;
			vm.spmChecker = null;

			sys.pauseMonitor = null;

			sys.sessionSavingTimer = null;

			initViewHandlers();
      initRootEventHandlers();
			initRPMGauge();
			initGoalSliders();

			updateStartButtonMsg();

			sys.accMeterAlgorithm = 'REV';
			accMeter.selectAlgo(sys.accMeterAlgorithm);

			initFSM();
			updateRpmMsg();

			// start(sys.tmpGoal);

			if (window.cordova) {
				cordova.plugins.backgroundMode.enable();
			}

			loadPrevSessionData();
		}

		function initGoalSliders() {
			vm.timeGoalSlider = {
				value: 5,
				options: {
					step: 5,
					floor: 5,
					ceil: 60,
					showTicks: true,
					ticksArray: [5, 10, 20, 30, 60],
					translate: function(value, sliderId, label) {
						switch (label) {
								case 'ceil':
								case 'floor':
									return '';
								case 'model':
								default:
								return '<b style="font-family:Antonio-Light; letter-spacing:2px; font-size:2.0em;">' +value +'</b> ' +$translate.instant('min');
						}
					},
					onChange: function(id, val) {
						updateStartButtonMsg();
					},
				},
			};

			vm.repsGoalSlider = {
				value: 100,
				options: {
					floor: 100,
					ceil: 2000,
					step: 100,
					showTicks: true,
					ticksArray: [100, 1000, 1500, 2000 ],
					translate: function(value, sliderId, label) {
						switch (label) {
								case 'ceil':
								case 'floor':
									return '';
								case 'model':
								default:
								return '<b style="font-family:Antonio-Light; font-size:2.0em; letter-spacing:2px;">' +numeral(value).format(',') +'</b> ' +$translate.instant('cycles');
						}
					},
					onChange: function(id, val) {
						updateStartButtonMsg();
					},
				},
			};

		}

		function initRPMGauge() {
			var MAX_RPM = 160;
			var LABEL_GAP = 20;

			var labels = [];

			for (var i = 0; i <= MAX_RPM; i += LABEL_GAP) {
				labels.push(i);
			}
			var numLabels = labels.length;

			// var staticZonesColors = [
			// 		"#cccccc", "#fec34d", "#00a86b", "#2196f3", "#ff2800",
			// ];
			var staticZones = [
					// {strokeStyle: "#cccccc", min: 0, max: 40},
					// {strokeStyle: "#fec34d", min: 41, max: 80},
					// {strokeStyle: "#00a86b", min: 81, max: 120},
					// {strokeStyle: "#2196f3", min: 121, max: 160},
					// {strokeStyle: "#ff2800", min: 161, max: 200},

					{strokeStyle: "#fec34d", min: 0, max: 20},
                    {strokeStyle: "#fec34d", min: 21, max: 40},
					{strokeStyle: "#00a86b", min: 41, max: 60},
                    {strokeStyle: "#00a86b", min: 61, max: 80},
					{strokeStyle: "#2196f3", min: 81, max: 100},
                    {strokeStyle: "#2196f3", min: 101, max: 120},
					{strokeStyle: "#ff2800", min: 121, max: 140},
                    {strokeStyle: "#ff2800", min: 141, max: 160},
			];

			var opts = {
				limitMax: true,
				radiusScale: 0.9,
				angle: 0.0, /// The span of the gauge arc
				lineWidth: 0.12, // The line thickness
				pointer: {
					length: 0.45, // Relative to gauge radius
					strokeWidth: 0.04 // The thickness
				},
				generateGradient: true,
				colorStart: '#00ff00',   // Colors
				colorStop: '#ff0000',    // just experiment with them
				strokeColor: '#E0E0E0',   // to see which ones work best for you
				staticLabels: {
					font: "22px LeagueGothic-Regular",
					// labels: [0, 20, 40, 60, 80, 100, 120, 140, 160],
					labels: labels,
				},
				staticZones: staticZones,
			};

			var target = document.getElementById('rpm-gauge'); // your canvas element
			var gauge = new Gauge(target).setOptions(opts); // create sexy gauge!
			gauge.maxValue = MAX_RPM; // set max gauge value
			gauge.setMinValue(0);  // set min value
			gauge.set(0); // set actual value

			vm.rpmGauge = gauge;
		}

		function initFSM() {
			var fsmEvents = initFsmEvents();
			var fsmEvHandlers = initFsmEvHandlers();

			sys.fsm = StateMachine.create({
				initial: 'INIT',
				events: fsmEvents,
				callbacks: fsmEvHandlers,
			});

			sys.fsm.init();
		}

		function initFsmEvents() {
			var events = [
				{
					name: 'init',
					from: 'INIT', to: 'IDLE'
				},
				{
					name: 'start',
					from: ['IDLE', 'PAUSED', 'REPORT' ], to: 'RUNNING'
				},
				{
					name: 'pause',
					from: 'RUNNING', to: 'PAUSED'
				},
				{
					name: 'report',
					from: ['RUNNING', 'PAUSED'], to: 'REPORT'
				},
				{
					name: 'stop',
					from: ['RUNNING', 'PAUSED', 'REPORT'], to: 'IDLE'
				},
			];

			return events;
		}

		function initFsmEvHandlers() {
			var handlers = {
				onenterIDLE: evEnterIdle,
				onenterRUNNING: evEnterRunning,
				onenterPAUSED: evEnterPaused,
				onenterREPORT: evEnterReport,

				onleaveIDLE: evLeaveIdle,
				onleavePAUSED: evLeavePaused,
				onleaveREPORT: evLeaveReport,
				onleaveRUNNING: evLeaveRunning,
			};
			return handlers;
		}

		function logFsmEv(ev, from, to, msg) {
			console.log("%c WORKOUT FSM : " +ev + " (" +from + " -> " +to + ")", "color:white; background-color:#33cd5f;");
			if (typeof msg !== 'undefined')
				console.log("  msg : " +msg);
		}

		function resetAll() {
			stopRunningTimer();
			stopSPMChecker();

			if (vm.goalPBar) {
				vm.goalPBar.destroy();
				vm.goalPBar = null;
				vm.goalMsg = "";
			}

			vm.goalReached = false;
			initRunningStats();

			setCount(0);
			setSPM(0);
			setCalories(0);
			resetSPMData();

			keepScreenOn(false);
			accMeter.clearCount('ALL');

			// Get count from accm
			sys.prevAccmCount = accMeter.getCount(sys.accMeterAlgorithm);
		}

		function evEnterIdle(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			if ((from == "PAUSED") || (from == "RUNNING"))
				saveSessionData();

			resetAll();

			vm.isIdle = true;
			vm.allowRestart = false;

			updateRpmMsg();
		}

		function evEnterRunning(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.isPulsing = false;
			vm.goalReached = false;
			vm.allowResume = false;

			sys.lastActionRepTime = 0;

			if (from != 'PAUSED' && !vm.shouldReloadPrevSession) {
				accMeter.clearCount('ALL');
				setTime(vm.runningStats.time, 0);
				setCount(0);
			}
			setSPM(0);
			resetSPMData();

			if (vm.shouldReloadPrevSession)
				reloadPrevSession();

			initGoalPBar();

			accMeter.setInterval(50);

			sys.pulsingTS = Date.now();

			keepScreenOn(true);
      startRunningTimer();

			updateRpmMsg();
			sys.prevAccmCount = accMeter.getCount(sys.accMeterAlgorithm);

			startSessionSavingTimer();
		}

		function stopSessionSavingTimer() {
			if (sys.sessionSavingTimer) {
				$interval.cancel(sys.sessionSavingTimer);
				sys.sessionSavingTimer = null;
			}
		}
		function startSessionSavingTimer() {
			stopSessionSavingTimer();
			sys.sessionSavingTimer = $interval(function() {
				if (sys.fsm.is("RUNNING"))
					saveSessionData();
				else {
					stopSessionSavingTimer();
				}
			}, 3000);
		}

		function unschedulePauseMonitor() {
			if (sys.pauseMonitor) {
				$timeout.cancel(sys.pauseMonitor);
				sys.pauseMonitor = null;
			}
		}

		/**
		 * Schedule a paused-state monitor.
		 * Get into IDLE state after 45 seconds of inactivity.
		 */
		function schedulePauseMonitor() {
			unschedulePauseMonitor();
			sys.pauseMonitor = $timeout(function() {
				sys.pauseMonitor = null;
				accMeter.setInterval(0);
				accMeter.disconnect();
				sys.fsm.stop();
			}, 60000);
		}

		function evEnterPaused(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.allowRestart = false;
			vm.allowResume = true;

			stopRunningTimer();
			stopSPMChecker();

			calculateAverageSPM();

			schedulePauseMonitor();
			// accMeter.pause();
		}

		function calculateAverageSPM() {
			/* Update the Strokes-per-minute field */
			if (vm.runningStats.time.sec > 0) {
				console.log("Calculating average spm, Got time: " +vm.runningStats.time.sec);
				console.log("Got count: " +vm.currCount);
				var spm = (60*vm.currCount)/vm.runningStats.time.sec;
				spm = sprintf("%.0f", spm);

				setSPM(spm);
			} else {
				setSPM(0);
				resetSPMData();
			}
		}

		function evEnterReport(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.allowRestart = true;
			stopRunningTimer();
			stopSPMChecker();

			calculateAverageSPM();

      vm.timeCountDownMode = false;
      vm.counterCountDownMode = false;

			if (vm.currGoal) {
				if (typeof vm.currGoal.time !== 'undefined') {
					if (vm.runningStats.time.sec > (vm.currGoal.time*60))
						setTime(vm.runningStats.time, vm.currGoal.time*60);
					else
						setTime(vm.runningStats.time, vm.runningStats.time.sec);
				} else if (typeof vm.currGoal.reps !== 'undefined') {
					if (vm.currCount > vm.currGoal.reps)
						setCount(vm.currGoal.reps);
					else
						setCount(vm.currCount);
				}
			} else {
				setTime(vm.runningStats.time, vm.runningStats.time.sec);
				setCount(vm.currCount);
			}

			if (vm.goalReached)
				playGoalReachedSound();

			accMeter.setInterval(0);
			vm.isPulsing = false;

			updateRpmMsg();

			saveSessionData();
		}

		function evLeaveIdle(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.isIdle = false;
		}

		function evLeavePaused(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.allowRestart = false;
			vm.allowResume = false;

			setSPM(0);
			resetSPMData();
			unschedulePauseMonitor();

			updateRpmMsg();
			// accMeter.resume();
		}

		function evLeaveReport(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);

			vm.allowRestart = false;
		}

		function evLeaveRunning(ev, from, to, msg) {
			logFsmEv(ev, from, to, msg);
			stopSessionSavingTimer();
		}

		function playNewRepSound() {
			// if ($state.current.name != currStateName) return;
			// sfx.play('repx1');
		}
		function playRepX10Sound() {
			if ($state.current.name != currStateName) return;
			sfx.play('repx10');
		}
		function playGoalReachedSound() {
			if ($state.current.name != currStateName) return;
			sfx.play('goalReached');
		}
		function playConnectedSound() {
			if ($state.current.name != currStateName) return;
			sfx.play('conn-ok');
		}
		function playConnectedFailedSound() {
			if ($state.current.name != currStateName) return;
			sfx.play('conn-ng');
		}

    function initRootEventHandlers() {
			sys.rootEvHandlers = [];
			var handler;

			console.log("//////////////////////////////////////////");
			console.log("workout, initializing root event handlers");
			console.log("//////////////////////////////////////////");

			handler = $rootScope.$on('acc:CONN', onAccEvConnection);
			sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("acc:ACTION-REP", onAccEvActionRep);
			sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("home:screenshot", onHomeScreenshotInfo);
			sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("home:logo", onHomeLogoClicked);
			sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("$stateChangeStart", onStateChangeStart);
			sys.rootEvHandlers.push(handler);

			$scope.$on('$destroy', function() {
				keepScreenOn(false);
				stopSessionSavingTimer();
				console.log("workout, destroy, unbind");
				for (var i = 0; i < sys.rootEvHandlers.length; i++) {
					sys.rootEvHandlers[i]();
				}
				sys.rootEvHandlers = [];
			});
    }

		function initViewHandlers() {
			vm.onVBack = onVBack;
			vm.onVStart = onVStart;
			vm.onVStop = onVStop;
			vm.onVQuit = onVQuit;
			vm.onVPause = onVPause;
			vm.onVGoalTime = onVGoalTime;
			vm.onVGoalReps = onVGoalReps;
			vm.onVShare = onVShare;
			vm.onVRestart = onVRestart;
			vm.onVLoadPrevSession = onVLoadPrevSession;
		}

		/**
		 * Save workout stats
		 */
		function saveWorkoutStats() {
			console.log("Saving workout stats...");

			var woStats = vm.wo.todayStats;
			var runningStats = vm.runningStats;

			if (typeof vm.currCount === 'undefined') return;
			if (typeof runningStats.time === 'undefined') return;
			if (typeof runningStats.time.sec === 'undefined') return;
			if (runningStats.time.sec <= 0) return;

			var dist = KM_PER_REV * vm.currCount; // in KM

			vm.vDistance = numeral(dist).format('0,0.00');

			var sessionStats = {
				woName: vm.wo.name,
				duration: runningStats.time.sec,
				numReps: vm.currCount,
				calories: vm.currCalories,
				distance: dist,
			};

			wos.writeWorkoutHistory(sessionStats);

			wos.setWorkoutTodayStats(vm.woIndex, {
				duration: woStats.duration + runningStats.time.sec,
				numReps : woStats.numReps + vm.currCount,
				calories : woStats.calories + vm.currCalories,
				distance : woStats.distance + dist,
			});
		}

		function onVBack() {
			vm.isAborting = true;
			if (!sys.fsm.is("IDLE")) {
				sys.fsm.stop();

				accMeter.setInterval(0);
				accMeter.disconnect();
			}

			$history.goBack();
		}

		function onVStop() {
			console.log("workout.ctrl : onVStop");

			/*
			 * Save the workout stats.
			 * @note This is the only place saving the workout stats is allowed.
			 * When the user presses STOP, the saved session data will be flagged
			 * as 'reporting'.  Reloading thie saved session will go straight into
			 * REPORT state.  In this state, the user will not be offered a 'STOP'
			 * button.  This way, we can prevent feeding the database with the same
			 * exercise data.
			 */
			saveWorkoutStats();
			sys.fsm.report();
			// accMeter.disconnect();
			// showMsg(null);
			// $state.go('dash');
		}

		function onVQuit() {
			accMeter.disconnect();
			showMsg(null);
			if (window.cordova) {
				cordova.plugins.backgroundMode.disable();
			}
			$state.go('tab.dash');
			resetAll();
			stopSessionSavingTimer();
		}

		function onVPause() {
			console.log("workout.ctrl : onVPause");
			if (!sys.fsm.is("PAUSED"))
				sys.fsm.pause();
			else
				sys.fsm.start();
		}

		function onVStart() {
			console.log("start, manual mode, connected=", accMeter.isConnected());
			resetAll();
			if (accMeter.isConnected()) {
				var goal = null;

				if (vm.timeGoalEnabled) {
					goal = {
						time: vm.timeGoalSlider.value,
						// time: 0.02, // for quick TESTING only
					};
				} else if (vm.repsGoalEnabled) {
					goal = {
						reps: vm.repsGoalSlider.value,
					};
				}
				start(goal);
			} else {
				/* not connected yet */
				// connect(null);
				onVQuit();
			}
		}

		function onVRestart() {
			if (!sys.fsm.is("REPORT") && !sys.fsm.is("PAUSED"))
				return;

			console.log("Restart");
			resetAll();

			if (accMeter.isConnected())
				start(vm.currGoal);
			else {
				/* not connected yet */
				// connect(vm.currGoal);
				onVQuit();
			}
		}

		function connect(goal) {
			return;
			vm.connState = 'LINKING';
			sys.tmpGoal = goal;
			accMeter.connect('emm');
			showMsg("Connecting");
		}

		function onVGoalTime() {
			vm.timeGoalEnabled = !vm.timeGoalEnabled;
			vm.repsGoalEnabled = false;
			updateStartButtonMsg();
		}

		function onVGoalReps() {
			vm.repsGoalEnabled = !vm.repsGoalEnabled;
			vm.timeGoalEnabled = false;
			updateStartButtonMsg();
		}

		function onVShare() {
			if (vm.isSharing) return;
			vm.isSharing = true;
			shareScr.share(50, function() {
				console.log("share screen done");
				$timeout(function() {
					vm.isSharing = false;
				}, 100);
			});
		}

		function start(goal, skipFSM) {
			vm.vShareTag = "";
			vm.vShareDate = "";
			vm.vShareMsg = "";

			vm.currGoal = goal;

      vm.timeCountDownMode = false;
      vm.counterCountDownMode = false;

      if (goal) {
        if (typeof goal.time != 'undefined') {
          vm.timeCountDownMode = true;
        } else
          vm.counterCountDownMode = true;
      }

			console.log("start, timeCountDownMode: " +vm.timeCountDownMode);
			console.log("start, counterCountDownMode: " +vm.counterCountDownMode);

			if (skipFSM) return;

			sys.fsm.start();
		}

    function initRunningStats() {
      var stats = {};

      initTime(stats);
      vm.runningStats = stats;
    }

    function initTime(stats) {
      var t = {};

      setTime(t, 0);
      stats.time = t;
    }

    function setTime(t, sec) {
      t.sec = sec;

      if (vm.timeCountDownMode) {
        // sec = vm.currGoal.time*60 - sec;
        // if (sec < 0)
        //   sec = 0;

				updateGoalProgress();
      }

			formatTime(t, sec);
    }

    function stopRunningTimer() {
      if (vm.runningTimer) {
        $interval.cancel(vm.runningTimer);
        vm.runningTimer = null;
      }
    }
    function startRunningTimer() {
			console.log("startRunningTimer");
      stopRunningTimer();
      vm.runningTimer = $interval(function() {
        var stats = vm.runningStats;

        setTime(stats.time, stats.time.sec+1);
        // setCalories(168*stats.time.sec)

        if (vm.timeCountDownMode) {
          if (stats.time.sec >= (vm.currGoal.time*60)) {
            /* Time goal has been reached */
            stopRunningTimer();
						vm.goalReached = true;
            showGoalReachedAlert();
						sys.fsm.report();
          }
        }

				var now = Date.now();

				/* comment out this to disable PAUSED state */
				// if (sys.fsm.is("RUNNING")) {
				// 	if ((now - sys.pulsingTS) >= 3000) {
				// 		sys.fsm.pause();
				// 	}
				// }

        // console.log("timer running");
      }, 1000);
    }

    function setCount(cnt) {
      vm.currCount = cnt;

			var dist = KM_PER_REV * cnt; // in KM
			if (vm.isImperialUnit)
				dist = km2miles(dist);

			vm.vDistance = numeral(dist).format('0,0.00');

      updateCalories(cnt);

      if (vm.counterCountDownMode) {
        // cnt = vm.currGoal.reps - cnt;
				updateGoalProgress();
      }
      if (cnt < 0) cnt = 0;
      vm.vCounts = numeral(cnt).format('0,0');

			var now = Date.now();
			if (!vm.countUpdateTs || !cnt) {
				vm.countUpdateTs = now;
			}

			if (vm.currCount > 0) {
				var gap = now - vm.countUpdateTs;

				vm.countUpdateTs = now;
				updateSPM(gap);
			}
    }

		function stopSPMChecker() {
			if (vm.spmChecker) {
				$timeout.cancel(vm.spmChecker);
				vm.spmChecker = null;
			}
		}

		function startSPMChecker() {
			stopSPMChecker();
			vm.spmChecker = $timeout(function() {
				vm.spmChecker = null;

				resetSPMData();
				setSPM(0);
			}, 3000);
		}

		function updateSPM(gap) {
			if (!sys.fsm.is("RUNNING")) {
				stopSPMChecker();
				return;
			}

			if (gap <= 200)
				return;

			var rate = (60 * 1000.0) / gap;
			var TOTAL = 2.0;
			var ALPHA = 1.0;

			// console.log("update spm, gap = " +gap);
			var tmp = vm.spmMovingAverage*(TOTAL - ALPHA) + rate*ALPHA;

			vm.spmMovingAverage = tmp/TOTAL;

			setSPM(vm.spmMovingAverage);

			if (vm.spmMovingAverage !== 0) {
				if (sys.fsm.is("RUNNING"))
					startSPMChecker();
				else
					stopSPMChecker();
			} else {
				stopSPMChecker();
			}
		}

    function setSPM(spm) {
      vm.vSPM = sprintf("%d", spm);

			vm.rpmGauge.set(spm); // set actual value

			var speed = KPH_PER_RPM * spm; // in kph
			if (vm.isImperialUnit)
				speed = km2miles(speed);
			vm.vSpeed = numeral(speed).format('0,0.0');

			vm.currRpm = spm;
    }

    function updateCalories() {
      // var kc = cnt * 0.15;
        
			var kc = vm.currCalories;
             console.log(kc)
			if (vm.vSpeed < 16)
				kc += 4*66*1/3600;
            else if(vm.vSpeed>=16 && vm.vSpeed<19.2)
                kc += 6*66*1/3600;
            else if(vm.vSpeed>=19.2 && vm.vSpeed<22.4)
                kc += 8*66*1/3600;
            else if(vm.vSpeed>=22.4 && vm.vSpeed<25.6)
                kc += 10*66*1/3600;
            else if(vm.vSpeed>=25.6 && vm.vSpeed<30.6)
                kc += 12*66*1/3600;
			else
				kc += 16*66*1/3600;
            
      
      
      setCalories(kc);
    
    }

    function setCalories(kc) {
      vm.currCalories = kc;
      Calories = kc;
      vm.vCalories = numeral(Calories).format('0,0.0');
    }

    function showGoalReachedAlert() {
      var goal = vm.currGoal;
      // var text = $translate.instant("Target: ");

      // if (vm.timeCountDownMode) {
      //   text = text +goal.time + " " +$translate.instant("min");
      // } else {
      //   text = text +goal.reps + " " +$translate.instant("reps");
      // }

			var text = '<span style="font-size:30px; font-family:LeagueGothic-Regular;color:#666666; font-weight:300;">';
			text += $translate.instant("TARGET") + "</span> ";
			text += ' <span style="font-size:60px; font-weight:300; font-family:LeagueGothic-Regular; color:#00a86b;">';

      if (vm.timeCountDownMode) {
				text += goal.time + "</span>";
      } else {
				text += goal.reps + "</span>";
      }

			text += '<span style="font-size:30px; font-weight:300; font-family: LeagueGothic-Regular; color:#666666;"> ';

      if (vm.timeCountDownMode) {
				text += $translate.instant("min");
      } else {
				text += $translate.instant("cycles");
      }
			text += "</span>";

			SweetAlert.swal({
				title: text,
				html: true,
				showConfirmButton: true,
				confirmButtonColor: "#2196f3",
				type: "success"
			});
    }

		function onAccEvConnection(ev, type) {
			console.log("workout, STATE=" + sys.fsm.current +" acc ev, CONN=" +type);
			switch (type) {
				case 'ON':
					if (vm.connState == 'LINKING') {
						// FIXME: 2017-09-02 commented out for testing
						// start(sys.tmpGoal);
					}
					vm.connState = 'ON';
					showMsg(null);
					playConnectedSound();
					break;
				case 'OFF':
				case 'NG':
					vm.connState = 'OFF';
					showMsg(null);
					playConnectedFailedSound();

					onVQuit(); // quick hack to avoid cumbersome handling
					return;

					if (!sys.fsm.is("RUNNING") && !sys.fsm.is("PAUSED")) {
						onVQuit(); // quick hack to avoid cumbersome handling
						return;
					}

					sys.fsm.report();
					onVQuit(); // quick hack to avoid cumbersome handling

					break;
			}
		}

		function onAccEvActionRep(event, type) {
			if (type != sys.accMeterAlgorithm) return;
			// if (!sys.fsm.is("RUNNING") && !sys.fsm.is("PAUSED")) return;
			if (!sys.fsm.is("RUNNING")) return;

      // console.log("z : " +z);
			var currAccmCount = accMeter.getCount(sys.accMeterAlgorithm);

			var oldCount = vm.currCount;
			var currCount = oldCount + (currAccmCount - sys.prevAccmCount);

			sys.prevAccmCount = currAccmCount;

      if (vm.counterCountDownMode) {
        if (currCount >= vm.currGoal.reps) {
          /* Time goal has been reached */
          stopRunningTimer();
					setCount(currCount);
					vm.goalReached = true;
          showGoalReachedAlert();
					sys.fsm.report();
					return;
        }
      }

			if (currCount != oldCount) {
				/* New count, beep */
				vm.isPulsing = true;
				sys.pulsingTS = Date.now();
				$timeout(function() {
					vm.isPulsing = false;
				}, 750);
				sys.lastActionRepTime = Date.now();
				setCount(currCount);
				if ((currCount % 10) !== 0)
					playNewRepSound();
				else
					playRepX10Sound();

				if (sys.fsm.is("PAUSED")) {
					sys.fsm.start();
				}
			}
		}

		function onHomeScreenshotInfo(event, info) {
			console.log("workout, onHomeScreenshotInfo");
			console.log(info);

			// if (info.userName || info.msg)
			// 	vm.vShareDate = moment(now).format("YYYY-MM-DD hh:mm A");
			// else
			// 	vm.vShareDate = "";

			if (info.userName) {
				vm.userName = info.userName;

				var now = new Date();
				// vm.vShareTag = vm.userName;
				vm.vShareTag = vm.userName /*+ " @ " + moment(now).format("YYYY-MM-DD HH:mm")*/;
			} else {
				vm.vShareTag = "";
			}
            

			if (info.msg)
				vm.vShareMsg = info.msg;
			else
				vm.vShareMsg = "";

			$timeout(function() {
				// vm.vShareTag = "";
				// vm.vShareMsg = "";
				// vm.vShareDate = "";
			}, 2000);
		}

		function onHomeLogoClicked(event, info) {
			if (!accMeter.isConnected()) {
				onVQuit();
				return;
			}

			if (sys.fsm.is("RUNNING") || sys.fsm.is("PAUSED") || sys.fsm.is("REPORT")) {
				console.log("homeLogoClicked, Running | Paused | Report");
				sys.fsm.stop();
			} else {
				$state.go("tab.dash");
			}
		}

		function initGoalPBar() {
			if (vm.goalPBar) {
				vm.goalPBar.destroy();
				vm.goalPBar = null;
				vm.goalMsg = "";
			}

			console.log("init goal progress bar");
			var pbarId = '#w-stats-goal-pbar';
			var pbar = new ProgressBar.Line(pbarId, {
				strokeWidth: 2,
				easing: 'easeInOut',
				// duration: 1400,
				duration: 500,
				color: '#FFEA82',
				trailColor: '#eee',
				trailWidth: 1,
				svgStyle: {width: '100%', height: '100%'},
				from: {color: '#ED6A5A', a:0},
				to: {color: '#27ae60', a:1},
				step: function(state, bar) {
					bar.path.setAttribute('stroke', state.color);
				},
			});
			console.log("pbar :");
			console.log(pbar);

			vm.goalPBar = pbar;
			updateGoalProgress();
		}

		function updateGoalProgress() {
			var frac = 0.0;

			if (!vm.goalPBar) return;
			if (!sys.fsm.is("RUNNING") && !sys.fsm.is("IDLE"))
				return;

      if (vm.counterCountDownMode) {
				frac = vm.currCount/vm.currGoal.reps;
				if (frac > 1.0) frac = 1.0;

				formatCounterCountDownMsg(vm.currCount, frac);
			} else if (vm.timeCountDownMode) {
				frac = vm.runningStats.time.sec / (vm.currGoal.time*60.0);
				if (frac > 1.0) frac = 1.0;

				formatTimeCountDownMsg(vm.runningStats.time.sec, frac);
			} else {
				vm.goalMsg = "";
				return;
			}

			// console.log("goal progress frac: " +frac);
			vm.goalPBar.stop();
			vm.goalPBar.animate(frac);
		}

		function showMsg(msg) {
			console.log("showMsg, msg=" +msg);
			if (msg) {
				vm.connectingMsg = $translate.instant(msg);
				$loading.show({
					templateUrl: "templates/connecting-dialog.html",
					scope: $scope
				});
			} else {
				$loading.hide();
			}
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

    function showStoppedMsg() {
			console.log("show stopped msg...");
			SweetAlert.swal({
				title: "Calculating statistics...",
        // text: text,
				showConfirmButton: false,
				type: "warning",
				timer: 2000,
			});
    }

		function resetSPMData() {
			vm.spmMovingAverage = 0;
		}

		function updateStartButtonMsg() {
			if (!vm.timeGoalEnabled && !vm.repsGoalEnabled) {
				vm.startButtonGoalMsg = null;
				return;
			}

			vm.startButtonGoalMsg = ' ';

			if (vm.timeGoalEnabled) {
				vm.startButtonGoalMsg += vm.timeGoalSlider.value;
				vm.startButtonGoalMsg += " " +$translate.instant('min');
				return;
			}

			if (vm.repsGoalEnabled) {
				vm.startButtonGoalMsg += numeral(vm.repsGoalSlider.value).format(',');
				vm.startButtonGoalMsg += " " +$translate.instant('cycles');
				return;
			}
		}

		function formatTime(t, sec) {
			var h, m, s;

			h = Math.floor(sec/3600);
			sec = Math.floor(sec - h*3600);
			m = Math.floor(sec/60);
			s = sec%60;

			if (h > 0)
				t.vHours = sprintf("%d", h);
			else
				t.vHours = null;
      t.vMinutes = sprintf("%02d", m);
      t.vSeconds = sprintf("%02d", s);
		}

		function formatTimeCountDownMsg(elapsed, frac) {
				var tmp = {};

				formatTime(tmp, vm.currGoal.time*60);

				if (tmp.vHours)
					vm.goalMsg = tmp.vHours +":" +tmp.vMinutes +":" +tmp.vSeconds;
				else
					vm.goalMsg = tmp.vMinutes +":" +tmp.vSeconds;

				vm.goalPct = sprintf("%.0f", frac*100.0);
				vm.goalPct += '%';

				var leftSec = vm.currGoal.time*60 - elapsed;
				if (leftSec < 0) leftSec = 0;
				formatTime(tmp, leftSec);

				if (tmp.vHours)
					vm.goalRemaining = tmp.vHours +":" +tmp.vMinutes +":" +tmp.vSeconds;
				else
					vm.goalRemaining = tmp.vMinutes +":" +tmp.vSeconds;
		}

		function formatCounterCountDownMsg(currCount, frac) {
				var tmp = {};

				formatTime(tmp, vm.currGoal.time*60);

				vm.goalMsg = numeral(vm.currGoal.reps).format('0,0') +" " +$translate.instant("cycles");

				vm.goalPct = sprintf("%.0f", frac*100.0);
				vm.goalPct += '%';

				var left = vm.currGoal.reps - currCount;
				if (left < 0) left = 0;
				vm.goalRemaining = numeral(left).format('0,0') +" " +$translate.instant("cycles");
		}

		function updateRpmMsg() {
			if (sys.fsm.is("REPORT")) {
				vm.rpmMsg = $translate.instant("Average RPM :");
				vm.rpmMsg += " " +vm.currRpm;
			} else {
				vm.rpmMsg = $translate.instant("RPM");
			}
		}

		function saveSessionData() {
			// console.log("workout, saving session data");
			if (vm.runningStats.time.sec <= 0) {
				console.log("  -> skip, not overriding the saved session");
				console.log("  runningStats");
				console.log(JSON.stringify(vm.runningStats));
				return;
			}

			var t = {};

			t.version = PREV_SESSION_DATA_VERSION;
			t.savedTimestamp = Date.now();
			t.duration = vm.runningStats.time.sec;
			t.reps = vm.currCount;
			t.calories = vm.currCalories;

			t.goal = vm.currGoal;

			t.reporting = sys.fsm.is("REPORT");
			// console.log(" reporting=" +t.reporting);

			if ((t.duration == vm.prevSessionData.duration) && vm.allowLoadPrevSession &&
				(t.reps == vm.prevSessionData.reps) && (t.reporting == vm.prevSessionData.reporting)) {
					console.log(" seems to be a duplicate, skip");
					return;
				}

			vm.prevSessionData = t;
			vm.allowLoadPrevSession = true;

			var json = JSON.stringify(vm.prevSessionData);

			$localStorage.set('workout-tmpData', json);
		}

		function loadPrevSessionData() {
			var tmpData = $localStorage.get('workout-tmpData');

			if (!tmpData) {
				initPrevSessionData();
				return;
			}

			vm.prevSessionData = JSON.parse(tmpData);

			if (vm.prevSessionData.version != PREV_SESSION_DATA_VERSION) {
				// Need to match the version
				initPrevSessionData();
				return;
			}

			// Check if the previous session is saved within 5 minutes
			if ((Date.now() - vm.prevSessionData.savedTimestamp) < (5*60000)) {
				vm.allowLoadPrevSession = true;
			} else
				vm.allowLoadPrevSession = false;
		}

		function initPrevSessionData() {
			var t = {};

			t.version = PREV_SESSION_DATA_VERSION;
			t.duration = 0;
			t.reps = 0;
			t.calories = 0;
			t.savedTimestamp = 0;

			vm.prevSessionData = t;
			vm.allowLoadPrevSession = false;
			// vm.allowLoadPrevSession = true;
		}

		function onVLoadPrevSession() {
			console.log("on load prev session, allow=" +vm.allowLoadPrevSession);
			if (!vm.allowLoadPrevSession) return;

			vm.shouldReloadPrevSession = true;
			sys.fsm.start();
			if (vm.prevSessionData.reporting) {
				console.log(" -> reporting");
				sys.fsm.report();
			}
		}

		function onStateChangeStart(event, toState, toParams, fromState, fromParams, options) {
			console.log("workout, state changing start -> " +toState.name);
			if (toState.name !== 'workout') {
				saveSessionData();
				stopSessionSavingTimer();
			}
		}

		function reloadPrevSession() {
			console.log("workout, reloadPrevSession");

			if (!vm.shouldReloadPrevSession) return;

			vm.shouldReloadPrevSession = false;

			console.log(JSON.stringify(vm.prevSessionData));

			var t = vm.prevSessionData;

			vm.runningStats.time.sec = t.duration;
			setCount(t.reps);
			setCalories(t.calories);

			setTime(vm.runningStats.time, t.duration);
			start(t.goal, true);
		}
	} // end of workoutCtrl
}())

