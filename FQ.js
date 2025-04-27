class FqCrypto {
    constructor(key) {
        this.key = this.hexToBytes(key);
        if (this.key.length !== 16) {
            throw new Error(`Invalid key length! Expected 16 bytes, got ${this.key.length}`);
        }
        this.cipherMode = { name: 'AES-CBC' };
    }
 
    hexToBytes(hex) {
        const bytes = [];
        for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substr(i, 2), 16));
        }
        return new Uint8Array(bytes);
    }
 
    bytesToHex(bytes) {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
 
    async encrypt(data, iv) {
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            this.key,
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv },
            cryptoKey,
            this.pkcs7Pad(data)
        );
        return new Uint8Array(encrypted);
    }
 
    async decrypt(data) {
        const iv = data.slice(0, 16);
        const ct = data.slice(16);
        const cryptoKey = await crypto.subtle.importKey(
            'raw',
            this.key,
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv },
            cryptoKey,
            ct
        );
        return this.pkcs7Unpad(new Uint8Array(decrypted));
    }
 
    pkcs7Pad(data) {
        const blockSize = 16;
        const padding = blockSize - (data.length % blockSize);
        const padded = new Uint8Array(data.length + padding);
        padded.set(data);
        for (let i = data.length; i < padded.length; i++) {
            padded[i] = padding;
        }
        return padded;
    }
 
    pkcs7Unpad(data) {
        const padding = data[data.length - 1];
        if (padding > 16) return data;
        for (let i = data.length - padding; i < data.length; i++) {
            if (data[i] !== padding) return data;
        }
        return data.slice(0, data.length - padding);
    }
 
    async generateRegisterContent(deviceId, strVal = "0") {
        if (!/^\d+$/.test(deviceId) || !/^\d+$/.test(strVal)) {
            throw new Error("Invalid device ID or value");
        }
        const deviceIdBytes = new Uint8Array(8);
        const deviceIdNum = BigInt(deviceId);
        for (let i = 0; i < 8; i++) {
            deviceIdBytes[i] = Number((deviceIdNum >> BigInt(i * 8)) & BigInt(0xFF));
        }
        const strValBytes = new Uint8Array(8);
        const strValNum = BigInt(strVal);
        for (let i = 0; i < 8; i++) {
            strValBytes[i] = Number((strValNum >> BigInt(i * 8)) & BigInt(0xFF));
        }
        const combined = new Uint8Array([...deviceIdBytes, ...strValBytes]);
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const encrypted = await this.encrypt(combined, iv);
        const result = new Uint8Array([...iv, ...encrypted]);
        return btoa(String.fromCharCode(...result));
    }
}
 
// API Client class
class FqClient {
    constructor(config) {
        this.config = config;
        this.crypto = new FqCrypto(config.REG_KEY);
        this.dynamicKey = null;
        this.keyExpireTime = 0;
    }
 
    async getContentKeys(itemIds) {
        const itemIdsStr = Array.isArray(itemIds) ? itemIds.join(',') : itemIds;
        return this._apiRequest(
            "GET",
            "/reading/reader/batch_full/v",
            {
                item_ids: itemIdsStr,
                req_type: "1",
                aid: this.config.AID,
                update_version_code: this.config.VERSION_CODE
            }
        );
    }
 
    async getDecryptionKey() {
        const now = Date.now();
        if (this.dynamicKey && this.keyExpireTime > now) {
            return this.dynamicKey;
        }
        const content = await this.crypto.generateRegisterContent(this.config.SERVER_DEVICE_ID);
        const payload = {
            content: content,
            keyver: 1
        };
        const result = await this._apiRequest(
            "POST",
            "/reading/crypt/registerkey",
            { aid: this.config.AID },
            payload
        );
        const encryptedKey = Uint8Array.from(atob(result.data.key), c => c.charCodeAt(0));
        const decryptedKey = await this.crypto.decrypt(encryptedKey);
        this.dynamicKey = this.crypto.bytesToHex(decryptedKey);
        this.keyExpireTime = now + 3600000;
        return this.dynamicKey;
    }
 
    async _apiRequest(method, endpoint, params = {}, data = null) {
        const url = new URL(`https://api5-normal-sinfonlineb.fqnovel.com${endpoint}`);
        Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
        const headers = {
            "Cookie": `install_id=${this.config.INSTALL_ID}`,
            "User-Agent": "okhttp/4.9.3"
        };
        if (data) {
            headers["Content-Type"] = "application/json";
        }
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url.toString(),
                headers: headers,
                data: data ? JSON.stringify(data) : undefined,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        try {
                            resolve(JSON.parse(response.responseText));
                        } catch (e) {
                            reject(new Error(`Failed to parse response: ${e.message}`));
                        }
                    } else {
                        reject(new Error(`API request failed with status ${response.status}`));
                    }
                },
                onerror: (error) => {
                    reject(new Error(`API request error: ${error.error}`));
                },
                timeout: 10000
            });
        });
    }
 
    async decryptContent(encryptedContent) {
        const dynamicKey = await this.getDecryptionKey();
        const contentCrypto = new FqCrypto(dynamicKey);
        const decoded = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
        const decrypted = await contentCrypto.decrypt(decoded);
        const decompressed = await this.gunzip(decrypted);
        return new TextDecoder().decode(decompressed);
    }
 
    async gunzip(data) {
        const ds = new DecompressionStream('gzip');
        const writer = ds.writable.getWriter();
        writer.write(data);
        writer.close();
        return new Response(ds.readable).arrayBuffer().then(arrayBuffer => new Uint8Array(arrayBuffer));
    }
}
