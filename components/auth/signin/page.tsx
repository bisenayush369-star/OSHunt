"use client" // 💡 Forces the browser to handle click actions instantly

import { signIn } from "next-auth/react" // 💡 Bypasses the server import error completely

export default function SignInPage() {
  return (
    <main style={{ minHeight:"100vh", background:"#090909", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #1a1a1a", borderRadius:20, padding:"2.5rem", width:"100%", maxWidth:400 }}>
        <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:-0.8, marginBottom:6, color:"#fff" }}>Welcome back.</h2>
        <p style={{ fontSize:13, color:"#444", marginBottom:"1.75rem" }}>Sign in to track your contributions.</p>

        {/* GitHub Button via client onClick */}
        <button 
          onClick={() => signIn("github", { callbackUrl: "/hunt" })}
          style={{ width:"100%", padding:"13px 20px", borderRadius:10, background:"#f0f0f0", color:"#090909", border:"none", fontWeight:600, fontSize:14, cursor:"pointer", marginBottom:12 }}
        >
          Continue with GitHub
        </button>

        {/* Google Button via client onClick */}
        <button 
          onClick={() => signIn("google", { callbackUrl: "/hunt" })}
          style={{ width:"100%", padding:"13px 20px", borderRadius:10, background:"transparent", color:"#888", border:"1px solid #1e1e1e", fontWeight:600, fontSize:14, cursor:"pointer" }}
        >
          Continue with Google
        </button>
      </div>
    </main>
  )
}