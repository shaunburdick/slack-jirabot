/// <reference path="../typings/tsd.d.ts" />
var JiraApi = require('jira').JiraApi, Slack = require('slack-client');
var moment = require('moment');
var logger = require('./logger');
var Bot = (function () {
    /**
     * Constructor.
     *
     * @param object config The final configuration for the bot
     */
    function Bot(config) {
        this.config = config;
        /* hold tickets and last time responded to */
        this.ticketBuffer = {};
        /* Length of buffer to prevent ticket from being responded to */
        this.TICKET_BUFFER_LENGTH = 300000;
        this.slack = new Slack(config.slack.token, config.slack.autoReconnect, config.slack.autoMark);
        this.jira = new JiraApi(config.jira.protocol, config.jira.host, config.jira.port, config.jira.user, config.jira.pass, config.jira.apiVersion, config.jira.verbose, config.jira.strictSSL, null, config.jira.base);
    }
    /**
     * Build a response string about an issue.
     *
     * @param object issue the issue object returned by JIRA
     * @return string the string for output
     */
    Bot.prototype.issueResponse = function (issue) {
        var response = '';
        var created = moment(issue['fields']['created']);
        var updated = moment(issue['fields']['updated']);
        var description = this.formatIssueDescription(issue['fields']['description']);
        response += "Here is some information on " + issue.key + ":\n";
        response += ">*Link*: " + this.buildIssueLink(issue.key) + "\n";
        response += ">*Summary:* " + issue['fields']['summary'] + "\n";
        response += ">*Created:* " + created.calendar();
        response += "\t*Updated:* " + updated.calendar() + "\n";
        response += ">*Status:* " + issue['fields']['status']['name'];
        response += "\t*Priority:* " + issue['fields']['priority']['name'] + "\n";
        // Sprint fields
        if (this.config.jira.sprintField) {
            response += ">*Sprint:* " + (this.parseSprint(issue['fields'][this.config.jira.sprintField]) || 'Not Assigned') + "\n";
        }
        // Custom fields
        if (this.config.jira.customFields && Object.keys(this.config.jira.customFields).length) {
            for (var customField in this.config.jira.customFields) {
                if (issue['fields'][customField]) {
                    response += ">*" + this.config.jira.customFields[customField] + ":* " + issue['fields'][customField] + "\n";
                }
            }
        }
        response += ">*Reporter:* " + (this.JIRA2Slack(issue['fields']['reporter'].name) || issue['fields']['reporter'].displayName);
        if (issue['fields']['assignee']) {
            response += "\t*Assignee:* " + (this.JIRA2Slack(issue['fields']['assignee'].name) || issue['fields']['assignee'].displayName) + "\n";
        }
        else {
            response += '\t*Assignee:* Unassigned\n';
        }
        response += "* Description:*\n" + description;
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
    Bot.prototype.formatIssueDescription = function (description) {
        if (!description) {
            description = 'Ticket does not contain a description';
        }
        else if (description.length > 1000) {
            description = description.slice(0, 999) + '\n\n_~~Description Continues in Ticket~~_';
        }
        return description.replace(/\{(quote|code)\}/g, '```');
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
        return this.config.jira.protocol + '://' + this.config.jira.host + ':' + this.config.jira.port + base + issueKey;
    };
    /**
     * Parses the sprint name of a ticket.
     * If the ticket is in more than one sprint
     * A. Shame on you
     * B. This will take the last one
     *
     * @param string[] customField The contents of the greenhopper custom field
     * @return string The name of the sprint or ''
     */
    Bot.prototype.parseSprint = function (customField) {
        var retVal = '';
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
     * @return string The slack username or ''
     */
    Bot.prototype.JIRA2Slack = function (username) {
        var retVal = '';
        if (this.config.usermap[username]) {
            retVal = "@" + this.config.usermap[username];
        }
        return retVal;
    };
    /**
     * Parse out JIRA tickets from a message.
     * This will return unique tickets that haven't been
     * responded with recently.
     *
     * @param string channel the channel the message came from
     * @param string message the message to search in
     * @return string[] an array of tickets, empty if none found
     */
    Bot.prototype.parseTickets = function (channel, message) {
        var retVal = [];
        var uniques = {};
        var found = message.match(this.config.jira.regex);
        var now = Date.now();
        var ticketHash;
        if (found && found.length) {
            for (var x in found) {
                ticketHash = this.hashTicket(channel, found[x]);
                if (!uniques.hasOwnProperty(found[x]) && (!this.ticketBuffer.hasOwnProperty(ticketHash) || (now - this.ticketBuffer[ticketHash]) > this.TICKET_BUFFER_LENGTH)) {
                    retVal.push(found[x]);
                    uniques[found[x]] = 1;
                    this.ticketBuffer[ticketHash] = now;
                }
            }
        }
        return retVal;
    };
    /**
     * Hashes the channel + ticket combo.
     *
     * @param string channel The name of the channel
     * @param string ticket  The name of the ticket
     * @return string The unique hash
     */
    Bot.prototype.hashTicket = function (channel, ticket) {
        return "" + channel + "-" + ticket;
    };
    /**
     * Remove any tickets from the buffer if they are past the length
     */
    Bot.prototype.cleanupTicketBuffer = function () {
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
    Bot.prototype.slackOpen = function () {
        var unreads = this.slack.getUnreadCount();
        var id;
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
        logger.info("Welcome to Slack. You are @" + this.slack.self.name + " of " + this.slack.team.name);
        logger.info("You are in: " + channels.join(', '));
        logger.info("As well as: " + groups.join(', '));
        var messages = unreads === 1 ? 'message' : 'messages';
        logger.info("You have " + unreads + " unread " + messages);
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
        var channelName = (channel && channel.is_channel) ? '#' : '';
        channelName = channelName + (channel ? channel.name : 'UNKNOWN_CHANNEL');
        var userName = (user && user.name) ? "@" + user.name : "UNKNOWN_USER";
        if (type === 'message' && (text !== null) && (channel !== null)) {
            var found = this.parseTickets(channelName, text);
            if (found && found.length) {
                logger.info("Detected " + found.join(',') + " from " + userName);
                for (var x in found) {
                    this.jira.findIssue(found[x], function (error, issue) {
                        if (!error) {
                            response = self.issueResponse(issue);
                            var result = channel.send(response);
                            if (result) {
                                logger.info("@" + self.slack.self.name + " responded with \"" + response + "\"");
                            }
                            else {
                                logger.error('It appears we are disconnected');
                            }
                        }
                        else {
                            logger.error("Got an error trying to find " + found[x], error);
                        }
                    });
                }
            }
            else {
            }
        }
        else {
            var typeError = type !== 'message' ? "unexpected type " + type + "." : null;
            var textError = text === null ? 'text was undefined.' : null;
            var channelError = channel === null ? 'channel was undefined.' : null;
            var errors = [typeError, textError, channelError].filter(function (element) {
                return element !== null;
            }).join(' ');
            logger.info("@" + this.slack.self.name + " could not respond. " + errors);
        }
    };
    /**
     * Start the bot
     */
    Bot.prototype.start = function () {
        var self = this;
        this.slack.on('open', function () {
            self.slackOpen();
        });
        this.slack.on('message', function (message) {
            self.handleMessage(message);
        });
        this.slack.on('error', function (error) {
            logger.error("Error: %s", error);
        });
        setInterval(this.cleanupTicketBuffer, 60000);
        this.slack.login();
    };
    return Bot;
})();
module.exports = Bot;
