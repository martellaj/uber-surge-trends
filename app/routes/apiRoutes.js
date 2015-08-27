var express = require('express');
var apiRoutes = express.Router();
var uber = require('../helpers/uberHelper');
var db = require('../helpers/dbHelper');
var cities = require('../models/cities');
var utilities = require('../helpers/utilitiesHelper');

var moment = require('moment-timezone');
function toTimeZone(time, zone) {
    return moment(time).tz(zone).format();
}

/**
 * Test call to make sure server is working.
 */
apiRoutes.get('/hello',
	function (req, res) {
		res.json({
			'data': 'Baby got back... end.'
		});
	});

/**
 * Returns a list of available cities and the
 * ride types available for each city. 
 */
apiRoutes.get('/cities',
	function (req, res) {
		var citiesData = [];

		for (var i = 0; i < cities.length; i++) {
			uber.getCityAndRideTypes(cities[i])
				.then(function (cityWithRideTypes) {
					citiesData.push(cityWithRideTypes);
					
					// Check if all requests are complete.
					if (citiesData.length === cities.length) {
						res.json({
							'cities': citiesData
						});
					}
				}, function (error) {
					res.json({
						'error': error
					});
				});
		}
	});

/**
 * Returns the average hourly multipliers for the selected city, ride type,
 * and day of week combination. 
 */
apiRoutes.get('/multipliers/:city/:rideType/:day',
	function (req, res) {
		var city = req.params.city;
		var rideType = req.params.rideType;
		var day = req.params.day;		
		var cityData = utilities.getCityData(city);

		db.logVisitorSearch(city);

		// Get all data by requested city and day.
		db.getAggregates(cityData, day)
			.then(function (surgeInfos) {
				var multipliers = [];
				
				// Strip out the desired ride type.
				for (var i = 0; i < surgeInfos.length; i++) {
					for (var j = 0; j < surgeInfos[i].multipliers.length; j++) {
						if (surgeInfos[i].multipliers[j].rideType === rideType) {
							multipliers.push({
								'multiplier': surgeInfos[i].multipliers[j].multiplier,
								'dateTime': surgeInfos[i].dateTime
							});
						}
					}
				}

				res.json({
					'multipliers': multipliers
				});
			}, function (err) {

			});
	});

module.exports = apiRoutes;