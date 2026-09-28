import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile: (params) => {
        if (params.flow === "signUp") {
          throw new Error("Self-registration is disabled.");
        }
        if (typeof params.email !== "string") {
          throw new Error("Email is required.");
        }
        return { email: params.email };
      },
    }),
  ],
});
