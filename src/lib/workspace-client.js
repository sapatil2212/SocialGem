// The workspace the dashboard is showing. Set once by WorkspaceProvider; switching reloads the page.
let current = "";

export function setWorkspace(id) {
  current = id;
}

export function inWorkspace(path) {
  return `/api/w/${current}${path}`;
}

// A preference only: the server checks membership every time.
export function rememberWorkspace(id) {
  document.cookie = `sg_ws=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
}
