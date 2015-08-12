var API = require('./api-functions');

(function () {
	API.search({
		text: "tranceylvania",
		count: 5,
		result_type: 'recent'
	});
	
	API.retweet("454674764486172673");

	API.favorite("454674764486172673");
})();