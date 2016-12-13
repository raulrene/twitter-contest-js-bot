const API = require('./api-functions');

(function () {
    API.search({text: 'retweet', result_type: 'recent'});

    API.retweet('454674764486172673');

    API.favorite('454674764486172673');

    API.followByUsername('RaulLepsa');

    API.getBlockedUsers();

    // Get the latest N tweets and delete them
    API.getTweetsForUser('2501185554', 1, (tweets) => {
        tweets.forEach((tweet) => {
            API.deleteTweet(tweet.id_str);
        });
    });
})();