FROM node:latest

MAINTAINER Shaun Burdick <docker@shaunburdick.com>

ENV NODE_ENV=production \
    JIRA_PROTOCOL= \
    JIRA_HOST= \
    JIRA_PORT= \
    JIRA_BASE= \
    JIRA_USER= \
    JIRA_PASS= \
    JIRA_API_VERSION= \
    JIRA_STRICT_SSL= \
    JIRA_REGEX= \
    JIRA_SPRINT_FIELD= \
    JIRA_RESPONSE= \
    SLACK_TOKEN= \
    SLACK_AUTO_RECONNECT=

ADD . /usr/src/myapp

WORKDIR /usr/src/myapp

RUN ["npm", "install"]

CMD ["npm", "start"]
