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
})();