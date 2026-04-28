export async function fetchHomeStats() {
  const res = await fetch("/api/home/stats");
  if (!res.ok) throw new Error("Failed to fetch home stats");
  return res.json();
}
