var API = require('./api-functions'),
    RATE_LIMIT_EXCEEDED_TIMEOUT = 1000 * 60 * 10,     // 10 minutes
    RETWEET_TIMEOUT = 1000 * 15,                      // 15 seconds
    RATE_SEARCH_TIMEOUT = 1000 * 30,                  // 30 seconds

    searchQueries = [
                     "retweet to win -vote -filter:retweets OR RT to win -vote -filter:retweets",
                     "retweet 2 win -vote -filter:retweets OR RT 2 win -vote -filter:retweets"
                    ],

    // "Specifies what type of search results you would prefer to receive. The current default is “mixed.” Valid values include:"
    // Default: "recent"   (return only the most recent results in the response)
    //          "mixed"    (Include both popular and real time results in the response)
    //          "popular"  (return only the most popular results in the response)
    RESULT_TYPE = "mixed",

    // Minimum amount of retweets a tweet needs before we retweet it.
    // - Significantly reduces the amount of fake contests retweeted and stops
    //    retweeting other bots that retweet retweets of other bots.
    // Default: 10
    MIN_RETWEETS_NEEDED = 10,

    // Maxiumum amount of tweets a user can have before we do not retweet them.
    // - Accounts with an extremely large amount of tweets are often bots,
    //    therefore we should ignore them and not retweet their tweets.
    // Default: 20000
    //          0 (disables)
    MAX_USER_TWEETS = 20000,

    // If option above is enabled, allow us to block them.
    // - Blocking users do not prevent their tweets from appearing in search,
    //    but this will ensure you do not accidentally retweet them still.
    // Default: false
    //          true (will block user)
    MAX_USER_TWEETS_BLOCK = false;


// Main self-initializing function
(function() {
    var last_tweet_id = 0,
        searchResultsArr = [],
        blockedUsers = [],
        badTweetIds = [],
        limitLockout = false;

    /** The Callback function for the Search API */
    var searchCallback = function(response) {
        var payload = JSON.parse(response);

        // Iterating through tweets returned by the Search
        payload.statuses.forEach(function (searchItem) {
          // Lots of checks to filter out bad tweets, other bots and contests that are likely not legitimate

          // is not already a retweet
          if (!searchItem.retweeted_status) {
              // is not an ignored tweet
              if (badTweetIds.indexOf(searchItem.id) === -1) {
                  // has enough retweets on the tweet for us to retweet it too (helps prove legitimacy)
                  if (searchItem.retweet_count >= MIN_RETWEETS_NEEDED) {
                      // user is not on our blocked list
                      if (blockedUsers.indexOf(searchItem.user.id) === -1) {
                          if (MAX_USER_TWEETS && searchItem.user.statuses_count < MAX_USER_TWEETS) { // should we ignore users with high amounts of tweets (likely bots)
                              // Save the search item in the Search Results array
                              searchResultsArr.push(searchItem);
                          }
                          else if (MAX_USER_TWEETS_BLOCK) { // may be a spam bot, do we want to block them?
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

    function unlock() {
        console.log("Limit lockout time has passed, resuming program...");
        limitLockout = false;
    };

    /** The error callback for the Search API */
    var errorHandler = function (err) {
        console.error("Error!", err.message);

        try {
            // If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
            if (JSON.parse(err.error).errors[0].code === 88) {
                console.log("After " + RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + " minutes, I will try again to fetch some results...");

                limitLockout = true; // suspend other functions from running while lockout is in effect

                // queue unsuspend of program
                setTimeout(function () {
                    unlock();
                }, RATE_LIMIT_EXCEEDED_TIMEOUT);
            }
        }
        catch (err) {
            console.log("Possible unexpected token E" + err);
        }
    };

    /** The Search function */
    var search = function() {
        // do not search if limit lockout is in effect
        if (limitLockout)
            return;

        console.log("Searching for tweets...");

        for (var i = 0; i < searchQueries.length; ++i) {
            API.search({
                // Without having the word "vote", and filtering out retweets - as much as possible
                text: searchQueries[i],
                result_type: RESULT_TYPE,
                callback: searchCallback,
                error_callback: errorHandler,
                since_id: last_tweet_id
            });

            // we need to wait between search queries so we do not trigger rate limit lockout
            sleepFor(RATE_SEARCH_TIMEOUT);
            console.log("Sleeping between searches so we don't trigger rate limit...");
        }
    };


    /** The Retweet worker - also performs Favorite and Follow actions if necessary */
    var retweetWorker = function() {
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
                    }, RETWEET_TIMEOUT);
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
                    }, RETWEET_TIMEOUT);
                }
            );
        } else { // no search results left in array
            if (limitLockout) {
                // we must schedule this to rerun, or else the program will exit when a lockout occurs
                setTimeout(function () {
                    retweetWorker();
                }, RATE_SEARCH_TIMEOUT);
                return;
            }

            console.log("No more results... will search and analyze again in " + RATE_SEARCH_TIMEOUT / 1000 + " seconds.");

            // go fetch new results
            search();

            setTimeout(function () {
                retweetWorker();
            }, RATE_SEARCH_TIMEOUT);
        }
    }

    function sleepFor(sleepDuration) {
        var now = new Date().getTime();
        while (new Date().getTime() < now + sleepDuration) { /* do nothing */ }
    }


    // Initializing function, begins the program.
    // First, gets the blocked users
    API.getBlockedUsers(function (blockedList) {

        blockedUsers = blockedList;

        // Start searching (the Search is in itself a worker, as the callback continues to fetch data)
        search();

        // Start the Retweet worker after short grace period for search results to come in
        setTimeout(function () {
            retweetWorker();
        }, 8000);
    });
}());
