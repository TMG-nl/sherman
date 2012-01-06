ifndef SHERMAN_DIR
    SHERMAN_DIR=%(shermanPath)s
endif

BOOT_JS_DIR=$(SHERMAN_DIR)/modules/boot/js
DOC_SRCS=$(BOOT_JS_DIR)/async.js $(BOOT_JS_DIR)/history.js $(BOOT_JS_DIR)/modules.js \
         $(BOOT_JS_DIR)/progressivetileloader.widget.js $(BOOT_JS_DIR)/routes.js \
         $(BOOT_JS_DIR)/tiles.js $(BOOT_JS_DIR)/useragent.js $(BOOT_JS_DIR)/util.js

serve:
	python $(SHERMAN_DIR)/build.py --target=development --serve

serve_debug:
	python $(SHERMAN_DIR)/build.py --target=debugging --serve

dist:
	python $(SHERMAN_DIR)/build.py --target=distribution

reference_docs:
	java -jar $(SHERMAN_DIR)/other/jsdoc-toolkit/jsrun.jar $(SHERMAN_DIR)/other/jsdoc-toolkit/app/run.js -t=$(SHERMAN_DIR)/other/jsdoc-toolkit/templates/jsdoc -d=docs/html $(DOC_SRCS)

confluence_docs:
	java -jar $(SHERMAN_DIR)/other/jsdoc-toolkit/jsrun.jar $(SHERMAN_DIR)/other/jsdoc-toolkit/app/run.js -t=$(SHERMAN_DIR)/other/jsdoc-toolkit/templates/confluence -d=docs/confluence $(DOC_SRCS)

clean:
	-find . -name *.pyc -exec rm -rf {} \;
	-find . -name *.so -exec rm -rf {} \;
	-find . -name *.dep -exec rm -rf {} \;
	-find . -name "*~" -exec rm -rf {} \;
	-find . -name scss -exec rm -rf {} \;
	-find . -name sprites.png -exec rm -rf {} \;
	rm -rf build 
	rm -rf build.tmp
