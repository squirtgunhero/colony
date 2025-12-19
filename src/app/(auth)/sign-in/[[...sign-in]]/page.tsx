import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-neutral-50 to-neutral-100">
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-10">
          <Image
            src="/colony-icon.svg"
            alt="Colony Logo"
            width={64}
            height={64}
            className="h-16 w-16 mb-4"
            priority
          />
          <h1 className="text-3xl font-light tracking-[0.3em] text-neutral-900 uppercase">
            Colony
          </h1>
          <p className="text-neutral-500 text-sm mt-2">Real Estate CRM</p>
        </div>
        
        {/* Clerk SignIn Component */}
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-2xl border border-neutral-200 rounded-2xl bg-white/80 backdrop-blur-sm",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              formButtonPrimary: "bg-neutral-900 hover:bg-neutral-800 rounded-xl h-11",
              formFieldInput: "rounded-xl border-neutral-200 focus:border-neutral-900 focus:ring-neutral-900 h-11",
              footerActionLink: "text-neutral-900 hover:text-neutral-700",
              socialButtonsBlockButton: "rounded-xl border-neutral-200 h-11",
              dividerLine: "bg-neutral-200",
              dividerText: "text-neutral-400",
            },
          }}
        />
      </div>
    </div>
  )
}

