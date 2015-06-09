/// <reference path="./typings/tsd.d.ts" />

import Config = require('./lib/ConfigInterface');
import logger = require('./lib/logger');
import Bot = require('./lib/bot');

var config: Config = (function() {
  var retVal: Config;

  try { // local config first
    retVal = require('./config');
  } catch (e) { // default config
    retVal = require('./config.default');
  }

  return retVal;
}());

/**
 * Pull config from ENV if set
 */
config.jira.protocol = process.env.JIRA_PROTOCOL || config.jira.protocol;
config.jira.host = process.env.JIRA_HOST || config.jira.host;
config.jira.port = process.env.JIRA_PORT || config.jira.port;
config.jira.base = process.env.JIRA_BASE || config.jira.base;
config.jira.user = process.env.JIRA_USER || config.jira.user;
config.jira.pass = process.env.JIRA_PASS || config.jira.pass;
config.jira.apiVersion = process.env.JIRA_API_VERSION || config.jira.apiVersion;
config.jira.verbose = process.env.JIRA_VERBOSE || config.jira.verbose;
config.jira.strictSSL = process.env.JIRA_STRICT_SSL || config.jira.strictSSL;
config.jira.regex = process.env.JIRA_REGEX ? new RegExp(process.env.JIRA_REGEX, 'g') : config.jira.regex;
config.jira.sprintField = process.env.JIRA_SPRINT_FIELD || config.jira.sprintField;

config.slack.token = process.env.SLACK_TOKEN || config.slack.token;
config.slack.autoReconnect = process.env.SLACK_AUTO_RECONNECT || config.slack.autoReconnect;
config.slack.autoMark = process.env.SLACK_AUTO_MARK || config.slack.autoMark;

logger.info("Using the following configuration:", config);

var bot = new Bot(config);

bot.start();