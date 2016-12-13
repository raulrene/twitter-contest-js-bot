const request = require('request-promise');
const oauth = require('./config').auth;
const allItems = [];
const rootUrl = 'https://api.twitter.com/1.1';

/* Callback functions */
const callbacks = {

    /**
     * Default callback
     * @param response {String} String representation of the response object
     */
    defaultCb: (response) => {
        const result = JSON.parse(response);

        // Case when the callback is used after a search
        if (result && result.statuses) {
            result.statuses.forEach((item) => allItems.push(item.id));

            console.log('So far we have a total of:', allItems.length);

            // If we have the next_results, search again for the rest (sort of a pagination)
            if (result.search_metadata.next_results) {
                API.searchByStringParam(result.search_metadata.next_results, callbacks.defaultCbCb);
            }
        }
    },

    /**
     * Default error handler. Just prints out the error.
     * @param err {Object} error thrown
     */
    errorHandler: (err) => console.error('An error occurred:', err.message),

    /**
     * Processes the list of blocked users, appending each blocked user id to an array
     * @param response {String} String representation of the Twitter response object
     * @returns {Array} IDs of blocked users
     */
    processBlockedList: (response) => {
        const result = JSON.parse(response);
        let blockedList = [];

        result.users.forEach((user) => blockedList.push(user.id));
        console.log('Your list of blocked users:\n', blockedList);

        return blockedList;
    }
};

/* API methods */
const API = {

    /**
     * Search for tweets
     * @param options {Object} Options object containing:
     * - text (Required) : String
     * - callback (optional) : Function
     * - error_callback (optional) : Function
     * - count (optional) : Number
     * - result_type (optional) : String
     * - since_id (optional) : Number - start search from this ID
     * - max_id (optional) : Number - end search on this ID
     */
    search: (options) => {
        const {text, callback = callbacks.defaultCb, count = 100, result_type = 'popular', since_id = 0, max_id} = options;

        let params =
                `?q=${encodeURIComponent(options.text)}` +
                `&count=${count}` +
                `&result_type=${result_type}` +
                `&since_id=${since_id}`;

        if (max_id) {
            params += `&max_id=${max_id}`;
        }

        API.searchByStringParam(params, callback, options.error_callback);
    },


    searchByStringParam: (stringParams, callback, errorHandler = callbacks.errorHandler) => {
        request.get({url: `${rootUrl}/search/tweets.json${stringParams}`, oauth})
            .then(callback)
            .catch((err) => errorHandler(err));
    },

    retweet: (tweetId, cb, errorHandler = callbacks.errorHandler) => {
        request.post({url: `${rootUrl}/statuses/retweet/${tweetId}.json`, oauth})
            .then(cb)
            .catch((err) => errorHandler(err));
    },

    favorite: (tweetId) => {
        request.post({url: `${rootUrl}/favorites/create.json?id=${tweetId}`, oauth})
            .then(callbacks.defaultCb)
            .catch((err) => callbacks.errorHandler(err));
    },

    follow: (userId) => {
        request.post({url: `${rootUrl}/friendships/create.json?user_id=${userId}`, oauth})
            .then(callbacks.defaultCb)
            .catch((err) => callbacks.errorHandler(err));
    },

    followByUsername: (userName) => {
        request.post({url: `${rootUrl}/friendships/create.json?screen_name=${userName}`, oauth})
            .then(callbacks.defaultCb)
            .catch((err) => callbacks.errorHandler(err));
    },

    blockUser: (userId) => {
        request.post({url: `${rootUrl}/blocks/create.json?user_id=${userId}`, oauth})
            .then(callbacks.defaultCb)
            .catch((err) => callbacks.errorHandler(err));
    },

    getBlockedUsers: (cb) => {
        request.get({url: `${rootUrl}/blocks/list.json`, oauth})
            .then((response) => cb && cb(callbacks.processBlockedList(response)))
            .catch((err) => console.error('Error retrieving blocked users:', err.message));
    },

    getTweetsForUser: (userId, count, callback) => {
        request.get({url: `${rootUrl}/statuses/user_timeline.json?user_id=${userId}&count=${count}`, oauth})
            .then((response) => callback(JSON.parse(response)))
            .catch((err) => callbacks.errorHandler(err));
    },

    deleteTweet: (tweetId) => {
        request.post({url: `${rootUrl}/statuses/destroy/${tweetId}.json`, oauth})
            .then(() => console.log('Deleted tweet', tweetId))
            .catch((err) => callbacks.errorHandler(err));
    }
};

module.exports = API;
