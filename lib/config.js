'use strict';

/**
 * Parse a boolean from a string
 *
 * @param  {string} string A string to parse into a boolean
 * @return {mixed}         Either a boolean or the original value
 */
function parseBool(string) {
  if (typeof string === 'string') {
    return /^(true|1)$/i.test(string);
  }

  return string;
}

/**
 * Parses and enhances config object
 *
 * @param  {object} cfg the raw object from file
 * @return {object}     the paresed config object
 * @throws Error if it cannot parse object
 */
function parse(cfg) {
  if (typeof cfg !== 'object') {
    throw new Error('Config is not an object');
  }

  const config = cfg;

  /**
   * Pull config from ENV if set
   */
  config.jira.protocol = process.env.JIRA_PROTOCOL || config.jira.protocol;
  config.jira.host = process.env.JIRA_HOST || config.jira.host;
  config.jira.port = parseInt(process.env.JIRA_PORT, 10) || config.jira.port;
  config.jira.base = process.env.JIRA_BASE || config.jira.base;
  config.jira.user = process.env.JIRA_USER || config.jira.user;
  config.jira.pass = process.env.JIRA_PASS || config.jira.pass;
  config.jira.apiVersion = process.env.JIRA_API_VERSION || config.jira.apiVersion;
  config.jira.strictSSL = parseBool(process.env.JIRA_STRICT_SSL) || config.jira.strictSSL;
  config.jira.regex = process.env.JIRA_REGEX || config.jira.regex;
  config.jira.sprintField = process.env.JIRA_SPRINT_FIELD || config.jira.sprintField;
  config.jira.response = process.env.JIRA_RESPONSE || config.jira.response;

  config.slack.token = process.env.SLACK_TOKEN || config.slack.token;
  config.slack.autoReconnect = parseBool(process.env.SLACK_AUTO_RECONNECT) ||
    config.slack.autoReconnect;

  return config;
}

module.exports = {
  parse,
  parseBool,
};
