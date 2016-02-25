var API = require('./api-functions'),
    RATE_LIMIT_EXCEEDED_TIMEOUT = 1000 * 60 * 10,     // 10 minutes
    RETWEET_TIMEOUT = 1000 * 15,                      // 15 seconds
    RATE_SEARCH_TIMEOUT = 1000 * 30;                  // 30 seconds


// Main self-initializing function
(function() {
    var last_tweet_id = 0,
        searchResultsArr = [],
        blockedUsers = [],
        limitLockout = false;

    /** The Callback function for the Search API */
    var searchCallback = function (response) {
        var payload = JSON.parse(response);

        // Iterating through tweets returned by the Search
        payload.statuses.forEach(function (searchItem) {

            // Further filtering out the retweets and tweets from blocked users
            if (!searchItem.retweeted_status && blockedUsers.indexOf(searchItem.user.id) === -1) {

                // Save the search item in the Search Results array
                searchResultsArr.push(searchItem);
            }
        });

        // If we have the next_results, search again for the rest (sort of a pagination)
        if (payload.search_metadata.next_results) {
            API.searchByStringParam(payload.search_metadata.next_results, searchCallback);
        }
    };

    function unlock()
    {
        console.log("Limit lockout time has passed, resuming program...");
        limitLockout = false;
    };

    /** The error callback for the Search API */
    var errorHandler = function (err) {
        console.error("Error!", err.message);

        // If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
        if (JSON.parse(err.error).errors[0].code === 88)
        {
            console.log("After " + RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + " minutes, I will try again to fetch some results...");

            limitLockout = true; // suspend other functions from running while lockout is in effect

            // queue unsuspend of program
            setTimeout(function () {
                unlock();
            }, RATE_LIMIT_EXCEEDED_TIMEOUT);
        }
    };

    /** The Search function */
    var search = function()
    {
        // do not search if limit lockout is in effect
        if (limitLockout)
            return;

        console.log("Searching for tweets...");

        API.search({
            // Without having the word "vote", and filtering out retweets - as much as possible
            text: "retweet to win -vote -filter:retweets OR RT to win -vote -filter:retweets",
            result_type: "recent",
            callback: searchCallback,
            error_callback: errorHandler,
            since_id: last_tweet_id
        });
    };


    /** The Retweet worker - also performs Favorite and Follow actions if necessary */
    var retweetWorker = function()
    {
        // Check if we have elements in the Result Array
        if (searchResultsArr.length)
        {
            // Pop the first element (by doing a shift() operation)
            var searchItem = searchResultsArr[0];
            searchResultsArr.shift();

            // Retweet
            console.log("Retweeting", searchItem.id);
            API.retweet(
                searchItem.id_str,
                function success()
                {
                    // On success, try to Favorite and Follow
                    if (searchItem.text.toLowerCase().indexOf("fav") > -1) {
                        //API.favorite(searchItem.id_str);
                        console.log("Favorite", searchItem.id);
                    }
                    if (searchItem.text.toLowerCase().indexOf("follow") > -1) {
                        //API.follow(searchItem.user.id_str);
                        console.log("Follow", searchItem.user.screen_name);
                    }

                    // Then, re-queue the RT Worker
                    setTimeout(function () {
                        retweetWorker();
                    }, RETWEET_TIMEOUT);
                },

                function error()
                {
                    console.error("RT Failed for", searchItem.id, ". Re-trying after a timeout.");

                    // If the RT fails, add the item back at the beginning of the array
                    searchResultsArr.unshift(searchItem);

                    // Re-start after a timeout
                    setTimeout(function () {
                        retweetWorker();
                    }, RATE_LIMIT_EXCEEDED_TIMEOUT);
                }
            );
        }
        else // no search results left in array
        {
            if (limitLockout)
            {
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


        // First, get the blocked users
        API.getBlockedUsers(function (blockedList) {

            blockedUsers = blockedList;

            // Start the Retweet worker after short grace period for search results to come in
            setTimeout(function () {
                retweetWorker();
            }, 8000);

            // Start searching (the Search is in itself a worker, as the callback continues to fetch data)
            search();
        });
}());
