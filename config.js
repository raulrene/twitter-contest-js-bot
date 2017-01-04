const config = {

    /* These are your twitter developer authentication details. Get them at https://apps.twitter.com/ */
    auth: {
        consumer_key: '',
        consumer_secret: '',
        token: '',
        token_secret: ''
    },

    // Array of preferred accounts. If set, it only filters tweets from these accounts. Example: ['user1', 'user2']
    PREFERRED_ACCOUNTS: [],

    SEARCH_QUERIES: [
        'retweet to win',
        'RT to win',
        'retweet 2 win',
        'RT 2 win'
    ],

    // Appended at the end of search queries to filter out some data
    SEARCH_QUERY_FILTERS: ' -vote -filter:retweets',

    // 'Specifies what type of search results you would prefer to receive. The current default is “mixed.” Valid values include:'
    // Default: 'recent'   (return only the most recent results in the response)
    //          'mixed'    (Include both popular and real time results in the response)
    //          'popular'  (return only the most popular results in the response)
    RESULT_TYPE: 'mixed',

    // Minimum amount of retweets a tweet needs before we retweet it.
    // - Significantly reduces the amount of fake contests retweeted and stops
    //    retweeting other bots that retweet retweets of other bots.
    // Default: 10
    MIN_RETWEETS_NEEDED: 10,

    // Maximum amount of tweets a user can have before we do not retweet them.
    // - Accounts with an extremely large amount of tweets are often bots,
    //    therefore we should ignore them and not retweet their tweets.
    // Default: 20000
    //          0 (disables)
    MAX_USER_TWEETS: 20000,

    // If option above is enabled, allow us to block them.
    // - Blocking users do not prevent their tweets from appearing in search,
    //    but this will ensure you do not accidentally retweet them still.
    // Default: false
    //          true (will block user)
    MAX_USER_TWEETS_BLOCK: false,

    // 10 minutes timeout for limit exceeded
    RATE_LIMIT_EXCEEDED_TIMEOUT: 1000 * 60 * 10,

    // 15 seconds timeout for Retweets
    RETWEET_TIMEOUT: 1000 * 15,

    // 30 seconds for Search Timeout
    RATE_SEARCH_TIMEOUT: 1000 * 30
};

module.exports = config;