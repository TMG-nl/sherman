from __future__ import with_statement
from builderror import BuildError

import base64
import hashlib
import os


htmlEscapeTable = {
    "&": "&amp;",
    '"': "&quot;",
    "'": "&apos;",
    ">": "&gt;",
    "<": "&lt;"
}

""" Produce entities within text. """
def htmlEscape(text):
    return "".join(htmlEscapeTable.get(c, c) for c in text)

""" Escapes a string so that it is safe to embed in a single-quoted JavaScript
    string. """
def jsStringEscape(text):
    return text.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")

extensionToMimeTypeMap = {
    "css": "text/css",
    "gif": "image/gif",
    "ico": "image/x-icon",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "js": "text/javascript",
    "png": "image/png"
}

""" Returns the MIME type for some specific extension """
def mimeTypeForExtension(extension):
    if extension[0] == ".":
        extension = extension[1:]
    extension = extension.lower()
    if extension in extensionToMimeTypeMap:
        return extensionToMimeTypeMap[extension]
    else:
        raise BuildError("Cannot determine MIME type for extension %s" % extension)

""" Yields all non-hidden entries in some directory. """
def dirEntries(path):
    if not os.path.exists(path):
        return
    for entry in sorted(os.listdir(path)):
        if entry[0] == ".":
            continue
        yield entry

""" Encodes the image stored at the given path using base64 encoding. """
def base64EncodeImage(path):
    (baseName, extension) = os.path.splitext(path)
    with open(path) as f:
        b64Image = "data:%s;base64,%s" % (mimeTypeForExtension(extension), base64.b64encode(f.read()))
    return b64Image

""" Returns a 12 byte hash for the given content. """
def getContentHash(self, content):
    if isinstance(content, unicode):
        return hashlib.md5(content.encode("utf-8")).hexdigest()[:12]
    else:
        return hashlib.md5(content).hexdigest()[:12]

""" Returns the proper output file name for a file, given the module name, base
    name, file content, locale and extension. """
def getDestinationFileName(self, moduleName, baseName, content, locale, extension):
    path = moduleName or ""
    if baseName != None:
        path += "." + baseName
    if content != None:
        path += "." + getContentHash(content)
    if locale != None and locale != "*":
        path += "." + locale
    if extension.startswith("."):
        path += extension
    else:
        path += "." + extension
    return path
