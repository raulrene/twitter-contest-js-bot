var API = require('./api-functions');

// Main self-initializing function
(function() {
	var callback = function (err, response, body) {
		if (!err && response.statusCode === 200) {
			var obj = JSON.parse(body);
			
			obj.statuses.forEach(function (searchItem) {
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
		text: "retweet to win -vote", 	// Without having the word "vote"
		result_type: "recent",
		callback: callback
	});
}());