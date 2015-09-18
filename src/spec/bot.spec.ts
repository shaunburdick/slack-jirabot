/// <reference path="../typings/tsd.d.ts" />

import Bot = require('../lib/bot');
import Config = require('../lib/ConfigInterface');
var config_dist: Config = require('../config.default.js');

describe ('Bot', () => {
  var config: Config;

  beforeEach(() => {
    // reset the configuration
    config = config_dist;
  });

  it ('should instantiate and set config', () => {
    var bot = new Bot(config);
    expect(bot.config).toEqual(config);
  });

  describe('Parse/Build Issues', () => {
    it ('should build issue links correctly', () => {
      var bot = new Bot(config);

      var issueKey = 'TEST-1';
      var expectedLink = 'https://jira.yourhost.domain:443/browse/' + issueKey;

      expect(bot.buildIssueLink(issueKey)).toEqual(expectedLink);
    });

    it ('should build issue links correctly with base', () => {
      config.jira.base = 'foo';
      var bot = new Bot(config);

      var issueKey = 'TEST-1';
      var expectedLink = 'https://jira.yourhost.domain:443/foo/browse/' + issueKey;

      expect(bot.buildIssueLink(issueKey)).toEqual(expectedLink);
    });
  });

  describe('Parsing Fields', () => {
    it ('should parse a sprint name from greenhopper field', function() {
      var bot = new Bot(config);

      var sprintName = 'TEST';
      var exampleSprint = [
        'derpry-derp-derp,name='+sprintName+',foo'
      ];

      expect(bot.parseSprint(exampleSprint)).toEqual(sprintName);
      expect(bot.parseSprint(['busted'])).toBeFalsy()
    });

    it ('should parse a sprint name from the last sprint in the greenhopper field', () => {
      var bot = new Bot(config);

      var sprintName = 'TEST';
      var exampleSprint = [
        'derpry-derp-derp,name='+sprintName+'1,foo',
        'derpry-derp-derp,name='+sprintName+'2,foo',
        'derpry-derp-derp,name='+sprintName+'3,foo',
      ];

      expect(bot.parseSprint(exampleSprint)).toEqual(sprintName+'3');
    });

    it ('should translate a jira username to a slack username', () => {
      config.usermap = {
        'foo': 'bar',
        'fizz': 'buzz',
        'ping': 'pong'
      }
      var bot = new Bot(config);

      expect(bot.JIRA2Slack('foo')).toEqual('@bar');
      expect(bot.JIRA2Slack('ping')).toEqual('@pong');
      expect(bot.JIRA2Slack('blap')).toBeFalsy();
    });

    it ('should parse unique jira tickets from a message', () => {
      var bot = new Bot(config);

      expect(bot.parseTickets('Chan', 'blarty blar TEST-1')).toEqual(['TEST-1']);
      expect(bot.parseTickets('Chan', 'blarty blar TEST-2 TEST-2')).toEqual(['TEST-2']);
      expect(bot.parseTickets('Chan', 'blarty blar TEST-3 TEST-4')).toEqual(['TEST-3', 'TEST-4']);
      expect(bot.parseTickets('Chan', 'blarty blar Test-1 Test-1')).toEqual([]);
    });

    it ('should handle empty message/channel', () => {
      var bot = new Bot(config);

      expect(bot.parseTickets('Chan', null)).toEqual([]);
      expect(bot.parseTickets(null, 'Foo')).toEqual([]);
    });
  });

  describe('Ticket Buffering', () => {
    it ('should populate the ticket buffer', () => {
      var bot = new Bot(config);
      var ticket = 'TEST-1';
      var channel = 'Test';
      var hash = bot.hashTicket(channel, ticket);

      expect(bot.parseTickets(channel, 'foo ' + ticket)).toEqual([ticket]);
      expect(bot.ticketBuffer.hasOwnProperty(hash)).toBeTruthy();
      // Expect the ticket to not be repeated
      expect(bot.parseTickets(channel, 'foo ' + ticket)).toEqual([]);
    });

    it ('should respond to the same ticket in different channels', () => {
      var bot = new Bot(config);
      var ticket = 'TEST-1';
      var channel1 = 'Test1';
      var channel2 = 'Test2';

      expect(bot.parseTickets(channel1, 'foo ' + ticket)).toEqual([ticket]);
      expect(bot.parseTickets(channel2, 'foo ' + ticket)).toEqual([ticket]);
    });

    it ('should cleanup the ticket buffer', () => {
      var bot = new Bot(config);
      var ticket = 'TEST-1';
      var channel = 'Test';
      var hash = bot.hashTicket(channel, ticket);

      expect(bot.parseTickets(channel, 'foo ' + ticket)).toEqual([ticket]);
      expect(bot.ticketBuffer.hasOwnProperty(hash)).toBeTruthy();

      // set the Ticket Buffer Length low to trigger the cleanup
      bot.TICKET_BUFFER_LENGTH = -1;
      bot.cleanupTicketBuffer();
      expect(bot.ticketBuffer.hasOwnProperty(hash)).toBeFalsy();
    });
  });

  describe("Issue Response", () => {
    var issue;

    beforeEach(() => {
      issue = {
        key: 'TEST-1',
        fields: {
          created: '2015-05-01T00:00:00.000',
          updated: '2015-05-01T00:01:00.000',
          summary: 'Blarty',
          description: 'Foo foo foo foo foo foo',
          status: {
            name: 'Open'
          },
          priority: {
            name: 'Low'
          },
          reporter: {
            name: 'bob',
            displayName: 'Bob'
          },
          assignee: {
            name: 'fred',
            displayName: 'Fred'
          },
          customfield_10000: 'Fizz',
          customfield_10001: [
            { value: 'Buzz' }
          ]
        }
      };
    });

    it ('should return a default description if empty', () => {
      var bot = new Bot(config);

      expect(bot.formatIssueDescription('')).toEqual('Ticket does not contain a description');
    });

    it ('should replace quotes', () => {
      var bot = new Bot(config);

      expect(bot.formatIssueDescription('{quote}foo{quote}'))
        .toEqual('```foo```');
    });

    it ('should replace code blocks', () => {
      var bot = new Bot(config);

      expect(bot.formatIssueDescription('{code}foo{code}'))
        .toEqual('```foo```');
    });

    it ('should show custom fields', () => {
      var tests = {
        cf1: false,
        cf2: false,
        nope1: false,
        nope2: false,
        nope3: false
      };

      var expected = {
        cf1: true,
        cf2: true,
        nope1: true,
        nope2: true,
        nope3: true
      };

      // Add some custom fields
      config.jira.customFields['customfield_10000'] = 'CF1';
      config.jira.customFields['customfield_10001[0].value'] = 'CF2';
      config.jira.customFields['customfield_10003 && exit()'] = 'Nope1';
      config.jira.customFields['customfield_10004; exit()'] = 'Nope2';
      config.jira.customFields['customfield_10005'] = 'Nope3';

      var bot = new Bot(config);
      var response = bot.issueResponse(issue);

      for (var x in response.fields) {
        switch (response.fields[x].title) {
          case config.jira.customFields['customfield_10000']:
            if (response.fields[x].value == issue.fields['customfield_10000']) {
              tests.cf1 = true;
            }
            break;
          case config.jira.customFields['customfield_10001[0].value']:
            if (response.fields[x].value == issue.fields['customfield_10001'][0].value) {
              tests.cf2 = true;
            }
            break;
          case config.jira.customFields['customfield_10003 && exit()']:
            if (response.fields[x].value == 'Invalid characters in customfield_10003 && exit()') {
              tests.nope1 = true;
            }
            break;
          case config.jira.customFields['customfield_10004; exit()']:
            if (response.fields[x].value == 'Invalid characters in customfield_10004; exit()') {
              tests.nope2 = true;
            }
            break;
          case config.jira.customFields['customfield_10005']:
            if (response.fields[x].value == 'Unable to read customfield_10005') {
              tests.nope3 = true;
            }
            break;
        }

      }
      expect(tests).toEqual(expected);
    });
  });
});
