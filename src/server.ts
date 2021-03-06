/**
 * application
 * @name log.io-ts
 * @author xialeistudio<xialeistudio@gmail.com>
 * @date 2017/9/29
 */
import * as http from 'http';
import * as Koa from 'koa';
import * as koaStatic from 'koa-static';
import * as koaViews from 'koa-views';
import * as io from 'socket.io';
import logger from './common/logger';
import siteRoute from './routes/site';

interface IBootstrapOptions {
  host: string;
  port: number;
  password: string;
}

export default class Server {
  /**
   * bootstrap the server
   * @param {IBootstrapOptions} options
   * @returns {Application}
   */
  public static bootstrap(options: IBootstrapOptions) {
    return new Server(options);
  }

  private app: Koa;
  private server: http.Server;
  private io: SocketIO.Server;
  private options: IBootstrapOptions;

  constructor(options: IBootstrapOptions) {
    this.options = options;
    this.app = new Koa();
    // middlewares
    this.app.use(koaStatic(__dirname + '/../static'));
    this.app.use(koaViews(__dirname + '/../views', { extension: 'ejs' }));
    // routes
    const site = siteRoute(this.options.password);
    this.app.use(site.routes()).use(site.allowedMethods());
    // start app
    this.server = this.app.listen(this.options.port!, this.options.host, () => {
      logger.info(`http startup on ${this.server.address().address}:${this.server.address().port}`);
      this.startupSocketIo();
    });
  }

  private startupSocketIo() {
    // 启动socket.io
    this.io = io(this.server, { transports: ['websocket', 'polling'] });
    this.io.of('/log').on('connection', (socket) => {
      socket.on('log', (node: string, message: any) => {
        logger.info(node, message);
        this.io.of('/administrator').emit('log', node, message);
      });
      socket.emit('ready');
    });
    // ready for client
    this.io.of('/administrator').on('connection', (socket) => {
      socket.emit('ready');
    });
    logger.info(`socket.io startup`);
  }
}
