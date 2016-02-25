var API = require('./api-functions'),
    RATE_LIMIT_EXCEEDED_TIMEOUT = 1000 * 60 * 10,     // 10 minutes
    RETWEET_TIMEOUT = 1000 * 5;                     // 5 seconds


// Main self-initializing function
(function() {
    var last_tweet_id = 0,
        searchResultsArr = [],
        blockedUsers = [];

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

      /** The error callback for the Search API */
      var errorHandler = function (err) {
          console.error("Error!", err.message);

          // If the error is "Rate limit exceeded", code 88 - try again after 10 minutes
          if (JSON.parse(err.error).errors[0].code === 88) {
              console.log("After " + RATE_LIMIT_EXCEEDED_TIMEOUT / 60000 + " minutes, I will try again to fetch some results...");
              setTimeout(function () {
                  search();
              }, RATE_LIMIT_EXCEEDED_TIMEOUT);
          }
      };

      /** The Search function */
      var search = function () {
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
      var retweetWorker = function () {
          setTimeout(function () {

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

                        // On success, try to Favorite and Follow
                        if (searchItem.text.toLowerCase().indexOf("fav") > -1) {
                            //API.favorite(searchItem.id_str);
                            console.log("Favorite", searchItem.id);
                        }
                        if (searchItem.text.toLowerCase().indexOf("follow") > -1) {
                            //API.follow(searchItem.user.id_str);
                            console.log("Follow", searchItem.user.screen_name);
                        }

                        // Then, re-start the RT Worker
                        retweetWorker();
                    },

                    function error() {
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


          }, RETWEET_TIMEOUT);
      }


      // First, get the blocked users
      API.getBlockedUsers(function (blockedList) {

          blockedUsers = blockedList;

          // Start the Retweet worker
          retweetWorker();

          // Start searching (the Search is in itself a worked, as the callback continues to fetch data)
          search();
      });
}());
