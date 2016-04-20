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
  - strictSSL: boolean, set false for self-signed certificates
  - regex: string, a string that will be used as a RegExp to match tickets, defaults to '([A-Z][A-Z0-9]+\-[0-9]+)'
  - sprintField: string, If using greenhopper, set the custom field that holds sprint information (customfield_1xxxx)
  - response: string, If 'full'(default), it will display all fields in response. 'minimal' just shows title/description
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
- JIRA_PROTOCOL=https, https or http
- JIRA_HOST=jira.yourdomain.com, hostname for JIRA
- JIRA_PORT=443, Usually 80 or 443
- JIRA_BASE= , If JIRA doesn't sit at the root, put its base directory here
- JIRA_USER=username, Username of JIRA user
- JIRA_PASS=password, Password of JIRA user
- JIRA_API_VERSION=latest, API version slug
- JIRA_VERBOSE=false, Verbose logging
- JIRA_STRICT_SSL=false, Set to false for self-signed certificates
- JIRA_REGEX=([A-Z0-9]+-[0-9]+), The regex to match JIRA tickets
- JIRA_SPRINT_FIELD=, if using greenhopper, set the custom field that holds sprint information (customfield_xxxxx)
- JIRA_RESPONSE=, If 'full' (default), it will display all fields in response. 'minimal' just shows title/description
- SLACK_TOKEN=xoxb-foo, Your Slack Token
- SLACK_AUTO_RECONNECT=true, Reconnect on disconnect

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
5. Update the documentation to reflect any changes.
6. Push to your fork and submit a pull request.
