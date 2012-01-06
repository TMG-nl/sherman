from __future__ import with_statement
from builderror import BuildError

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

""" Escapes a string so that it is safe to embed in a single-quoted JavaScript string. """
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
