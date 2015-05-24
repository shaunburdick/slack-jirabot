FROM node:onbuild

MAINTAINER Shaun Burdick <github@shaunburdick.com>

ADD . /usr/src/myapp
WORKDIR /usr/src/myapp

ENV JIRA_PROTOCOL=https
ENV JIRA_HOST=jira.yourdomain.com
ENV JIRA_PORT=443
ENV JIRA_USER=username
ENV JIRA_PASS=password
ENV JIRA_API_VERSION=latest
ENV JIRA_VERBOSE=false
ENV JIRA_STRICT_SSL=false
ENV JIRA_REGEX=([A-Z0-9]+\-[0-9]+)

ENV SLACK_TOKEN=xoxb-foo
ENV SLACK_AUTO_RECONNECT=true
ENV SLACK_AUTO_MARK=true
