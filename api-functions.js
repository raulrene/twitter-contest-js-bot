const request = require('request-promise');
const oauth = require('./config').auth;
let allItems = [];
const rootUrl = 'https://api.twitter.com/1.1';

/**
 * Default callback
 * @param response {String} String representation of the response object
 */


/* API methods */
const API = {

    /**
     * Search for tweets
     * @param options {Object} Options object containing:
     * - text (Required) : String
     * - count (optional) : Number
     * - result_type (optional) : String
     * - since_id (optional) : Number - start search from this ID
     * - max_id (optional) : Number - end search on this ID
     */
    search: (options) => {
        return new Promise((resolve) => {
            const {text, count = 100, result_type = 'popular', since_id = 0, max_id} = options;

            let params =
                    `?q=${encodeURIComponent(options.text)}` +
                    `&count=${count}` +
                    `&result_type=${result_type}` +
                    `&since_id=${since_id}`;

            if (max_id) {
                params += `&max_id=${max_id}`;
            }

            allItems = [];
            API.searchByStringParam(params).then((items) => resolve(items));
        });
    },


    /**
     * Search w/ params
     * @param stringParams {String} Params as string
     */
    searchByStringParam: (stringParams) =>
        new Promise((resolve, reject) => {

            const searchCallback = (res) => {
                const result = JSON.parse(res);

                if (result && result.statuses) {
                    result.statuses.forEach((item) => allItems.push(item.id));
                    console.log('So far we have a total of:', allItems.length);

                    // If we have the next_results, search again for the rest (sort of a pagination)
                    const nextRes = result.search_metadata.next_results;
                    if (nextRes) {
                        API.searchByStringParam(nextRes).then((items) => resolve(items));
                    } else {
                        resolve(allItems);
                    }
                } else {
                    resolve(null);
                }
            };

            request.get({url: `${rootUrl}/search/tweets.json${stringParams}`, oauth})
                .then((res) => searchCallback(res))
                .catch((err) => reject(err));
        })
    ,

    /**
     * Retweet a tweet
     * @param tweetId {String} identifier for the tweet
     */
    retweet: (tweetId) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/statuses/retweet/${tweetId}.json`, oauth})
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Favorite a tweet
     * @param tweetId {String} identifier for the tweet
     */
    favorite: (tweetId) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/favorites/create.json?id=${tweetId}`, oauth})
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Follow a user by username
     * @param userId {String} identifier for the user
     */
    follow: (userId) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/friendships/create.json?user_id=${userId}`, oauth})
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Follow a user by username
     * @param userName {String} username identifier for the user
     */
    followByUsername: (userName) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/friendships/create.json?screen_name=${userName}`, oauth})
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Block a user
     * @param userId {String} ID of the user to block
     */
    blockUser: (userId) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/blocks/create.json?user_id=${userId}`, oauth})
                .then((res) => resolve(res))
                .catch((err) => reject(err))
        )
    ,

    /** Get list of blocked users for the current user */
    getBlockedUsers: () =>
        new Promise((resolve, reject) =>
            request.get({url: `${rootUrl}/blocks/list.json`, oauth})
                .then((res) => resolve(JSON.parse(res).users.map((user) => user.id)))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Get a user's tweets
     * @param userId {String} identifier for the user
     * @param count {Number} max tweets to retrieve
     */
    getTweetsForUser: (userId, count) =>
        new Promise((resolve, reject) =>
            request.get({url: `${rootUrl}/statuses/user_timeline.json?user_id=${userId}&count=${count}`, oauth})
                .then((response) => resolve(response))
                .catch((err) => reject(err))
        )
    ,

    /**
     * Delete a tweet
     * @param tweetId {String} identifier for the tweet
     */
    deleteTweet: (tweetId) =>
        new Promise((resolve, reject) =>
            request.post({url: `${rootUrl}/statuses/destroy/${tweetId}.json`, oauth})
                .then(() => {
                    console.log('Deleted tweet', tweetId);
                    resolve();
                })
                .catch((err) => reject(err))
        )

};

module.exports = API;
