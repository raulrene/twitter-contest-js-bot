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
                setTimeout(() => this.worker(), config.RETWEET_TIMEOUT);
            })
            .catch(err => console.error('Your credentials are not valid. Check the config.js file and ensure you supply the correct API keys.', err));
    }

    /** The Search function */
    search() {
        // Don't search if limit lockout is in effect
        if (this.limitLockout) return;

        const since_id = this.last_tweet_id;
        console.log('[Search] Searching for tweets...');

        let doSearch = (index) => {
            // Construct the query
            let text = config.SEARCH_QUERIES[index] + config.SEARCH_QUERY_FILTERS;

            // Append preferred accounts if it's the case
            if (config.PREFERRED_ACCOUNTS) {
                text += ` from:${config.PREFERRED_ACCOUNTS.join(' OR from:')}`;
            }

            API.search({text, result_type: config.RESULT_TYPE, since_id})
                .then(res => {
                    // Call the search callback to process the data
                    this.searchCallback(res);

                    if (config.SEARCH_QUERIES[index + 1]) {
                        // Sleep between searches so we do not trigger rate limit lockout
                        console.log(`[Search] Sleeping for ${config.RATE_SEARCH_TIMEOUT / 1000} seconds between searches so we don't trigger rate limit`);
                        setTimeout(() => doSearch(index++), config.RATE_SEARCH_TIMEOUT);
                    }
                })
                .catch(err => this.errorHandler(err));
        };

        doSearch(0);
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
            if (config.MAX_USER_TWEETS && searchItem.user.statuses_count >= config.MAX_USER_TWEETS) {
                // may be a spam bot, do we want to block them?
                if (config.MAX_USER_TWEETS_BLOCK) {
                    this.blockedUsers.push(searchItem.user.id);
                    API.blockUser(searchItem.user.id)
                        .then(() => console.log('Blocked possible bot user' + searchItem.user.id));
                }
                return;
            }

            // Save the search item in the Search Results array
            this.searchResultsArr.push(searchItem);
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


    /**
     * The worker starts by Retweeting a tweet.
     * If it finds necessary it also likes (favorites) it and follows the user.
     */
    worker() {

        // Check if we have elements in the Result Array
        if (this.searchResultsArr.length) {
            // Pop the first element (by doing a shift() operation)
            var searchItem = this.searchResultsArr[0];
            this.searchResultsArr.shift();

            // Retweet
            console.log('[Retweeting Tweet #]', searchItem.id);
            API.retweet(searchItem.id_str)
                .then(() => {

                    // Check if we should Like (favorite) the Tweet
                    if (searchItem.text.toLowerCase().indexOf('fav') > -1 || searchItem.text.toLowerCase().indexOf('like') > -1) {
                        API.like(searchItem.id_str);
                        console.log('[Liked tweet #]', searchItem.id);
                    }

                    // Check if we should Follow the user
                    if (searchItem.text.toLowerCase().indexOf('follow') > -1) {
                        API.follow(searchItem.user.id_str);
                        console.log('[Following user]', searchItem.user.screen_name);
                    }

                    // Then, re-queue the RT Worker
                    setTimeout(() => this.worker(), config.RETWEET_TIMEOUT);
                })
                .catch(() => {
                    console.error('[Error] RT Failed for', searchItem.id, '. Likely has already been retweeted. Adding to blacklist.');

                    // If the RT fails, blacklist it
                    this.badTweetIds.push(searchItem.id);

                    // Then, re-start the RT Worker
                    setTimeout(() => this.worker(), config.RETWEET_TIMEOUT);
                });

        }

        // No search results left in array
        else {
            if (this.limitLockout) {
                // we must schedule this to rerun, or else the program will exit when a lockout occurs
                setTimeout(() => this.worker(), config.RATE_SEARCH_TIMEOUT);
                return;
            }

            console.log('No more results. Will search and analyze again in ', config.RATE_SEARCH_TIMEOUT / 1000 + ' seconds.');

            // go fetch new results
            this.search();
            setTimeout(() => this.worker(), config.RATE_SEARCH_TIMEOUT);
        }
    }
}

// Start the bot
new ContestJSBot().start();