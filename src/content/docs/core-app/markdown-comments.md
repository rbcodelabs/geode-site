---
title: Markdown Comments
description: Add passage-anchored threads, reply, resolve discussions, and recover detached comments in Markdown notes.
category: core-app
order: 3
---

> Upcoming feature: this guide accompanies the Markdown comments implementation and does not imply availability in the latest released app.

Markdown comments attach a discussion to a passage in a note. Threads live inside the Markdown file, so they travel with it through rename, backup, and sync without an account or a separate comment service.

## Add a comment

1. Select ordinary prose in an open Markdown note.
2. Run **Comments: Add comment to selection**, or use the selection button or context menu.
3. Enter your comment. Geode opens the Comments pane in the right sidebar or Details drawer.

Click a highlighted passage to focus its thread. Click the passage preview in a thread to return to the text.

## Manage a discussion

Use **Reply** to continue a thread and **Edit** or **Delete** to manage individual messages. Messages show author names; agent-authored messages also carry an **Agent** label.

**Resolve** hides a thread from the default list. Enable **Include resolved** to find resolved threads and choose **Reopen** to return one to the active list. **Delete thread** removes the whole discussion after confirmation.

## Select a supported anchor

Anchors cannot overlap another comment or protected Markdown syntax, including code, links, math, HTML, and Obsidian comments. If Geode rejects a selection, choose a smaller range of ordinary prose.

Deleting just the anchored prose leaves a detached thread. Select replacement prose and choose **Reattach to selection**. After directly editing or deleting anchor text, reopen the note if the pane still shows the old preview or detached state.

## Storage and recovery

Live Preview and Reading view hide the comment markers. Source mode intentionally exposes the paired `geode-comment:v1` markers and encoded metadata. The payload is encoded, not encrypted: anyone who can read the Markdown file can access its comments.

Deleting a complete marker pair removes its thread. If Geode reports malformed markers, comment mutations are blocked to protect the existing content. Preserve a backup and inspect Source mode before repairing marker bytes.

## Plugin access

Plugins can use the live service at `app.comments`. The `require("geode")` module exports `CommentService` and the `CommentAuthor`, `CommentMessage`, and `CommentThread` types.

For the storage tradeoffs and concurrent-write limitation, see [Inline Markdown comment markers](/docs/architecture-decisions/0017-inline-markdown-comment-markers/).
