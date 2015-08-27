var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SurgeInfo = new Schema({
	city: String,
	dateTime: Date,
	multipliers: [{
		multiplier: Number,
		rideType: String,
		count: Number
	}]
});

module.exports = mongoose.model('SurgeInfo', SurgeInfo);