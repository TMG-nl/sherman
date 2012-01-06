/** Called automatically by JsDoc Toolkit. */
function publish(symbolSet) {
	publish.conf = {  // trailing slash expected for dirs
	    pagePrefix: "Hybrid - Class ",
		ext: ".txt",
		outDir: JSDOC.opt.d || SYS.pwd + "../out/confluence/",
		templatesDir: JSDOC.opt.t || SYS.pwd + "../templates/confluence/",
		symbolsDir: "symbols/"
	};
	
	// used to allow Link to check the details of things being linked to
	Link.symbolSet = symbolSet;

	// generate wiki links instead of <a href> tags
	Link.prototype._makeSymbolLink = function(alias) {
        var linkTo = Link.getSymbol(alias);
        if (!linkTo) {
            // if there is no symbol by that name just return the name unaltered
            return this.text || alias;
        }

        var linkPath;
        if (!linkTo.is("CONSTRUCTOR") && !linkTo.isNamespace) { // it's a method or property
            linkPath = (Link.filemap) ? Link.filemap[linkTo.memberOf] :
                      escape(linkTo.memberOf) || "_global_";
            linkPath += "#" + Link.symbolNameToLinkName(linkTo);
        } else {
            linkPath = (Link.filemap) ? Link.filemap[linkTo.alias] : escape(linkTo.alias);
        }

        var linkText = this.text || alias;
        var linkInner = (this.innerName ? "#" + this.innerName : "");
        return "[" + linkText + "|" + publish.conf.pagePrefix + linkPath + linkInner + "]";
	};

	// create the required templates
	try {
        var indexTemplate = new JSDOC.JsPlate(publish.conf.templatesDir + "index.tmpl");
		var classTemplate = new JSDOC.JsPlate(publish.conf.templatesDir + "class.tmpl");
	} catch(exception) {
		print("Couldn't create the required templates: " + exception);
		quit();
	}
	
	// get an array version of the symbolset, useful for filtering
	var symbols = symbolSet.toArray();

 	// get a list of all the classes in the symbolset
 	var classes = symbols.filter(function ($) { return ($.is("CONSTRUCTOR") || $.isNamespace); }).sort(makeSortby("alias"));

	// create each of the class pages
	for (var i = 0, l = classes.length; i < l; i++) {
		var symbol = classes[i];

		symbol.events = symbol.getEvents();   // 1 order matters
		symbol.methods = symbol.getMethods(); // 2

		Link.currentSymbol = symbol;

		var output = classTemplate.process(symbol);
		IO.saveFile(publish.conf.outDir, publish.conf.pagePrefix + symbol.alias + publish.conf.ext, output);
	}
	
    var index = indexTemplate.process(classes);
    IO.saveFile(publish.conf.outDir, "index" + publish.conf.ext, index);
}

/** Escapes curly braces (as used in examples). */
function escapeCurlyBraces(text) {
    text = text.replace(/{/g, "\\{");
    text = text.replace(/}/g, "\\}");
    return text;
}

/** Converts the HTML tags in a text block to Confluence Wiki formatting. */
function html2wiki(text) {
    text = text.replace(/\n/g, " ");
    text = text.replace(/<h2>/g, "h2. ");
    text = text.replace(/<\/h2>/g, "");
    text = text.replace(/<p>/g, "\n\n");
    text = text.replace(/<\/p>/g, "");
    text = text.replace(/<dl>/g, "");
    text = text.replace(/<\/dl>/g, "");
    text = text.replace(/<dt>/g, "\n * ");
    text = text.replace(/<\/dt>/g, "\\\\");
    text = text.replace(/<dd>/g, "");
    text = text.replace(/<\/dd>/g, "");
    text = text.replace(/<ul>/g, "\n");
    text = text.replace(/<\/ul>/g, "");
    text = text.replace(/<li>/g, "\n * ");
    text = text.replace(/<\/li>/g, "");
    text = text.replace(/<strong>/g, "*");
    text = text.replace(/<\/strong>/g, "*");
    text = text.replace(/<br>/g, "\\\\");
    return text;
}

/** Strips all HTML tags from a text block. */
function stripHtml(text) {
    text = text.replace(/\n/g, " ");
    text = text.replace(/<h2>/g, "");
    text = text.replace(/<\/h2>/g, "");
    text = text.replace(/<p>/g, "\n\n");
    text = text.replace(/<\/p>/g, "");
    text = text.replace(/<dl>/g, "");
    text = text.replace(/<\/dl>/g, "");
    text = text.replace(/<dt>/g, "");
    text = text.replace(/<\/dt>/g, "");
    text = text.replace(/<dd>/g, "");
    text = text.replace(/<\/dd>/g, "");
    text = text.replace(/<ul>/g, "");
    text = text.replace(/<\/ul>/g, "");
    text = text.replace(/<li>/g, "");
    text = text.replace(/<\/li>/g, "");
    text = text.replace(/<strong>/g, "");
    text = text.replace(/<\/strong>/g, "");
    text = text.replace(/<br>/g, "");
    return text;
}

/** Just the first sentence (up to a full stop). Should not break on dotted variable names. */
function summarize(desc) {
	if (typeof desc != "undefined")
		return desc.match(/([\w\W]+?\.)[^a-z0-9_$]/i)? RegExp.$1 : desc;
}

/** Make a symbol sorter by some attribute. */
function makeSortby(attribute) {
	return function(a, b) {
		if (a[attribute] != undefined && b[attribute] != undefined) {
			a = a[attribute].toLowerCase();
			b = b[attribute].toLowerCase();
			if (a < b) return -1;
			if (a > b) return 1;
			return 0;
		}
	}
}

/** Pull in the contents of an external file at the given path. */
function include(path) {
	var path = publish.conf.templatesDir+path;
	return IO.readFile(path);
}

/** Build output for displaying function parameters. */
function makeSignature(params) {
	if (!params) return "()";
	var signature = "("
	+
	params.filter(
		function($) {
			return $.name.indexOf(".") == -1; // don't show config params in signature
		}
	).map(
		function($) {
			return $.name;
		}
	).join(", ")
	+
	")";
	return signature;
}

/** Find symbol {@link ...} strings in text and turn into html links */
function resolveLinks(str, from) {
	str = str.replace(/\{@link ([^} ]+) ?\}/gi,
		function(match, symbolName) {
			return new Link().toSymbol(symbolName);
		}
	);
	
	return str;
}
