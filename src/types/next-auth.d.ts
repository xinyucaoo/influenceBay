import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role?: string | null;
      onboarded?: boolean;
    };
  }

  interface User {
    role?: string | null;
    onboarded?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string | null;
    onboarded?: boolean;
  }
}
