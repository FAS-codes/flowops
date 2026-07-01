import { Role } from '../utils/rbac';

declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth once a valid access token is verified.
      userId?: string;
      // Set by requireTenant once the user's membership in the active org is loaded.
      orgId?: string;
      role?: Role;
    }
  }
}

export {};
