import { app } from './app';
import { env } from './config/env';
import './config/redis'; // initialize the Redis connection

app.listen(env.PORT);

console.log('Server is running on port', env.PORT);
