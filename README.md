# Slack Bot for JIRA
This slack bot will listen on any channel it's on for JIRA tickets. It will lookup the ticket and respond with some information about it.

## Example

```
Shaun Burdick [8:18 AM]
Anyone looked at BUG-81?

JIRABot BOT [8:18 AM]
Here is some information on BUG-81:
>*Link*: https://jira.foo.com:443/jira/browse/BUG-81
>*Summary:* Sticky CD Trays
>*Created:* 5/20/2015    *Updated:* 2 Days ago
>*Status:* Open    *Priority:* Normal
>*Reporter:* Buffalo Pieman    *Assignee:* None
*Description:*
Submitting form causes CD tray to eject exposing pie to the elements.

User would like option to keep CD tray closed so he can keep pie warm.
```

## Install
1. Clone this [repository](https://github.com/shaunburdick/slack-jirabot.git)
2. `npm install`
3. Copy `./release/js/config.default.js` to `./release/js/config.js` and fill it out
4. `npm start`

## Test
1. `npm install` (make sure your NODE_ENV != `production`)
2. `npm test`

## Build
1. `npm install` (make sure your NODE_ENV != `production`)
2. `./node_modules/.bin/gulp build`

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
- _SLACK_AUTO_MARK_=true, Mark messages as read

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
Once you've made your great commits:
1. [Fork][fk] it!
2. Create a topic branch - `git checkout -b my_branch`
3. Push to your branch - `git push origin my_branch`
4. Create an [Issue][is] with a link to your branch
5. That's it!
