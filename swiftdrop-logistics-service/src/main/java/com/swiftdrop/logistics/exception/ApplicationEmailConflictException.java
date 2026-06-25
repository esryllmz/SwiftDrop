package com.swiftdrop.logistics.exception;

public class ApplicationEmailConflictException extends RuntimeException {

    public ApplicationEmailConflictException(String message) {
        super(message);
    }
}
