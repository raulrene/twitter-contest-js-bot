# Twitter-ContestJS-bot

A Javascript bot that searches recent tweets about contests (based on retweeting) and retweets them. If necessary, it also favorites the tweet. (Follow functionality comming up soon)

Inspired by http://www.hscott.net/twitter-contest-winning-as-a-service/

##To Dos
 * Keep polling content without exiting program
 * Follow users that require following for entering the contest

##Disclaimer

This bot is written purely for educational purposes. I hold no liability for what you do with this bot or what happens to you by using this bot. Abusing this bot can get you banned from Twitter, so make sure to read up on proper usage of the Twitter API.

##Installation
 * Make sure you have NodeJS up and running.
 * Get the code
 * Do a `npm install` in the directory where you cloned the repository (for installing dependencies)
 * Edit the `config.js` file with your Twitter API Credentials
 * run `node index.js`

## Dependencies
It makes use of the <a href="https://github.com/request/request"><b>Request</b></a> library, a HTTP JS client.

## Alternatives
If you're looking for similar projects in alternative languages, check these out:
 * (Python) https://github.com/kurozael/twitter-contest-bot

## Licence
The code is open-source and available under the MIT Licence. More details in the LICENCE.md file.
