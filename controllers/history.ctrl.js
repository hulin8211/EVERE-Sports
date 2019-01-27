(function() {
	angular.module('starter')
	.controller('HistoryCtrl', [ '$rootScope', '$scope', '$state', '$timeout', '$interval', '$ionicHistory', '$ionicLoading', '$ionicModal', '$ionicPopup', '$translate', '$cordovaCamera',  'ShareScr', 'HistorySrv', 'SysOptsService', 'LangUpdateSrv', historyCtrl ]);

	function historyCtrl($rootScope, $scope, $state, $timeout, $interval, $history, $loading, $modal, $popup, $translate,$cordovaCamera, shareScr, historySrv, sysOpts, langUpdate) {
		var vm = this;
		var sys = {};

		var fakingForTesting = false;

		console.log("History Controller init, v#1");

		init();

		function init() {
			vm.isImperialUnit = sysOpts.isImperialUnitSystem();
			if (vm.isImperialUnit) {
				vm.vSpeedUnit = $translate.instant("MPH");
				vm.vDistUnit = $translate.instant("MI");
			} else {
				vm.vSpeedUnit = $translate.instant("km/h");
				vm.vDistUnit = $translate.instant("KM");
			}

			vm.dataSets = {
				'cycles' : { visible: true, },
				'duration' : { visible: true, },
				'distance' : { visible: true, },
				'rpm' : { visible: true, },
                'calories' : { visible: true, },
			};

			initViewHandlers();

			vm.currMonth = {};
			vm.statsByMonth = [];

			initRootEventHandlers();

			showLoadingMsg("Loading", true);
			prepareMonthlyView();
            

			/* defer the loading a bit to smooth out the transition */
			$timeout(function() {
				vm.loadingStartTS = Date.now();
				if (!fakingForTesting)
					historySrv.loadAll(true);

				if (window.plugins && !fakingForTesting) return;
				genStats(); // faking it
			}, 500);
		}

		function initViewHandlers() {
			vm.onVSelectMonth = onVSelectMonth;
            vm.onVSelectCalendar = onVSelectCalendar;
			vm.onVAbort = onVAbort;
			vm.onVBack = onVBack;
            vm.onViewMonthlyData = onViewMonthlyData;
			vm.onViewDailyData = onViewDailyData;
			vm.onViewData = onViewData;
			vm.onVAdjMonth = onVAdjMonth;
            vm.onVAdjDate = onVAdjDate;
			vm.onVShare = onVShare;
		}
        
        function initFakeMonthlyChartData() {
			var m = vm.currMonth;
			var data = [];
			for (var i = 0; i < 31; i++) {
				if (m.name == "2017-9")
					data.push(i*2 + 9);
				else
					data.push(i*2 + 0);
			}
			vm.currChartData = i;
			return data;
		}
        
        function initFakeDailyChartData() {
			var data = [];
			for (var i = 0; i < 3; i++) {
				// data.push(100+i*2);
				data.push(i+1);
			}
			vm.currChartData = i;
			return data;
		}

		function initFakeChartData() {
			var data = [];
			for (var i = 0; i < 31; i++) {
				data.push(i*2);
			}
			vm.currChartData = i;
			return data;
		}

		function changeChartData() {
			$interval(function() {
				vm.chartData.shift();
				vm.currChartData++;
				vm.chartData.push(vm.currChartData);
				vm.myChart.update();
			}, 500);
		}
        
        function initFakeMonthlyChart(set) {
			var canvas = document.getElementById("myMonthlyChart");
			// console.log('canvas : ');
			// console.log(canvas);
			// console.log('canvas width,height: ' + canvas.width + ', ' +canvas.height);

			vm.currChartDataSet = set;
			vm.monthlyChartData = initFakeMonthlyChartData();
			vm.monthlyChartLabels = initMonthlyChartLabels(vm.monthlyChartData.length);
			var xLabel = $translate.instant('Day');
			var chartTitle = "Test Title";

			vm.myMonthlyChart = new Chart(canvas, {
				type: 'line',
				data: {
					labels: vm.monthlyChartLabels,
					datasets: [{
						fill: false,
						label: 'RPM',
						fill: true,
						data: vm.monthlyChartData,
						borderColor: vm.monthlyChartLineColor,
						backgroundColor: vm.monthlyChartLineAreaColor,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					title: {
						display:false,
						position: 'top',
						text: chartTitle,
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							scaleLabel: {
								display: false,
								labelString: vm.currMonth.name,
								fontFamily: 'Antonio-Regular',
								fontSize: 14,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: 'RPM',
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								callback: fmtChartLabelY,
							},
						}],
					}
				}
			});
		}

		function initFakeChart(set) {
			var canvas = document.getElementById("myChart");
			console.log('canvas : ');
			console.log(canvas);
			console.log('canvas width,height: ' + canvas.width + ', ' +canvas.height);

			vm.currChartDataSet = set;
			vm.chartData = initFakeChartData();
			vm.chartLabels = initChartLabels(vm.chartData.length);

			var xLabel = $translate.instant('Day');
			var chartTitle = "Test Title";

			// var ctx = canvas.getContext('2d');
			// var gradientFill = ctx.createLinearGradient(0, 0, 0, canvas.height);
			// gradientFill.addColorStop(0, "rgba(32, 227, 178, 0.8)"); // top
			// gradientFill.addColorStop(1, "rgba(255, 153, 102, 0.8)"); //bottom

			vm.myChart = new Chart(canvas, {
				type: 'line',
				data: {
					// labels: ["Red", "Blue", "Yellow", "Green", "Purple", "Orange"],
					labels: vm.chartLabels,
					datasets: [{
						fill: false,
						label: 'RPM',
						data: vm.chartData,
						borderColor: '#2196f3',
						fill: true,
						backgroundColor: 'rgba(33, 105, 243, 0.1)',
						// backgroundColor: gradientFill,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					// layout: {
					// 	padding: {
					// 		right: 30,
					// 	},
					// },
					title: {
						display:false,
						position: 'top',
						text: chartTitle,
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							scaleLabel: {
								display: false,
								labelString: vm.currMonth.name,
								fontFamily: 'Antonio-Regular',
								fontSize: 14,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: 'RPM',
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								callback: fmtMonthlyChartLabelY,
							},
						}],
					}
				}
			});

			// changeChartData();
		}
        
        function initMonthlyChartData(set) {
			var m = vm.currMonth;
			var data = [];

			for (var i = 0; i < m.items.length; i++) {
				var item = m.items[i];

				if (set == 'cycles')
					data.push(item.numReps);
				else if (set == 'duration')
					data.push(item.duration);
				else if (set == 'rpm') {
					data.push(item.avgSPM);
				} else if (set == 'distance') {
					var dist = item.distance;
					if (vm.isImperialUnit)
						dist = km2miles(dist);

					data.push(dist);
				} else {
					return [];
				}
			}
			return data;
		}

		function initChartData(set) {
			var m = vm.currMonth;
			var data = [];

			for (var i = 0; i < m.items.length; i++) {
				var item = m.items[i];

				if (set == 'cycles')
					data.push(item.numReps);
				else if (set == 'duration')
					data.push(item.duration);
                else if (set == 'calories')
					data.push(item.calories);
				else if (set == 'rpm') {
					data.push(item.avgSPM);
				} else if (set == 'distance') {
					var dist = item.distance;
					if (vm.isImperialUnit)
						dist = km2miles(dist);

					data.push(dist);
				} else {
					return [];
				}
			}
			return data;
		}
        
        function initMonthlyChartLabels(len) {
			var labels = [];

			for (var i = 0; i < len; i++) {
				var lb = i + 1;
				if (lb == 1) {
					labels.push(lb);
				} else if ((lb % 10) == 0) {
					labels.push(lb);
				} else
					labels.push("");
			}
			return labels;
		}

		function initChartLabels(len) {
			var labels = [];

			for (var i = 0; i < len; i++) {
				var lb = i + 1;
				if (lb == 1) {
					labels.push(lb);
				} else if ((lb % 10) == 0) {
					labels.push(lb);
				} else
					labels.push("");
			}
			return labels;
		}
        
        function initMonthlyChart(set, force) {
			if (!force && (set == vm.currChartDataSet))
				return;

			if (vm.myMonthlyChart) {
				vm.myMonthlyChart.destroy();
				vm.myMonthlyChart = null;
			}

			if (!window.plugins || fakingForTesting) {
				initFakeMonthlyChart(set);
				return;
			}

			vm.currChartDataSet = set;

			var setLabels = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : vm.vDistUnit,
				'duration' : $translate.instant('DURATION'),
				'rpm' : $translate.instant('RPM'),
			};
			var chartTitle = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : $translate.instant('DISTANCE'),
				'duration' : $translate.instant('DURATION'),
				'rpm' : $translate.instant('Revolutions per Minute'),
			};

			var canvas = document.getElementById("myMonthlyChart");
			console.log('canvas : ');
			console.log(canvas);

			vm.monthlyChartData = initMonthlyChartData(set);
			vm.monthlyChartLabels = initMonthlyChartLabels(vm.monthlyChartData.length);

			vm.myMonthlyChart = new Chart(canvas, {
				type: 'line',
				data: {
					labels: vm.monthlyChartLabels,
					datasets: [{
						fill: false,
						label: setLabels[set],
						data: vm.monthlyChartData,
						fill: true,
						borderColor: vm.monthlyChartLineColor,
						backgroundColor: vm.monthlyChartLineAreaColor,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					title: {
						display:false,
						position: 'top',
						text: chartTitle[set],
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							scaleLabel: {
								display: false,
								labelString: vm.currMonth.name,
								fontFamily: 'Antonio-Regular',
								fontSize: 16,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: setLabels[set],
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								callback: fmtChartLabelY,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
					}
				}
			});
		}

		function initChart(set) {
			if (set == vm.currChartDataSet)
				return;

			if (vm.myChart) {
				vm.myChart.destroy();
				vm.myChart = null;
			}

			if (!window.plugins || fakingForTesting) {
				initFakeChart(set);
				return;
			}

			vm.currChartDataSet = set;

			var setLabels = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : vm.vDistUnit,
				'duration' : $translate.instant('DURATION'),
                'calories' : $translate.instant('CALORIES'),
				'rpm' : $translate.instant('RPM'),
			};
			var chartTitle = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : $translate.instant('DISTANCE'),
				'duration' : $translate.instant('DURATION'),
                'calories' : $translate.instant('CALORIES'),
				'rpm' : $translate.instant('Revolutions per Minute'),
			};

			var canvas = document.getElementById("myChart");
			console.log('canvas : ');
			console.log(canvas);

			vm.chartData = initChartData(set);
			vm.chartLabels = initChartLabels(vm.chartData.length);

			vm.myChart = new Chart(canvas, {
				type: 'line',
				data: {
					labels: vm.chartLabels,
					datasets: [{
						fill: false,
						label: setLabels[set],
						data: vm.chartData,
						borderColor: '#2196f3',
						fill: true,
						backgroundColor: 'rgba(33, 105, 243, 0.1)',
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					title: {
						display:false,
						position: 'top',
						text: chartTitle[set],
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							scaleLabel: {
								display: false,
								labelString: vm.currMonth.name,
								fontFamily: 'Antonio-Regular',
								fontSize: 16,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: setLabels[set],
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								callback: fmtMonthlyChartLabelY,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
					}
				}
			});
		}

		function timeString(sec, compact) {
			var hh, mm, ss;

			hh = Math.floor(sec/3600);
			sec = Math.floor(sec - hh*3600);
			mm = Math.floor(sec/60);
			ss = sec%60;

			var ret = "";

			if (compact && !hh) {
				ret = sprintf("%02d:%02d", mm, ss);
			} else
				ret = sprintf("%02d:%02d:%02d", hh, mm, ss);

			return ret;
		}

		function fmtMonthlyChartLabelY(label, index, labels) {
			if (vm.currChartDataSet == 'cycles')
				return label;

			if (vm.currChartDataSet == 'rpm')
				return label;
            
            if (vm.currChartDataSet == 'calories')
				return label;

			if (vm.currChartDataSet == 'duration')
				return timeString(parseInt(label), true);

			if (vm.currChartDataSet == 'distance')
				return toFixedFloat(label, 1);

			return "";
		}

		function showLoadingMsg(msg, busy) {
			// if (busy) {
			// 	vm.loadingMsg = $translate.instant(msg);
			// 	$loading.show({
			// 		// template: msg
			// 		templateUrl: "history-loading-dialog.html",
			// 		scope: $scope
			// 	});
			// } else
			// 	$loading.hide();

			vm.isLoading = busy;
		}

		function onVSelectMonth($index) {
			console.log("On select month");

			var month = vm.statsByMonth[$index];
			month.indexInStats = $index; // cryptic naming to avoid collision

			console.log(JSON.stringify(month));

			vm.currMonth = month;
			if (!vm.monthlyViewVisible) {
				vm.modal.show();
				vm.monthlyViewVisible = true;
			}

			var nItems = vm.statsByMonth.length;
			if (nItems <= 1) {
				vm.noPrevMonth = true;
				vm.noNextMonth = true;
			} else {
				if ($index == 0) {
					vm.noNextMonth = true;
				} else
					vm.noNextMonth = false;

				if ($index >= (nItems - 1)) {
					vm.noPrevMonth = true;
				} else {
					vm.noPrevMonth = false;
				}
			}

			onViewData('none');
            onViewMonthlyData('none');

			$timeout(function() {
				vm.dataSets['cycles'].visible = true;
				// vm.dataSets['duration'].visible = true;
				$timeout(function() {
					// initChart('duration');
					initChart('cycles');
				}, 500);
			}, 150);

			$timeout(function() {
				/* Resize 'chart-div' */
				var chartDiv = document.getElementById("chart-div");
				var content = document.getElementById("content");
				var topParts = document.getElementById("monthly-top");

				// console.log(chartDiv);
				// console.log(content);
				// console.log(topParts);

				console.dir(chartDiv);
				console.dir(content);
				console.dir(topParts);

				var h = content.height - topParts.height;

				// console.log("content w: " +content.clientWidth);
				// console.log("content h: " +content.clientHeight);

				// console.log("top w: " +topParts.clientWidth);
				// console.log("top h: " +topParts.clientHeight);

				// console.log("chartDiv w: " +chartDiv.clientWidth);
				// console.log("chartDiv h: " +chartDiv.clientHeight);
				// console.log("chartDiv offset w: " +chartDiv.offsetWidth);
				// console.log("chartDiv offset h: " +chartDiv.offsetHeight);

				// console.log("chartDiv offset left: " +chartDiv.offsetLeft);
				// console.log("chartDiv offset top: " +chartDiv.offsetTop);

				chartDiv.style.height = (content.clientHeight - chartDiv.offsetTop) + 'px';

			}, 0);

			return;
		}
        
        function onVSelectCalendar($index) {
			console.log("On select calendar, $index:" +$index);

			var month = vm.statsByMonth[$index];
			month.indexInStats = $index; // cryptic naming to avoid collision

			vm.calendarMonth = month;

			// console.log(JSON.stringify(month));

			showCalendar(month);
		}

		function onVAbort() {
			if (vm.isLoading) {
				showLoadingMsg('', false);
				$state.go('dash');
			}
		}

		function hideMonthlyView(forceHide) {
			if (vm.monthlyViewVisible) {
				if (forceHide)
					vm.modal.hide();

				vm.monthlyViewVisible = false;
				if (vm.myChart) {
					// $timeout(function() {
					// 	console.log(" --> destroy my chart");
					// 	vm.myChart.destroy();
					// 	vm.myChart = null;
					// }, 500);
				}
			}
		}
        
        function hideDailyView(forceHide) {
			if (vm.dailyViewVisible) {
				if (forceHide)
					vm.dailyModal.hide();

				vm.dailyViewVisible = false;
			}
		}

		function onVBack() {
			console.log("history, onVBack, monthlyViewVisible=" + vm.monthlyViewVisible);
			if (vm.monthlyViewVisible) {
				hideMonthlyView(true);
			} else {
				$history.goBack();
			}
		}

		function onVShare() {
			console.log("history, vshare");

			if (vm.isSharing) return;
			vm.isSharing = true;

			if (window.plugins)
				StatusBar.backgroundColorByHexString("#ffffff");

			canvas2Image('myChart', 'copycat');

			if (!window.plugins) {
				vm.isSharing = false;
				return;
			}

			$timeout(function() {
				shareScreen();
			}, 750);
		}

		function shareScreen() {
			shareScr.share(50, function() {
				console.log("history, share screen done");
				$timeout(function() {
					vm.isSharing = false;
					StatusBar.backgroundColorByHexString("#0d7cd5"); // restore

					$timeout(function() {
						hideCanvasImage('myChart', 'copycat');
					}, 2000);
				}, 100);
			});
		}

		function canvas2Image(canvasId, imgId) {
			// Set imageMask width/height to fit current canvas
			var canvas = document.getElementById(canvasId);
			var img = canvas.toDataURL("image/png");

			var w = canvas.clientWidth;
			var h = canvas.clientHeight;

			console.log("canvas origianl display: " +canvas.style.display);
			canvas.style.display = "none";

			// var copycatHolder = document.getElementById('copycat-holder');
			// copycatHolder.style.display = 'inline';

			var copycat = document.getElementById(imgId);
			copycat.src = img;

			copycat.style.width = w + 'px';
			copycat.style.height = h + 'px';
			copycat.style.display = '';

		}

		function hideCanvasImage(canvasId, imgId) {
			var canvas = document.getElementById(canvasId);
			if (canvas)
				canvas.style.display = "";

			var copycat = document.getElementById(imgId);
			if (copycat) {
				copycat.src = "";
				copycat.style.display = 'none';
			}
		}

    function initRootEventHandlers() {
			sys.rootEvHandlers = [];
			var handler;

			handler = $rootScope.$on("home:logo", onHomeLogoClicked);
			sys.rootEvHandlers.push(handler);

			handler = $rootScope.$on("history:loadAll", onHistoryLoadAllEv);
			sys.rootEvHandlers.push(handler);

			$scope.$on('$destroy', function() {
				console.log("history, destroy, unbind");
				for (var i = 0; i < sys.rootEvHandlers.length; i++) {
					sys.rootEvHandlers[i]();
				}
				sys.rootEvHandlers = [];

				if (vm.myChart) {
					console.log(" --> destroy my chart");
					vm.myChart.destroy();
					vm.myChart = null;
				}

				if (vm.modal) {
					vm.modal.remove();
				}
			});
    }

		function onHomeLogoClicked(event, info) {
			console.log("history, home logo clicked");
			$state.go("tab.dash");
		}

		function onHistoryLoadAllEv(event, statsByMonth) {
			console.log("history, loadall ev from history.service");
			console.log("  --> statsByMonth");
			console.log(statsByMonth);
			console.log(JSON.stringify(statsByMonth));

			vm.statsByMonth = statsByMonth;
			for (var i = 0; i < statsByMonth.length; i++) {
				var m = statsByMonth[i];
				var dist = m.totalDistance;

				if (vm.isImperialUnit)
					dist = km2miles(dist);

				m.vTotalDistance = numeral(dist).format('0,0.00');
			}

			vm.vDistance = numeral(dist).format('0,0.00');

			/* Try to keep the spinner going for at least 1.5 sec */
			var elapsed = Date.now() - vm.loadingStartTS;
			var deferMsec;

			if (elapsed > 1500)
				deferMsec = 0;
			else
				deferMsec = 1500 - elapsed;

			$timeout(function() {
				showLoadingMsg("", false);
			}, deferMsec);
		}

		function genStats() {
			var months = [];

			var month = {
				name: '2017-9',
				totalNumReps: 100,
				vTotalNumReps: 100,
				timeHours: '00',
				timeMinutes: '01',
				timeSeconds: '02',
				vHMS: '00:01:02',
				avgSPM: 155,
				totalDistance: 1.123,
			};

			var dist = month.totalDistance;
			if (vm.isImperialUnit)
				dist = km2miles(dist);

			month.vTotalDistance = numeral(dist).format('0,0.00');

			months.push(cloneObj(month));

			month.name = '2017-8';
			month.totalNumReps = 200;
			month.vTotalNumReps = 200;
			months.push(cloneObj(month));

			// onHistoryLoadAllEv(null, months);
			vm.statsByMonth = months;
			showLoadingMsg("", false);
		}

		function prepareMonthlyView() {
			vm.monthlyViewVisible = false;
			$modal.fromTemplateUrl('templates/monthly.modal.html', {
				scope: $scope,
				animation: 'slide-in-up'
			}).then(function(modal) {
				vm.modal = modal;
				// initChart();
			});

			$scope.$on('modal.hidden', function() {
				console.log("monthly view hidden!");
				if (vm.monthlyViewVisible) {
					console.log("  -> modal is still visible");
					hideMonthlyView(false);
				} else {
					console.log("  -> modal is NOT visible");
					$state.go("dash");
				}
				vm.monthlyViewVisible = false;
			});
			$scope.$on('modal.removed', function() {
				console.log("monthly view removed!");
				vm.monthlyViewVisible = false;
				vm.modal = null;
			});
		}

		function onViewData(set) {
			for (var p in vm.dataSets) {
				if (p == set) {
					vm.dataSets[p].visible = true;
				} else
					vm.dataSets[p].visible = false;
			}

			if (set != 'none')
				initChart(set);
		}
        
        function onViewMonthlyData(set) {
			for (var p in vm.dataSets) {
				if (p == set) {
					vm.dataSets[p].visible = true;
				} else
					vm.dataSets[p].visible = false;
			}

			if (set != 'none')
				initMonthlyChart(set, false);
		}

		function onVAdjMonth(dir) {
			console.log("onAdjMonth, dir=" +dir);
			var m = vm.currMonth;
			var index = m.indexInStats;

			index += dir;
			if (index < 0)
				index = 0;

			if (index >= (vm.statsByMonth.length))
				index = vm.statsByMonth.length;

			if (index == m.indexInStats)
				return;

			onVSelectMonth(index);
		}
        
        function onVAdjDate(dir) {
			console.log("onVAdjDate, dir=" +dir);

			var selMonth = vm.calendarMonth;
			var nextIndex = -1;
			var currItem = selMonth.items[vm.currDateIndex];

			console.log("currDateIndex: " +vm.currDateIndex);
			console.log(currItem);
			if (dir < 0) {
				/* load previous */
				nextIndex = currItem.calendarPrevDateIndex;
			} else {
				/* load next */
				nextIndex = currItem.calendarNextDateIndex;
			}

			if ((typeof(nextIndex) == 'undefined') || !nextIndex)
				return; // something's wrong...

			currItem = selMonth.items[nextIndex];
			var date = currItem.date;
			var fmt = sprintf("%04d-%02d-%02d",
				date.getFullYear(), date.getMonth()+1, date.getDate());

			historySrv.loadDate(fmt);
		}
        
        function initMachine() {
			var mach = sysOpts.getMachineName();

			switch (mach) {
				case 'evs-elliptical':
				case 'evs-spinbike':
					vm.monthlyChartLineColor = '#ef473a';
					vm.monthlyChartLineAreaColor = 'rgba(239, 71, 58, 0.1)';

					vm.dailyChartLineColor = '#ef473a';
					vm.dailyChartLineAreaColor = 'rgba(239, 71, 58, 0.8)';
					break;
				default:
					//'duoxbike':
					vm.monthlyChartLineColor = '#2196f3';
					vm.monthlyChartLineAreaColor = 'rgba(33, 105, 243, 0.1)';

					vm.dailyChartLineColor = 'rgba(33, 105, 243, 0.8)';
					vm.dailyChartLineAreaColor = 'rgba(33, 105, 243, 0.3)';
					break;
			}
		}

		

    function showCalendar(month) {
			var title;

			title = $translate.instant('Select the date');

			vm.loadingDateHistory = false;
			vm.calendarMsg = $translate.instant('Select the date to view workouts by day.');

			vm.popup = $popup.show({
				templateUrl: "templates/datepicker-dialog.html",
				title: $translate.instant('View Daily Workouts'),
				scope: $scope,
				buttons: [
					{
						text: $translate.instant('Cancel'),
						type: 'button-positive',
					},
				]
			});

			vm.popup.then(function() {
				console.log("popup closed");
				cleanDatePicker();
			});

			vm.datePickerChecker = $interval(function() {
				checkDatePicker();
			}, 50);

			return;
    }
        
    function checkDatePicker() {
			var pickers = $('#datepicker');
			console.log(pickers);

			console.log("############");
			console.log("############");
			console.log("############");
			console.log("Language: " +langUpdate.getCurrLanguage());

			if (pickers.length <= 0) return;
			$interval.cancel(vm.datePickerChecker);
			vm.datePickerChecker = null;

			var tmp, currLang, lang;

			tmp = langUpdate.getCurrLanguage();
			tmp = tmp.split('-');
			currLang = tmp[0];
			console.log("language: " +currLang);
			if (currLang == 'zh')
				lang = 'zh';
			else
				lang = 'en';

			var m = vm.calendarMonth;
			$('#datepicker').datepicker({
				language: lang,
				inline: false,
				startDate : new Date(m.year, m.month-1, 1),
				showOtherMonths: false,
				selectOtherMonths: false,
				moveToOtherMonthsOnSelect: false,
				dateFormat: 'yyyy-mm-dd',
				onRenderCell: onRenderCalendarCell,
				onSelect: onSelectCalendarDate,
			});

			// var picker = $('#datepicker').datepicker().data('datepicker');
			// picker.date = new Date(m.year, m.month-1, 1);

			$timeout(function() {
				$(".datepicker--nav-action").remove();
			}, 0);
		}
        
        function cleanDatePicker() {
			var picker = $('#datepicker').datepicker().data('datepicker');
			if (picker) {
				$timeout(function() {
					picker.destroy();
				}, 0);
			}
		}
        
        function onSelectCalendarDate(formattedDate, date, inst) {
			console.log("history.c : date selected");
			console.log("  formattedDate: " +formattedDate);
			console.log("  date: " +date);
			console.log("  inst: " +inst);

			vm.loadingDateHistory = true;
			historySrv.loadDate(formattedDate);

			if (!window.plugins) {
				/* fake data */
				$timeout(function() {
					var dateItem = {};

					dateItem.dateName = "2017-10-06";
					dateItem.workouts = [];
					dateItem.avgSPM = 123;
					dateItem.vHMS = "01:23:45";
					dateItem.vTotalDistance = 38;
					dateItem.vTotalNumReps = 388;

					dateItem.workouts.push({
						duration: 123,
						numReps: 456,
						calories: 888,
						avgSPM: 33,
					});
					onHistoryLoadDateEv(null, dateItem);
				}, 500);
			}
		}
        
        function checkCellMonth(date) {
			var selMonth = vm.calendarMonth;

			if (date.getFullYear() != selMonth.year)
				return false;

			if ((date.getMonth()+1) != selMonth.month)
				return false;

			return true;
		}
        
        function onRenderCalendarCell(date, cellType) {
			// console.log("   cellType: " +cellType);
			if (cellType != 'day') return;

			// console.log("onRenderCalendarCell");
			// printDate(date);

			var day = date.getDay();
			var content;
			var isDisabled;

			// console.log("date: " +date.getDate());

			var dayItem = null;
			if (checkCellMonth(date)) {
				dayItem = vm.calendarMonth.items[date.getDate() - 1];
				isDisabled = (dayItem.numWorkouts <= 0);

				dayItem.calendarDisabled = isDisabled;
			} else {
				isDisabled = true;
			}
			// console.log("dayItem");
			// console.log(dayItem);

			// console.log("dayItem.workouts");
			// console.log(dayItem.workouts);


			if (!isDisabled) {
				if (!isToday(date)) {
					content = '<span class="calendar-cell-enabled">' +date.getDate() +'</span>';
				} else {
					content = '<span class="calendar-cell-today">' +date.getDate() +'</span>';
				}
				dayItem.date = date;
			} else {
				content = date.getDate();
			}

			return {
				html: content,
				disabled: isDisabled,
			}
		}
        
        function initDailyChartData(set) {
			var m = vm.currDateItem;
			var data = [];

			for (var i = 0; i < m.workouts.length; i++) {
				var item = m.workouts[i];

				if (set == 'cycles')
					data.push(item.numReps);
				else if (set == 'duration')
					data.push(item.duration);
				else if (set == 'rpm') {
					data.push(item.avgSPM);
				} else if (set == 'distance') {
					var dist = item.distance;
					if (vm.isImperialUnit)
						dist = km2miles(dist);

					data.push(dist);
				} else {
					return [];
				}
			}
			return data;
		}
        
        function initDailyChartLabels(len) {
			var labels = [];
			var space;

			if (len <= 15)
				space = 1;
			else
				space = 5;

			for (var i = 0; i < len; i++) {
				var lb = i + 1;

				if (space == 0) {
					labels.push(lb);
					continue;
				}

				if (lb == 1) {
					labels.push(lb);
				} else if ((lb % space) == 0) {
					labels.push(lb);
				} else
					labels.push("");
			}
			return labels;
		}
        
        function initFakeDailyChart(set) {
			var canvas = document.getElementById("myDailyChart");

			vm.currChartDataSet = set;
			vm.dailyChartData = initFakeDailyChartData();
			vm.dailyChartLabels = initDailyChartLabels(vm.dailyChartData.length);

			var xLabel = $translate.instant('Day');
			var chartTitle = "Test Title";

			vm.myDailyChart = new Chart(canvas, {
				type: 'bar',
				data: {
					labels: vm.dailyChartLabels,
					datasets: [{
						fill: false,
						label: set,
						fill: true,
						data: vm.dailyChartData,
						borderColor: vm.dailyChartLineColor,
						backgroundColor: vm.dailyChartLineAreaColor,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					title: {
						display:false,
						position: 'top',
						text: chartTitle,
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							maxBarThickness: 20,
							scaleLabel: {
								display: false,
								labelString: vm.currDateItem.dateName,
								fontFamily: 'Antonio-Regular',
								fontSize: 14,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: set,
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								callback: fmtChartLabelY,
							},
						}],
					}
				}
			});
		}

		function initDailyChart(set, force) {
			if (!force && (set == vm.currChartDataSet))
				return;

			if (vm.myDailyChart) {
				console.log("Destroying daily chart.");
				vm.myDailyChart.destroy();
				vm.myDailyChart = null;
			}

			if (!window.plugins || fakingForTesting) {
				initFakeDailyChart(set);
				return;
			}

			vm.currChartDataSet = set;

			var setLabels = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : vm.vDistUnit,
				'duration' : $translate.instant('DURATION'),
				'rpm' : $translate.instant('RPM'),
			};
			var chartTitle = {
				'cycles' : $translate.instant('CYCLES'),
				'distance' : $translate.instant('DISTANCE'),
				'duration' : $translate.instant('DURATION'),
				'rpm' : $translate.instant('Revolutions per Minute'),
			};

			var canvas = document.getElementById("myDailyChart");
			console.log(canvas);

			vm.dailyChartData = initDailyChartData(set);
			vm.dailyChartLabels = initDailyChartLabels(vm.dailyChartData.length);

			vm.myDailyChart = new Chart(canvas, {
				type: 'bar',
				data: {
					labels: vm.dailyChartLabels,
					datasets: [{
						fill: false,
						label: setLabels[set],
						data: vm.dailyChartData,
						fill: true,
						borderColor: vm.dailyChartLineColor,
						backgroundColor: vm.dailyChartLineAreaColor,
						borderWidth: 1,
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					tooltips: {
						enabled: false,
					},
					hover: {
						mode: null,
					},
					title: {
						display:false,
						position: 'top',
						text: chartTitle[set],
					},
					legend: {
						display: false,
						position: 'right',
						labels: {
							fontFamily: 'Antonio-Bold',
							fontSize: 18,
							boxWidth: 20,
						}
					},
					scales: {
						xAxes: [{
							maxBarThickness: 20,
							scaleLabel: {
								display: false,
								labelString: vm.currMonth.name,
								fontFamily: 'Antonio-Regular',
								fontSize: 16,
								fontColor: '#333333',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
							},
						}],
						yAxes: [{
							scaleLabel: {
								display: true,
								labelString: setLabels[set],
								fontFamily: 'Anton',
								fontSize: 14,
								fontColor: '#555555',
								padding: 2,
							},
							ticks: {
								beginAtZero:true,
								callback: fmtChartLabelY,
								fontFamily: 'LeagueGothic-Regular',
								fontSize: 14,
								padding: 2,
							},
						}],
					}
				}
			});
		}

		function integerLabel(label, index, labels) {
			if ((label %1) === 0)
				return label;
			else
				return '';
		}

		function fmtChartLabelY(label, index, labels) {
			if (vm.currChartDataSet == 'cycles')
				return integerLabel(label, index, labels);

			if (vm.currChartDataSet == 'rpm') {
				return integerLabel(label, index, labels);
			}

			if (vm.currChartDataSet == 'duration')
				return timeString(parseInt(label), true);

			if (vm.currChartDataSet == 'distance')
				return sprintf("%.1f", toFixedFloat(label, 1));

			return "";
		}

		function onViewDailyData(set) {
			for (var p in vm.dataSets) {
				if (p == set) {
					vm.dataSets[p].visible = true;
				} else
					vm.dataSets[p].visible = false;
			}

			if (set != 'none')
				initDailyChart(set, false);
		}
        
        function registerModalHandler() {
			$scope.$on('modal.hidden', function() {
				console.log("modal hidden!");
				if (vm.dailyViewVisible) {
					console.log("  -> modal is still visible");
					hideDailyView(false);
					vm.dailyViewVisible = false;
				} else if (vm.monthlyViewVisible) {
					console.log("  -> modal is still visible");
					hideMonthlyView(false);
					vm.monthlyViewVisible = false;
				} else {
					console.log("  -> modal is NOT visible");
					$state.go("dash");
				}
			});
			$scope.$on('modal.removed', function() {
				console.log("modal removed!");
			});
		}



		
        
      /*  $scope.takePhoto = function() {
    var options = {
        //这些参数可能要配合着使用，比如选择了sourcetype是0，destinationtype要相应的设置
        quality: 100,
        //相片质量0-100
        destinationType: Camera.DestinationType.FILE_URI,
        //返回类型：DATA_URL= 0，返回作为 base64 編碼字串。 FILE_URI=1，返回影像档的 URI。NATIVE_URI=2，返回图像本机URI (例如，資產庫)
        sourceType: Camera.PictureSourceType.CAMERA,
        //从哪里选择图片：PHOTOLIBRARY=0，相机拍照=1，SAVEDPHOTOALBUM=2。0和1其实都是本地图库
        allowEdit: false,
        //在选择之前允许修改截图
        encodingType: Camera.EncodingType.JPEG,
        //保存的图片格式： JPEG = 0, PNG = 1
        targetWidth: 200,
        //照片宽度
        targetHeight: 200,
        //照片高度
        mediaType: 0,
        //可选媒体类型：圖片=0，只允许选择图片將返回指定DestinationType的参数。 視頻格式=1，允许选择视频，最终返回 FILE_URI。ALLMEDIA= 2，允许所有媒体类型的选择。
        cameraDirection: 0,
        //枪后摄像头类型：Back= 0,Front-facing = 1
        popoverOptions: CameraPopoverOptions,
        saveToPhotoAlbum: true //保存进手机相册
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
        CommonJs.AlertPopup(imageData);
        var image = document.getElementById('myImage');
        image.src = imageData;
        //image.src = "data:image/jpeg;base64," + imageData;
    },
    function(err) {
        // error
        CommonJs.AlertPopup(err.message);
    });

};*/

    //作者：没有故事的我
    //链接：https://www.jianshu.com/p/bf54c90a2eff
    //來源：简书
    //著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
        
        
       
        
             
            var destinationType;
             
            document.addEventListener("deviceready",onDeviceReady,false);
             
            //Cordova加载完成会触发
            function onDeviceReady() {
                destinationType=navigator.camera.DestinationType;
            }
         
            //拍照
            function capturePhoto() {
                //拍照并获取Base64编码的图像（quality : 存储图像的质量，范围是[0,100]）
                navigator.camera.getPicture(onPhotoDataSuccess, onFail, { quality: 50,
                                            destinationType: destinationType.DATA_URL }
                                            );
            }
         
            //拍照成功
            function onPhotoDataSuccess(imageData) {
                console.log(imageData);
                var smallImage = document.getElementById('smallImage');
                smallImage.style.display = 'block';
                smallImage.src = "data:image/jpeg;base64," + imageData;
            }
 
            //拍照失败
            function onFail(message) {
                alert('拍照失败: ' + message);
            }
        
        
        
        
        
	}
}());

