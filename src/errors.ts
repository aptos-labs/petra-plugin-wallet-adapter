export class PetraApiError extends Error {
  constructor(
    readonly code: number,
    readonly status: string,
    message: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, PetraApiError.prototype);
  }
}

export const PetraApiErrors = Object.freeze({
  INTERNAL_ERROR: new PetraApiError(-30001, 'Internal Error', 'Internal Error'),
  NO_ACCOUNTS: new PetraApiError(4000, 'No Accounts', 'No accounts found'),
  TIME_OUT: new PetraApiError(
    4002,
    'Time Out',
    'The prompt timed out without a response. This could be because the user did not respond or because a new request was opened.',
  ),
  UNAUTHORIZED: new PetraApiError(
    4100,
    'Unauthorized',
    'The requested method and/or account has not been authorized by the user.',
  ),
  UNSUPPORTED: new PetraApiError(
    4200,
    'Unsupported',
    'The provider does not support the requested method.',
  ),
  USER_REJECTION: new PetraApiError(
    4001,
    'Rejected',
    'The user rejected the request',
  ),
});

export function codeToError(code: number): PetraApiError {
  return Object.values(PetraApiErrors)
    .find((error) => error.code === code) ?? PetraApiErrors.INTERNAL_ERROR;
}
