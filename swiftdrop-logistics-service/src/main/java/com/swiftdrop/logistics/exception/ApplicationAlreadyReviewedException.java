package com.swiftdrop.logistics.exception;

public class ApplicationAlreadyReviewedException extends RuntimeException {

    public ApplicationAlreadyReviewedException(String message) {
        super(message);
    }
}
