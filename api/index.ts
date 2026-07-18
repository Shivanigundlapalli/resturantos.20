export default async function handler(req: any, res: any) {
  try {
    // Dynamic import to catch load errors
    const { app } = await import('../server.js');
    
    // Wrap Express execution in a Promise so Vercel waits for the response
    await new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('error', reject);
      app(req, res);
    });
  } catch (e: any) {
    console.error("Startup Crash:", e);
    res.status(500).json({ error: "Startup Crash", message: e.message, stack: e.stack });
  }
}
