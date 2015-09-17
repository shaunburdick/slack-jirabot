/// <reference path="../typings/tsd.d.ts" />

interface AttachmentFieldInterface {
  "title": string;      // Priority
  "value": string;      // High
  "short": boolean;     // if true, can be placed on same row as others
}

interface AttachmentInterface {
  "fallback": string;       // Required plain-text summary of the attachment.
  "color"?: string;         // html color code
  "pretext"?: string;       // Optional text that appears above the attachment block
  "author_name"?: string;   // Bobby Tables
  "author_link"?: string;   // http://flickr.com/bobby/
  "author_icon"?: string;   // http://flickr.com/icons/bobby.jpg
  "title"?: string;         // Slack API Documentation
  "title_link"?: string;    // https://api.slack.com/
  "text"?: string;          // Optional text that appears within the attachment

  "fields"?: AttachmentFieldInterface[];

  "image_url"?: string;     // http://my-website.com/path/to/image.jpg
  "thumb_url"?: string;     // http://example.com/path/to/thumb.png
}

export = AttachmentInterface;
