import { HttpContext, HttpContextToken } from "@angular/common/http";

// If true, the interceptor won't try to refresh the token on a 401 error
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);

// If false, we don't send cookies (good for external or purely public APIs)
export const SEND_CREDENTIALS = new HttpContextToken<boolean>(() => true);

export function publicApiContext(): HttpContext {
    // public/external API: no cookies, no refresh
    return new HttpContext()
        .set(SEND_CREDENTIALS, false)
        .set(SKIP_REFRESH, true);
}

export function authEndpointsContext(): HttpContext {
    // login/signup/forgot/reset: needs cookies sometimes, but never refresh-on-401
    return new HttpContext()
        .set(SEND_CREDENTIALS, true)
        .set(SKIP_REFRESH, true);
}

export function refreshCallContext(): HttpContext {
    // refresh endpoint itself: must never trigger refresh again
    return new HttpContext().set(SEND_CREDENTIALS, true).set(SKIP_REFRESH, true);
}