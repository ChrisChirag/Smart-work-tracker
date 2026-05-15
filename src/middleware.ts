export { default } from "next-auth/middleware";

export const config = {
  // Protect everything except the sign-in page and NextAuth API
  matcher: ["/((?!auth|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
