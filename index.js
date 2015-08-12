var API = require('./api-functions');

// Main self-initializing function
(function() {
	var last_tweet_id = 0;

	var callback = function (err, response, body) {
		if (!err && response.statusCode === 200) {
			var obj = JSON.parse(body);
			
			obj.statuses.forEach(function (searchItem) {

				// Save the last tweet id
				if (searchItem.id > last_tweet_id) {
					last_tweet_id = searchItem.id;
				}

				if (searchItem.text.indexOf("fav") > -1) {
					console.log("Retweet + Favorite", searchItem.id);
					API.favorite(searchItem.id_str);
					API.retweet(searchItem.id_str);
				} else {
					console.log("Retweet", searchItem.id);
					API.retweet(searchItem.id_str);
				}
			});

	  	} else {
	  		console.error("Error!", body);
	  	};
  	}

	API.search({
		text: "retweet to win OR RT -vote", 	// Without having the word "vote"
		result_type: "recent",
		callback: callback,
		since_id: last_tweet_id
	});
}());