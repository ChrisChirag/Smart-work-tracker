export default function AuthLayout({ children }: { children: React.ReactNode }) {
  // Auth pages render without sidebar/nav — just the full-screen sign-in card
  return <>{children}</>;
}
