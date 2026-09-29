import { NextFunction, Request, Response } from "express";

/**
 * Express 4 does not catch rejected promises from async handlers — an
 * uncaught rejection inside one becomes a process-level unhandledRejection,
 * which crashes the whole Node process (bot included) by default. Wrap
 * every async route/middleware with this so errors reach Express's error
 * handler instead.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
