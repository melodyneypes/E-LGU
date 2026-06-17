import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      isPasswordChanged: boolean;
      managedBarangay?: string | null;
      department?: string | null;
      accessiblePages?: string[];
    } & DefaultSession["user"]
  }

  interface User {
    id: string;
    role: string;
    isPasswordChanged: boolean;
    managedBarangay?: string | null;
    department?: string | null;
    accessiblePages?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    isPasswordChanged: boolean;
    managedBarangay?: string | null;
    department?: string | null;
    accessiblePages?: string[];
  }
}
