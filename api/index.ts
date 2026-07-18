import { appPromise } from '../server';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const app = await appPromise;
    return app(req as any, res as any);
  } catch (err: any) {
    console.error("Vercel Serverless Error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Vercel Serverless Handler Failed", 
      error: err.message || String(err)
    });
  }
}
