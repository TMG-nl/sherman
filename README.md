
# Sherman README

## What is Sherman?

Sherman is a build system for client-side JavaScript projects. It was designed
with flexibility and customization in mind. This should make it easier to use
Sherman with a variety of projects.

## What does it do?

The main Sherman script has only few features, namely:

- Reads a project manifest, and module manifests
- Concatenates all JavaScript sources found in a module
- Writes versioned output for every module
- Built-in webserver for hosting a project

However, the project manifest can specify additional features that will be
loaded at runtime:

- css: Load CSS files and include them in the concatenated JavaScript
- sass: Compile SCSS into CSS
- base64: Inline images into CSS using base64 encoding
- jquery-tmpl: Read jQuery templates and include them in the concatenated
               JavaScript
- hogan: Read Hogan templates and include them in the concatenated JavaScript
- namespace: Apply namespaces to modules
- modules: Provides a module loader
- statics: Copy versioned static files into the build
- i18n: Apply translations to all JavaScript sources and templates
- minify: Minify JavaScript sources
- jslint: Perform jslint checks on modified JavaScript files

For more information about specific features, see below.

## What do I need to use it?

Sherman requires Python 2.6 or higher in order to operate. In addition, you're
strongly advised to have make installed on your system (I will assume you have
it in this documentation).

Specific features may have additional dependencies:
- To use the minify or jslint features, you should have Java installed.
- To use the hogan feature, you should have Node.js installed.

## How do I use it?

- Checkout the Sherman project from: https://github.com/arendjr/sherman/
- Export the SHERMAN\_DIR environment variable to point to the location where
  you have your Sherman checkout.
- Use create\_project.py script to generate the boiler plate for a new project,
  or check out an external project that uses Sherman.
- From the project's main directory, run "make serve" to get a development
  server, or "make dist" to generate a distribution build.

## How do I use a distribution build?

A distribution could build is nothing more than the various versioned JavaScript
files for your project's modules, plus an HTML file and optionally a JSON file
that are used for booting the application.

Before either the HTML or the JSON file is ready to use you will have to
substitute two placeholders:
- "[config]" should be replaced by a JavaScript object that will be passed to
  the application's init() method. If you don't plan on passing through any
  configuration, you can just replace it with an empty object ("{}").
- "[static\_base]" should be replaced by a base URL under which all the
  individual resources can be found. If, in your final setup, the other
  resources are served from the same base URL as the HTML content, then you can
  simply replace it with an empty string ("").

Please note there are __version__.locale.md5 that contain nothing but the MD5
sum in the boot HTML file name. If you are serving the application from some
script, you can use these files to figure out the right name of the boot HTML
file to serve.

Here is a short example in PHP:

```php
$locale = 'en_US';
$md5 = file_get_contents(STATICS_BASE."/__version__.$locale.md5");
$bootHtml = file_get_contents(STATICS_BASE."/boot.$md5.$locale.html");
$bootHtml = str_replace("[static_base]", STATICS_BASE, $bootHtml);
$bootHtml = str_replace("[config]", "{}", $bootHtml);
echo $bootHtml; // this the HTML that will be served to the client
```

## What features are available, and how do they work?

### css

This feature loads all CSS files specified under "styles" in a module's
manifest, concatenates them, and includes them in the concatenated JavaScript.

The fully concatenated CSS is embedded into a JavaScript string and assigned to
the Modules.{moduleName}.css property. If you are using modules.js (provided by
the modules feature), the CSS will be read from this property and automatically
included in the DOM when the module is loaded.

### sass

