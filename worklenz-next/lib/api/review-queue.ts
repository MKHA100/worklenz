export async function fetchReviewQueue() {
  const res = await fetch("/api/jcc/review-queue");
  if (!res.ok) throw new Error("Failed to fetch review queue");
  const { data } = await res.json();
  return data;
}
