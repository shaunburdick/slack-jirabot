/// <reference path="../typings/tsd.d.ts" />

interface ConfigInterface {
  jira: {
    protocol: string;
    host: string;
    port: number;
    base: string;
    user: string;
    pass: string;
    apiVersion: string;
    verbose: boolean;
    strictSSL: boolean;
    regex: RegExp;
    sprintField: string;
    customFields: { [id: string]: string }
  }

  slack: {
    token: string;
    autoReconnect: boolean;
    autoMark: boolean;
  }

  usermap: { [id: string]: string }
}

export = ConfigInterface;
