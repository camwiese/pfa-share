import { Toaster } from "react-hot-toast";

export const viewport = {
  themeColor: "#1c1610",
};

export const metadata = {
  title: "A new civic destination for San Francisco at the Palace of Fine Arts",
  description: "A new civic destination for San Francisco at the Palace of Fine Arts.",
  openGraph: {
    title: "A new civic destination at the Palace of Fine Arts",
    description: "A new civic destination at the Palace of Fine Arts.",
    images: ["/images/opt/header-image-1280.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "A new civic destination at the Palace of Fine Arts",
    description: "A new civic destination at the Palace of Fine Arts.",
    images: ["/images/opt/header-image-1280.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      </body>
    </html>
  );
}
