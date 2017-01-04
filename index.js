const API = require('./api-functions');
const config = require('./config');

/** @class ContestJSBot */
class ContestJSBot {

    constructor() {
        this.last_tweet_id = 0;
        this.searchResultsArr = [];
        this.blockedUsers = [];
        this.badTweetIds = [];
        this.limitLockout = false;
    }

    /** Start the bot */
    start() {
        // Begin the program by fetching the blocked users list for the current user
        API.getBlockedUsers()
            .then(blockedList => {
                this.blockedUsers = Object.assign([], blockedList);

                // Start searching (the Search is in itself a worker, as the callback continues to fetch data)
                this.search();

                // Start the Retweet worker after short grace period for search results to come in
                setTimeout(() => this.retweetWorker.bind(this), 8000);
            })
            .catch((err) => console.error('Your credentials are not valid. Check the config.js file and ensure you supply the correct API keys.', err.messsage));
    }

    /** The Search function */
    search() {
        // Don't search if limit lockout is in effect
        if (this.limitLockout) return;

        console.log('Searching for tweets...');
        let text = '';

        config.SEARCH_QUERIES.forEach((searchQuery) => {
            // Construct the query
            text = searchQuery + config.SEARCH_QUERY_FILTERS;

            // Append preferred accounts if it's the case
            if (config.PREFERRED_ACCOUNTS) {
                text += ` from:${config.PREFERRED_ACCOUNTS.join(' OR from:')}`;
            }

            API.search({text, result_type: config.RESULT_TYPE, since_id: this.last_tweet_id})
                .then(res => this.searchCallback(res))
                .catch(err => this.errorHandler(err));

            // we need to wait between search queries so we do not trigger rate limit lockout
            // sleepFor(config.RATE_SEARCH_TIMEOUT);
            // console.log(`Sleeping for ${config.RATE_SEARCH_TIMEOUT} ms between searches so we don't trigger rate limit`);
        });
    }

    /** The Callback function for the Search API */
    searchCallback(tweets) {

        // Iterate through tweets returned by the Search
        tweets.forEach(searchItem => {

            // Lots of checks to filter out bad tweets, other bots and contests that are likely not legitimate :
            // If it's not already a retweet
            if (searchItem.retweeted_status || searchItem.quoted_status_id) return;

            // It's not an ignored tweet
            if (this.badTweetIds.indexOf(searchItem.id) > -1) return;

            // has enough retweets on the tweet for us to retweet it too (helps prove legitimacy)
            if (searchItem.retweet_count < config.MIN_RETWEETS_NEEDED) return;

            // user is not on our blocked list
            if (this.blockedUsers.indexOf(searchItem.user.id) > -1) return;

            // We ignore users with high amounts of tweets (likely bots)
            if (config.MAX_USER_TWEETS && searchItem.user.statuses_count < config.MAX_USER_TWEETS) {
                // Save the search item in the Search Results array
                this.searchResultsArr.push(searchItem);
            }
            // may be a spam bot, do we want to block them?
            else if (config.MAX_USER_TWEETS_BLOCK) {
                this.blockedUsers.push(searchItem.user.id);
                API.blockUser(searchItem.user.id)
                    .then(() => console.log('Blocked possible bot user ' + searchItem.user.id));
            }
        });
    }

    /** The error callback for the Search API */
    errorHandler(err) {
        console.error('[Error]', err);

        try {
            // If the error is 'Rate limit exceeded', code 88 - try again after 10 minutes
            if (JSON.parse(err.error).errors[0].code === 88) {
                console.log('After ' + config.RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + ' minutes, I will try again to fetch some results...');

                this.limitLockout = true; // suspend other functions from running while lockout is in effect

                // Queue resume of program by setting the lockout to false
                setTimeout(() => this.limitLockout = false, config.RATE_LIMIT_EXCEEDED_TIMEOUT);
            }
        }
        catch (err) {
            console.log('[Error]', err);
        }
    }


    /** The Retweet worker - also performs Favorite and Follow actions if necessary */
    retweetWorker() {

        // Check if we have elements in the Result Array
        if (this.searchResultsArr.length) {
            // Pop the first element (by doing a shift() operation)
            var searchItem = this.searchResultsArr[0];
            this.searchResultsArr.shift();

            // Retweet
            console.log('[Retweeting]', searchItem.id);
            API.retweet(searchItem.id_str)
                .then(() => {

                    // On success, try to Favorite/Like and Follow
                    if (searchItem.text.toLowerCase().indexOf('fav') > -1 || searchItem.text.toLowerCase().indexOf('like') > -1) {
                        API.favorite(searchItem.id_str);
                        console.log('[Favorite]', searchItem.id);
                    }
                    if (searchItem.text.toLowerCase().indexOf('follow') > -1) {
                        API.follow(searchItem.user.id_str);
                        console.log('[Follow]', searchItem.user.screen_name);
                    }

                    // Then, re-queue the RT Worker
                    setTimeout(() => this.retweetWorker.bind(this), config.RETWEET_TIMEOUT);
                })
                .catch(() => {
                    console.error('[Error] RT Failed for', searchItem.id, '. Likely has already been retweeted. Adding to blacklist.');

                    // If the RT fails, blacklist it
                    this.badTweetIds.push(searchItem.id);

                    // Then, re-start the RT Worker
                    setTimeout(() => this.retweetWorker.bind(this), config.RETWEET_TIMEOUT);
                });

        }

        // No search results left in array
        else {
            if (this.limitLockout) {
                // we must schedule this to rerun, or else the program will exit when a lockout occurs
                setTimeout(() => this.retweetWorker.bind(this), config.RATE_SEARCH_TIMEOUT);
                return;
            }

            console.log('No more results. Will search and analyze again in ', config.RATE_SEARCH_TIMEOUT / 1000 + ' seconds.');

            // go fetch new results
            this.search();
            setTimeout(() => this.retweetWorker.bind(this), config.RATE_SEARCH_TIMEOUT);
        }
    }
}

// Start the bot
new ContestJSBot().start();