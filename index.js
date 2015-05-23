var JiraApi = require('jira').JiraApi,
  Slack = require('slack-client'),
  config = require('./config');

var slack = new Slack(
  config.slack.token,
  config.slack.autoReconnect,
  config.slack.autoReconnect
);

var jira = new JiraApi(
  config.jira.protocol,
  config.jira.host,
  config.jira.port,
  config.jira.user,
  config.jira.pass,
  config.jira.apiVersion,
  config.jira.verbose,
  config.jira.strictSSL
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
        // jira.findIssue(issueNumber, function(error, issue) {
        //   if (!error) {
        //     console.log('Status: ' + issue.fields.status.name);
        //     response = text.split('').reverse().join('');
        //     channel.send(response);
        //     console.log("@" + slack.self.name + " responded with \"" + response + "\"");
        //   } else {
        //     console.log("Got an error trying to find ")
        //   }
        // });
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