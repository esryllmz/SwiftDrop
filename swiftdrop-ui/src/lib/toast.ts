"use client";

import { toast } from "react-toastify";

const TOAST_CONTAINER_ID = "swiftdrop-toast";

export function showSuccessToast(message: string) {
  toast.success(message, { containerId: TOAST_CONTAINER_ID });
}

export function showErrorToast(message: string) {
  toast.error(message, { containerId: TOAST_CONTAINER_ID });
}

export function showInfoToast(message: string) {
  toast.info(message, { containerId: TOAST_CONTAINER_ID });
}
