import { useAuthContext } from "@/contexts/AuthContext";

export const useAuth = () => {
    const context = useAuthContext();

    return {
        user: context.user,
        isAuthenticated: context.isAuthenticated,
        isLoading: context.isLoading,
        login: context.login,
        logout: context.logout,
    };
};
