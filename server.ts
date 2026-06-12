import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes here
  app.post("/api/webhooks/:gateway", async (req, res) => {
    // In a real app, verify signature (e.g. req.headers['stripe-signature'])
    const { gateway } = req.params;
    const event = req.body;
    
    console.log(`Received ${gateway} webhook:`, event);
    
    // Simulate webhook processing
    // To update firestore from here we'd normally use firebase-admin
    // For this prototype, we'll return 200 to acknowledge.
    // The frontend/tests will trigger the update via another endpoint /api/simulate-payment-success
    // which emulates the webhook's effect on DB.
    res.json({ received: true });
  });

  // Simulated Webhook Processor for Preview Environment
  app.post("/api/simulate-payment-success", async (_req, res) => {
    // We would use firebase-admin here
    // To keep the workspace pure, we just acknowledge the simulation
    res.json({ success: true, message: "Webhook processed" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
