var request = require('request');
var config = require('../config');
var prettyjson = require('prettyjson');
var Q = require('q');
var uber = {};

/**
 * Returns a list of ride types for a given 
 * city from the Uber API. 
 */
uber.getCityAndRideTypes = function (city) {
	var deferred = Q.defer();

	request({
		url: 'https://api.uber.com/v1/products',
		qs: {
			server_token: config.serverToken,
			latitude: city.latitude,
			longitude: city.longitude
		}
	},
		function (error, response, body) {
			if (response.statusCode != 200) {
				deferred.reject(response.statusCode);
			}
			else {
				var products = JSON.parse(body).products;
				var rideTypes = [];

				/**
				 * Iterate over products returned from city and add
				 * display names to an array.
				 */
				for (var i = 0; i < products.length; i++) {
					rideTypes.push(products[i].display_name);
				}

				var cityWithRideTypes = {
					'city': city.name,
					'rideTypes': rideTypes
				};

				deferred.resolve(cityWithRideTypes);
			}
		});

	return deferred.promise;
};

/**
 * Returns the surge multiplier for the given
 * city.
 */
uber.getSurgeMultipliers = function (city) {
	var deferred = Q.defer();

	request({
		url: 'https://api.uber.com/v1/estimates/price',
		qs: {
			server_token: config.serverToken,
			start_latitude: city.latitude,
			start_longitude: city.longitude,
			end_latitude: city.latitude,
			end_longitude: city.longitude
		}
	},
		function (error, response, body) {
			if (response.statusCode != 200) {
				deferred.reject(response.statusCode);
			}
			else {
				var prices = JSON.parse(body).prices;
				var multipliers = [];

				for (var i = 0; i < prices.length; i++) {
					multipliers.push({
						'city': city.name,
						'rideType': prices[i].display_name,
						'multiplier': prices[i].surge_multiplier
					});
				}

				deferred.resolve(multipliers);
			}
		});

	return deferred.promise;
};

module.exports = uber; 