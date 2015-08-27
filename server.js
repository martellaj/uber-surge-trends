var express = require('express');
var app = express();
var mongoose = require('mongoose');
var morgan = require('morgan');
var path = require('path');
var cities = require('./app/models/cities');
var uber = require('./app/helpers/uberHelper');
var db = require('./app/helpers/dbHelper');
var utilities = require('./app/helpers/utilitiesHelper');
var prettyjson = require('prettyjson');
var config = require('./app/config');
var schedule = require('node-schedule');

// Turn dev environment on or off.
var dev = false;

// Initialize variables. 
var port = process.env.PORT || 8080; 

// Connect to DB.
if (dev) {
	mongoose.connect(config.dbConnectionStringDev);
}
else {
	mongoose.connect(config.dbConnectionString);
}

// Configure morgan module to log all requests.
app.use(morgan('dev')); 

// Set the public folder to serve public assets.
app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname));

// Configure app to handle CORS requests.
app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
	next();
});

// Route registration. 
app.use('/api', require('./app/routes/apiRoutes')); 

// Set up our one route to the index.html file.
app.get('*', function (req, res) {
	res.sendFile(path.join(__dirname + '/public/index.html'));
});

// Get surge data from Uber API at XX:00 and XX:30.
schedule.scheduleJob({ minute: [0, 30] }, function () {
	for (var i = 0; i < cities.length; i++) {
		uber.getSurgeMultipliers(cities[i])
			.then(function (multipliers) {
				var now = new Date();
				var standardDate = utilities.getStandardsDate(now);
				var hours = now.getHours();
				var minutes = now.getMinutes();
				var dateTime = new Date(config.standardYear, config.standardMonth, standardDate, hours, minutes, 0, 0);

				db.updateAggregates(multipliers, dateTime);
			}, function (error) {
				console.log('Error: ', error);
			});
	}
});

// Start the app.  
app.listen(port);
console.log('Listening on port ' + port + '...'); 