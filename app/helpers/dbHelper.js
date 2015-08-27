var Q = require('q');
var mongoose = require('mongoose');
var SurgeInfo = require('../schemas/surgeInfoSchema');
var Search = require('../schemas/searchSchema');
var prettyjson = require('prettyjson');
var utilities = require('./utilitiesHelper');
var config = require('../config');
var moment = require('moment-timezone');
var db = {};

/**
 * Get aggregates from the city and day of week supllied in 
 * the params. 
 */
db.getAggregates = function (city, dayOfWeek) {
	var deferred = Q.defer();
	
	// Standardize date (based on chosen week).
	var standardDate = utilities.getStandardsDate(dayOfWeek);
	
	// Make start and end time based on standard week.
	var startDate = moment(config.standardYear + ' ' + (config.standardMonth + 1) + ' ' + standardDate, "YYYY MM DD");
	var endDate = moment(config.standardYear + ' ' + (config.standardMonth + 1) + ' ' + (standardDate + 1), "YYYY MM DD");
	
	// Calculate UTC offset, apply offset (to get midnight to midnight returned), and
	// convert to correct timezone. 
	var offset = moment.tz(startDate, city.timezone).utcOffset();
	var startDateConverted = moment.tz(startDate, city.timezone).subtract(offset, 'minutes').format();
	var endDateConverted = moment.tz(endDate, city.timezone).subtract(offset, 'minutes').format();

	SurgeInfo
		.find({
			'city': city.name,
			'dateTime': {
				$gte: startDateConverted,
				$lt: endDateConverted
			}
		})
		.lean()
		.exec(function (err, surgeInfos) {
			if (err) {
				console.log('Error getting aggregates: ', err);
				deferred.reject(err);
				return;
			}
			else {
				console.log('Surge infos: ', surgeInfos.length);
				deferred.resolve(surgeInfos);
			}
		});

	return deferred.promise;
};

/**
 * Updates the database values for the given city and dateTime.
 */
db.updateAggregates = function (multipliers, dateTime) {
	var city = multipliers[0].city;
	SurgeInfo
		.findOne({
			'city': city,
			'dateTime': dateTime
		})
		.exec(function (err, dbSurgeInfo) {
			if (err) {
				console.log('Error finding aggregate to update: ', err);
				return;
			}
			/**
			 * No document for that city and dateTime found, 
			 * so create it.
			 */
			else if (dbSurgeInfo === null) {
				initializeSurgeInfo(multipliers, city, dateTime)
			}
			/**
			 * Found a document for that city and dateTime,
			 * so update aggregate data.
			 */
			else {
				updateSurgeInfo(multipliers, dbSurgeInfo, city, dateTime);
			}
		});
};

/**
 * Keep track of what cities are being requested.
 */
db.logVisitorSearch = function (city) {
	Search
		.findOne({
			'city': city
		})
		.exec(function (err, dbSearch) {
			if (err) {
				console.log('Error finding search info: ', err);
				return;
			}
			/**
			 * If there hasn't been any recorded searches for a given
			 * city yet, initialize it.
			 */
			else if (dbSearch === null) {
				initializeSearchInfo(city);
			}
			/**
			 * Found a document for the given city, so increment the
			 * search count.
			 */
			else {
				updateSearchInfo(dbSearch);
			}
		});
};

/**
 * A city and dateTime combo that isn't in the database is trying to 
 * get in there. Add it here.
 */
function initializeSurgeInfo(multipliers, city, dateTime) {
	var surgeInfoMultipliers = [];
	for (var i = 0; i < multipliers.length; i++) {
		surgeInfoMultipliers.push({
			'multiplier': multipliers[i].multiplier,
			'rideType': multipliers[i].rideType,
			'count': 1
		});
	}

	var newSurgeInfo = new SurgeInfo({
		'city': city,
		'dateTime': dateTime,
		'multipliers': surgeInfoMultipliers
	});

	newSurgeInfo.save(function (err, newSurgeInfo) {
		if (err) {
			console.log('Error initializing surge info: ', err);
		}
		else {
			console.log('Successfully initialized surge info.');
		}
	});
}

/**
 * A city and dateTime combo that is in the database has new data to
 * aggregate. Update values and save it back to database.
 */
function updateSurgeInfo(multipliers, dbSurgeInfo) {
	for (var i = 0; i < dbSurgeInfo.multipliers.length; i++) {
		for (var j = 0; j < multipliers.length; j++) {
			if (dbSurgeInfo.multipliers[i].rideType === multipliers[j].rideType) {
				// Calculate new average multiplier. 
				var sum = (dbSurgeInfo.multipliers[i].multiplier * dbSurgeInfo.multipliers[i].count) + multipliers[j].multiplier;
				var updatedMultiplier = sum / (dbSurgeInfo.multipliers[i].count + 1);
							
				// Update aggregates.
				dbSurgeInfo.multipliers[i].multiplier = updatedMultiplier;
				dbSurgeInfo.multipliers[i].count++;
							
				// Remove info we already used to make loops shorter.
				multipliers.splice(j, 1);
				break;
			}
		}
	}
				
	// Save surgeInfo to db.
	dbSurgeInfo.save(function (err) {
		if (err) {
			console.log('Error updating surge info: ', err);
		}
		else {
			console.log('Successfully updated surge info.');
		}
	});
}

/**
 * A city that isn't in the search history database has been
 * logged. Add a document for it.
 */
function initializeSearchInfo(city) {
	var newSearchInfo = new Search({
		'city': city,
		'count': 1
	});

	newSearchInfo.save(function (err, newSearchInfo) {
		if (err) {
			console.log('Error initializing search info: ', err);
		}
		else {
			console.log('Successfully initialized search info.');
		}
	});
};

/**
 * Update the search info document that was recovered from database.
 */
function updateSearchInfo(dbSearch) {
	// Increment count for city.
	dbSearch.count = dbSearch.count + 1;
	
	// Save dbSearch to db.
	dbSearch.save(function (err) {
		if (err) {
			console.log('Error updating search info: ', err);
		}
		else {
			console.log('Successfully updated search info.');
		}
	});
};

module.exports = db;