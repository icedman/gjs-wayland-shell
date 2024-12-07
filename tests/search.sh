#!/bin/sh
gdbus introspect --session --dest org.gnome.Nautilus --object-path /org/gnome/Nautilus/SearchProvider
gdbus call --session --dest=org.gnome.Nautilus --object-path=/org/gnome/Nautilus/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetInitialResultSet "['board']"
gdbus call --session --dest=org.gnome.Nautilus --object-path=/org/gnome/Nautilus/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetResultMetas "['file:///home/iceman/Documents/board-resolution.md']"

# gdbus introspect --session --dest org.gnome.Calculator.SearchProvider --object-path /org/gnome/Calculator/SearchProvider
gdbus call --session --dest=org.gnome.Calculator.SearchProvider --object-path=/org/gnome/Calculator/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetInitialResultSet "['3 * 3']"
gdbus call --session --dest=org.gnome.Calculator.SearchProvider --object-path=/org/gnome/Calculator/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetResultMetas "['3 * 3', 'copy-to-clipboard-3 * 3']" 
# gdbus call --session --dest=org.gnome.Calculator.SearchProvider --object-path=/org/gnome/Calculator/SearchProvider --method=org.gnome.Shell.SearchProvider2.GetSubsearchResultSet "['3 * 3', 'copy-to-clipboard-3 * 3']" "['3 * 3']" 