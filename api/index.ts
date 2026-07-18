import express from 'express';

const wrapperApp = express();

wrapperApp.use(async (req, res, next) => {
  try {
    const { app } = await import('../server');
    app(req, res, next);
  } catch (e: any) {
    res.status(500).json({
      error: "Startup Crash",
      message: e.message,
      stack: e.stack
    });
  }
});

export default wrapperApp;
