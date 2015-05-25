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

- *JIRA_PROTOCOL*=https, https or http
- *JIRA_HOST*=jira.yourdomain.com, hostname for JIRA
- *JIRA_PORT*=443, Usually 80 or 443
- *JIRA_BASE*= , If JIRA doesn't sit at the root, put its base directory here
- *JIRA_USER*=username, Username of JIRA user
- *JIRA_PASS*=password, Password of JIRA user
- *JIRA_API_VERSION*=latest, API version slug
- *JIRA_VERBOSE*=false, Verbose logging
- *JIRA_STRICT_SSL*=false, Set to false for self-signed certificates
- *JIRA_REGEX*=([A-Z0-9]+\-[0-9]+), The regex to match JIRA tickets
- *JIRA_SPRINT_FIELD*=, if using greenhopper, set the custom field that holds sprint information (customfield_1xxxx)
- *SLACK_TOKEN*=xoxb-foo, Your Slack Token
- *SLACK_AUTO_RECONNECT*=true, Reconnect on disconnect
- *SLACK_AUTO_MARK*=true, Mark messages as read

Set them using the `-e` flag while running docker:

```
docker run -it \
-e JIRA_HOST=foo.bar.com \
-e JIRA_USER=someuser \
-e JIRA_PASS=12345 \
-e SLACK_TOKEN=xobo-blarty-blar-blar \
shaunburdick/slack-jirabot:latest
```