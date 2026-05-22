"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
const client_2 = require("@libsql/client");
const adapter_libsql_1 = require("@prisma/adapter-libsql");
const globalForPrisma = globalThis;
function createPrismaClient() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        throw new Error("DATABASE_URL environment variable is not set");
    }
    if (url.startsWith("file:")) {
        return new client_1.PrismaClient({
            log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
        });
    }
    const libsql = (0, client_2.createClient)({
        url,
        authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    const adapter = new adapter_libsql_1.PrismaLibSQL(libsql);
    return new client_1.PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
}
exports.db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = exports.db;
}
__exportStar(require("@prisma/client"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBOEM7QUFDOUMsMkNBQThDO0FBQzlDLDJEQUFzRDtBQUV0RCxNQUFNLGVBQWUsR0FBRyxVQUV2QixDQUFDO0FBRUYsU0FBUyxrQkFBa0I7SUFDekIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUM7SUFFckMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO0lBQ2xFLENBQUM7SUFFRCxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUM1QixPQUFPLElBQUkscUJBQVksQ0FBQztZQUN0QixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7U0FDNUUsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQztRQUMxQixHQUFHO1FBQ0gsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CO0tBQzNDLENBQUMsQ0FBQztJQUVILE1BQU0sT0FBTyxHQUFHLElBQUksNkJBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUV6QyxPQUFPLElBQUkscUJBQVksQ0FBQztRQUN0QixPQUFPO1FBQ1AsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0tBQzVFLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFWSxRQUFBLEVBQUUsR0FBRyxlQUFlLENBQUMsTUFBTSxJQUFJLGtCQUFrQixFQUFFLENBQUM7QUFFakUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLEVBQUUsQ0FBQztJQUMxQyxlQUFlLENBQUMsTUFBTSxHQUFHLFVBQUUsQ0FBQztBQUM5QixDQUFDO0FBRUQsaURBQStCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUHJpc21hQ2xpZW50IH0gZnJvbSBcIkBwcmlzbWEvY2xpZW50XCI7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tIFwiQGxpYnNxbC9jbGllbnRcIjtcbmltcG9ydCB7IFByaXNtYUxpYlNRTCB9IGZyb20gXCJAcHJpc21hL2FkYXB0ZXItbGlic3FsXCI7XG5cbmNvbnN0IGdsb2JhbEZvclByaXNtYSA9IGdsb2JhbFRoaXMgYXMgdW5rbm93biBhcyB7XG4gIHByaXNtYTogUHJpc21hQ2xpZW50IHwgdW5kZWZpbmVkO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlUHJpc21hQ2xpZW50KCk6IFByaXNtYUNsaWVudCB7XG4gIGNvbnN0IHVybCA9IHByb2Nlc3MuZW52LkRBVEFCQVNFX1VSTDtcbiAgXG4gIGlmICghdXJsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiREFUQUJBU0VfVVJMIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIG5vdCBzZXRcIik7XG4gIH1cblxuICBpZiAodXJsLnN0YXJ0c1dpdGgoXCJmaWxlOlwiKSkge1xuICAgIHJldHVybiBuZXcgUHJpc21hQ2xpZW50KHtcbiAgICAgIGxvZzogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09IFwiZGV2ZWxvcG1lbnRcIiA/IFtcImVycm9yXCIsIFwid2FyblwiXSA6IFtcImVycm9yXCJdLFxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgbGlic3FsID0gY3JlYXRlQ2xpZW50KHtcbiAgICB1cmwsXG4gICAgYXV0aFRva2VuOiBwcm9jZXNzLmVudi5EQVRBQkFTRV9BVVRIX1RPS0VOLFxuICB9KTtcblxuICBjb25zdCBhZGFwdGVyID0gbmV3IFByaXNtYUxpYlNRTChsaWJzcWwpO1xuICBcbiAgcmV0dXJuIG5ldyBQcmlzbWFDbGllbnQoe1xuICAgIGFkYXB0ZXIsXG4gICAgbG9nOiBwcm9jZXNzLmVudi5OT0RFX0VOViA9PT0gXCJkZXZlbG9wbWVudFwiID8gW1wiZXJyb3JcIiwgXCJ3YXJuXCJdIDogW1wiZXJyb3JcIl0sXG4gIH0pO1xufVxuXG5leHBvcnQgY29uc3QgZGIgPSBnbG9iYWxGb3JQcmlzbWEucHJpc21hID8/IGNyZWF0ZVByaXNtYUNsaWVudCgpO1xuXG5pZiAocHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09IFwicHJvZHVjdGlvblwiKSB7XG4gIGdsb2JhbEZvclByaXNtYS5wcmlzbWEgPSBkYjtcbn1cblxuZXhwb3J0ICogZnJvbSBcIkBwcmlzbWEvY2xpZW50XCI7XG4iXX0=