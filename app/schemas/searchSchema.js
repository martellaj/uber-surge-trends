var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Search = new Schema({
	city: String,
	count: Number
});

module.exports = mongoose.model('Search', Search);