#!/usr/bin/env node
import express from "express";
import path from "path";
import fs from "fs";
import { registerRoutes } from "./routes.js";

const app = express();

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit", 
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  try {
    log("🌟 Initializing Goose Alpha Trading Bot...");
    
    // Trust Railway's proxy
    app.set("trust proxy", 1);
    
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Standard security headers
    app.use((_req, res, next) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("X-Frame-Options", "DENY");
      res.setHeader("X-XSS-Protection", "1; mode=block");
      next();
    });

    log("🔗 Registering API routes...");
    const server = await registerRoutes(app);
    log("✅ Routes registered successfully");

    // Simple static file serving for production
    log("📁 Setting up production static file serving...");
    try {
      const publicPath = path.resolve(process.cwd(), "dist/public");
      if (fs.existsSync(publicPath)) {
        app.use(express.static(publicPath));
        app.get("*", (_req, res) => {
          res.sendFile(path.join(publicPath, "index.html"));
        });
        log(`✅ Static files served from: ${publicPath}`);
      } else {
        log(`⚠️ Static directory not found: ${publicPath}, API-only mode`);
      }
    } catch (staticError: any) {
      log(`⚠️ Static serving issue: ${staticError?.message || 'Unknown'}, continuing API-only`);
    }

    // Error handling middleware
    app.use((err: any, _req: any, res: any, next: any) => {
      if (res.headersSent) {
        return next(err);
      }
      const message = err?.message || "Something went wrong!";
      const status = err?.status || 500;
      log(`❌ Error ${status}: ${message}`);
      res.status(status).json({ message });
    });

    const port = Number(process.env.PORT) || 5000;
    
    log("🚀 Starting Goose Alpha Bot...");
    log(`🔧 Environment: PORT=${port}, NODE_ENV=${process.env.NODE_ENV || 'production'}`);
    log(`📁 Working directory: ${process.cwd()}`);
    log(`🏠 Platform: ${process.platform}, Arch: ${process.arch}`);
    log(`📦 Node version: ${process.version}`);

    server.listen(port, "0.0.0.0", () => {
      log(`✅ Server successfully started on port ${port}`);
      log(`🔗 Health check available at: http://0.0.0.0:${port}/api/health`);
    });

    // Graceful shutdown
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