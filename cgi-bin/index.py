#!/usr/bin/env python
from __future__ import with_statement

import cgi
import cgitb
import os
import sys

try:
    import json
except ImportError:
    import simplejson as json


cgitb.enable()

with open("project-manifest.json", "r") as f:
    contents = f.read()
projectManifest = json.loads(contents)

locales = projectManifest["locales"]
defaultLocale = projectManifest["defaultLocale"]

form = cgi.FieldStorage()
locale = form.getvalue("locale", defaultLocale)

if not locale in locales:
    raise Exception("Unsupported locale, must be one of %s" % locales)

if os.path.exists("__version__.%s.md5" % (locale)):
    extra = ""
elif os.path.exists("__version__.%s.debug.md5" % (locale)):
    extra = ".debug"
else:
    raise Exception("Could not locate version file")


def render(locale):
    print "Content-Type: text/html"     # HTML is following
    print                               # blank line, end of headers

    with open("__version__.%s%s.md5" % (locale, extra)) as f:
        version = f.read()

    with open("boot.%s.%s%s.html" % (version, locale, extra)) as f:
        print f.read().replace("[static_base]", "")

render(locale)
