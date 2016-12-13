const API = require('./api-functions');

let promises = [
    API.search({text: 'retweet', result_type: 'recent'}),

    API.retweet('454674764486172673'),

    API.favorite('454674764486172673'),

    API.followByUsername('RaulLepsa'),

    API.getBlockedUsers(),

    // Get the latest N tweets and delete them
    API.getTweetsForUser('2501185554', 1)
        .then((res) => {
            const tweets = JSON.parse(res);
            tweets.forEach((tweet) => API.deleteTweet(tweet.id_str));
        })
];

Promise.all(promises)
    .then(() => console.log('Finished calling all API functions'))
    .catch((err) => console.log('Finished calling all API functions w/ error(s)', err.message));
