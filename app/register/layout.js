import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Register | QualCard',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }) {
  return <div className={inter.className}>{children}</div>
}
