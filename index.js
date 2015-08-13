var API = require('./api-functions');

// Main self-initializing function
(function() {
	var last_tweet_id = 0,
		allItems = [];

	// Callback function for the Search API
	var callback = function (err, response, body) {
		if (!err && response.statusCode === 200) {
			var obj = JSON.parse(body);
			
			obj.statuses.forEach(function (searchItem) {
				allItems.push(searchItem.id);

				// Save the last tweet id
				if (searchItem.id > last_tweet_id) {
					last_tweet_id = searchItem.id;
				}

				if (searchItem.text.indexOf("fav") > -1) {
					console.log("Retweet + Favorite", searchItem.id);
					//API.favorite(searchItem.id_str);
					//API.retweet(searchItem.id_str);
				} else {
					console.log("Retweet", searchItem.id);
					//API.retweet(searchItem.id_str);
				}
			});

			// If we have the next_results, search again for the rest (sort of a pagination)
			if (obj.search_metadata.next_results) {
				API.searchByStringParam(obj.search_metadata.next_results, callback);
			}

	  	} else {
	  		console.error("Error!", body);
	  		
	  		// If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
	  		if (body.errors[0].code === 88) {
	  			console.log("Waiting another 10 minutes and trying again ...");
	  			setTimeout(function () {
	  				search();
	  			}, 1000 * 60 * 10);
			  		
		  	}
	  	};
  	}

  	var search = function () {
  		API.search({
			text: "retweet OR RT to win OR -vote", 	// Without having the word "vote"
			result_type: "recent",
			callback: callback,
			since_id: last_tweet_id
		});
  	}

  	search();
}());