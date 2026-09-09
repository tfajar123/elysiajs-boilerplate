import { Elysia } from 'elysia';

new Elysia().get('/', 'hello').get('/world', 'world').listen(3000);
