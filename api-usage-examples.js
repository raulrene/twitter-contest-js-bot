var API = require('./api-functions');

(function () {
	API.search({
		text: "retweet",
		result_type: 'recent'
	});
	
	API.retweet("454674764486172673");

	API.favorite("454674764486172673");

	API.followByUsername("RaulLepsa");

	API.getBlockedUsers();

	// Get the latest 50 tweets and delete them
	API.getTweetsForUser("2501185554", 50, function (tweets) {
        for (var i = 0; i < tweets.length; i++) {
            API.deleteTweet(tweets[i].id_str);
        }
    });
})();