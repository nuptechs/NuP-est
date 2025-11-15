import type { Options, Filter } from 'http-proxy-middleware';
import type { ClientRequest } from 'http';
import type { Request, Response } from 'express';

export interface ProxyConfig extends Options {
  onProxyReq?: (
    proxyReq: ClientRequest,
    req: Request,
    res: Response
  ) => void;
  onError?: (
    err: Error,
    req: Request,
    res: Response
  ) => void;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  filter?: Filter;
}
