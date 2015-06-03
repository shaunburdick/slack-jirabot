var Bot = require('../lib/bot.js'),
  config_dist = require('../config.js-dist');

describe ('Bot', function () {
  var config = {};

  beforeEach(function() {
    // reset the configuration
    config = config_dist;
  });

  it ('should instantiate and set config', function() {
    var bot = new Bot(config);
    expect(bot.config).toEqual(config);
  });

  describe('Parse/Build Issues', function() {
    it ('should build issue links correctly', function() {
      var bot = new Bot(config);

      var issueKey = 'TEST-1';
      var expectedLink = 'https://jira.yourhost.domain:443/browse/' + issueKey;

      expect(bot.buildIssueLink(issueKey)).toEqual(expectedLink);
    });

    it ('should build issue links correctly with base', function() {
      config.jira.base = 'foo';
      var bot = new Bot(config);

      var issueKey = 'TEST-1';
      var expectedLink = 'https://jira.yourhost.domain:443/foo/browse/' + issueKey;

      expect(bot.buildIssueLink(issueKey)).toEqual(expectedLink);
    });
  });

  describe('Parsing Fields', function() {
    it ('should parse a sprint name from greenhopper field', function() {
      var bot = new Bot(config);

      var sprintName = 'TEST';
      var exampleSprint = [
        'derpry-derp-derp,name='+sprintName+',foo'
      ];

      expect(bot.parseSprint(exampleSprint)).toEqual(sprintName);
      expect(bot.parseSprint(['busted'])).toBeFalsy()
    });

    it ('should parse a sprint name from the last sprint in the greenhopper field', function() {
      var bot = new Bot(config);

      var sprintName = 'TEST';
      var exampleSprint = [
        'derpry-derp-derp,name='+sprintName+'1,foo',
        'derpry-derp-derp,name='+sprintName+'2,foo',
        'derpry-derp-derp,name='+sprintName+'3,foo',
      ];

      expect(bot.parseSprint(exampleSprint)).toEqual(sprintName+'3');
    });

    it ('should translate a jira username to a slack username', function() {
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

    it ('should parse unique jira tickets from a message', function() {
      var bot = new Bot(config);

      expect(bot.parseTickets('blarty blar TEST-1')).toEqual(['TEST-1']);
      expect(bot.parseTickets('blarty blar TEST-2 TEST-2')).toEqual(['TEST-2']);
      expect(bot.parseTickets('blarty blar TEST-3 TEST-4')).toEqual(['TEST-3', 'TEST-4']);
      expect(bot.parseTickets('blarty blar Test-1 Test-1')).toEqual([]);
    });
  });

  describe('Ticket Buffering', function() {
    it ('should populate the ticket buffer', function() {
      var bot = new Bot(config);
      var ticket = 'TEST-1';

      expect(bot.parseTickets('foo ' + ticket)).toEqual([ticket]);
      expect(bot.ticketBuffer.hasOwnProperty(ticket)).toBeTruthy();
      // Expect the ticket to not be repeated
      expect(bot.parseTickets('foo ' + ticket)).toEqual([]);
    });

    it ('should cleanup the ticket buffer', function() {
      var bot = new Bot(config);
      var ticket = 'TEST-1';

      expect(bot.parseTickets('foo ' + ticket)).toEqual([ticket]);
      expect(bot.ticketBuffer.hasOwnProperty(ticket)).toBeTruthy();

      // set the Ticket Buffer Length low to trigger the cleanup
      bot.TICKET_BUFFER_LENGTH = -1;
      bot.cleanupTicketBuffer();
      expect(bot.ticketBuffer.hasOwnProperty(ticket)).toBeFalsy();
    });
  });

  describe("Issue Response", function() {
    var issue;

    beforeEach(function() {
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
          }
        }
      };
    });

    it ('should return a default description if empty', function() {
      var bot = new Bot(config);

      expect(bot.formatIssueDescription('')).toEqual('Ticket does not contain a description');
    });

    it ('should truncate a long description', function() {
      var bot = new Bot(config);
      var longDescription = Array(1500).join('a');

      expect(bot.formatIssueDescription(longDescription).length)
        .toBeLessThan(longDescription.length);
    });

    it ('should replace quotes', function() {
      var bot = new Bot(config);

      expect(bot.formatIssueDescription('{quote}foo{quote}'))
        .toEqual('```foo```');
    });
  });
});