import { Toaster } from "react-hot-toast";
import Page from "./page";
import Footer from "./footer";
import { ScrollRestoration } from "./scroll-restoration";
import AuthGate from "./auth-gate";

export default function Layout() {
  return (
    <div
      className="ge-shell flex flex-col overflow-hidden"
      style={{ background: "var(--bg-page)", color: "var(--fg-1)" }}
    >
      <AuthGate>
        <Page />
        <Footer />
      </AuthGate>
      <Toaster
        position="bottom-center"
        containerStyle={{ bottom: 96 }}
        toastOptions={{
          duration: 1900,
          style: {
            background: "var(--sand-900)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 500,
            borderRadius: "14px",
            padding: "12px 18px",
            maxWidth: "86vw",
            boxShadow: "0 12px 32px -8px rgba(0,0,0,0.4)",
          },
          iconTheme: { primary: "var(--teal-300)", secondary: "var(--sand-900)" },
        }}
      />
      <ScrollRestoration />
    </div>
  );
}
