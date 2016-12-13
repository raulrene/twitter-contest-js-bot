const API = require('./api-functions');
const config = require("./config");

const last_tweet_id = 0;
let searchResultsArr = [];
let blockedUsers = [];
const badTweetIds = [];
let limitLockout = false;

/** The Callback function for the Search API */
var searchCallback = function (response) {
    var payload = JSON.parse(response);

    // Iterating through tweets returned by the Search
    payload.statuses.forEach(function (searchItem) {
        // Lots of checks to filter out bad tweets, other bots and contests that are likely not legitimate

        // is not already a retweet
        if (!searchItem.retweeted_status && !searchItem.quoted_status_id) {
            // is not an ignored tweet
            if (badTweetIds.indexOf(searchItem.id) === -1) {
                // has enough retweets on the tweet for us to retweet it too (helps prove legitimacy)
                if (searchItem.retweet_count >= config.MIN_RETWEETS_NEEDED) {
                    // user is not on our blocked list
                    if (blockedUsers.indexOf(searchItem.user.id) === -1) {
                        if (config.MAX_USER_TWEETS && searchItem.user.statuses_count < config.MAX_USER_TWEETS) { // should we ignore users with high amounts of tweets (likely bots)
                            // Save the search item in the Search Results array
                            searchResultsArr.push(searchItem);
                        }
                        else if (config.MAX_USER_TWEETS_BLOCK) { // may be a spam bot, do we want to block them?
                            blockedUsers.push(searchItem.user.id);
                            API.blockUser(searchItem.user.id);
                            console.log("Blocking possible bot user " + searchItem.user.id);
                        }
                    }
                }
            }
        }
    });

    // If we have the next_results, search again for the rest (sort of a pagination)
    if (payload.search_metadata.next_results) {
        API.searchByStringParam(payload.search_metadata.next_results, searchCallback);
    }
};

var unlock = function () {
    console.log("Limit lockout time has passed, resuming program...");
    limitLockout = false;
};

/** The error callback for the Search API */
var errorHandler = function (err) {
    console.error("Error!", err.message);

    try {
        // If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
        if (JSON.parse(err.error).errors[0].code === 88) {
            console.log("After " + config.RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + " minutes, I will try again to fetch some results...");

            limitLockout = true; // suspend other functions from running while lockout is in effect

            // queue unsuspend of program
            setTimeout(function () {
                unlock();
            }, config.RATE_LIMIT_EXCEEDED_TIMEOUT);
        }
    }
    catch (err) {
        console.log("Possible unexpected token E" + err);
    }
};

/** The Search function */
var search = function () {
    // do not search if limit lockout is in effect
    if (limitLockout) {
        return;
    }

    console.log("Searching for tweets...");

    var query,
        preferredAccounts = " from:" + config.preferred_accounts.join(" OR from:");

    for (var i = 0; i < config.SEARCH_QUERIES.length; ++i) {
        // Construct the query
        query = config.SEARCH_QUERIES[i] + config.SEARCH_QUERY_FILTERS;

        // Append preferred accounts if it's the case
        if (preferredAccounts) {
            query += preferredAccounts;
        }

        // Without having the word "vote", and filtering out retweets - as much as possible
        API.search({
            text: query,
            result_type: config.RESULT_TYPE,
            callback: searchCallback,
            error_callback: errorHandler,
            since_id: last_tweet_id
        });

        // we need to wait between search queries so we do not trigger rate limit lockout
        sleepFor(config.RATE_SEARCH_TIMEOUT);
        console.log("Sleeping between searches so we don't trigger rate limit...");
    }
};


/** The Retweet worker - also performs Favorite and Follow actions if necessary */
var retweetWorker = function () {
    // Check if we have elements in the Result Array
    if (searchResultsArr.length) {
        // Pop the first element (by doing a shift() operation)
        var searchItem = searchResultsArr[0];
        searchResultsArr.shift();

        // Retweet
        console.log("Retweeting", searchItem.id);
        API.retweet(
            searchItem.id_str,
            function success() {
                // On success, try to Favorite/Like and Follow
                if (searchItem.text.toLowerCase().indexOf("fav") > -1 || searchItem.text.toLowerCase().indexOf("like") > -1) {
                    API.favorite(searchItem.id_str);
                    console.log("Favorite", searchItem.id);
                }
                if (searchItem.text.toLowerCase().indexOf("follow") > -1) {
                    API.follow(searchItem.user.id_str);
                    console.log("Follow", searchItem.user.screen_name);
                }

                // Then, re-queue the RT Worker
                setTimeout(function () {
                    retweetWorker();
                }, config.RETWEET_TIMEOUT);
            },

            function error(errorCallback) {
                // Currently will only apply to rate limit errors
                if (errorCallback)
                    errorHandler(errorCallback);

                console.error("RT Failed for", searchItem.id, ". Likely has already been retweeted. Adding to blacklist.");

                // If the RT fails, blacklist it
                badTweetIds.push(searchItem.id);

                // Then, re-start the RT Worker
                setTimeout(function () {
                    retweetWorker();
                }, config.RETWEET_TIMEOUT);
            }
        );
    } else { // no search results left in array
        if (limitLockout) {
            // we must schedule this to rerun, or else the program will exit when a lockout occurs
            setTimeout(function () {
                retweetWorker();
            }, config.RATE_SEARCH_TIMEOUT);
            return;
        }

        console.log("No more results... will search and analyze again in " + config.RATE_SEARCH_TIMEOUT / 1000 + " seconds.");

        // go fetch new results
        search();

        setTimeout(function () {
            retweetWorker();
        }, config.RATE_SEARCH_TIMEOUT);
    }
};

var sleepFor = function (sleepDuration) {
    var now = new Date().getTime();
    while (new Date().getTime() < now + sleepDuration) {
        /* do nothing */
    }
};

// Begin the program by fetching the blocked users list for the current user
API.getBlockedUsers()
    .then((blockedList) => {
        blockedUsers = Object.assign([], blockedList);

        // // Start searching (the Search is in itself a worker, as the callback continues to fetch data)
        // search();
        //
        // // Start the Retweet worker after short grace period for search results to come in
        // setTimeout(function () {
        //     retweetWorker();
        // }, 8000);
    })
    .catch((err) => console.error('Your credentials are not valid. Check the config.js file and ensure you supply the corrent API keys.', err.messsage));

