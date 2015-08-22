# Twitter-ContestJS-bot

A Javascript bot that searches recent tweets about contests (based on retweeting) and Retweets them. If necessary, it also Favorites the tweet or Follows the user. It ignores tweets from blocked users.

Inspired by http://www.hscott.net/twitter-contest-winning-as-a-service/

##Disclaimer

This bot is written purely for educational purposes. I hold no liability for what you do with this bot or what happens to you by using this bot. Abusing this bot can get you banned from Twitter, so make sure to read up on proper usage of the Twitter API.

##Installation
 * Make sure you have NodeJS up and running
 * `git clone` the repository, or download the zip file and unzip it
 * `npm install` in the directory where you cloned the repository (this is needed for installing dependencies)
 * Edit the `config.js` file with your Twitter API Credentials
 * run `node index.js`

## Dependencies
It makes use of the <a href="https://github.com/request/request-promise"><b>reqyest-promise</b></a> library, a HTTP JS client.

## Alternatives
If you're looking for similar projects in alternative languages, check these out:
 * (Python) https://github.com/kurozael/twitter-contest-bot

## Licence
The code is open-source and available under the MIT Licence. More details in the LICENCE.md file.
