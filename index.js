var JiraApi = require('jira').JiraApi,
  Slack = require('slack-client'),
  fs = require('fs'),
  moment = require('moment'),
  config = fs.existsSync('config.js') ? require('./config') : require('./config.js-dist');

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

console.log("Using the following configuration:");
console.dir(config);

/**
 * Build Instances
 */
var slack = new Slack(
  config.slack.token,
  config.slack.autoReconnect,
  config.slack.autoMark
);

var jira = new JiraApi(
  config.jira.protocol,
  config.jira.host,
  config.jira.port,
  config.jira.user,
  config.jira.pass,
  config.jira.apiVersion,
  config.jira.verbose,
  config.jira.strictSSL,
  null, // No OAuth yet
  config.jira.base
);

slack.on('open', function() {
  var channel, channels, group, groups, id, messages, unreads;
  channels = [];
  groups = [];
  unreads = slack.getUnreadCount();
  channels = (function() {
    var _ref, _results;
    _ref = slack.channels;
    _results = [];
    for (id in _ref) {
      channel = _ref[id];
      if (channel.is_member) {
        _results.push("#" + channel.name);
      }
    }
    return _results;
  })();
  groups = (function() {
    var _ref, _results;
    _ref = slack.groups;
    _results = [];
    for (id in _ref) {
      group = _ref[id];
      if (group.is_open && !group.is_archived) {
        _results.push(group.name);
      }
    }
    return _results;
  })();
  console.log("Welcome to Slack. You are @" + slack.self.name + " of " + slack.team.name);
  console.log('You are in: ' + channels.join(', '));
  console.log('As well as: ' + groups.join(', '));
  messages = unreads === 1 ? 'message' : 'messages';
  return console.log("You have " + unreads + " unread " + messages);
});

slack.on('message', function(message) {
  var channel, channelError, channelName, errors, response, text, textError, ts, type, typeError, user, userName;
  channel = slack.getChannelGroupOrDMByID(message.channel);
  user = slack.getUserByID(message.user);
  response = '';
  type = message.type, ts = message.ts, text = message.text;
  channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
  channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
  userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";

  if (type === 'message' && (text != null) && (channel != null)) {
    var found = text.match(config.jira.regex);
    if (found) {
      console.log('Detected ' + found.join(',') + ' from ' + userName);
      for (var x in found) {
        jira.findIssue(found[x], function(error, issue) {
          if (!error) {
            response = buildResponse(issue);
            channel.send(response);
            console.log("@" + slack.self.name + " responded with \"" + response + "\"");
          } else {
            console.log("Got an error trying to find " + found[x] + ':');
            console.log(error);
          }
        });
      }
    } else {
      // Do nothing
    }
  } else {
    typeError = type !== 'message' ? "unexpected type " + type + "." : null;
    textError = text == null ? 'text was undefined.' : null;
    channelError = channel == null ? 'channel was undefined.' : null;
    errors = [typeError, textError, channelError].filter(function(element) {
      return element !== null;
    }).join(' ');
    return console.log("@" + slack.self.name + " could not respond. " + errors);
  }
});

slack.on('error', function(error) {
  return console.error("Error: " + error);
});

slack.login();

function buildResponse(issue) {
  var response = '';
  var created = moment(issue.fields.created);
  var updated = moment(issue.fields.updated);
  var description = issue.fields.description;

  if (!description) {
    description = 'Ticket does not contain a description';
  } else if (description.length > 1000) { // Prevent giant descriptions
    description = description.slice(0, 999) + '\n\n_~~Description Continues in Ticket~~_';
  }

  response += 'Here is some information on ' + issue.key + ':\n';
  response += '>*Link*: ' + buildJIRAURI(issue.key) + '\n';
  response += '>*Summary:* ' + issue.fields.summary + '\n';
  response += '>*Created:* ' + created.calendar();
  response += '\t*Updated:* ' + updated.calendar() + '\n';
  response += '>*Status:* ' + issue.fields.status.name;
  response += '\t*Priority:* ' + issue.fields.priority.name + '\n';
  if (config.jira.sprintField) {
    response += '>*Sprint:* ' + (parseSprint(issue.fields[config.jira.sprintField]) || 'Not Assigned') + '\n';
  }
  response += '>*Reporter:* ' + (JIRA2Slack(issue.fields.reporter.name) || issue.fields.reporter.displayName);
  response += '\t*Assignee:* ' + (JIRA2Slack(issue.fields.assignee.name) || issue.fields.assignee.displayName) + '\n';
  response += '*Description:*\n' 
    + description
      .replace(/\{quote\}/g, '```'); // Wrap quoted text to quasi-quote it

  return response;
}

function buildJIRAURI(issueKey) {
  var base = '/browse/';
  if (config.jira.base) {
    // Strip preceeding and trailing forward slash
    base = '/' + config.jira.base.replace(/^\/|\/$/g, '') + base;
  }
  return config.jira.protocol + '://' + config.jira.host + ':' + config.jira.port + base + issueKey;
}

function parseSprint(customField) {
  retVal = false;

  if (customField && customField[0]) {
    var matches = customField[0].match(/\,name=([^,]+)\,/);
    if (matches && matches[1]) {
      retVal = matches[1];
    }
  }

  return retVal;
}

function JIRA2Slack(username) {
  var retVal = false;

  if (config.usermap[username]) {
    retVal = '@' + config.usermap[username];
  }

  return retVal;
}
