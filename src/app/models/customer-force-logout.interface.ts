export interface ICustomerForceLogoutRequest {
  email: string;
  password: string;
  verificationCode?: string;
  reason?: string;
}

export interface ICustomerForceLogoutResponse {
  success: boolean;
  message: string;
  revokedSessionsCount: number;
  requiresAdditionalVerification: boolean;
}
