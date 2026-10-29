export async function loadGeoJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function notice(html) {
  const el = document.createElement('p');
  el.className = 'notice';
  el.innerHTML = html;
  document.getElementById('notices').append(el);
}
