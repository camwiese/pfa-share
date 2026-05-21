import { Toaster } from "react-hot-toast";
import FontExplorer from "../components/FontExplorer";

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
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@300;400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300..700;1,6..72,300..700&family=Petrona:ital,wght@0,300..700;1,300..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,300..700;1,8..60,300..700&family=Crimson+Pro:ital,wght@0,300..700;1,300..700&family=Vollkorn:ital,wght@0,400..700;1,400..700&family=Lora:ital,wght@0,400..700;1,400..700&family=Spectral:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Cardo:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <FontExplorer />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontFamily: "'Inter', -apple-system, sans-serif",
              fontSize: "13px",
              borderRadius: "8px",
              background: "#1a1612",
              color: "#f1ece1",
              padding: "10px 14px",
            },
            success: { iconTheme: { primary: "#8e2832", secondary: "#f1ece1" } },
            error: { iconTheme: { primary: "#8e2832", secondary: "#f1ece1" } },
          }}
        />
      </body>
    </html>
  );
}
