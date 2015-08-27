(function () {
	angular
		.module('app')
		.controller('MainController', MainController);

	/**
	 * The MainController code.
	 */
 	MainController.$inject = ['$scope', '$timeout', '$log', '$http', '$localStorage', 'citiesFactory'];
	function MainController($scope, $timeout, $log, $http, $storage, cities) {
		var vm = this;
		
		// Properties
		vm.cities;
		vm.selectedCity;
		vm.rideTypes;
		vm.selectedRideType;
		vm.daysOfWeek;
		vm.selectedDayOfWeek;
		vm.chartData;
		vm.chartOptions = {
			chart: {
				type: 'historicalBarChart',
				height: 350,
				margin: {
					top: 20,
					right: 20,
					bottom: 60,
					left: 50
				},
				showValues: false,
				x: function (d) {
					return d[0];
				},
				y: function (d) {
					return d[1];
				},
				transitionDuration: 500,
				xAxis: {
					tickFormat: function (d) {
						return moment.tz(d, displayedTimezone).format('h:mm a');
					},
					rotateLabels: -45,
					showMaxMin: false
				},
				yAxis: {
					tickFormat: function (d) {
						return d3.format(',.1f')(d);
					},
					showMaxMin: false
				}
			},
			callback: function (chart) {
				chart.container.setAttribute('preserveAspectRatio', 'xMinYMin');
				chart.container.setAttribute('viewBox', '0 0 100 100');
			}
		};
		vm.graphingRideData = false;
		
		// Methods
		vm.citySelected = citySelected;
		vm.rideTypeSelected = rideTypeSelected;
		vm.graphRideData = graphRideData;
		
		/////////////////////////////////////////
		// End of exposed properties and methods.
		
		// Private members
		var displayedTimezone = '';
		
		/**
		 * This function does any initialization work the 
		 * controller needs.
		 */
		(function activate() {
			$log.debug('Activated MainController.');

			vm.daysOfWeek = [
				{
					'value': 0,
					'label': 'Sunday'
				},
				{
					'value': 1,
					'label': 'Monday'
				},
				{
					'value': 2,
					'label': 'Tuesday'
				},
				{
					'value': 3,
					'label': 'Wednesday'
				},
				{
					'value': 4,
					'label': 'Thursday'
				},
				{
					'value': 5,
					'label': 'Friday'
				},
				{
					'value': 6,
					'label': 'Saturday'
				}
			];

			$http.get('/api/cities')
				.then(function (res) {
					vm.cities = res.data.cities;
					vm.cities.sort(function (a, b) {
						if (a.city > b.city) {
							return 1;
						}
						if (a.city < b.city) {
							return -1;
						}

						return 0;
					});

					/**
					 * For selectedCity and selectedRideType, try to get
					 * last used from localStorage. If there's none in local storage,
					 * just set it to the first in each list. 
					 */
					if ($storage.savedCity || true) {
						// See if city is supported.
						var cityData = getSavedCityData($storage.savedCity);

						if (cityData) {
							// If city is supported, select it and save its ride types.
							vm.selectedCity = cityData.city;
							vm.rideTypes = cityData.rideTypes;
							
							// Check if there was a saved ride type.
							var rideTypeFound = false;
							if ($storage.savedRideType) {
								// Check if we have data on selected ride type. If so,
								// selected it. 
								for (var i = 0; i < cityData.rideTypes.length; i++) {
									if (cityData.rideTypes[i] === $storage.savedRideType) {
										vm.selectedRideType = $storage.savedRideType;
										rideTypeFound = true
										break;
									}
								}
								
								// If not, select the first one in list.
								if (!rideTypeFound) {
									vm.selectedRideType = vm.rideTypes[0];
								}
							}
							// If there is no saved ride type, select the first one.
							else {
								vm.selectedRideType = vm.rideTypes[0];
							}
						}
						// If city wasn't found, select first one.
						else {
							vm.selectedCity = vm.cities[0].city;
							vm.rideTypes = vm.cities[0].rideTypes;
							vm.selectedRideType = vm.rideTypes[0];
						}
					}
					// If no saved city, select first of all.
					else {
						vm.selectedCity = vm.cities[0].city;
						vm.rideTypes = vm.cities[0].rideTypes;
						vm.selectedRideType = vm.rideTypes[0];
					}
					
					// Set selectedDayOfWeek as the current day.
					vm.selectedDayOfWeek = vm.daysOfWeek[(new Date()).getDay()];
				}, function (err) {

				});
		})();
		
		/**
		 * When a new city is selected, change the ride types
		 * dropdown with the ride types available for that city.
		 */
		function citySelected(option) {
			vm.selectedCity = option.city;
			vm.rideTypes = option.rideTypes;
			vm.selectedRideType = vm.rideTypes[0];
		};
		
		/**
		 * When a new ride type is selected, change the selected
		 * ride type.
		 */
		function rideTypeSelected(option) {
			vm.selectedRideType = option;
		};
		
		/**
		 * Take parameters, get the corresponding data, and graph it.
		 */
		function graphRideData() {
			vm.graphingRideData = true;

			$storage.savedCity = vm.selectedCity;
			$storage.savedRideType = vm.selectedRideType;

			$http.get('/api/multipliers/' + vm.selectedCity + '/' + vm.selectedRideType + '/' + vm.selectedDayOfWeek.value)
				.then(function (res) {
					vm.chartData = [{
						key: 'Average multiplier',
						bar: true,
						values: []
					}];

					// Getting timezone data here.
					var cityData = getCityData(vm.selectedCity);
					
					// Skip datapoints if screen is too small to display them on X axis.
					var skipHalfs = isTooSmall();

					// Iterate over returned data, convert to timezone of city, and then display.
					for (var i = 0; i < res.data.multipliers.length; i++) {
						var timestamp = new Date(res.data.multipliers[i].dateTime);

						if (skipHalfs) {
							if (timestamp.getMinutes() != 0) {
								continue;
							}
						}

						// Used in vm.chartOptions to format timezone. Can't pass it up.
						displayedTimezone = cityData.timezone;
						
						// Add datapoint to chart data.
						vm.chartData[0].values.push([timestamp, res.data.multipliers[i].multiplier]);
					}

					/**
					 * Workaround for chart not resizing to container width on 
					 * page load.
					 * 
					 * https://github.com/krispo/angular-nvd3/issues/40
					 */
					$timeout(function () {
						$scope.lineChart.api.refresh();
					}, 0);
					
					vm.graphingRideData = false;
				}, function (err) {
					vm.graphingRideData = false;
				});
		};
		
		/**
		 * Get city data from list of cities.
		 */
		function getCityData(city) {
			for (var i = 0; i < cities.data.length; i++) {
				if (cities.data[i].name === city) {
					return cities.data[i];
				}
			}
		};
		
		/**
		 * Decides if screen is too small to show all datapoints.
		 */
		function isTooSmall() {
			var mql = window.matchMedia("only screen and (min-width: 600px)");
			return !mql.matches;
		};

		function getSavedCityData(city) {
			for (var i = 0; i < vm.cities.length; i++) {
				if (vm.cities[i].city === city) {
					return vm.cities[i];
				}
			}

			return null;
		};
	};
})();
