export declare function isHoneypotTriggered(honeypotValue: string | undefined): boolean;
export declare function isLikelyBot(userAgent: string): boolean;
export declare function isIpBlacklisted(ip: string): boolean;
export declare function addToBlacklist(ip: string): void;
export declare function removeFromBlacklist(ip: string): void;
export declare function isValidUserAgent(userAgent: string | null): boolean;
export declare function generateRequestFingerprint(ip: string, userAgent: string, acceptLanguage: string): string;
export declare function isCountryBlocked(countryCode: string): boolean;
export declare function blockCountry(countryCode: string): void;
export declare function isTorExitNode(ip: string): boolean;
export declare function detectProxyHeaders(headers: Record<string, string>): boolean;
export interface AbuseSignals {
    failedLogins: number;
    rateLimitHits: number;
    suspiciousRequests: number;
    accountAge: number;
}
export declare function calculateAbuseScore(signals: AbuseSignals): number;
export declare function isTimingAnomaly(requestTimes: number[], threshold?: number): boolean;
export declare function verifyCaptcha(token: string, secret: string): Promise<boolean>;
export declare function hasSuspiciousPatterns(input: string): boolean;
