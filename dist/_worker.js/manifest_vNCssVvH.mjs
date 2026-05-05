globalThis.process ??= {}; globalThis.process.env ??= {};
import { p as decodeKey } from './chunks/astro/server_Bj5LOVb5.mjs';
import './chunks/astro-designed-error-pages_Cpol0wKV.mjs';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/noop-middleware_DIruPqB4.mjs';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///Users/adam/dev/crt/","cacheDir":"file:///Users/adam/dev/crt/node_modules/.astro/","outDir":"file:///Users/adam/dev/crt/dist/","srcDir":"file:///Users/adam/dev/crt/src/","publicDir":"file:///Users/adam/dev/crt/public/","buildClientDir":"file:///Users/adam/dev/crt/dist/","buildServerDir":"file:///Users/adam/dev/crt/dist/_worker.js/","adapterName":"@astrojs/cloudflare","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"404.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"colophon/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/colophon","isIndex":false,"type":"page","pattern":"^\\/colophon\\/?$","segments":[[{"content":"colophon","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/colophon.astro","pathname":"/colophon","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"projects/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/projects","isIndex":false,"type":"page","pattern":"^\\/projects\\/?$","segments":[[{"content":"projects","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/projects.astro","pathname":"/projects","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"resume/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/resume","isIndex":false,"type":"page","pattern":"^\\/resume\\/?$","segments":[[{"content":"resume","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resume.astro","pathname":"/resume","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}}],"site":"https://burmister.com","base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/Users/adam/dev/crt/src/pages/404.astro",{"propagation":"none","containsHead":true}],["/Users/adam/dev/crt/src/pages/colophon.astro",{"propagation":"none","containsHead":true}],["/Users/adam/dev/crt/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/adam/dev/crt/src/pages/projects.astro",{"propagation":"none","containsHead":true}],["/Users/adam/dev/crt/src/pages/resume.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/colophon@_@astro":"pages/colophon.astro.mjs","\u0000@astro-page:src/pages/projects@_@astro":"pages/projects.astro.mjs","\u0000@astro-page:src/pages/resume@_@astro":"pages/resume.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"index.js","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_vNCssVvH.mjs","/Users/adam/dev/crt/node_modules/unstorage/drivers/memory.mjs":"chunks/memory_DYjVIWa3.mjs","/Users/adam/dev/crt/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_YktoQUHG.mjs","/Users/adam/dev/crt/src/components/TerminalExperience.astro?astro&type=script&index=0&lang.ts":"_astro/TerminalExperience.astro_astro_type_script_index_0_lang.YPUfLxio.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/llms.txt","/robots.txt","/_astro/TerminalExperience.astro_astro_type_script_index_0_lang.YPUfLxio.js","/_astro/crt-renderer.D2wEe3NU.js","/_astro/terminal-programs.CPlVHugz.js","/_astro/three.EI7roFq3.js","/_astro/xterm.CWKXqyIO.js","/_worker.js/_@astrojs-ssr-adapter.mjs","/_worker.js/_astro-internal_middleware.mjs","/_worker.js/index.js","/_worker.js/noop-entrypoint.mjs","/_worker.js/renderers.mjs","/assets/Adam Burmister - Full Stack Engineer - Resume.pdf","/assets/adam-burmister.png","/_worker.js/chunks/BaseLayout_COwunzD0.mjs","/_worker.js/chunks/_@astrojs-ssr-adapter_Dn9XX0Wk.mjs","/_worker.js/chunks/astro-designed-error-pages_Cpol0wKV.mjs","/_worker.js/chunks/astro_C3DZpe_r.mjs","/_worker.js/chunks/image-endpoint_xfcifezz.mjs","/_worker.js/chunks/index_BuLLpcpQ.mjs","/_worker.js/chunks/memory_DYjVIWa3.mjs","/_worker.js/chunks/noop-middleware_DIruPqB4.mjs","/_worker.js/chunks/path_CH3auf61.mjs","/_worker.js/chunks/remote_CVXTZJrr.mjs","/_worker.js/chunks/sharp_YktoQUHG.mjs","/_worker.js/pages/404.astro.mjs","/_worker.js/pages/_image.astro.mjs","/_worker.js/pages/colophon.astro.mjs","/_worker.js/pages/index.astro.mjs","/_worker.js/pages/projects.astro.mjs","/_worker.js/pages/resume.astro.mjs","/assets/audio/background.mp3","/assets/audio/chill-game.mp3","/assets/audio/dialup.mp3","/assets/audio/game.mp3","/assets/content/bios.txt","/assets/content/license.txt","/assets/images/arkanoid.png","/assets/images/chess.png","/assets/images/cmd.png","/assets/images/favicon.png","/assets/images/ffplay.png","/assets/images/invaders.png","/assets/images/tetris.png","/assets/images/thumbnail.png","/assets/video/gotcha.webm","/assets/video/magic-word.webm","/_worker.js/chunks/astro/server_Bj5LOVb5.mjs","/assets/content/bbs/welcome.ans","/404.html","/colophon/index.html","/projects/index.html","/resume/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"x9zYCXgYlA9ricGPTllwwAlqZ962AOrzIjYcyFHR2Ok=","sessionConfig":{"driver":"memory"}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/memory_DYjVIWa3.mjs');

export { manifest };
