import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Production optimizations for Railway
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // Trust Railway's proxy
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  log(`🌟 Initializing Goose Alpha Trading Bot...`);
  
  try {
    const server = await registerRoutes(app);
    log(`✅ Routes registered successfully`);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Temporary simplified static serving for Railway
    log(`📁 Setting up production static file serving...`);
    try {
      // Simplified static serving without problematic path resolution
      app.use(express.static("dist/public"));
      app.get("*", (_req, res) => {
        res.sendFile("index.html", { root: "dist/public" });
      });
      log(`✅ Static file serving configured`);
    } catch (staticError: any) {
      log(`⚠️ Static serving issue: ${staticError?.message || 'Unknown'}, continuing without static files`);
      // Continue without static files - API will still work
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Railway debugging
  log(`🚀 Starting Goose Alpha Bot on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
  log(`🔧 Environment variables: PORT=${process.env.PORT}, NODE_ENV=${process.env.NODE_ENV}`);
  log(`📁 Working directory: ${process.cwd()}`);
  log(`🏠 Platform: ${process.platform}, Arch: ${process.arch}`);
  log(`📦 Node version: ${process.version}`);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`✅ Server successfully started on port ${port}`);
    log(`🔗 Health check available at: http://0.0.0.0:${port}/api/health`);
  });
    
    // Graceful shutdown for Railway
    process.on("SIGTERM", () => {
      log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        log("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      log("SIGINT received, shutting down gracefully");
      server.close(() => {
        log("Process terminated");
        process.exit(0);
      });
    });
    
  } catch (error: any) {
    log(`❌ Failed to start server: ${error?.message || 'Unknown error'}`);
    console.error('Detailed error:', error);
    process.exit(1);
  }
})();
