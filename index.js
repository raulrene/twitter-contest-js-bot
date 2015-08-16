var API = require('./api-functions'),
	RATE_LIMIT_EXCEEDED_TIMEOUT = 1000 * 60 * 10, 	// 10 minutes
	RETWEET_TIMEOUT = 1000 * 5; 					// 5 seconds

// Main self-initializing function
(function() {
	var last_tweet_id = 0,
		searchResultsArr = [];

	/** The Callback function for the Search API */
	var callback = function (response) {
		var payload = JSON.parse(response);
		
		// Iterating through tweets returned by the Search
		payload.statuses.forEach(function (searchItem) {

			// Further filtering out the retweets
			if (!searchItem.retweeted_status) {

				// Save the search item in the Search Results array
				searchResultsArr.push(searchItem);
			}
		});

		// If we have the next_results, search again for the rest (sort of a pagination)
		if (payload.search_metadata.next_results) {
			API.searchByStringParam(payload.search_metadata.next_results, callback);
		}
  	};

  	/** The error callback for the Search API */
  	var errorHandler = function (err) {
  		console.error("Error!", err.message);

  		// If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
  		if (JSON.parse(err.error).errors[0].code === 88) {
  			console.log("After " + RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + " minutes, I will try again to fetch some results...");
  			setTimeout(function () {
  				search();
  			}, RATE_LIMIT_EXCEEDED_TIMEOUT);
	  	}
  	};

  	/** The Search function */
  	var search = function () {
  		API.search({
  			// Without having the word "vote", and filtering out retweets - as much as possible
			text: "retweet to win -vote -filter:retweets OR RT to win -vote -filter:retweets", 
			result_type: "recent",
			callback: callback,
			error_callback: errorHandler,
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