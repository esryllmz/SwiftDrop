package com.swiftdrop.logistics.exception;

public class MissingAuthenticationContextException extends RuntimeException {

    public MissingAuthenticationContextException(String message) {
        super(message);
    }
}
