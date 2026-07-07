// Cloudflare Pages "advanced mode" worker.
// A single _worker.js at the project root is run for every request on Direct Upload
// (drag-and-drop) deployments — unlike a functions/ folder, which only compiles on
// Git/Wrangler deploys. This handles the shared-progress API and serves the static site.
//
// Requires a KV namespace bound as PROGRESS on this Pages project.

const KEY = "shared-state";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/progress") {
      if (request.method === "GET") {
        if (!env.PROGRESS) return json({});
        const v = await env.PROGRESS.get(KEY);
        return json(v ? JSON.parse(v) : {});
      }
      if (request.method === "POST") {
        if (!env.PROGRESS) return json({ ok: false, error: "KV not bound" }, 500);
        let body;
        try {
          body = await request.json();
        } catch (e) {
          return json({ ok: false, error: "bad json" }, 400);
        }
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          return json({ ok: false, error: "expected object" }, 400);
        }
        await env.PROGRESS.put(KEY, JSON.stringify(body));
        return json({ ok: true });
      }
      return json({ ok: false, error: "method not allowed" }, 405);
    }

    // Everything else: serve the static site (index.html, etc.)
    return env.ASSETS.fetch(request);
  },
};
