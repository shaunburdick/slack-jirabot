Slack Bot for JIRA
==================

This slack bot will listen on any channel it's on for JIRA tickets.
It will lookup the ticket and respond with some information about it.

## Install
1. Clone this [repository](https://github.com/shaunburdick/slack-jirabot.git)
2. `npm install`
3. Copy `config.js-dist` to `config.js` and fill it out
4. `npm start`

## Docker

Build an image using `docker build -t your_image:tag`

### Configuration Environment Variables
You can set the configuration of the bot by using environment variables.
*ENVIRONMENT_VARIABLE*=Default Value

- *JIRA_PROTOCOL*=https
- *JIRA_HOST*=jira.yourdomain.com
- *JIRA_PORT*=443
- *JIRA_USER*=username
- *JIRA_PASS*=password
- *JIRA_API_VERSION*=latest
- *JIRA_VERBOSE*=false
- *JIRA_STRICT_SSL*=false
- *JIRA_REGEX*=([A-Z0-9]+\-[0-9]+)
- *SLACK_TOKEN*=xoxb-foo
- *SLACK_AUTO_RECONNECT*=true
- *SLACK_AUTO_MARK*=true

Set them using the `-e` flag while running docker:

```
docker run -it \
-e JIRA_HOST=foo.bar.com \
-e JIRA_USER=someuser \
-e JIRA_PASS=12345 \
-e SLACK_TOKEN=xobo-blarty-blar-blar \
shaunburdick/slack-jirabot:latest
```