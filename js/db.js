// db.js — IndexedDB wrapper

const DB_NAME = 'BillingAppDB';
const DB_VERSION = 1;

let _db = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (_db) return resolve(_db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Clients store
            if (!db.objectStoreNames.contains('clients')) {
                const clientStore = db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
                clientStore.createIndex('name', 'name', { unique: false });
            }

            // Bills store
            if (!db.objectStoreNames.contains('bills')) {
                const billStore = db.createObjectStore('bills', { keyPath: 'id', autoIncrement: true });
                billStore.createIndex('clientName', 'clientName', { unique: false });
                billStore.createIndex('billNumber', 'billNumber', { unique: true });
                billStore.createIndex('date', 'date', { unique: false });
            }

            // Settings store (key-value pairs)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'key' });
            }
        };

        request.onsuccess = (event) => {
            _db = event.target.result;
            resolve(_db);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Generic helpers
function dbGet(storeName, id) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).get(id);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbGetAll(storeName) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbAdd(storeName, data) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).add(data);
        req.onsuccess = () => resolve(req.result); // returns new id
        req.onerror = () => reject(req.error);
    }));
}

function dbPut(storeName, data) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).put(data);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

function dbDelete(storeName, id) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

// --- Clients ---
const ClientDB = {
    getAll: () => dbGetAll('clients'),
    get: (id) => dbGet('clients', id),
    add: (client) => dbAdd('clients', client),
    update: (client) => dbPut('clients', client),
    delete: (id) => dbDelete('clients', id),
};

// --- Bills ---
const BillDB = {
    getAll: () => dbGetAll('bills'),
    get: (id) => dbGet('bills', id),
    add: (bill) => dbAdd('bills', bill),
    update: (bill) => dbPut('bills', bill),
    delete: (id) => dbDelete('bills', id),

    getNextBillNumber: async () => {
        const bills = await dbGetAll('bills');
        if (bills.length === 0) return generateBillNumber(0);
        const nums = bills.map(b => parseInt(b.billNumber, 10)).filter(n => !isNaN(n));
        const max = Math.max(...nums);
        return generateBillNumber(max);
    },
};

// --- Settings ---
const SettingsDB = {
    get: async (key) => {
        const row = await dbGet('settings', key);
        return row ? row.value : null;
    },
    set: (key, value) => dbPut('settings', { key, value }),
    getContractor: async () => {
        const data = await dbGet('settings', 'contractor');
        return data ? data.value : {
            name: 'Your Garage Name',
            address: 'Your Address, City',
            phone: '9999999999',
        };
    },
    setContractor: (contractorData) => dbPut('settings', { key: 'contractor', value: contractorData }),

    // Bill layout preferences
    getBillLayout: async () => {
        const data = await dbGet('settings', 'billLayout');
        return data ? data.value : {
            subtitle: 'Vehicle Repair Contractor',
            headerColor: '#3d2b00',
            showVehicleInfo: true,
            showClientPhone: true,
            showClientAddress: true,
            showStampArea: true,
            showThankYou: false,
            footerNote: '',
        };
    },
    setBillLayout: (layout) => dbPut('settings', { key: 'billLayout', value: layout }),
};
