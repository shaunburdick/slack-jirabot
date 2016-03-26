'use strict';

const JiraApi = require('jira-client');
const Botkit = require('botkit');
const moment = require('moment');
const logger = require('./logger')();

/**
 * @module Bot
 */
class Bot {
  /**
   * Constructor.
   *
   * @constructor
   * @param {Config} config The final configuration for the bot
   */
  constructor(config) {
    this.config = config;
    /* hold tickets and last time responded to */
    this.ticketBuffer = new Map();

    /* Length of buffer to prevent ticket from being responded to */
    this.TICKET_BUFFER_LENGTH = 300000;

    this.controller = Botkit.slackbot();

    this.ticketRegExp = new RegExp(config.jira.regex, 'g');
    logger.info(`Ticket Matching Regexp: ${this.ticketRegExp}`);

    this.jira = new JiraApi({
      protocol: config.jira.protocol,
      host: config.jira.host,
      port: config.jira.port,
      username: config.jira.user,
      password: config.jira.pass,
      apiVersion: config.jira.apiVersion,
      strictSSL: config.jira.strictSSL,
      base: config.jira.base,
    });
  }

  /**
   * Build a response string about an issue.
   *
   * @param {Issue} issue the issue object returned by JIRA
   * @return {Attachment} The response attachment.
   */
  issueResponse(issue) {
    const response = {
      fallback: `No summary found for ${issue.key}`,
    };
    const created = moment(issue.fields.created);
    const updated = moment(issue.fields.updated);

    response.text = this.formatIssueDescription(issue.fields.description);
    response.mrkdwn_in = ['text']; // Parse text as markdown
    response.fallback = issue.fields.summary;
    response.pretext = `Here is some information on ${issue.key}`;
    response.title = issue.fields.summary;
    response.title_link = this.buildIssueLink(issue.key);
    response.fields = [];
    response.fields.push({
      title: 'Created',
      value: created.calendar(),
      short: true,
    });
    response.fields.push({
      title: 'Updated',
      value: updated.calendar(),
      short: true,
    });
    response.fields.push({
      title: 'Status',
      value: issue.fields.status.name,
      short: true,
    });
    response.fields.push({
      title: 'Priority',
      value: issue.fields.priority.name,
      short: true,
    });
    response.fields.push({
      title: 'Reporter',
      value: (this.jira2Slack(issue.fields.reporter.name) || issue.fields.reporter.displayName),
      short: true,
    });
    let assignee = 'Unassigned';
    if (issue.fields.assignee) {
      assignee = (this.jira2Slack(issue.fields.assignee.name) || issue.fields.assignee.displayName);
    }
    response.fields.push({
      title: 'Assignee',
      value: assignee,
      short: true,
    });
    // Sprint fields
    if (this.config.jira.sprintField) {
      response.fields.push({
        title: 'Sprint',
        value: (this.parseSprint(issue.fields[this.config.jira.sprintField]) || 'Not Assigned'),
        short: false,
      });
    }
    // Custom fields
    if (this.config.jira.customFields && Object.keys(this.config.jira.customFields).length) {
      for (const customField in this.config.jira.customFields) {
        if (this.config.jira.customFields.hasOwnProperty(customField)) {
          let fieldVal = null;
          // Do some simple guarding before eval
          if (!/[;&\|\(\)]/.test(customField)) {
            try {
              fieldVal = eval(`issue.fields.${customField}`);
            } catch (e) {
              fieldVal = `Error while reading ${customField}`;
            }
          } else {
            fieldVal = `Invalid characters in ${customField}`;
          }
          fieldVal = fieldVal || `Unable to read ${customField}`;
          response.fields.push({
            title: this.config.jira.customFields[customField],
            value: fieldVal,
            short: false,
          });
        }
      }
    }
    return response;
  }

  /**
   * Format a ticket description for display.
   * * Truncate to 1000 characters
   * * Replace any {quote} with ```
   * * If there is no description, add a default value
   *
   * @param {string} description The raw description
   * @return {string} the formatted description
   */
  formatIssueDescription(description) {
    const desc = description || 'Ticket does not contain a description';
    return desc.replace(/\{(quote|code)\}/g, '```');
  }

  /**
   * Construct a link to an issue based on the issueKey and config
   *
   * @param {string} issueKey The issueKey for the issue
   * @return {string} The constructed link
   */
  buildIssueLink(issueKey) {
    let base = '/browse/';
    if (this.config.jira.base) {
      // Strip preceeding and trailing forward slash
      base = '/' + this.config.jira.base.replace(/^\/|\/$/g, '') + base;
    }
    return this.config.jira.protocol + '://'
      + this.config.jira.host + ':' + this.config.jira.port
      + base + issueKey;
  }

  /**
   * Parses the sprint name of a ticket.
   * If the ticket is in more than one sprint
   * A. Shame on you
   * B. This will take the last one
   *
   * @param {string[]} customField The contents of the greenhopper custom field
   * @return {string} The name of the sprint or ''
   */
  parseSprint(customField) {
    let retVal = '';
    if (customField && customField.length > 0) {
      const sprintString = customField.pop();
      const matches = sprintString.match(/\,name=([^,]+)\,/);
      if (matches && matches[1]) {
        retVal = matches[1];
      }
    }
    return retVal;
  }

