import assert from 'node:assert/strict';
import { isCorsOriginAllowed } from '../src/config/security';

const configured = ['https://noc.infrafield.example'];

assert.equal(isCorsOriginAllowed('http://localhost:5173', {
  nodeEnv: 'development', allowedOrigins: [...configured, 'http://localhost:5173', 'http://127.0.0.1:5173'],
}), true);
assert.equal(isCorsOriginAllowed('http://127.0.0.1:5173', {
  nodeEnv: 'development', allowedOrigins: [...configured, 'http://localhost:5173', 'http://127.0.0.1:5173'],
}), true);
assert.equal(isCorsOriginAllowed('https://turned-pursuant-sci-soon.trycloudflare.com', {
  nodeEnv: 'development', allowedOrigins: configured,
}), true);
assert.equal(isCorsOriginAllowed('https://qualquer-subdominio.trycloudflare.com', {
  nodeEnv: 'development', allowedOrigins: configured,
}), true);
assert.equal(isCorsOriginAllowed('https://trycloudflare.com.evil.example', {
  nodeEnv: 'development', allowedOrigins: configured,
}), false);
assert.equal(isCorsOriginAllowed('https://evil.example/trycloudflare.com', {
  nodeEnv: 'development', allowedOrigins: configured,
}), false);
assert.equal(isCorsOriginAllowed('http://tunnel.trycloudflare.com', {
  nodeEnv: 'development', allowedOrigins: configured,
}), false);
assert.equal(isCorsOriginAllowed('https://tunnel.trycloudflare.com', {
  nodeEnv: 'production', allowedOrigins: configured,
}), false);
assert.equal(isCorsOriginAllowed('https://tunnel.trycloudflare.com', {
  nodeEnv: 'production', allowedOrigins: [...configured, 'https://tunnel.trycloudflare.com'],
}), true);
assert.equal(isCorsOriginAllowed('https://unknown.example', {
  nodeEnv: 'development', allowedOrigins: configured,
}), false);

console.log('InfraField CORS tests: OK');
