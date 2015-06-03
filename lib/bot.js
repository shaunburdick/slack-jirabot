var JiraApi = require('jira').JiraApi,
  Slack = require('slack-client'),
  moment = require('moment'),
  logger = require('./logger');

/**
 * Constructor.
 *
 * @param object config The final configuration for the bot
 */
function Bot(config) {
  /** @var Object Configuration values */
  this.config = config;

  /** @var Object hold tickets and last time responded to */
  this.ticketBuffer = {};
  this.TICKET_BUFFER_LENGTH = 300000;

  this.slack = new Slack(
    config.slack.token,
    config.slack.autoReconnect,
    config.slack.autoMark
  );

  this.jira = new JiraApi(
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
};

/**
 * Build a response string about an issue.
 *
 * @param object issue the issue object returned by JIRA
 * @return string the string for output
 */
Bot.prototype.issueResponse = function (issue) {
  var response = '';
  var created = moment(issue.fields.created);
  var updated = moment(issue.fields.updated);
  var description = this.formatIssueDescription(issue.fields.description);

  response += 'Here is some information on ' + issue.key + ':\n';
  response += '>*Link*: ' + this.buildIssueLink(issue.key) + '\n';
  response += '>*Summary:* ' + issue.fields.summary + '\n';
  response += '>*Created:* ' + created.calendar();
  response += '\t*Updated:* ' + updated.calendar() + '\n';
  response += '>*Status:* ' + issue.fields.status.name;
  response += '\t*Priority:* ' + issue.fields.priority.name + '\n';
  if (this.config.jira.sprintField) {
    response += '>*Sprint:* ' + (this.parseSprint(issue.fields[this.config.jira.sprintField]) || 'Not Assigned') + '\n';
  }
  response += '>*Reporter:* ' + (this.JIRA2Slack(issue.fields.reporter.name) || issue.fields.reporter.displayName);
  response += '\t*Assignee:* ' + (this.JIRA2Slack(issue.fields.assignee.name) || issue.fields.assignee.displayName) + '\n';
  response += '*Description:*\n' + description;

  return response;
};

/**
 * Format a ticket description for display.
 * * Truncate to 1000 characters
 * * Replace any {quote} with ```
 * * If there is no description, add a default value
 *
 * @param string description The raw description
 * @return string the formatted description
 */
Bot.prototype.formatIssueDescription = function(description) {
  if (!description) {
    description = 'Ticket does not contain a description';
  } else if (description.length > 1000) { // Prevent giant descriptions
    description = description.slice(0, 999) + '\n\n_~~Description Continues in Ticket~~_';
  }

  return description
    .replace(/\{quote\}/g, '```');
};

/**
 * Construct a link to an issue based on the issueKey and config
 *
 * @param string issueKey The issueKey for the issue
 * @return string The constructed link
 */
Bot.prototype.buildIssueLink = function (issueKey) {
  var base = '/browse/';
  if (this.config.jira.base) {
    // Strip preceeding and trailing forward slash
    base = '/' + this.config.jira.base.replace(/^\/|\/$/g, '') + base;
  }
  return this.config.jira.protocol + '://'
    + this.config.jira.host + ':' + this.config.jira.port
    + base + issueKey;
};

/**
 * Parses the sprint name of a ticket.
 * If the ticket is in more than one sprint
 * A. Shame on you
 * B. This will take the last one
 *
 * @param string[] customField The contents of the greenhopper custom field
 * @return string|false The name of the sprint or false
 */
Bot.prototype.parseSprint = function (customField) {
  retVal = false;

  if (customField && customField.length > 0) {
    var sprintString = customField.pop();
    var matches = sprintString.match(/\,name=([^,]+)\,/);
    if (matches && matches[1]) {
      retVal = matches[1];
    }
  }

  return retVal;
};

/**
 * Lookup a JIRA username and return their Slack username
 * Meh... Trying to come up with a better system for this feature
 *
 * @param string username the JIRA username
 * @return string|false The slack username or false
 */
Bot.prototype.JIRA2Slack = function (username) {
  var retVal = false;

  if (this.config.usermap[username]) {
    retVal = '@' + this.config.usermap[username];
  }

  return retVal;
};

/**
 * Parse out JIRA tickets from a message.
 * This will return unique tickets that haven't been
 * responded with recently.
 *
 * @param string message the message to search in
 * @return string[] an array of tickets, empty if none found
 */
Bot.prototype.parseTickets = function (message) {
  var retVal = [], uniques = {};
  var found = message.match(this.config.jira.regex);
  var now = Date.now();

  if (found && found.length) {
    for (var x in found) {
      if (
        !uniques.hasOwnProperty(found[x])
        && (
          !this.ticketBuffer.hasOwnProperty(found[x])
          || (
            (now - this.ticketBuffer[found[x]]) > this.TICKET_BUFFER_LENGTH
          )
        )
      ) {
        retVal.push(found[x]);
        uniques[found[x]] = 1;
        this.ticketBuffer[found[x]] = now;
      }
    }
  }

  return retVal;
};

/**
 * Remove any tickets from the buffer if they are past the length
 */
Bot.prototype.cleanupTicketBuffer = function() {
  var now = Date.now();

  for (var x in this.ticketBuffer) {
    if (now - this.ticketBuffer[x] > this.TICKET_BUFFER_LENGTH) {
      delete this.ticketBuffer[x];
    }
  }
};

/**
 * Function to be called on slack open
 */
Bot.prototype.slackOpen = function() {
  var unreads = this.slack.getUnreadCount();

  var channels = [];
  var allChannels = this.slack.channels;
  for (id in allChannels) {
    if (allChannels[id].is_member) {
      channels.push("#" + allChannels[id].name);
    }
  }

  var groups = [];
  var allGroups = this.slack.groups;
  for (id in allGroups) {
    if (allGroups[id].is_open && !allGroups[id].is_archived) {
      groups.push(allGroups[id].name);
    }
  }

  logger.info("Welcome to Slack. You are @%s of %s", this.slack.self.name, this.slack.team.name);
  logger.info('You are in: %s', channels.join(', '));
  logger.info('As well as: %s', groups.join(', '));
  messages = unreads === 1 ? 'message' : 'messages';
  return logger.info("You have %d unread %s", unreads, messages);
};

/**
 * Handle an incoming message
 * @param object message The incoming message from Slack
 */
Bot.prototype.handleMessage = function (message) {
  var self = this;
  var channel = this.slack.getChannelGroupOrDMByID(message.channel);
  var user = this.slack.getUserByID(message.user);
  var response = '';
  var type = message.type, ts = message.ts, text = message.text;
  var channelName = (channel != null ? channel.is_channel : void 0) ? '#' : '';
  channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
  var userName = (user != null ? user.name : void 0) != null ? "@" + user.name : "UNKNOWN_USER";

  if (type === 'message' && (text != null) && (channel != null)) {
    var found = this.parseTickets(text);
    if (found && found.length) {
      logger.info('Detected %s from %s', found.join(','), userName);
      for (var x in found) {
        this.jira.findIssue(found[x], function(error, issue) {
          if (!error) {
            response = self.issueResponse(issue);
            channel.send(response);
            logger.info("@%s responded with \"%s\"", self.slack.self.name, response);
          } else {
            logger.error("Got an error trying to find %s:", found[x], error);
          }
        });
      }
    } else {
      // Do nothing
    }
  } else {
    var typeError = type !== 'message' ? "unexpected type " + type + "." : null;
    var textError = text == null ? 'text was undefined.' : null;
    var channelError = channel == null ? 'channel was undefined.' : null;
    var errors = [typeError, textError, channelError].filter(function(element) {
      return element !== null;
    }).join(' ');
    return logger.info("@%s could not respond. %s", this.slack.self.name, errors);
  }
};

/**
 * Start the bot
 */
Bot.prototype.start = function() {
  var self = this;
  this.slack.on('open', function() {
    self.slackOpen();
  });
  this.slack.on('message', function(message) {
    self.handleMessage(message);
  });
  this.slack.on('error', function(error) {
    return logger.error("Error: %s", error);
  });

  setInterval(this.cleanupTicketBuffer, 60000);
  this.slack.login();
};

module.exports = Bot;