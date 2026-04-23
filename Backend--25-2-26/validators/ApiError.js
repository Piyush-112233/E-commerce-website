class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode;
        this.data = this.data;
        this.message = message;
        this.errors = errors;
        this.success = false;

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON() {
        return {
            statusCode: this.statusCode,
            message: this.message,
            success: this.success,
            data: this.data,
            errors: this.errors
        };
    }
}

export { ApiError }