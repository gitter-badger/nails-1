const chalk = require('chalk');
const debug = require('./util')('router');

const methods = 'get head post put delete patch'.split(' ');

const bind = (function () {
  function bind(...keys) {
    keys.forEach(key => {
      this[key] = this[key].bind(this);
    });
  }
  return bind.call.bind(bind);
})();

exports = module.exports = class Router {
  constructor() {
    this.scopes = [];
    this.routes = [];
    debug('creating router');
    methods.forEach(method => {
      this[method] = this.request.bind(this, method);
    });
    bind(this, ...methods, 'request', 'ws');
    bind(this, 'scope', '_url', 'debug');
  }

  debug(...args) {
    if (this.scopes.length === 0) {
      debug(...args);
    } else {
      debug('  '.repeat(this.scopes.length).slice(0, -1), ...args);
    }
  }
  static draw(f) {
    const router = new this();
    router.debug('drawing routes...');
    f.call(router, router);
    router.debug('drew', router.routes.length, 'routes.');
    return router.routes;
  }

  request(method, path, to, options) {
    options = this._processOptions(to, options);
    options.to = this._pathToJS(options.to, path);
    method = method.toUpperCase();
    const route = Object.assign({
      type: method,
      url: this._url(path),
    }, options);
    this.routes.push(route);
    this.debug('created', method === 'GET' ? chalk.gray(method) : chalk.bold(method), 'route', chalk.underline(path) || chalk.gray('<root>'), 'to', chalk.bold(options.to));
    return route;
  }
  scope(...args) {
    const scopes = args.slice(0, -1);
    const f = args[args.length - 1];
    this.debug('entering scope', chalk.underline(scopes.join('/')));
    this.scopes = this.scopes.concat(scopes);
    f.call(this, this);
    this.scopes.length -= scopes.length;
    this.debug('leaving scope', chalk.underline(scopes.join('/')));
  }

  ws(path, to, options) {
    options = this._processOptions(to, options);
    options.to = this._pathToJS(options.to, path);
    const route = Object.assign({
      ws: true,
      url: this._url(path),
    }, options);
    this.routes.push(route);
    this.debug('created websocket channel', chalk.underline(path) || chalk.gray('<root>'), 'to', chalk.bold(options.to));
    return route;
  }

  _processOptions(to, options) {
    if (typeof to === 'object' && !options) {
      options = to;
    } else {
      options = options || {};
      options.to = to;
    }
    return options;
  }
  _url(path) {
    return `${this.scopes.length > 0 ? '/' : ''}${this.scopes.join('/')}${path.length > 0 && path !== '/' ? '/' : ''}${path}` || '/';
  }
  _pathToJS(name, path) {
    if (path.endsWith('/')) {
      path += 'index';
    }
    if (!name || name.length === 0) {
      name = path.replace(/^\//, '').replace(/\//g, '.');
    }
    if (this.scopes.length > 0) {
      if (name) {
        return `${this.scopes.join('.')}.${name}`;
      }
      return this.scopes.join('.');
    }
    return name;
  }
};
