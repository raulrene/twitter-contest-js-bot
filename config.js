module.exports = {

    /* These are your twitter developer authentication details. Get them at https://apps.twitter.com/ */
    Auth: {
        consumer_key: "",
        consumer_secret: "",
        token: "",
        token_secret: ""
    },

    /* Extra user preferences */
    Preferences: {

        // Array of preferred accounts. If set, it only filters tweets from these accounts. Example: ["user1", "user2"]
        preferred_accounts: []
    }
};
