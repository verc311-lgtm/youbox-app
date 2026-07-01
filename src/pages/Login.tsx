import React from 'react';
import { AlertOctagon, Mail } from 'lucide-react';

export function Login() {
  const supportEmail = "support@youboxgt.com";
  const errorCode = "ERR_YOUBOX_SYSTEM_CRASH_404";
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/20 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration / Glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-red-500/10 blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-red-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 shadow-2xl shadow-red-950/20 text-center">
          {/* Brand Logo or Header */}
          <div className="flex flex-col items-center mb-6">
            <img
              src="https://youboxgt.online/wp-content/uploads/2024/10/Manual-de-logo-YouBoxGt-03-1.png"
              alt="YOUBOX GT Logo"
              className="h-16 w-auto object-contain opacity-40 grayscale mb-4"
            />
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
          </div>

          {/* Error Icon */}
          <div className="inline-flex items-center justify-center p-4 bg-red-500/10 border border-red-500/20 rounded-full mb-6">
            <AlertOctagon className="h-12 w-12 text-red-500 animate-pulse" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">404</h1>
          <h2 className="text-xl font-bold text-red-400 mb-4 uppercase tracking-wider">Page Crashed / Offline</h2>

          {/* Message in English */}
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed mb-8">
            <p className="font-semibold text-white">
              The login portal has encountered a critical system error.
            </p>
            <p>
              We apologize for the inconvenience. The page you are looking for has crashed and is currently unavailable.
            </p>
            <p>
              Access is restricted. Please contact our support team if you need further assistance.
            </p>
          </div>

          {/* Diagnostics Details */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 text-left font-mono text-xs text-slate-500 mb-8 space-y-1">
            <div><span className="text-slate-400">Error:</span> {errorCode}</div>
            <div><span className="text-slate-400">Status:</span> Offline</div>
            <div><span className="text-slate-400">Time:</span> {timestamp}</div>
          </div>

          {/* Contact Button */}
          <a
            href={`mailto:${supportEmail}?subject=Support Request: ${errorCode}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-4 transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
          >
            <Mail className="h-4 w-4" />
            Contact Support
          </a>
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          © 2025 YOUBOX GT — Systems Administration
        </p>
      </div>
    </div>
  );
}
