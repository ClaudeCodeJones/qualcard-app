import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sign In | QualCard',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }) {
  return <div className={inter.className}>{children}</div>
}
