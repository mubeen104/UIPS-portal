export default function SetupPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">⚙️</div>
          <h1 className="text-2xl font-bold text-gray-900">Setup Required</h1>
        </div>

        <p className="text-gray-600 text-center mb-6">
          The HR Management System needs Supabase credentials to run. Please configure your environment variables.
        </p>

        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="font-semibold text-gray-900 mb-3">To Configure:</h2>
          <ol className="text-sm text-gray-700 space-y-2">
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Go to your Supabase project dashboard</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Navigate to Settings → API</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Copy Project URL and Anon Key</span>
            </li>
            <li className="flex gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>In Replit, add as Secrets (Tools panel)</span>
            </li>
          </ol>
        </div>

        <div className="space-y-3 text-sm text-gray-600 bg-gray-50 rounded p-4 mb-6">
          <p className="font-semibold text-gray-900">Environment Variables:</p>
          <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-xs break-all">
            VITE_SUPABASE_URL
          </code>
          <code className="block bg-white p-2 rounded border border-gray-200 font-mono text-xs break-all">
            VITE_SUPABASE_ANON_KEY
          </code>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
          <p className="text-xs text-amber-800">
            💡 <strong>Tip:</strong> After adding secrets, restart the workflow for changes to take effect.
          </p>
        </div>

        <button
          onClick={() => location.reload()}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Retry Connection
        </button>

        <p className="text-xs text-gray-500 text-center mt-4">
          HR Management System v1.0
        </p>
      </div>
    </div>
  );
}
