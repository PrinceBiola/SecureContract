import * as Y from 'yjs';
import redis from './redis.js';

const docs = new Map<string, Y.Doc>();

/**
 * loads a Yjs document from Redis or creates a new one
 */
export async function getYjsDoc(docId: string, gc: boolean = true): Promise<Y.Doc> {
    if (docs.has(docId)) {
        return docs.get(docId)!;
    }

    const doc = new Y.Doc({ gc });
    const stored = await redis.getBuffer(`yjs:doc:${docId}`);

    if (stored) {
        Y.applyUpdate(doc, new Uint8Array(stored));
    }

    docs.set(docId, doc);

    // Auto-save logic can be improved (e.g. debounced save)
    doc.on('update', async (update) => {
        // In a real app, you might want to debounce this or use a queue
        // For now, we just append updates to a list or simple overwrite (overwrite is riskier for concurrency but simpler for demo)
        // Better approach: Store updates in a list and merge periodically, or just overwrite if single instance.

        // Since we are single instance for now:
        const state = Y.encodeStateAsUpdate(doc);
        await redis.set(`yjs:doc:${docId}`, Buffer.from(state));
    });

    // Cleanup if unused for a long time? 
    // For this demo we keep them in memory

    return doc;
}

export async function createYjsDoc(docId: string) {
    const doc = new Y.Doc();
    const state = Y.encodeStateAsUpdate(doc);
    await redis.set(`yjs:doc:${docId}`, Buffer.from(state));
    return doc;
}
