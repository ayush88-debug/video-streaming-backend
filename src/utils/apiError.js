class apiError extends Error{
    constructor(statusCode, message = "something went wrong", errors = [], stack =""){

        super(message);  //calls parents constuctor

        this.statusCode =statusCode;
        this.message = message;  //overide 'message'
        this.errors = errors;
        this.stack = stack;
        
        this.success = false;

    }
}
export {apiError}