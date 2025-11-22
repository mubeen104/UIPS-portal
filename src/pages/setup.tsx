export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-3 sm:p-4 safe-area-inset">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-10">
        <div className="text-center mb-8 sm:mb-10">
          <div className="text-6xl sm:text-7xl mb-4">⚙️</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Setup Required</h1>
          <p className="text-sm text-gray-500">HR Management System</p>
        </div>

        <p className="text-base sm:text-lg text-gray-600 text-center mb-8">
          Connect your Supabase project to get started. Takes less than 2 minutes!
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 sm:p-6 mb-7">
          <h2 className="font-bold text-gray-900 mb-4 text-lg">Quick Setup Steps:</h2>
          <ol className="text-base text-gray-700 space-y-4">
            <li className="flex gap-3 items-start">
              <span className="text-blue-600 font-bold text-xl bg-blue-100 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">1</span>
              <span className="pt-1">Visit your Supabase project dashboard</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-blue-600 font-bold text-xl bg-blue-100 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">2</span>
              <span className="pt-1">Go to Settings → API keys</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-blue-600 font-bold text-xl bg-blue-100 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">3</span>
              <span className="pt-1">Copy Project URL & Anon Key</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="text-blue-600 font-bold text-xl bg-blue-100 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">4</span>
              <span className="pt-1">Add to Replit Secrets (Tools panel)</span>
            </li>
          </ol>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 sm:p-6 mb-7">
          <p className="font-bold text-gray-900 mb-4 text-base">Environment Variables to Add:</p>
          <div className="space-y-3">
            <div className="bg-white border border-gray-300 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Variable Name</p>
              <code className="text-base font-mono text-gray-900 break-all">VITE_SUPABASE_URL</code>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Variable Name</p>
              <code className="text-base font-mono text-gray-900 break-all">VITE_SUPABASE_ANON_KEY</code>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 mb-8">
          <p className="text-sm text-amber-900 leading-relaxed">
            <strong>Tip:</strong> After adding secrets to Replit, restart the workflow from the Tools panel for changes to take effect.
          </p>
        </div>

        <button
          onClick={() => location.reload()}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 px-6 rounded-xl transition-colors text-base sm:text-lg min-h-12"
          data-testid="button-retry-connection"
        >
          Retry Connection
        </button>

        <button
          onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          className="w-full mt-3 bg-white border-2 border-blue-600 hover:bg-blue-50 active:bg-blue-100 text-blue-600 font-bold py-3 px-6 rounded-xl transition-colors text-base sm:text-lg min-h-12"
          data-testid="button-open-supabase"
        >
          Open Supabase Dashboard
        </button>

        <p className="text-xs text-gray-500 text-center mt-6">
          HR Management System • PWA Edition
        </p>
      </div>
    </div>
  );
}
