var request = require('request');
var oauth = require("./config");
var allItems = [];

//Callback functions
var defaultCallback = function (error, response, body) {
	if (!error && response.statusCode === 200) {
		var result = JSON.parse(body);

		result.statuses.forEach(function (item) {
			allItems.push(item.id);
		});

		console.log("So far we have a total of:", allItems.length);
		
		// If we have the next_results, search again for the rest (sort of a pagination)
		if (result.search_metadata.next_results) {
			API.searchByStringParam(result.search_metadata.next_results, defaultCallback);
		}
  	} else {
  		console.error("Error!", body);
  	}
};

var API = {
	search: function (options) {
		params = 
			"?q=" + encodeURIComponent(options.text),
			"&count=" + options.count ? options.count : 100,
			"&result_type=" + options.result_type ? options.result_type : 'popular',
			"&since_id=" + options.since_id ? options.since_id : 0;
		
		if (options.max_id) {
			params += "&max_id=" + options.max_id;
		}

		API.searchByStringParam(params, options.callback ? options.callback : defaultCallback);
	},

	searchByStringParam: function (stringParams, callback) {
		request.get({url: 'https://api.twitter.com/1.1/search/tweets.json' + stringParams, oauth: oauth}, callback);
	},

	retweet: function (id) {
		request.post({url: 'https://api.twitter.com/1.1/statuses/retweet/' + id + '.json', oauth: oauth}, defaultCallback); 
	},

	favorite: function (id) {
		request.post({url: 'https://api.twitter.com/1.1/favorites/create.json?id=' + id, oauth: oauth}, defaultCallback);
	}
};

module.exports = API;
