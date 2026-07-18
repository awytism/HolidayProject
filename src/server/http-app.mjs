import express from "express";
import { resolve } from "node:path";

export function createHttpApp(options) {
  const app = express();
  const moduleOptions = { fallthrough: false, setHeaders: setStaticRevalidation };
  app.disable("x-powered-by");
  app.use(pageSecurityHeaders);
  app.use("/api", options.router);
  app.use("/client", express.static(resolve(options.root, "src/client"), moduleOptions));
  app.use("/shared", express.static(resolve(options.root, "src/shared"), moduleOptions));
  app.use(express.static(resolve(options.root, "public"), { extensions: ["html"], setHeaders: setStaticRevalidation }));
  app.use((_request, response) => response.status(404).sendFile(resolve(options.root, "public/404.html")));
  return app;
}

export function setStaticRevalidation(response) {
  response.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
}

export function pageSecurityHeaders(_request, response, next) {
  response.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' https://fonts.gstatic.com",
    "frame-ancestors 'none'",
    "img-src 'self' https: data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
  ].join("; "));
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  next();
}
