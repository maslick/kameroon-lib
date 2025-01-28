/**
 * Converts an ArrayBuffer to a String
 * @param {ArrayBuffer} buf - The ArrayBuffer to convert
 * @returns {string} The converted string
 */
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}


/**
 * Converts a String to an ArrayBuffer
 * @param {string} str - The string to convert
 * @returns {ArrayBuffer} The converted ArrayBuffer
 */
function str2ab(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

/**
 * Generates a pair of RSA-OAEP encryption keys.
 *
 * This function uses the Web Crypto API to generate a 2048-bit RSA key pair
 * with SHA-256 as the hash algorithm. The keys can be used for encryption
 * and decryption.
 *
 * @async
 * @function
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to a `CryptoKeyPair` object,
 * containing `publicKey` and `privateKey` properties.
 *
 * @example
 * const keys = await createKeys();
 * console.log(keys.publicKey); // Access the public key
 * console.log(keys.privateKey); // Access the private key
 */
export async function createKeys() {
  return await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Saves RSA key pair to localStorage with expiration
 * @param {Object} keys - Object containing the key pair
 * @param {CryptoKey} keys.privateKey - The private key to store
 * @param {CryptoKey} keys.publicKey - The public key to store
 * @returns {Promise<void>} A promise that resolves when the keys are saved
 * @throws {Error} If there is an error exporting or saving the keys
 */
export async function saveKeysToLocalStorage(keys) {
  try {
    const {privateKey, publicKey} = keys;

    const exportedPrivateKey = await exportPrivateKeyToBase64(privateKey);
    const exportedPublicKey = await exportPublicKeyToBase64(publicKey);

    // Store the encrypted private key and expiration timestamp in localStorage
    const ttlSeconds = 3600; // 1 hour
    const expirationTimestamp = Date.now() + ttlSeconds * 1000;
    localStorage.setItem('privateKeyBase64', exportedPrivateKey);
    localStorage.setItem('publicKeyBase64', exportedPublicKey);
    localStorage.setItem('ttl', expirationTimestamp.toString());
  }
  catch (e) {
    console.error(e);
  }
}

/**
 * Retrieves RSA key pair from localStorage and checks expiration
 * @returns {Promise<Object>} A promise that resolves to an object containing:
 *   - privateKey {CryptoKey} The imported private key
 *   - publicKey {string} The public key in base64 format
 * @throws {Error} If private key is not found in localStorage
 * @throws {Error} If public key is not found in localStorage
 * @throws {Error} If the stored keys have expired based on TTL
 */
export async function fetchKeysFromLocalStorage() {
  const privateKeyBase64 = localStorage.getItem('privateKeyBase64');
  if (privateKeyBase64 === null)
    throw new Error("private key not found");
  const publicKeyBase64 = localStorage.getItem('publicKeyBase64');
  if (publicKeyBase64 === null)
    throw new Error("public key not found");
  const keyExpiration = parseInt(localStorage.getItem('ttl'));
  if (Date.now() < keyExpiration) {
    return {privateKey: await importPrivateKey(privateKeyBase64), publicKey: publicKeyBase64};
  } else {
    throw new Error("keys expired");
  }
}

/**
 * Exports a public key to base64 format
 * @param {CryptoKey} publicKey - The public key to export
 * @returns {Promise<string>} The exported public key in base64 format
 */
export async function exportPublicKeyToBase64(publicKey) {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = ab2str(exported);
  return window.btoa(exportedAsString);
}

/**
 * Exports a private key to base64 format
 * @param {CryptoKey} privateKey - The private key to export
 * @returns {Promise<string>} The exported private key in base64 format
 */
export async function exportPrivateKeyToBase64(privateKey) {
  const exportedPrivateKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
  const exportedPrivateKeyAsString = ab2str(exportedPrivateKey);
  return window.btoa(exportedPrivateKeyAsString);
}

/**
 * Imports a public key from base64 PEM format
 * @param {string} pem - The public key in base64 PEM format
 * @returns {Promise<CryptoKey>} A Promise that resolves to the imported CryptoKey object
 * @throws {Error} If the key import fails
 */
export async function importPublicKey(pem) {
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pem);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return await window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Imports a private key from base64 PEM format
 * @param {string} pem - The private key in base64 PEM format
 * @returns {Promise<CryptoKey>} A Promise that resolves to the imported CryptoKey object
 * @throws {Error} If the key import fails
 */
export async function importPrivateKey(pem) {
  const binaryDerString = window.atob(pem);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return await window.crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["decrypt"]
  );
}

/**
 * Encrypts a message using RSA-OAEP with a public key
 * @param {string} publicKeyBase64 - The public key in base64 format
 * @param {string} message - The message to encrypt
 * @returns {Promise<ArrayBuffer>} The encrypted message as an ArrayBuffer
 */
export async function encryptMessage(publicKeyBase64, message) {
  const publicKey = await importPublicKey(publicKeyBase64);
  return await window.crypto.subtle.encrypt(
    {name: "RSA-OAEP"},
    publicKey,
    new TextEncoder().encode(message)
  );
}

/**
 * Decrypts an encrypted message using RSA-OAEP with a private key
 * @param {CryptoKey} privateKey - The private key to use for decryption
 * @param {ArrayBuffer} encryptedMessage - The encrypted message to decrypt
 * @returns {Promise<string>} The decrypted message as a string
 */
export async function decryptMessage(privateKey, encryptedMessage) {
  const decryptedMessage = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedMessage
  );
  return new TextDecoder().decode(decryptedMessage);
}

/**
 * Encodes an encrypted message as a base64 string
 * @param {ArrayBuffer} encryptedMessage - The encrypted message to encode
 * @returns {string} The base64 encoded string representation of the encrypted message
 */
export function encodeEncryptedMessageAsBase64(encryptedMessage) {
  return window.btoa(ab2str(encryptedMessage));
}

/**
 * Decodes a base64 encoded encrypted message back to an ArrayBuffer
 * @param {string} base64encodedMessage - The base64 encoded encrypted message
 * @returns {ArrayBuffer} The decoded encrypted message as an ArrayBuffer
 */
export function decodeBase64EncryptedMessage(base64encodedMessage) {
  return str2ab(window.atob(base64encodedMessage));
}
