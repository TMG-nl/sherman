#!/usr/bin/env python
from __future__ import with_statement

import cgi
import cgitb
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


def render(locale):
    print "Content-Type: text/html"     # HTML is following
    print                               # blank line, end of headers

    with open("build/__version__.%s.md5" % locale) as f:
        version = f.read()

    with open("build/boot.%s.%s.html" % (version, locale)) as f:
        print f.read().replace("[static_base]", "/build")

render(locale)
