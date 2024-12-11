all: build install lint

.PHONY: build install

build:
	glib-compile-schemas --strict --targetdir=schemas/ schemas

install:
	mkdir -p ~/.local/share/glib-2.0/schemas
	cp ./schemas/*.compiled ~/.local/share/glib-2.0/schemas

lint:
	eslint ./

xml-lint:
	find . -name "*.ui" -type f -exec xmllint --output '{}' --format '{}' \;

pretty: xml-lint
	prettier --single-quote --write "**/*.js"
