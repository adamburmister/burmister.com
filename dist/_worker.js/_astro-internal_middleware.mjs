globalThis.process ??= {}; globalThis.process.env ??= {};
import './chunks/astro-designed-error-pages_Cpol0wKV.mjs';
import './chunks/astro/server_Bj5LOVb5.mjs';
import { s as sequence } from './chunks/index_BuLLpcpQ.mjs';

const onRequest$1 = (context, next) => {
  if (context.isPrerendered) {
    context.locals.runtime ??= {
      env: process.env
    };
  }
  return next();
};

const onRequest = sequence(
	onRequest$1,
	
	
);

export { onRequest };
