# Guardian Chrome extension

Manifest V3 content script and popup providing Elderly Mode (large text), Focus Mode (hides ads/sidebars/nav without deleting page content), Read Aloud (browser speech synthesis), automatic phishing-keyword highlighting, and a "Simplify this page" companion panel that calls the Guardian API.

The companion panel is only injected after the user activates Guardian via the toolbar popup's "Scan Page Now" button — the passive phishing-keyword scan runs automatically on page load, but the floating button does not.

See `docs/setup.md` for how to sideload it locally.
