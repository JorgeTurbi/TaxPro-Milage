export interface ICustomerLogin {
  email: string
  password: string
}

export interface ICustomerProfile {
  customerId: string
  firstName: string
  lastName: string
  middleName?: string
  email: string
  phoneNumber: string
  companyId: string
  status?: 'active' | 'inactive' | 'pending'
  createdAt?: string
  updatedAt?: string
}

// Opción de company para selección
export interface ICustomerCompanyOption {
  companyId: string;
  customerId: string;
  companyName: string;
  companyBrand?: string;
  companyLogo?: string;
  companyCity?: string;
  companyState?: string;
  displayName: string;
}

// Respuesta de login que puede requerir selección
export interface ICustomerLoginResponse {
  // Campos para selección de company
  requiresCompanySelection?: boolean;
  availableCompanies?: ICustomerCompanyOption[];

  // Campos de login exitoso
  tokenRequest?: string;
  expireTokenRequest?: string;
  tokenRefresh?: string;
  customerProfile?: ICustomerProfile;
}

// Request para login con company seleccionada
export interface ICustomerSelectCompanyRequest {
  email: string;
  password: string;
  companyId: string;
}
