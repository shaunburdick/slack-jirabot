FROM node:latest

MAINTAINER Shaun Burdick <docker@shaunburdick.com>

ENV NODE_ENV=production \
    JIRA_PROTOCOL=https \
    JIRA_HOST=jira.yourdomain.com \
    JIRA_PORT=443 \
    JIRA_BASE= \
    JIRA_USER=username \
    JIRA_PASS=password \
    JIRA_API_VERSION=latest \
    JIRA_VERBOSE=false \
    JIRA_STRICT_SSL=false \
    JIRA_REGEX=([A-Z]{1}[A-Z0-9]+\-[0-9]+) \
    JIRA_SPRINT_FIELD= \
    SLACK_TOKEN=xoxb-foo \
    SLACK_AUTO_RECONNECT=true \
    SLACK_AUTO_MARK=true

ADD . /usr/src/myapp

WORKDIR /usr/src/myapp

RUN ["npm", "install"]

CMD ["npm", "start"]