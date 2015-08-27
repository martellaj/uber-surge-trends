var cities = require('../models/cities');
var utilities = {};

/**
 * Creating dates to store in database. We want all day (i.e. Monday) data
 * in one document, so we get the day of the week and give it the appropriate
 * date for the week of 4/12/2015 as the date since only day and time matters.
 */
utilities.getStandardsDate = function (date) {
	/**
		* April 12 is Sunday (0).
		* April 18 is Saturday (6);
		*/
	var start = 12;
	var current = start;
	
	/**
	 * Checks if "date" is a dayOfWeek value (0-6) or a Date 
	 * object and then does the work based on that.
	 */
	if (date instanceof Date) {
		current = current + date.getDay(); 
	}
	else {
		current = current + parseInt(date);	
	}
	
	return current;
};

/**
 * Get city data by city name.
 */
utilities.getCityData = function(cityName) {
	for (var i = 0; i < cities.length; i++) {
		if (cities[i].name === cityName) {
			return cities[i];
		}
	}
};

module.exports = utilities;