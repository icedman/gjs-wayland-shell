# Niri

### Windows Updated
```json
{
    "event": "windows-update",
    "windows": [
        {
            "id": 1,
            "title": "./tests/test.sh",
            "app_id": "kitty",
            "pid": 700901,
            "workspace_id": 1,
            "is_focused": true
        },
        {
            "id": 2,
            "title": "~/Developer/gnome/gjs-wayland-shell/src/compositors/niri.js (gjs-wayland-shell) - Sublime Text (UNREGISTERED)",
            "app_id": "sublime_text",
            "pid": 701529,
            "workspace_id": 1,
            "is_focused": false
        }
    ],
    "raw": {
        "Ok": {
            "Windows": [
                {
                    "id": 1,
                    "title": "./tests/test.sh",
                    "app_id": "kitty",
                    "pid": 700901,
                    "workspace_id": 1,
                    "is_focused": true
                },
                {
                    "id": 2,
                    "title": "~/Developer/gnome/gjs-wayland-shell/src/compositors/niri.js (gjs-wayland-shell) - Sublime Text (UNREGISTERED)",
                    "app_id": "sublime_text",
                    "pid": 701529,
                    "workspace_id": 1,
                    "is_focused": false
                }
            ]
        }
    }
}
```

### Window Opened
```json
{
    "event": "window-opened",
    "window": {
        "id": 3,
        "title": "iceman@fedora:~/Developer/gnome/gjs-wayland-shell",
        "app_id": "kitty",
        "pid": 702023,
        "workspace_id": 1,
        "is_focused": true
    },
    "raw": {
        "WindowOpenedOrChanged": {
            "window": {
                "id": 3,
                "title": "iceman@fedora:~/Developer/gnome/gjs-wayland-shell",
                "app_id": "kitty",
                "pid": 702023,
                "workspace_id": 1,
                "is_focused": true
            }
        }
    }
}
```

### Window Closed
```json
{
    "event": "window-closed",
    "window": {
        "id": 6,
        "raw": {
            "WindowClosed": {
                "id": 6
            }
        }
    }
}
```

### Window Focused
```json
{
    "event": "window-focused",
    "window": {
        "id": 3
    },
    "raw": {
        "WindowFocusChanged": {
            "id": 3
        }
    }
}
```

### Workspace
```json
{
    "event": "success",
    "raw": {
        "WorkspaceActivated": {
            "id": 2,
            "focused": true
        }
    }
}
```