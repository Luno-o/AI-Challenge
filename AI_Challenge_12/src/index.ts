import 'dotenv/config';
import express from 'express';
import { router as chatRouter } from './routes/chat';

const app = express();
app.use(express.json());

app.use('/api', chatRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`perplexity-chat listening on port ${port}`);
});
