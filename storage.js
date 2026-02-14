// Advanced Storage System: IndexedDB + localStorage fallback
// Version: 1.0

const DEBUG = false; // Set to false in production

const logger = {
    log: (...args) => DEBUG && console.log('[Storage]', ...args),
    warn: (...args) => DEBUG && console.warn('[Storage]', ...args),
    error: (...args) => console.error('[Storage]', ...args)
};

class IndexedDBStorage {
    constructor(dbName = 'SahsiHesapDB', storeName = 'data', version = 1) {
        this.dbName = dbName;
        this.storeName = storeName;
        this.version = version;
        this.db = null;
        this.ready = false;
        this.initPromise = this.init();
    }

    async init() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = () => {
                    logger.error('IndexedDB open failed:', request.error);
                    reject(request.error);
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    this.ready = true;
                    logger.log('IndexedDB initialized successfully');
                    resolve(this.db);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        db.createObjectStore(this.storeName);
                        logger.log('Object store created:', this.storeName);
                    }
                    // Create syncQueue for background sync
                    if (!db.objectStoreNames.contains('syncQueue')) {
                        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
                        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                        logger.log('Sync queue object store created');
                    }
                };
            });
        } catch (error) {
            logger.error('IndexedDB initialization failed:', error);
            throw error;
        }
    }

    async getItem(key) {
        try {
            await this.initPromise;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    logger.log('Retrieved:', key, request.result !== undefined);
                    resolve(request.result);
                };

                request.onerror = () => {
                    logger.error('Get failed for key:', key);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('getItem error:', error);
            return null;
        }
    }

    async setItem(key, value) {
        try {
            await this.initPromise;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.put(value, key);

                request.onsuccess = () => {
                    logger.log('Stored:', key);
                    resolve();
                };

                request.onerror = () => {
                    logger.error('Set failed for key:', key);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('setItem error:', error);
        }
    }

    async removeItem(key) {
        try {
            await this.initPromise;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(key);

                request.onsuccess = () => {
                    logger.log('Removed:', key);
                    resolve();
                };

                request.onerror = () => {
                    logger.error('Remove failed for key:', key);
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('removeItem error:', error);
        }
    }

    async clear() {
        try {
            await this.initPromise;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    logger.log('Cleared all data');
                    resolve();
                };

                request.onerror = () => {
                    logger.error('Clear failed');
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('clear error:', error);
        }
    }

    async getAllKeys() {
        try {
            await this.initPromise;
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.getAllKeys();

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = () => {
                    reject(request.error);
                };
            });
        } catch (error) {
            logger.error('getAllKeys error:', error);
            return [];
        }
    }
}

// Hybrid Storage: IndexedDB with localStorage fallback
class HybridStorage {
    constructor() {
        this.useIndexedDB = this.checkIndexedDBSupport();
        this.storage = null;
        this.ready = false;

        if (this.useIndexedDB) {
            this.storage = new IndexedDBStorage();
            this.storage.initPromise.then(() => {
                this.ready = true;
                logger.log('Using IndexedDB');
            }).catch(() => {
                logger.warn('IndexedDB failed, falling back to localStorage');
                this.useIndexedDB = false;
                this.storage = this.createLocalStorageWrapper();
                this.ready = true;
            });
        } else {
            logger.log('Using localStorage (IndexedDB not supported)');
            this.storage = this.createLocalStorageWrapper();
            this.ready = true;
        }
    }

    checkIndexedDBSupport() {
        try {
            return typeof indexedDB !== 'undefined' && indexedDB !== null;
        } catch (e) {
            return false;
        }
    }

    createLocalStorageWrapper() {
        return {
            async getItem(key) {
                try {
                    return localStorage.getItem(key);
                } catch (e) {
                    logger.error('localStorage getItem failed:', e);
                    return null;
                }
            },
            async setItem(key, value) {
                try {
                    localStorage.setItem(key, value);
                } catch (e) {
                    logger.error('localStorage setItem failed:', e);
                }
            },
            async removeItem(key) {
                try {
                    localStorage.removeItem(key);
                } catch (e) {
                    logger.error('localStorage removeItem failed:', e);
                }
            },
            async clear() {
                try {
                    localStorage.clear();
                } catch (e) {
                    logger.error('localStorage clear failed:', e);
                }
            },
            async getAllKeys() {
                try {
                    return Object.keys(localStorage);
                } catch (e) {
                    logger.error('localStorage getAllKeys failed:', e);
                    return [];
                }
            }
        };
    }

    async waitForReady() {
        if (this.ready) return;
        if (this.useIndexedDB && this.storage) {
            await this.storage.initPromise;
        }
        this.ready = true;
    }

    async getItem(key) {
        await this.waitForReady();
        return this.storage.getItem(key);
    }

    async setItem(key, value) {
        await this.waitForReady();
        return this.storage.setItem(key, value);
    }

    async removeItem(key) {
        await this.waitForReady();
        return this.storage.removeItem(key);
    }

    async clear() {
        await this.waitForReady();
        return this.storage.clear();
    }

    async getAllKeys() {
        await this.waitForReady();
        return this.storage.getAllKeys();
    }
}

// Migration: localStorage → IndexedDB
async function migrateFromLocalStorage() {
    try {
        logger.log('Starting migration from localStorage to IndexedDB...');

        const migrationKey = '__migration_completed__';
        const migrationCheck = localStorage.getItem(migrationKey);

        if (migrationCheck === 'true') {
            logger.log('Migration already completed, skipping...');
            return;
        }

        const db = new IndexedDBStorage();
        await db.initPromise;

        const keysToMigrate = [
            'sahsiHesapTakibiData',
            'sahsiHesapTakibiNotifications'
        ];

        let migratedCount = 0;
        for (const key of keysToMigrate) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                await db.setItem(key, value);
                migratedCount++;
                logger.log(`Migrated: ${key}`);
            }
        }

        // Mark migration as complete
        localStorage.setItem(migrationKey, 'true');
        logger.log(`Migration completed! ${migratedCount} items migrated.`);

    } catch (error) {
        logger.error('Migration failed:', error);
    }
}

// Initialize and export
const advancedStorage = new HybridStorage();

// Auto-migrate on first load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        migrateFromLocalStorage();
    });
}
