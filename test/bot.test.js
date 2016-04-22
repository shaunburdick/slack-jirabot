'use strict';

const test = require('tape');
const Bot = require(`${process.env.PWD}/lib/bot`);
const configDist = require(`${process.env.PWD}/config.default.js`);

test('Bot: instantiate and set config', (assert) => {
  const bot = new Bot(configDist);
  assert.equal(bot.config, configDist);
  assert.end();
});

test('Bot: build issue links', (assert) => {
  const bot = new Bot(configDist);
  const issueKey = 'Test-1';
  const expectedLink = `https://jira.yourhost.domain:443/browse/${issueKey}`;

  assert.equal(bot.buildIssueLink(issueKey), expectedLink);
  assert.end();
});

test('Bot: build issue links correctly with base', (assert) => {
  configDist.jira.base = 'foo';
  const bot = new Bot(configDist);
  const issueKey = 'TEST-1';
  const expectedLink = `https://jira.yourhost.domain:443/foo/browse/${issueKey}`;
  assert.equal(bot.buildIssueLink(issueKey), expectedLink);
  assert.end();
});

test('Bot: parse a sprint name from greenhopper field', (assert) => {
  const bot = new Bot(configDist);
  const sprintName = 'TEST';
  const exampleSprint = [
    `derpry-derp-derp,name=${sprintName},foo`,
  ];

  assert.equal(bot.parseSprint(exampleSprint), sprintName);
  assert.notOk(bot.parseSprint(['busted']));
  assert.end();
});

test('Bot: parse a sprint name from the last sprint in the greenhopper field', (assert) => {
  const bot = new Bot(configDist);
  const sprintName = 'TEST';
  const exampleSprint = [
    `derpry-derp-derp,name=${sprintName}1,foo`,
    `derpry-derp-derp,name=${sprintName}2,foo`,
    `derpry-derp-derp,name=${sprintName}3,foo`,
  ];

  assert.equal(bot.parseSprint(exampleSprint), `${sprintName}3`);
  assert.end();
});

test('Bot: translate a jira username to a slack username', (assert) => {
  configDist.usermap = {
    foo: 'bar',
    fizz: 'buzz',
    ping: 'pong',
  };

  const bot = new Bot(configDist);

  assert.equal(bot.jira2Slack('foo'), '@bar');
  assert.equal(bot.jira2Slack('ping'), '@pong');
  assert.notOk(bot.jira2Slack('blap'));
  assert.end();
});

test('Bot: parse unique jira tickets from a message', (assert) => {
  const bot = new Bot(configDist);
  assert.deepEqual(bot.parseTickets('Chan', 'blarty blar TEST-1'), ['TEST-1']);
  assert.deepEqual(bot.parseTickets('Chan', 'blarty blar TEST-2 TEST-2'), ['TEST-2']);
  assert.deepEqual(bot.parseTickets('Chan', 'blarty blar TEST-3 TEST-4'), ['TEST-3', 'TEST-4']);
  assert.deepEqual(bot.parseTickets('Chan', 'blarty blar Test-1 Test-1'), []);
  assert.end();
});

test('Bot: handle empty message/channel', (assert) => {
  const bot = new Bot(configDist);
  assert.deepEqual(bot.parseTickets('Chan', null), []);
  assert.deepEqual(bot.parseTickets(null, 'Foo'), []);
  assert.end();
});

test('Bot: populate the ticket buffer', (assert) => {
  const bot = new Bot(configDist);
  const ticket = 'TEST-1';
  const channel = 'Test';
  const hash = bot.hashTicket(channel, ticket);

  assert.deepEqual(bot.parseTickets(channel, `fooå${ticket}`), [ticket]);
  assert.ok(bot.ticketBuffer.get(hash));

  // Expect the ticket to not be repeated
  assert.deepEqual(bot.parseTickets(channel, `foo ${ticket}`), []);
  assert.end();
});

test('Bot: respond to the same ticket in different channels', (assert) => {
  const bot = new Bot(configDist);
  const ticket = 'TEST-1';
  const channel1 = 'Test1';
  const channel2 = 'Test2';

  assert.deepEqual(bot.parseTickets(channel1, `foo ${ticket}`), [ticket]);
  assert.deepEqual(bot.parseTickets(channel2, `foo ${ticket}`), [ticket]);
  assert.end();
});

