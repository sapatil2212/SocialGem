// Runs once when the server starts. Starts the publisher, which sends scheduled posts.
// On by default in production; PUBLISHER=off stops it, PUBLISHER=on runs it in development.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { publisherEnabled, startPublisher } = await import("./server/publisher");
  if (publisherEnabled()) startPublisher();
}
