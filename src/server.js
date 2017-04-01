const http = require("http");
const createDebug = require('debug');
const chalk = require('chalk');
const Handler = require("./handlers");
const Library = require("./library");

const debug = createDebug('nails:server');
const warn = createDebug('nails:WARNING');
const log = createDebug('nails');

exports = module.exports = class Server {
  constructor(config) {
    this.handler = new Handler(config);
    this.config = config;
  }
  /* istanbul ignore next */run() {
    this.handler.ready.then(this._run.bind(this));
  }
  /* istanbul ignore next */_run() {
    debug('starting server...');
    const iface = this.config.server_interface;
    const port = this.config.server_port;
    const server = http.createServer(this._handleRequest.bind(this));

    server.listen(port, iface, () => {
      log("Nails server listening on " + iface + ":" + port);
    });
  }
  _handleRequest(req, res) {
    log(req.method, chalk.underline(req.url), `HTTP/${req.httpVersion}`);

    const requestHandler = this.handler.getHandler(req);
    if (requestHandler) {
      const library = new Library();
      const prom = requestHandler.call(library.context, req);
      Promise.resolve(prom).then(() => {
        let opts = library.requestData;

        // istanbul ignore else
        if (opts != null) {
          if (opts.redirect_to) {
            res.writeHead(302, {
              location: opts.redirect_to,
              'Turbolinks-Location': opts.redirect_to
            });
            res.end();
          }
          else {
            opts = Object.assign(opts, { routes: this.handler.routes });
            Handler.renderer(req, res, opts);
          }
        }
      });
    }
    else {
      Handler.getStaticContent("404.html", this.config).then(customErrorPage => {
        if (customErrorPage) {
          res.statusCode = 404;
          Handler.renderer(req, res, {
            routes: this.handler.routes,
            content: customErrorPage
          });
        }
        else {
          Handler.renderer(req, res, {
            status: 404,
            text: 'Not Found'
          });
        }
        log('404 at', req.url);
      }).catch(warn);
    }
  }
};
