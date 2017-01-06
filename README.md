# Twitter contest JS bot

A Javascript bot that searches for tweets about contests and Retweets them. If necessary, it can also Like (Favorite) the tweet, Reply and Follow the user. It ignores tweets from blocked users.

Inspired by http://www.hscott.net/twitter-contest-winning-as-a-service/

## Disclaimer

This bot is written purely for educational purposes. I hold no liability for what you do with this bot or what happens to you by using this bot. Abusing this bot can get you banned from Twitter, so make sure to read up on proper usage of the Twitter API.

## Installation
 * Make sure you have NodeJS up and running
 * `git clone` the repository, or download the zip file and unzip it
 * `npm install` in the directory where you cloned the repository (this is needed for installing dependencies)

## Usage
* Edit the `config.js` file with your Twitter API Credentials
* The configuration file also holds all configurations needed for the bot:
    * __SEARCH_QUERIES__ - the searches the bot will do
    * __SEARCH\_QUERY_FILTERS__ - filters out data (each filter must be preceded by a "-")  
    * __SEARCH\_BY_GEOCODE__ - allows searching by location given a latitude, longitude and radius
    * __RESULT_TYPE__ - recent, popular or mixed
    * __MIN\_RETWEETS_NEEDED__ - minimum amount of retweets a tweet needs before we retweet it (significantly reduces the amount of fake contests)
    * __MAX\_USER_TWEETS__ - maximum amount of tweets a user can have before we do not retweet them
    * __MAX\_USER\_TWEETS_BLOCK__ - block the user you suspect of being fake because of the high number of tweets
    * __RATE\_LIMIT\_EXCEEDED_TIMEOUT__ - timeout when the max Twitter API limit is exceeded
    * __RETWEET_TIMEOUT__ - timeout between retweets
    * __RATE\_SEARCH_TIMEOUT__ - timeout between searches
    * __PREFERRED_ACCOUNTS__ - array of preferred accounts; if set, it only filters tweets from these accounts
* To start, run `node index.js`

## Dependencies
It makes use of [request-promise](https://github.com/request/request-promise) - a HTTP JS client

## Alternatives
If you're looking for similar projects in alternative languages, check these out:
 * (Python) https://github.com/kurozael/twitter-contest-bot

## Licence
The code is open-source and available under the MIT Licence. More details in the LICENCE.md file.
