// Service worker do player (escopo /display/): mantém a TV exibindo sem internet.
//
// - Página do display e /api/display: rede primeiro, cópia em cache se cair.
//   A tela de erro (servidor/banco fora do ar) nunca substitui a cópia boa.
// - Arquivos do Next (/_next/static) e imagens otimizadas: cache primeiro.
// - Mídias do Storage do Supabase: baixadas assim que entram na lista e
//   servidas do cache (com suporte a Range, que o <video> usa).
// - Outros hosts não são interceptados (a CSP do worker não permite buscá-los).

const VERSION = "v2";
const PAGE_CACHE = `display-pages-${VERSION}`;
const STATIC_CACHE = `display-static-${VERSION}`;
const MEDIA_CACHE = `display-media-${VERSION}`;
const CACHES = [PAGE_CACHE, STATIC_CACHE, MEDIA_CACHE];

const MAX_STATIC_ENTRIES = 300;
const NAVIGATION_TIMEOUT_MS = 5000;

const SUPABASE_ORIGIN = new URL(self.location.href).searchParams.get("supabase");
const STORAGE_PREFIX = "/storage/v1/object/public/";
/** Marca da tela de erro do display (DisplayError). */
const ERROR_MARKER = "data-display-error";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("display-") && !CACHES.includes(key)) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })()
  );
});

// O primeiro carregamento acontece antes do worker assumir a página:
// o player pede para guardar a página e a lista assim que ele fica ativo.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "warm" || typeof data.page !== "string") return;
  const page = new URL(data.page, self.location.origin);
  const api = new URL(data.api, self.location.origin);
  if (
    page.origin !== self.location.origin ||
    !page.pathname.startsWith("/display/") ||
    api.origin !== self.location.origin ||
    !api.pathname.startsWith("/api/display/")
  ) {
    return;
  }

  const assets = (Array.isArray(data.assets) ? data.assets : [])
    .map((u) => new URL(u, self.location.origin))
    .filter(
      (u) =>
        u.origin === self.location.origin &&
        (u.pathname.startsWith("/_next/static/") || u.pathname === "/_next/image")
    );

  event.waitUntil(
    Promise.all([
      navigation(new Request(page.href)).catch(() => {}),
      displayApi(new Request(api.href)).catch(() => {}),
      ...assets.map((u) =>
        (u.pathname === "/_next/image"
          ? cacheFirst(new Request(u.href), MEDIA_CACHE)
          : cacheFirst(new Request(u.href), STATIC_CACHE, true)
        ).catch(() => {})
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, STATIC_CACHE, true));
    } else if (url.pathname === "/_next/image") {
      event.respondWith(optimizedImage(request));
    } else if (url.pathname.startsWith("/api/display/")) {
      event.respondWith(displayApi(request));
    } else if (request.mode === "navigate" && url.pathname.startsWith("/display/")) {
      event.respondWith(navigation(request));
    }
    return;
  }

  if (isStorageUrl(url)) {
    event.respondWith(storageMedia(request));
  }
});

function isStorageUrl(url) {
  return (
    !!SUPABASE_ORIGIN &&
    url.origin === SUPABASE_ORIGIN &&
    url.pathname.startsWith(STORAGE_PREFIX)
  );
}

function cacheable(response) {
  return response && response.status === 200 && !response.redirected;
}

async function cacheFirst(request, cacheName, trim = false) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (cacheable(response)) {
    await cache.put(request, response.clone());
    if (trim) void trimCache(cache, MAX_STATIC_ENTRIES);
  }
  return response;
}

async function trimCache(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) {
    await cache.delete(key);
  }
}

/** Página de anúncios de verdade (não a tela de erro, nem 404/500). */
async function isGoodPage(response) {
  if (!cacheable(response) || response.type !== "basic") return false;
  const html = await response.clone().text();
  return !html.includes(ERROR_MARKER);
}

async function navigation(request) {
  const cache = await caches.open(PAGE_CACHE);
  const key = request.url.split("?")[0];
  const network = fetch(request).then(async (response) => {
    if (await isGoodPage(response)) {
      await cache.put(key, response.clone());
      return response;
    }
    // Servidor respondeu com erro: a última página boa continua passando
    // os anúncios (o player tenta atualizar sozinho depois)
    return (await cache.match(key)) || response;
  });
  // Se a cópia já foi usada, uma falha posterior da rede não deve virar erro solto
  network.catch(() => {});

  // Rede lenta: depois do tempo limite, usa a cópia (se houver)
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(null), NAVIGATION_TIMEOUT_MS)
  );

  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
    return (await cache.match(key)) || (await network);
  } catch (error) {
    const cached = await cache.match(key);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Imagem otimizada pelo Next. Sem rede e sem essa versão em cache, usa o
 * arquivo original (baixado antes por precacheMedia): a imagem aparece mesmo
 * que a TV nunca a tenha exibido antes de cair a internet.
 */
async function optimizedImage(request) {
  try {
    return await cacheFirst(request, MEDIA_CACHE);
  } catch (error) {
    const source = new URL(request.url).searchParams.get("url");
    if (source) {
      const cache = await caches.open(MEDIA_CACHE);
      const original = await cache.match(new URL(source, self.location.origin).href);
      if (original) return original;
    }
    throw error;
  }
}

async function displayApi(request) {
  const cache = await caches.open(PAGE_CACHE);
  const key = request.url;
  try {
    const response = await fetch(request);
    if (cacheable(response)) {
      await cache.put(key, response.clone());
      response
        .clone()
        .json()
        .then((body) => precacheMedia(body.ads || []))
        .catch(() => {});
    }
    return response;
  } catch (error) {
    // Sem rede: devolve a última lista (o player ignora se for igual)
    const cached = await cache.match(key);
    if (cached) return cached;
    throw error;
  }
}

/** Baixa as mídias da lista atual e remove do cache as que saíram dela. */
async function precacheMedia(ads) {
  const cache = await caches.open(MEDIA_CACHE);
  const wanted = new Set(
    ads
      .map((ad) => ad.content_url)
      .filter((u) => {
        try {
          return isStorageUrl(new URL(u));
        } catch {
          return false;
        }
      })
  );

  for (const request of await cache.keys()) {
    const url = new URL(request.url);
    const source =
      url.pathname === "/_next/image" ? url.searchParams.get("url") : request.url;
    if (source && isStorageUrl(new URL(source, self.location.origin)) && !wanted.has(source)) {
      await cache.delete(request);
    }
  }

  for (const url of wanted) {
    if (await cache.match(url)) continue;
    try {
      const response = await fetch(url, { mode: "cors" });
      if (cacheable(response)) await cache.put(url, response);
    } catch {
      // Tenta de novo na próxima atualização da lista
    }
  }
}

async function storageMedia(request) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request.url);
  if (!cached) return fetch(request);

  const range = request.headers.get("range");
  if (!range) return cached;
  return rangeResponse(cached, range);
}

/** Responde 206 a partir do arquivo inteiro em cache (o <video> pede por partes). */
async function rangeResponse(response, rangeHeader) {
  const blob = await response.blob();
  const size = blob.size;
  const match = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  let start = match && match[1] ? Number(match[1]) : 0;
  let end = match && match[2] ? Number(match[2]) : size - 1;
  if (match && !match[1] && match[2]) {
    // bytes=-N: últimos N bytes
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  }
  if (start >= size || end < start) {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  end = Math.min(end, size - 1);

  return new Response(blob.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || blob.type,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Accept-Ranges": "bytes",
    },
  });
}
