package com.swiftdrop.logistics.exception;

public class UserProvisioningUnavailableException extends RuntimeException {

    public UserProvisioningUnavailableException(String message) {
        super(message);
    }

    public UserProvisioningUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
