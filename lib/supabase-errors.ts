type ErrorWithMessage = {
  message?: unknown;
};

export function getSupabaseErrorMessage(caughtError: unknown) {
  if (caughtError instanceof Error) {
    return caughtError.message;
  }

  if (
    typeof caughtError === "object" &&
    caughtError !== null &&
    "message" in caughtError
  ) {
    const { message } = caughtError as ErrorWithMessage;

    if (typeof message === "string") {
      return message;
    }
  }

  try {
    return String(caughtError);
  } catch {
    return "";
  }
}

export function isMissingColumnError(caughtError: unknown, columnName: string) {
  return getSupabaseErrorMessage(caughtError)
    .toLowerCase()
    .includes(columnName.toLowerCase());
}
