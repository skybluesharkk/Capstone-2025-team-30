import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as morgan from 'morgan';
import signaling from './signaling';
import { log, LogLevel } from './log';
import Options from './class/options';
import { reset as resetHandler }from './class/httphandler';

const cors = require('cors');

export const createServer = (config: Options): express.Application => {
  const app: express.Application = express();
  resetHandler(config.mode);
  // logging http access
  if (config.logging != "none") {
    app.use(morgan(config.logging));
  }
  // const signal = require('./signaling');
  app.use(cors({origin: '*'}));
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.get('/config', (req, res) => res.json({ useWebSocket: config.type == 'websocket', startupMode: config.mode, logging: config.logging }));
  app.use('/signaling', signaling);
  
  // 환경에 따른 정적 파일 서빙
  const isDeployTest = process.env.DEPLOY_TEST === 'true';
  
  if (isDeployTest) {
    // 배포 테스트용: deploy-test 폴더의 HTML 서빙
    app.use(express.static(path.join(__dirname, '../deploy-test')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../deploy-test/index.html'));
    });
    log(LogLevel.info, '🚀 Running in DEPLOY TEST mode - Single server deployment');
  } else {
    // 개발용: 기존 방식
    app.use(express.static(path.join(__dirname, '../client/public')));
    app.use('/module', express.static(path.join(__dirname, '../client/src')));
    app.get('/', (req, res) => {
      const indexPagePath: string = path.join(__dirname, '../client/public/index.html');
      fs.access(indexPagePath, (err) => {
        if (err) {
          log(LogLevel.warn, `Can't find file ' ${indexPagePath}`);
          res.status(404).send(`Can't find file ${indexPagePath}`);
        } else {
          res.sendFile(indexPagePath);
        }
      });
    });
    log(LogLevel.info, '💻 Running in DEVELOPMENT mode - Separate React dev server');
  }
  return app;
};
