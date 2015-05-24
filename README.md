Slack Bot for JIRA
==================

This slack bot will listen on any channel it's on for JIRA tickets.
It will lookup the ticket and respond with some information about it.

## Install
1. Clone this repository
2. `npm install`
3. Copy `config.js-dist` to `config.js` and fill it out
4. `node .`

## Docker

Build an image using `docker build -t your_image:tag`

### Configuration Environment Variables
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