  /**
   * Lookup a JIRA username and return their Slack username
   * Meh... Trying to come up with a better system for this feature
   *
   * @param {string} username the JIRA username
   * @return {string} The slack username or ''
   */
  jira2Slack(username) {
    let retVal = '';
    if (this.config.usermap[username]) {
      retVal = `@${this.config.usermap[username]}`;
    }
    return retVal;
  }

  /**
   * Parse out JIRA tickets from a message.
   * This will return unique tickets that haven't been
   * responded with recently.
   *
   * @param {string} channel the channel the message came from
   * @param {string} message the message to search in
   * @return {string[]} an array of tickets, empty if none found
   */
  parseTickets(channel, message) {
    const retVal = [];
    if (!channel || !message) {
      return retVal;
    }
    const uniques = {};
    const found = message.match(this.ticketRegExp);
    const now = Date.now();
    let ticketHash;
    if (found && found.length) {
      found.forEach((ticket) => {
        ticketHash = this.hashTicket(channel, ticket);
        if (
          !uniques.hasOwnProperty(ticket)
          && (now - (this.ticketBuffer.get(ticketHash) || 0) > this.TICKET_BUFFER_LENGTH)
        ) {
          retVal.push(ticket);
          uniques[ticket] = 1;
          this.ticketBuffer.set(ticketHash, now);
        }
      });
    }
    return retVal;
  }

  /**
   * Hashes the channel + ticket combo.
   *
   * @param {string} channel The name of the channel
   * @param {string} ticket  The name of the ticket
   * @return {string} The unique hash
   */
  hashTicket(channel, ticket) {
    return channel + '-' + ticket;
  }

  /**
   * Remove any tickets from the buffer if they are past the length
   *
   * @return {null} nada
   */
  cleanupTicketBuffer() {
    const now = Date.now();
    logger.debug('Cleaning Ticket Buffer');
    this.ticketBuffer.forEach((time, key) => {
      if (now - time > this.TICKET_BUFFER_LENGTH) {
        logger.debug(`Deleting ${key}`);
        this.ticketBuffer.delete(key);
      }
    });
  }

  /**
   * Function to be called on slack open
   *
   * @param {object} payload Connection payload
   * @return {Bot} returns itself
   */
  slackOpen(payload) {
    const channels = [];
    const groups = [];
    const mpims = [];

    logger.info(`Welcome to Slack. You are @${payload.self.name} of ${payload.team.name}`);

    if (payload.channels) {
      payload.channels.forEach((channel) => {
        if (channel.is_member) {
          channels.push(`#${channel.name}`);
        }
      });

      logger.info(`You are in: ${channels.join(', ')}`);
    }

    if (payload.groups) {
      payload.groups.forEach((group) => {
        groups.push(`${group.name}`);
      });

      logger.info(`Groups: ${groups.join(', ')}`);
    }

    if (payload.mpims) {
      payload.mpims.forEach((mpim) => {
        mpims.push(`${mpim.name}`);
      });

      logger.info(`Multi-person IMs: ${mpims.join(', ')}`);
    }

    return this;
  }

  /**
   * Handle an incoming message
   * @param {object} message The incoming message from Slack
   * @returns {null} nada
   */
  handleMessage(message) {
    const response = {
      as_user: true,
      attachments: [],
    };

    if (message.type === 'message' && message.text) {
      const found = this.parseTickets(message.channel, message.text);
      if (found && found.length) {
        logger.info(`Detected ${found.join(',')}`);
        found.forEach((issueId) => {
          this.jira.findIssue(issueId)
            .then((issue) => {
              response.attachments = [this.issueResponse(issue)];
              this.bot.reply(message, response, (err) => {
                if (err) {
                  logger.error('Unable to respond', err);
                } else {
                  logger.info(`@${this.bot.identity.name} responded with`, response);
                }
              });
            })
            .catch((error) => {
              logger.error(`Got an error trying to find ${issueId}`, error);
            });
        });
      } else {
        // nothing to do
      }
    } else {
      logger.info(`@${this.bot.identity.name} could not respond.`);
    }
  }

  /**
   * Start the bot
   *
   * @return {Bot} returns itself
   */
  start() {
    this.controller.on(
      'direct_mention,mention,ambient',
      (bot, message) => {
        this.handleMessage(message);
      }
    );

    this.controller.on('rtm_close', () => {
      logger.info('The RTM api just closed');

      if (this.config.slack.autoReconnect) {
        this.connect();
      }
    });

    this.connect();

    setInterval(() => {
      this.cleanupTicketBuffer();
    }, 60000);

    return this;
  }

  /**
   * Connect to the RTM
   * @return {Bot} this
   */
  connect() {
    this.bot = this.controller.spawn({
      token: this.config.slack.token,
      no_unreads: true,
      mpim_aware: true,
    }).startRTM((err, bot, payload) => {
      if (err) {
        logger.error('Error starting bot!', err);
      }

      this.slackOpen(payload);
    });

    return this;
  }
}

module.exports = Bot;
