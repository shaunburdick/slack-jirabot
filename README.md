# Slack Bot for JIRA
[![Build Status](https://travis-ci.org/shaunburdick/slack-jirabot.svg)](https://travis-ci.org/shaunburdick/slack-jirabot) [![Coverage Status](https://coveralls.io/repos/shaunburdick/slack-jirabot/badge.svg?branch=master&service=github)](https://coveralls.io/github/shaunburdick/slack-jirabot?branch=master)

This slack bot will listen on any channel it's on for JIRA tickets. It will lookup the ticket and respond with some information about it.

## Example
![Example](https://github.com/shaunburdick/slack-jirabot/raw/master/doc/img/example.png)

## Install
1. Clone this [repository](https://github.com/shaunburdick/slack-jirabot.git)
2. `npm install`
3. Copy `./config.default.js` to `./config.js` and [fill it out](#configjs)
4. `npm start`

## Test
1. `npm install` (make sure your NODE_ENV != `production`)
2. `npm test`

## Build
1. `npm install` (make sure your NODE_ENV != `production`)
2. `./node_modules/.bin/gulp build`

## config.js
The config file should be filled out as follows:
- jira:
  - protocol: string, https or http
  - host: string, the host or fqdn for JIRA (jira.yourhost.domain)
  - port: integer, the port JIRA is on, usually 80 or 443
  - base: string, If JIRA doesn't sit at the root, put its base directory here
  - user: string, Username of JIRA user
  - pass: string, Password of JIRA user
  - apiVersion: string, API version slug, usually latest
  - verbose: boolean, Verbose logging
  - strictSSL: boolean, set false for self-signed certificates
  - regex: string, a string that will be used as a RegExp to match tickets, defaults to '([A-Z][A-Z0-9]+\-[0-9]+)'
  - sprintField: string, If using greenhopper, set the custom field that holds sprint information (customfield_1xxxx)
  - customFields:
    - Add any custom fields you would like to display
    - customfield_1xxxx: "Custom Title"
    - Object notation is supported
      - "customfield_1xxxx.member": "Custom Title"
      - "customfield_1xxxx[0].member": "Custom Title"

- slack:
  - token: string, Your slack token
  - autoReconnect: boolean, Reconnect on disconnect

- usermap:
  - Map a JIRA username to a Slack username
  - "jira-username": "slack-username"

## Docker
Build an image using `docker build -t your_image:tag`

Official Image [shaunburdick/slack-jirabot](https://registry.hub.docker.com/u/shaunburdick/slack-jirabot/)

### Configuration Environment Variables
You can set the configuration of the bot by using environment variables. _ENVIRONMENT_VARIABLE_=Default Value
- _JIRA_PROTOCOL_=https, https or http
- _JIRA_HOST_=jira.yourdomain.com, hostname for JIRA
- _JIRA_PORT_=443, Usually 80 or 443
- _JIRA_BASE_= , If JIRA doesn't sit at the root, put its base directory here
- _JIRA_USER_=username, Username of JIRA user
- _JIRA_PASS_=password, Password of JIRA user
- _JIRA_API_VERSION_=latest, API version slug
- _JIRA_VERBOSE_=false, Verbose logging
- _JIRA_STRICT_SSL_=false, Set to false for self-signed certificates
- _JIRA_REGEX_=([A-Z0-9]+-[0-9]+), The regex to match JIRA tickets
- _JIRA_SPRINT_FIELD_=, if using greenhopper, set the custom field that holds sprint information (customfield_xxxxx)
- _SLACK_TOKEN_=xoxb-foo, Your Slack Token
- _SLACK_AUTO_RECONNECT_=true, Reconnect on disconnect

Set them using the `-e` flag while running docker:

```
docker run -it \
-e JIRA_HOST=foo.bar.com \
-e JIRA_USER=someuser \
-e JIRA_PASS=12345 \
-e SLACK_TOKEN=xobo-blarty-blar-blar \
shaunburdick/slack-jirabot:latest
```

## Contributing
1. Create a new branch, please don't work in master directly.
2. Add failing tests for the change you want to make (if appliciable). Run `npm test` to see the tests fail.
3. Fix stuff.
4. Run `npm test` to see if the tests pass. Repeat steps 2-4 until done.
5. Check code coverage `npm run coverage` and add test paths as needed.
6. Update the documentation to reflect any changes.
7. Push to your fork and submit a pull request.
