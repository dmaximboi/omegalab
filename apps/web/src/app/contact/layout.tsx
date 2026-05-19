import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with De-Omega Labaffairs for laboratory equipment inquiries, quotes, installation services, and technical support. Located in Ilorin, Kwara State, Nigeria.",
  keywords: ["contact lab equipment supplier", "lab equipment quotes Nigeria", "De-Omega contact"],
  openGraph: {
    title: "Contact De-Omega Labaffairs",
    description: "Reach out for lab equipment inquiries, quotes, and technical support.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
