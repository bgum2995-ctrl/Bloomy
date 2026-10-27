// Файлы анализов храним в IndexedDB: localStorage для них слишком мал.
const DB = 'bloomy-files';
const STORE = 'tests';

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

export const listTests = () => run('readonly', (s) => s.getAll());
export const getTest = (id) => run('readonly', (s) => s.get(id));
export const saveTest = (item) => run('readwrite', (s) => s.put(item));
export const deleteTest = (id) => run('readwrite', (s) => s.delete(id));