test('Bot: cleanup the ticket buffer', (assert) => {
  const bot = new Bot(configDist);
  const ticket = 'TEST-1';
  const channel = 'Test';
  const hash = bot.hashTicket(channel, ticket);

  assert.deepEqual(bot.parseTickets(channel, `foo ${ticket}`), [ticket]);
  assert.ok(bot.ticketBuffer.get(hash));

  // set the Ticket Buffer Length low to trigger the cleanup
  bot.TICKET_BUFFER_LENGTH = -1;
  bot.cleanupTicketBuffer();
  assert.notOk(bot.ticketBuffer.get(hash));

  assert.end();
});

test('Bot: return a default description if empty', (assert) => {
  const bot = new Bot(configDist);
  assert.equal(bot.formatIssueDescription(''), 'Ticket does not contain a description');
  assert.end();
});

test('Bot: replace quotes', (assert) => {
  const bot = new Bot(configDist);
  assert.equal(bot.formatIssueDescription('{quote}foo{quote}'), '```foo```');
  assert.end();
});

test('Bot: replace code blocks', (assert) => {
  const bot = new Bot(configDist);
  assert.equal(bot.formatIssueDescription('{code}foo{code}'), '```foo```');
  assert.end();
});

test('Bot: show custom fields', (assert) => {
  assert.plan(5);
  const issue = {
    key: 'TEST-1',
    fields: {
      created: '2015-05-01T00:00:00.000',
      updated: '2015-05-01T00:01:00.000',
      summary: 'Blarty',
      description: 'Foo foo foo foo foo foo',
      status: {
        name: 'Open',
      },
      priority: {
        name: 'Low',
      },
      reporter: {
        name: 'bob',
        displayName: 'Bob',
      },
      assignee: {
        name: 'fred',
        displayName: 'Fred',
      },
      customfield_10000: 'Fizz',
      customfield_10001: [
        { value: 'Buzz' },
      ],
    },
  };

  // Add some custom fields
  configDist.jira.customFields.customfield_10000 = 'CF1';
  configDist.jira.customFields['customfield_10001[0].value'] = 'CF2';
  configDist.jira.customFields['customfield_10003 && exit()'] = 'Nope1';
  configDist.jira.customFields['customfield_10004; exit()'] = 'Nope2';
  configDist.jira.customFields.customfield_10005 = 'Nope3';

  const bot = new Bot(configDist);
  const response = bot.issueResponse(issue);

  let x;
  for (x in response.fields) {
    if (response.fields.hasOwnProperty(x)) {
      switch (response.fields[x].title) {
        case configDist.jira.customFields.customfield_10000:
          assert.equal(response.fields[x].value, issue.fields.customfield_10000);
          break;
        case configDist.jira.customFields['customfield_10001[0].value']:
          assert.equal(response.fields[x].value, issue.fields.customfield_10001[0].value);
          break;
        case configDist.jira.customFields['customfield_10003 && exit()']:
          assert.equal(response.fields[x].value,
            'Invalid characters in customfield_10003 && exit()');
          break;
        case configDist.jira.customFields['customfield_10004; exit()']:
          assert.equal(response.fields[x].value, 'Invalid characters in customfield_10004; exit()');
          break;
        case configDist.jira.customFields.customfield_10005:
          assert.equal(response.fields[x].value, 'Unable to read customfield_10005');
          break;
        default:
          // nothing to see here
      }
    }
  }
});

