export default function Loading() {
  const bar = "animate-pulse rounded-lg bg-slate-200/70";
  return (
    <div className="space-y-6" aria-busy="true" aria-label="در حال بارگذاری">
      <div className="space-y-2"><div className={`h-3 w-20 ${bar}`} /><div className={`h-8 w-56 ${bar}`} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="card h-28 space-y-3"><div className={`h-3 w-24 ${bar}`} /><div className={`h-7 w-14 ${bar}`} /></div>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => <div key={i} className="card h-64 space-y-3"><div className={`h-4 w-32 ${bar}`} />{[0, 1, 2, 3].map((j) => <div key={j} className={`h-9 ${bar}`} />)}</div>)}
      </div>
    </div>
  );
}
