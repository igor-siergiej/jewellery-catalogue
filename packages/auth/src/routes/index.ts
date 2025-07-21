import Router from 'koa-router';
import { login } from './login';
import { register } from './register';
import { verify } from './verify';
import { refresh } from './refresh';
import { logout } from './logout';

const router = new Router();

router.post('/login', login);
router.post('/register', register);
router.get('/verify', verify);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