test('Bot: show minimal response', (assert) => {
  const issue = {
    key: 'TEST-1',
    fields: {
      created: '2015-05-01T00:00:00.000',
      updated: '2015-05-01T00:01:00.000',
      summary: 'Blarty',
      description: 'Foo foo foo foo foo foo',
      status: {
        name: 'Open',
      },
      priority: {
        name: 'Low',
      },
      reporter: {
        name: 'bob',
        displayName: 'Bob',
      },
      assignee: {
        name: 'fred',
        displayName: 'Fred',
      },
      customfield_10000: 'Fizz',
      customfield_10001: [
        { value: 'Buzz' },
      ],
    },
  };

  // Add some custom fields
  configDist.jira.customFields.customfield_10000 = 'CF1';
  configDist.jira.customFields['customfield_10001[0].value'] = 'CF2';
  configDist.jira.customFields['customfield_10003 && exit()'] = 'Nope1';
  configDist.jira.customFields['customfield_10004; exit()'] = 'Nope2';
  configDist.jira.customFields.customfield_10005 = 'Nope3';
  configDist.jira.response = 'minimal';

  const bot = new Bot(configDist);
  const response = bot.issueResponse(issue);

  assert.equal(response.fields.length, 0, 'No fields should be provided in minimal response');
  assert.end();
});

test('Bot: show minimal response', (assert) => {
  const issue = {
    key: 'TEST-1',
    fields: {
      created: '2015-05-01T00:00:00.000',
      updated: '2015-05-01T00:01:00.000',
      summary: 'Blarty',
      description: 'h1. Heading\nFoo foo _foo_ foo foo foo\n' +
        '* Bulleted List\n** Indented more\n* Indented less\n\n' +
        '# Numbered List\n' +
        '## Indented more\n' +
        '## Indented more\n' +
        '### Indented morer\n' +
        '### Indented morer\n' +
        '### Indented morer\n' +
        '# Indented less\n\n' +
        '||heading 1||heading 2||\n' +
        '|col A1|col B1|\n|col A2|col B2|\n\n' +
        'Bold: *boldy*\n' +
        'Italic: _Italicy_\n' +
        'Monospace: {{$code}}\n' +
        'Citations: ??citation??\n' +
        'Subscript: ~subscript~\n' +
        'Strikethrough: -strikethrough-\n' +
        'Code: {code}some code{code}\n' +
        'Quote: {quote}quoted text{quote}\n' +
        'No Format: {noformat}pre text{noformat}\n' +
        'Unnamed Link: [http://someurl.com]\n' +
        'Named Link: [Someurl|http://someurl.com]\n' +
        'Blockquote: \nbq. This is quoted\n' +
        'Color: {color:white}This is white text{color}\n' +
        'Panel: {panel:title=foo}Panel Contents{panel}\n',
      status: {
        name: 'Open',
      },
      priority: {
        name: 'Low',
      },
      reporter: {
        name: 'bob',
        displayName: 'Bob',
      },
      assignee: {
        name: 'fred',
        displayName: 'Fred',
      },
      customfield_10000: 'Fizz',
      customfield_10001: [
        { value: 'Buzz' },
      ],
    },
  };

  const expectedText = '\n* Heading*\n\nFoo foo _foo_ foo foo foo\n' +
    '• Bulleted List\n  • Indented more\n• Indented less\n\n' +
    '1. Numbered List\n' +
    '  1. Indented more\n' +
    '  2. Indented more\n' +
    '    1. Indented morer\n' +
    '    2. Indented morer\n' +
    '    3. Indented morer\n' +
    '2. Indented less\n\n' +
    '\n|heading 1|heading 2|\n' +
    '| --- | --- |\n|col A1|col B1|\n|col A2|col B2|\n\n' +
    'Bold: *boldy*\n' +
    'Italic: _Italicy_\n' +
    'Monospace: `$code`\n' +
    'Citations: _-- citation_\n' +
    'Subscript: ~~subscript~~\n' +
    'Strikethrough: ~strikethrough~\n' +
    'Code: ```some code```\n' +
    'Quote: ```quoted text```\n' +
    'No Format: ```pre text```\n' +
    'Unnamed Link: <http://someurl.com>\n' +
    'Named Link: <http://someurl.com|Someurl>\n' +
    'Blockquote: \n> This is quoted\n' +
    'Color: This is white text\n' +
    'Panel: \n| foo |\n| --- |\n| Panel Contents |\n';

  const bot = new Bot(configDist);
  const response = bot.issueResponse(issue);

  assert.equal(response.text, expectedText, 'Atlassian Markup should be converted to Slack Markup');
  assert.end();
});
