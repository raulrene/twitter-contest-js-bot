var request = require('request');
var oauth = require("./config");

//Callback functions
var defaultCallback = function (error, response, body) {
	if (!error && response.statusCode === 200) {
		console.log(JSON.parse(body)); 
  	} else {
  		console.error("Error!", body);
  	}
};

module.exports = {
	search: function (options) {
		params = 
			"q=" + encodeURIComponent(options.text),
			"&count=" + options.count ? options.count : 10,
			"&result_type=" + options.result_type ? options.result_type : 'popular';

		request.get({url: 'https://api.twitter.com/1.1/search/tweets.json?' + params, oauth: oauth}, options.callback ? options.callback : defaultCallback);
	},

	retweet: function (id) {
		request.post({url: 'https://api.twitter.com/1.1/statuses/retweet/' + id + '.json', oauth: oauth}, defaultCallback); 
	},

	favorite: function (id) {
		request.post({url: 'https://api.twitter.com/1.1/favorites/create.json?id=' + id, oauth: oauth}, defaultCallback);
	}
};
