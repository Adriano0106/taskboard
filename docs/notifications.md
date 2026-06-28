# TaskBoard Notifications And Events

## Direction

TaskBoard should use internal domain events to decouple business operations from side effects.

Examples:

- task creation should not directly know how notifications are stored
- task movement should not directly know how WebSocket messages are sent
- comments should not directly know how task activity is written

## Planned Domain Events

Initial events:

- `TaskCreated`
- `TaskUpdated`
- `TaskMoved`
- `CommentCreated`
- `AttachmentCreated`
- `NotificationCreated`
- `BoardColumnCreated`
- `BoardColumnRenamed`
- `BoardColumnReordered`
- `BoardColumnDeleted`

## Consumers

Events can be consumed by:

- `ActivityModule`
- `NotificationModule`
- `RealtimeModule`
- `AuditModule`
- `AutomationModule`

The MVP does not need asynchronous infrastructure. A simple in-process event publisher is enough when the first event-driven feature is implemented.

## Notification Rules

Initial notification triggers:

- task assigned to user
- comment added to watched task
- task moved to another column
- user mentioned in a comment
- task priority changed

Notification records should be scoped by company and user.

## Realtime Direction

REST remains the write interface.

WebSocket should broadcast events to scoped rooms:

- company room
- board room
- task room
- user notification room

WebSocket payloads should be small and should not replace REST detail endpoints.

## Future Email

Email notifications should be added after internal notifications are stable.

Email delivery should be handled by a background job, not inline with HTTP requests.
