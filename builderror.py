import inspect


class BuildError(Exception):
    def __init__(self, message, originalException = None):
        Exception.__init__(self, message)

        self.originalException = originalException
        self.originalTrace = inspect.trace() if originalException else None
