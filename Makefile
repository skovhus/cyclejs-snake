SHELL          := /usr/bin/env bash -o pipefail
PWD            := $(CURDIR)
BIN            := $(PWD)/node_modules/.bin

JS_COMP_FILES  := $(shell find src -type f -name '*.js')
JS_FILES       := $(JS_COMP_FILES)


# Generel targets
# ======================

all: dev

clean:
	-rm -rf .*.made build

distclean: clean
	-rm -rf node_modules



# npm
# ======================

node_modules: node_modules/.made

node_modules/.made: package.json
ifneq ("$(wildcard $(PWD)/node_modules)","")
	npm update
	npm prune
else
	npm install
endif
	touch $@


# build and develop
# ======================

build: build-js

build-js: node_modules
	$(BIN)/webpack --progress --colors --config webpack.production.config.js


dev: node_modules
	node server.js


.PHONY: build dev build-js
