# Tnvios Notification Architecture

## Purpose
This document defines notifications, email delivery, in-app messages, and future provider integration.

## Core Rule
Modules do not send notifications directly.

Modules publish events or call Notification Engine.

## Stack

```text
Notification Engine: Tnvios
Email Provider: Resend by default
Provider Abstraction: required
Future Provider: Novu optional
Background Delivery: BullMQ
```

## Notification Channels

```text
in-app
email
SMS future
push future
WhatsApp future
chat future
```

## Notification Engine Owns
- notification templates
- notification preferences
- channel routing
- delivery logs
- retries
- in-app inbox
- read/unread state
- tenant branding
- audit where needed

## Email Provider Abstraction

Interface:
```ts
interface EmailProvider {
  sendEmail(input: SendEmailInput): Promise<SendEmailResult>;
}
```

Providers:
```text
ResendProvider
SESProvider future
SMTPProvider future
SendGridProvider future
MailgunProvider future
```

## Notification Flow

```text
domain event occurs
↓
notification rule matches
↓
notification created
↓
BullMQ job queued
↓
provider sends email/push/etc.
↓
delivery log stored
↓
event emitted
```

## Notification Events

```text
notification.created
notification.sent
notification.failed
notification.read
notification.preference.updated
```

## Preferences
Users may configure:
- email on/off
- in-app on/off
- mention notifications
- workflow notifications
- digest frequency
- module-specific preferences

## Security
Notifications must not leak restricted data.

Example:
If user is mentioned on a restricted invoice but lacks access, do not include invoice details.

## Inbound Email
Email-to-action belongs to Inbound Email Engine, but may create notifications and comments after permission checks.
