import { api } from "@/shared/api";
import type { AuthMeResponse, TokenResponse } from "@/shared/types";

export const authService = {
  login(username: string, password: string) {
    return api.post<TokenResponse>(
      "/auth/token/",
      { username, password },
      { auth: false },
    );
  },

  me() {
    return api.get<AuthMeResponse>("/auth/me/");
  },
};
