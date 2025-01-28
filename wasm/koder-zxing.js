/**
 * Class representing a WASM wrapper for Zxing library
 */
class KoderZxing {
  /**
   * Initializes the ZXing WASM module
   * @param {Object} config - Configuration object
   * @param {string} [config.wasmDirectory="./wasm"] - Directory containing WASM files
   * @returns {Promise<KoderZxing>} Instance of KoderZxing
   */
  initialize(config) {
    return (async () => {
      // Load WASM file
      console.log("Zxing");
      config ||= {};
      const directory = config.wasmDirectory || "./wasm";
      this.mod = await ZXing({locateFile: file => `${directory}/${file}`});
      return this;
    })();
  }

  /**
   * Decodes a barcode from image data
   * @param {Uint8Array} imgData - Raw image data
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @param {boolean} [mode=true] - Decoding mode
   * @param {string} [format=""] - Barcode format to look for
   * @returns {Object|null} Decoded barcode result with code and type, or null if no barcode found
   */
  decode(imgData, width, height, mode = true, format = "") {
    const buffer = this.mod._malloc(imgData.byteLength);
    this.mod.HEAPU8.set(imgData, buffer);
    const results = [];
    const result = this.mod.readBarcodeFromPixmap(buffer, width, height, mode, format);
    this.mod._free(buffer);
    if (result && result.text.length > 0) {
      results.push({
        code: result.text,
        type: result.format
      });
    }
    if (results.length > 0) return results[0];
    else return null;
  }
}