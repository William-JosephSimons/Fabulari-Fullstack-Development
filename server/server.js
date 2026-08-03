import http from 'http';
import cors from 'cors';
import express from 'express';
import { routes } from './routes.js';

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(cors());
app.use(express.json());

routes(app);

server.listen(port, () => {
  console.log(`Fabulari server listening on port ${port}`);
});
