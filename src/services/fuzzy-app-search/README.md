Based on the Gnome Extension:

<img src="/looking_glass_icon.png"  width="32px" height="32px"> GNOME Fuzzy App Search
==================

[Fuzzy](https://en.wikipedia.org/wiki/Approximate_string_matching) application search results for [Gnome Search](https://developer.gnome.org/SearchProvider/). Forked from [gnome-fuzzy-search](https://github.com/fffilo/gnome-fuzzy-search).

## Install

### Install from extensions.gnome.org

Go to [the GNOME Extensions page of this extension](https://extensions.gnome.org/extension/3956/gnome-fuzzy-app-search/) and click on the switch to install.

### Install from AUR

You can install GNOME Fuzzy App Search from the AUR package [`gnome-fuzzy-app-search-git`](https://aur.archlinux.org/packages/gnome-fuzzy-app-search-git).

### Install from source

 - Download and unpack [the highest release](https://gitlab.com/Czarlie/gnome-fuzzy-app-search/-/releases) from [the Gitlab repo](https://gitlab.com/Czarlie/gnome-fuzzy-app-search) or `git clone https://gitlab.com/Czarlie/gnome-fuzzy-app-search`
 - Run `make install` inside the `gnome-fuzzy-app-search` root directory
 - On X11, you can press `Alt`+`F2`, enter `r` and press `Enter` to reload extensions (and everything else, too). On Wayland, or if you choose not to reload, the extension will be loaded on your next login.

## How It Works

The search query is split up into [n-grams](https://en.wikipedia.org/wiki/N-gram#n-grams_for_approximate_matching) and matched against an index of the applications you have on your system. A previous version used Levenshtein distances, but this was limited to application titles and didn't scale well (and had bugs).

![fuzzy search enabled](screenshot_after.png "GNOME search showing 'Calculator' for the query 'calxu'")

## Where is this project headed?

Although [the extension this is forked from](https://github.com/fffilo/gnome-fuzzy-search) did have [plans](https://github.com/fffilo/gnome-fuzzy-search/issues/1#issuecomment-445189640) to extend more search providers, other providers currently aren't being actively developed by me, @Czarlie, but I am not entirely ruling it out. 
