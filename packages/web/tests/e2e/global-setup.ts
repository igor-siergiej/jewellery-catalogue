import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const KIVO_PORT = 3008;
const ALLOWED_ORIGIN = 'http://localhost:3000';

const makePart = (obj: object | string) =>
    Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj)).toString('base64');

function makeMockToken(username: string): string {
    const id = `e2e${username.slice(0, 8).padEnd(8, '0')}00000000000`;
    return [
        makePart({ alg: 'HS256', typ: 'JWT' }),
        makePart({ username, id, catalogueId: `${id.slice(0, -1)}7`, exp: 9999999999, iat: 1700000000 }),
        makePart('mock-signature'),
    ].join('.');
}

function setCors(res: ServerResponse) {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function readBody(req: IncomingMessage): Promise<Record<string, string>> {
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(data));
            } catch {
                resolve({});
            }
        });
    });
}

export default async function globalSetup(): Promise<() => void> {
    const registeredUsers = new Map<string, string>();

    const server = createServer(async (req, res) => {
        setCors(res);
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ status: 'healthy', service: 'kivo' }));
            return;
        }

        if (req.method === 'POST' && req.url === '/register') {
            const { username, password } = await readBody(req);
            if (registeredUsers.has(username)) {
                res.writeHead(409);
                res.end(JSON.stringify({ message: 'Username already taken' }));
                return;
            }
            registeredUsers.set(username, password);
            const token = makeMockToken(username);
            res.writeHead(200);
            res.end(JSON.stringify({ accessToken: token, user: { id: `e2e-${username}`, username } }));
            return;
        }

        if (req.method === 'POST' && req.url === '/login') {
            const { username, password } = await readBody(req);
            if (!registeredUsers.has(username) || registeredUsers.get(username) !== password) {
                res.writeHead(401);
                res.end(JSON.stringify({ message: 'Invalid credentials' }));
                return;
            }
            const token = makeMockToken(username);
            res.writeHead(200);
            res.end(JSON.stringify({ accessToken: token, user: { id: `e2e-${username}`, username } }));
            return;
        }

        if (req.method === 'POST' && req.url === '/refresh') {
            // Return 401 — tests start with cleared auth state and no valid refresh token
            res.writeHead(401);
            res.end(JSON.stringify({ message: 'No refresh token' }));
            return;
        }

        if (req.method === 'POST' && req.url === '/logout') {
            res.writeHead(200);
            res.end(JSON.stringify({ message: 'Logout successful' }));
            return;
        }

        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    });

    await new Promise<void>((resolve) => server.listen(KIVO_PORT, resolve));

    return () => {
        server.close();
    };
}
