import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import {jwtDecode} from "jwt-decode"


export interface CustomerDecodedToken {
  sub: string;
  nameid: string;
  email: string;
  unique_name: string;
  jti: string;
  sid: string;
  given_name?: string;
  family_name?: string;
  companyId: string;
  customerStatus?: string;
  roles?: string | string[];
  perms?: string | string[];
  portal: string | string[];

  exp: number;
}

@Injectable({
  providedIn: "root",
})
export class CustomerTokenService {
  private readonly TOKEN_KEY = "customer_auth_token"
  private readonly REFRESH_TOKEN_KEY = "customer_refresh_token"
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken())

  constructor() { }

  decodeToken(): CustomerDecodedToken | null {
    const token = this.token;
    if (token) {
      try {
        return jwtDecode<CustomerDecodedToken>(token);
      } catch (error) {
        console.error("Error decoding customer token:", error);
        return null;
      }
    }
    return null;
  }

  getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  getStoredRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY)
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.TOKEN_KEY, accessToken)
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken)
    this.tokenSubject.next(accessToken)
  }

  removeTokens(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.REFRESH_TOKEN_KEY)
    this.tokenSubject.next(null)
  }

  getCustomerIdFromToken(): string | null {
    const decodedToken = this.decodeToken();
    return decodedToken ? decodedToken.sub : null;
  }

  getUserIdFromToken(): string | null {
    const decodedToken = this.decodeToken();
    return decodedToken ? decodedToken.sub : null;
  }

  getCustomerDisplayNameFromToken(): string | null {
    const decodedToken = this.decodeToken();
    return decodedToken ? decodedToken.unique_name : null;
  }

  getCustomerEmailFromToken(): string | null {
    const decodedToken = this.decodeToken();
    return decodedToken ? decodedToken.email : null;
  }

  getCompanyIdFromToken(): string | null {
    const decodedToken = this.decodeToken();
    return decodedToken ? decodedToken.companyId : null;
  }

  isCustomerPortalToken(): boolean {
    const decodedToken = this.decodeToken();
    return decodedToken?.portal?.includes('customer') ?? false;
  }

  getCustomerRoles(): string[] {
    const decodedToken = this.decodeToken();
    if (!decodedToken?.roles) return [];

    return Array.isArray(decodedToken.roles)
      ? decodedToken.roles
      : [decodedToken.roles];
  }

  getCustomerPermissions(): string[] {
    const decodedToken = this.decodeToken();
    if (!decodedToken?.perms) return [];

    return Array.isArray(decodedToken.perms)
      ? decodedToken.perms
      : [decodedToken.perms];
  }

  get token$() {
    return this.tokenSubject.asObservable()
  }

  get token(): string | null {
    return this.tokenSubject.value
  }

  get refreshToken(): string | null {
    return this.getStoredRefreshToken()
  }
}
