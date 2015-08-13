var API = require('./api-functions'),
	RATE_LIMIT_EXCEEDED_TIMEOUT = 1000 * 60 * 10, 	// 10 minutes
	RETWEET_TIMEOUT = 1000 * 5; 					// 5 minutes

// Main self-initializing function
(function() {
	var last_tweet_id = 0,
		searchResultsArr = [];

	/** The Callback function for the Search API */
	var callback = function (err, response, body) {
		if (!err && response.statusCode === 200) {
			var obj = JSON.parse(body);
			
			// Iterating through tweets returned by the Search
			obj.statuses.forEach(function (searchItem) {

				// Save the search item in the Search Results array
				searchResultsArr.push(searchItem);
			});

			// If we have the next_results, search again for the rest (sort of a pagination)
			if (obj.search_metadata.next_results) {
				API.searchByStringParam(obj.search_metadata.next_results, callback);
			}

	  	} else {
	  		console.error("Error!", body);
	  		
	  		// If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
	  		if (body.errors[0].code === 88) {
	  			console.log("I'm waiting a bit, and then trying again...");
	  			setTimeout(function () {
	  				search();
	  			}, RATE_LIMIT_EXCEEDED_TIMEOUT);
			  		
		  	}
	  	};
  	};

  	/** The Search function */
  	var search = function () {
  		API.search({
			text: "retweet to win -vote OR RT to win -vote", 	// Without having the word "vote"
			result_type: "recent",
			callback: callback,
			since_id: last_tweet_id
		});
  	};


  	/** The Retweet worker - also performs Favorite and Follow actions if necessary */
  	var retweetWorker = function () {

  		setTimeout(function () {

  			// Check if we have elements in the Result Array
  			if (searchResultsArr.length) {

  				// Pop the first element (by doing a shift() operation)
  				var searchItem = searchResultsArr[0];	
  				searchResultsArr.shift();
  				
  				// Retweet
				API.retweet(searchItem.id_str);
				console.log("Retweet", searchItem.id);

  				// Check if we also need to Favorite
  				if (searchItem.text.toLowerCase().indexOf("fav") > -1) {
  					API.favorite(searchItem.id_str);
  					console.log("Favorite", searchItem.id);
  				} 

  				if (searchItem.text.toLowerCase().indexOf("follow") > -1) {
  					API.follow(searchItem.user.id_str);
  					console.log("Follow", searchItem.user.screen_name);
  				}
  			}	

  			retweetWorker();
  		}, RETWEET_TIMEOUT);
  	}

  	// Start the Retweet worker
  	retweetWorker();

  	// Start searching (the Search is in itself a worked, as the callback continues to fetch data)
  	search();
}());