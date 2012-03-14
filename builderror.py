import inspect


class BuildError(Exception):

    def __init__(self, message, originalException = None):
        Exception.__init__(self, message)

        self.originalException = originalException
        self.originalTrace = inspect.trace() if originalException else None

    def printMessage(self):
        message = "Build Error: " + str(self)
        message = self.extendMessage(message, self.originalException)

        print message
        if self.originalTrace:
            print "Traceback (most recent call last):"
            for frame in self.originalTrace:
                print "  File \"%s\", line %s, in %s" % (frame[1], frame[2], frame[3])

    def extendMessage(self, message, exception):
        if exception:
            message += ": " + str(exception)
            if "originalException" in exception.__dict__ and exception.originalException:
                message = self.extendMessage(message, exception.originalException)
        return message
