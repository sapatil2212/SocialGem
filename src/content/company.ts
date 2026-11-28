export const COMPANY = {
  name: "Brightwave Digital Products LLP",
  email: process.env.SUPPORT_EMAIL || "contactsocialgem@gmail.com",
  phone: process.env.CONTACT_PHONE || "+91 9168 08 1355",
  whatsapp: process.env.CONTACT_WHATSAPP || "",
  address: "Pune, Maharashtra, India",
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

export const COMPANY_LINKS = [
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
  ["/privacy", "Privacy Policy"],
  ["/terms", "Terms & Conditions"],
  ["/refund", "Refund Policy"],
  ["/shipping", "Shipping & Delivery"],
  ["/cookies", "Cookie Policy"],
  ["/data-deletion", "Data Deletion"],
  ["/help", "Help Centre"],
] as const;
