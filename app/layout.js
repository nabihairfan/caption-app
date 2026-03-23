import "./globals.css"

export const metadata = {
  title: "Crackd",
  description: "Rate AI-generated captions",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
