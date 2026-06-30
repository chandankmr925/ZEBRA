/** Vite dev-server middleware — portfolio + live market APIs */

import { handlePortfolioApi } from './portfolioApi.js';
import { handleMarketApi } from './marketApi.js';

export function portfolioApiPlugin() {
  return {
    name: 'portfolio-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (url.startsWith('/api/portfolio')) {
          handlePortfolioApi(req, res);
          return;
        }
        if (url.startsWith('/api/market')) {
          handleMarketApi(req, res);
          return;
        }
        next();
      });
    },
  };
}
