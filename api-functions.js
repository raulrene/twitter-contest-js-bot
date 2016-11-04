const request = require('request-promise');
const auth = require('./config').auth;
const allItems = [];

//Callback functions
const callbacks = {
    defaultCb: (response) => {
        const result = JSON.parse(response);

        // Case when the callback is used after a search
        if (result && result.statuses) {
            result.statuses.forEach((item) => allItems.push(item.id));

            console.log("So far we have a total of:", allItems.length);

            // If we have the next_results, search again for the rest (sort of a pagination)
            if (result.search_metadata.next_results) {
                API.searchByStringParam(result.search_metadata.next_results, callbacks.defaultCbCb);
            }
        }
    },

    /** Processes the list of blocked users, appending each blocked user id to an array */
    processBlockedList: (response) => {
        const result = JSON.parse(response);
        let blockedList = [];

        result.users.forEach((user) => blockedList.push(user.id));
        console.log("Your list of blocked users:\n", blockedList);

        return blockedList;
    }
};

const API = {
    search: (options) => {
        var params =
                "?q=" + encodeURIComponent(options.text) +
                "&count=" + (options.count ? options.count : 100) +
                "&result_type=" + (options.result_type ? options.result_type : 'popular') +
                "&since_id=" + (options.since_id ? options.since_id : 0);

        if (options.max_id) {
            params += "&max_id=" + options.max_id;
        }

        API.searchByStringParam(params, options.callback ? options.callback : callbacks.defaultCb, options.error_callback);
    },

    searchByStringParam: (stringParams, callback, errorHandler) => {
        request.get({url: 'https://api.twitter.com/1.1/search/tweets.json' + stringParams, oauth: auth})
            .then(callback)
            .catch((err) => {
                    if (errorHandler) {
                        errorHandler(err);
                    } else {
                        console.error("An error occurred:", err.message);
                    }
                }
            )
        ;
    },

    retweet: (tweetId, cb, errorHandler) => {
        request.post({url: 'https://api.twitter.com/1.1/statuses/retweet/' + tweetId + '.json', oauth: auth})
            .then(() => cb())
            .catch((err) => {
                    if (errorHandler)
                        errorHandler(err);
                    else
                        console.error("An error occurred:", err.message);
                }
            )
        ;
    },

    favorite: (tweetId) => {
        request.post({url: 'https://api.twitter.com/1.1/favorites/create.json?id=' + tweetId, oauth: auth})
            .then(callbacks.defaultCb)
            .catch((err) => console.error(err.message));
    },

    follow: (userId) => {
        request.post({url: 'https://api.twitter.com/1.1/friendships/create.json?user_id=' + userId, oauth: auth})
            .then(callbacks.defaultCb)
            .catch((err) => console.error(err.message));
    },

    followByUsername: (userName) => {
        request.post({url: 'https://api.twitter.com/1.1/friendships/create.json?screen_name=' + userName, oauth: auth})
            .then(callbacks.defaultCb)
            .catch((err) => console.error(err.message));
    },

    blockUser: (userId) => {
        request.post({url: 'https://api.twitter.com/1.1/blocks/create.json?user_id=' + userId, oauth: auth})
            .then(callbacks.defaultCb)
            .catch((err) => console.error(err.message));
    },

    getBlockedUsers: (callback) => {
        request.get({url: 'https://api.twitter.com/1.1/blocks/list.json', oauth: auth})
            .then((response) => {
                var blockedList = callbacks.processBlockedList(response);

                if (callback) {
                    callback(blockedList);
                }
            })
            .catch((err) => console.error("Error retrieving blocked users:", err.message));
    },

    getTweetsForUser: (userId, count, callback) => {
        request.get({
            url: 'https://api.twitter.com/1.1/statuses/user_timeline.json?user_id=' + userId + '&count=' + count,
            oauth: auth
        })
            .then((response) => {
                callback(JSON.parse(response));
            })
            .catch((err) => {
                console.error(err.message);
            });
    },

    deleteTweet: (tweetId) => {
        request.post({url: 'https://api.twitter.com/1.1/statuses/destroy/' + tweetId + ".json", oauth: auth})
            .then(() => {
                console.log("Deleted tweet", tweetId);
            })
            .catch((err) => console.error(err.message));
    }
};

module.exports = API;
