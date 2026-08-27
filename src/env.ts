import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
    PUBLIC_API_BASE_URL: {
        public: true,
        static: true,
        description: "Base URL of the backend API.",
    },
    PUBLIC_ENV: {
        public: true,
        static: true,
        description: "Current environment, e.g. dev or prod.",
    },
});
