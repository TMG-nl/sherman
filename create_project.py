#!/usr/bin/env python
from __future__ import with_statement
from optparse import OptionParser

import buildutil
import codecs
import os
import shutil


def parseOptions():
    usage = "Usage: %prog [options] <project_name> [<target_directory>]"
    parser = OptionParser(usage = usage)
    parser.add_option("-n", "--namespace", default = "Sherman",
                      help = "Specify a JavaScript namespace for the generated modules")

    (options, args) = parser.parse_args()
    if len(args) < 1:
        parser.error("Missing project name")

    class Config:
        projectName = None
        targetDirectory = None
        namespace = None

    config = Config()
    config.projectName = args[0]

    if len(args) > 1:
        config.targetDirectory = args[1]
    else:
        config.targetDirectory = config.projectName.lower().replace(" ", "_")

    config.namespace = options.namespace

    return config

def copyTemplate(source, destination, variables):
    with codecs.open(source, "r", "utf-8") as sourceFile:
        content = sourceFile.read() % variables
        with codecs.open(destination, "w", "utf-8") as destinationFile:
            destinationFile.write(content)

if __name__ == "__main__":
    config = parseOptions()

    try:
        shermanPath = os.path.dirname(os.path.abspath(__file__))

        os.mkdir(config.targetDirectory)
        copyTemplate("templates/Makefile", config.targetDirectory + "/Makefile", {
            "shermanPath": shermanPath
        })
        copyTemplate("templates/project-manifest.json", config.targetDirectory + "/project-manifest.json", {
            "title": config.projectName
        })

        os.mkdir(config.targetDirectory + "/boot")
        copyTemplate("templates/boot.tpl.html", config.targetDirectory + "/boot/boot.tpl.html", {
            "title": buildutil.htmlEscape(config.projectName)
        })
        shutil.copy("templates/favicon.ico", config.targetDirectory + "/boot/favicon.ico")

        os.mkdir(config.targetDirectory + "/modules")
        shutil.copytree("templates/core/css", config.targetDirectory + "/modules/core/css")
        shutil.copytree("templates/core/i18n", config.targetDirectory + "/modules/core/i18n")
        shutil.copytree("templates/core/js", config.targetDirectory + "/modules/core/js")
        shutil.copytree("templates/core/tmpl", config.targetDirectory + "/modules/core/tmpl")
        copyTemplate("templates/core/manifest.json", config.targetDirectory + "/modules/core/manifest.json", {
            "namespace": config.namespace
        })

        shutil.copytree("templates/boot/js", config.targetDirectory + "/modules/boot/js")
        copyTemplate("templates/boot/manifest.json", config.targetDirectory + "/modules/boot/manifest.json", {
            "namespace": config.namespace
        })

        os.mkdir(config.targetDirectory + "/docs")

        print "Created project %s in directory %s." % (config.projectName, config.targetDirectory)
    except Exception, exception:
        print "Could not create project %s in directory %s." % (config.projectName, config.targetDirectory)
        print "ERROR: " + str(exception)
        exit(1)
