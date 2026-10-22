export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-md border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
          ChatApp
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Senior Assessment Real-time Chat Platform
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs text-zinc-600">Frontend ready</span>
        </div>
      </div>
    </main>
  );
}