This feature allows you to use SCSS (http://sass-lang.com/) in addition to plain
CSS. SCSS files should be listed in a module's manifest under "styles", just as
for regular CSS.

SCSS files are compiled into CSS by the included Woodpecker compiler
(https://github.com/arendjr/woodpecker).

When a module has listed other modules as its dependencies, any SCSS variables,
mixins or functions defined in the prerequisite modules are made available in
the dependent module.

### base64

This feature allows images to be base64-encoded into the CSS.

The images should be located in a module's img/base64/ directory and be
referenced from the CSS as "url(base64/{fileName})".

### jquery-tmpl

This feature includes jQuery templates into a module.

The templates should be located in a module's tmpl/ directory and have a file
name ending in .tmpl.html. Every file can contain one or more templates, each
starting with a line that says:

<!-- template id="{templateName}" -->

and ending with a line that says:

<!-- /template id="{templateName}" -->

The final name of the template, as used in the $.tmpl() function will be
"{moduleName}.{templateName}".

By enabling this feature, the file jquery.tmpl.js will automatically be bundled
with the boot module.

### hogan

This feature includes Hogan templates into a module.

The templates should be located in a module's tmpl/ directory and have a file
name ending in .moustache.html. Every file can contain one or more templates, each
starting with a line that says:

<!-- template id="{templateName}" -->

and ending with a line that says:

<!-- /template id="{templateName}" -->

The templates are compiled by the Hogan compiler and then assigned to the
Modules.{moduleName}.templates["{templateName}"] property.

By enabling this feature, the file hogan/template.js will automatically be
bundled with the boot module.

### namespace

This feature encapsulated every module into its own namespace. Namespaces can
also be shared between modules.

Fundamentally, the namespace is realized by putting a block like this around
a module's concatenated source:

```javascript
var MyNamespace = MyNamespace || {};
MyNamespace.NS = MyNamespace;
with(MyNamespace) {
...
}
```

For the code within the with-block, all global declarations are rewritten so
that they are assigned to the namespace object. This helps to avoid polluting
the global window object.

The namespace is defined in the "namespace" property in a module's manifest.

### modules

This feature provides a module loader, used through the Modules class.

This feature is currently pretty much mandatory to use Sherman, or many of the
other features.

In order to make a module ready for use by the loader, it adds a callback to the
Modules class to the concatenated source of a module. The exact callback used
depends on whether or not stringifying is used. Stringifying is the process of
wrapping the entire module's source into a JavaScript string. Using stringifying
allows the loader to cache the module's source in LocalStorage, which is why its
usage is advised and enabled by default. To disable stringifying, you can set
set the stringify option to false in the project manifest (see the
project-manifest.json for a new project's boiler plate for an example).

By enabling this feature, the file modules.js will automatically be bundled with
the boot module.

### statics

This feature allows to deploy static resources together with a module.

The statics should be located in a module's statics/ directory and be listed in
a module's manifest under "statics". The statics will be versioned using any
other file.

The versioned file name of a static file can be retrieved using the
Modules.getStaticUrl() method.

### i18n

This feature allows to provide translations for text keys. Text keys looking like
"[[TEXT_KEY]]" are replaced inline, both in JavaScript source and templates. In
addition, a dynamic map is included to perform more advanced replacements at run
time.

Translations should be specified in a module's i18n/translations.json file.

By enabling this feature, the file i18n.js will automatically be bundled with
the boot module. This file contains the i18n() function, which is used for
performing runtime translations.

### tiles

This features adds support for the Tiles class.

By enabling this feature, the files routes.js, history.js, tiles.js and will
automatically be bundled with the boot module.

### profiling and remove-profiling

The profiling feature adds support for profiling through the Profiling class.
Profiling is performed using the Profiling.start() and Profiling.stop() methods.
In order to profile the boot sequence of your project, just add the following
two lines in your code whenever your boot application is completely ready to
use:

```js
Profiling.stop("boot", bootProfilingToken);
Profiling.submit("boot");
```

The profiling feature will automatically inject the corresponding
Profile.start() at the very soonest of the JavaScript execution path.

Every time Profiling.submit() is called, it sends a profiling dump back to the
development webserver, which will print the profiling information on the
console.

You can leave any profiling statements in your code, provided you use the
remove-profiling feature when creating a distribution build.

### remove-dev-cruft

Automatically removes console.log() and logging.debug() calls from your code
before distributing your code.

### minify

This feature minifies all concatenated JavaScript using the Google Closure
compiler (https://developers.google.com/closure/compiler/).

### jquery

This feature includes jQuery into the boot module.

### zepto

This feature includes Zepto.js into the boot module.

### jslint

This feature performs JSLint checks on every modified JavaScript source, and
aborts the build if errors are detected.
