var config = {
    jira: {
        protocol: 'https',
        host: 'jira.yourhost.domain',
        port: 443,
        base: '',
        user: 'username',
        pass: 'password',
        apiVersion: 'latest',
        verbose: false,
        strictSSL: false,
        regex: /([A-Z]{1}[A-Z0-9]+\-[0-9]+)/g,
        sprintField: '',
        customFields: {}
    },
    slack: {
        token: 'xoxb-Your-Token',
        autoReconnect: true,
        autoMark: true // Mark messages as read
    },
    usermap: {}
};
module.exports = config;
