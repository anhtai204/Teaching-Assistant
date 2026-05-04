import { createClient } from "@/utils/supabase/server";

export default async function TestSupabasePage() {
  const supabase = createClient();
  
  // Try to get the current user (if any)
  const { data: { user }, error } = await supabase.auth.getUser();

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <div className="space-y-4">
        <section>
          <h2 className="text-lg font-semibold">Authentication State:</h2>
          {error ? (
            <p className="text-red-500">Error: {error.message}</p>
          ) : (
            <pre className="bg-slate-100 p-4 rounded mt-2 overflow-auto">
              {user ? JSON.stringify(user, null, 2) : "No user logged in (Guest)"}
            </pre>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold">Environment Variables:</h2>
          <ul className="list-disc pl-5">
            <li>URL: <code className="bg-slate-200 px-1 rounded">{process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}</code></li>
            <li>Key: <code className="bg-slate-200 px-1 rounded">{process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "✅ Set" : "❌ Missing"}</code></li>
          </ul>
        </section>
      </div>
    </div>
  );
}
