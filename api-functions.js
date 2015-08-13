var request = require('request');
var oauth = require("./config");
var allItems = [];

//Callback functions
var defaultCallback = function (error, response, body) {
	if (!error && response.statusCode === 200) {
		var result = JSON.parse(body);

		// Case when the callback is used after a search
		if (result && result.statuses) {
			result.statuses.forEach(function (item) {
				allItems.push(item.id);
			});

			console.log("So far we have a total of:", allItems.length);
			
			// If we have the next_results, search again for the rest (sort of a pagination)
			if (result.search_metadata.next_results) {
				API.searchByStringParam(result.search_metadata.next_results, defaultCallback);
			}
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

	retweet: function (tweetId) {
		request.post({url: 'https://api.twitter.com/1.1/statuses/retweet/' + tweetId + '.json', oauth: oauth}, defaultCallback); 
	},

	favorite: function (tweetId) {
		request.post({url: 'https://api.twitter.com/1.1/favorites/create.json?id=' + tweetId, oauth: oauth}, defaultCallback);
	},

	follow: function (userId) {
		request.post({url: 'https://api.twitter.com/1.1/friendships/create.json?user_id=' + userId, oauth: oauth}, defaultCallback);
	},

	followByUsername: function (userName) {
		request.post({url: 'https://api.twitter.com/1.1/friendships/create.json?screen_name=' + userName, oauth: oauth}, defaultCallback);
	}
};

module.exports = API;
