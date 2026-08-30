---
title: Community Themes
description: Install, apply, update, and remove community themes in Geode.
category: guides
order: 1
---

Geode can keep multiple community themes installed, but only one community
theme can be active at a time. Themes change CSS only, and compatibility varies:
a theme may depend on Obsidian UI details that Geode does not yet implement.

## Install a theme from GitHub

Geode has no browsable theme catalog or marketplace today. Find the theme's
GitHub repository first, then copy its repository name in `owner/repo` form.

1. Open **Settings → Community plugins & themes**.
2. Find **Install from GitHub** and select **Add…**.
3. Enter the repository as `owner/repo`.
4. Leave the type set to **Auto-detect**, or choose **Theme** if detection is
   ambiguous.
5. Optionally select **Check** to preview the resolved name, type, and version.
6. To use the theme immediately, select **Enable / apply after installing**.
7. Select **Install**.

If you did not apply the theme during installation, open **Settings → Appearance**
and choose it from the **Theme** dropdown. Choose **Default** to remove the active
community theme and return to Geode's built-in styling. This does not uninstall
the theme.

## Manage updates and installed files

For newly installed themes, **Auto-update is off by default**. In **Settings →
Community plugins & themes**, each tracked theme has these controls:

- **Auto-update** opts the theme into update checks on launch.
- **pin** freezes the installed version and disables updating until unpinned.
- **Update now** checks for and installs an available update immediately.
- **Stop updating** stops tracking updates but keeps the installed files and
  active-theme state.
- **Uninstall** removes the installed files and returns to **Default** if that
  theme was active. This is different from **Stop updating**.

Geode stores each theme under
`<vault>/.geode/themes/<name>/`. A usable theme folder contains `theme.css` and
`manifest.json`.

## Troubleshooting

- **The install reports a missing `theme.css`:** confirm that the file exists in
  the repository's default branch and that the repository is a theme package.
- **Geode finds the wrong type or cannot detect one:** retry the install and
  choose **Theme** instead of **Auto-detect**. Also confirm that you entered the
  intended `owner/repo`.
- **The installed theme is missing from the Theme dropdown:** confirm that
  `<vault>/.geode/themes/<name>/theme.css` exists. Reinstall the theme if the
  folder or stylesheet is missing, then reopen **Settings → Appearance**.
