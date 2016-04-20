'use strict';

const config = {
  jira: {
    protocol: 'https',
    host: 'jira.yourhost.domain',
    port: 443,
    base: '',
    user: 'username',
    pass: 'password',
    apiVersion: 'latest',
    strictSSL: false,
    regex: '([A-Z][A-Z0-9]+-[0-9]+)',
    sprintField: '',
    customFields: {

    },
  },
  slack: {
    token: 'xoxb-Your-Token',
    autoReconnect: true,
  },
  usermap: {},
};
module.exports = config;
