import logger from '../config/logger.js';

// In-memory registry of active SSE clients per opId
const clients = new Map(); // opId -> Set<res>

function ensureSet(opId) {
    if (!clients.has(opId)) {
        clients.set(opId, new Set());
    }
    return clients.get(opId);
}

export function sseHandler(req, res) {
    const { opId } = req.params;
    if (!opId) {
        res.status(400).end('Missing opId');
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const set = ensureSet(opId);
    set.add(res);

    // Send initial open event
    res.write(`event: open\n`);
    res.write(`data: {"opId":"${opId}"}\n\n`);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
        try { res.write(`: heartbeat\n\n`); } catch (e) { /* noop */ }
    }, 15000);

    req.on('close', () => {
        clearInterval(heartbeat);
        set.delete(res);
        if (set.size === 0) clients.delete(opId);
    });
}

function broadcast(opId, event, data) {
    const set = clients.get(opId);
    if (!set || set.size === 0) return;
    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    for (const res of set) {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${payload}\n\n`);
        } catch (err) {
            logger.warn(`SSE write failed for opId=${opId}: ${err.message}`);
        }
    }
}

export function emitProgress(opId, message, extra = {}) {
    if (!opId) return; // optional
    broadcast(opId, 'progress', { message, ...extra });
}

export function emitDone(opId, summary = {}) {
    if (!opId) return;
    broadcast(opId, 'done', { done: true, ...summary });
} 