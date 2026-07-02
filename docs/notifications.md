# TaskBoard Notifications

## Direction

Notifications should be event-driven and introduced incrementally.

Potential event sources:

- task created
- task assigned
- task moved
- task updated
- comment created
- attachment added
- watcher added
- access request created
- access request approved/rejected
- epic linked to task
- epic updated

## Recipients

Potential recipients:

- task assignee
- task author
- task watchers
- epic owner/participants
- department managers
- board managers
- access request requester

Being a notification recipient does not grant permission to manage the resource.

## Delivery

MVP can start with in-app notifications. Later extensions can include email, realtime/websocket, digest, or external integrations.

## Data Rules

- Notifications should be scoped to the user.
- Include enough metadata to render a useful message.
- Do not expose restricted resource details to users without access.
