/**
 * Class representing a WASM wrapper for Zbar
 */
class KoderZbar {
  /**
   * Initializes the ZBar WASM module
   * @param {Object} config - Configuration options
   * @param {string} [config.wasmDirectory='./wasm'] - Directory containing WASM files
   * @returns {Promise<KoderZbar>} Initialized KoderZbar instance
   */
  initialize(config) {
    return (async () => {
      // Load WASM file
      console.log("Zbar");
      config ||= {};
      const directory = config.wasmDirectory || "./wasm";
      this.mod = await CreateKoder({locateFile: file => `${directory}/${file}`});

      // Initialize a glue API object (between JavaScript and C++ code)
      this.api = {
        createBuffer: this.mod.cwrap('createBuffer', 'number', ['number']),
        deleteBuffer: this.mod.cwrap('deleteBuffer', '', ['number']),
        triggerDecode: this.mod.cwrap('triggerDecode', 'number', ['number', 'number', 'number']),
        getScanResults: this.mod.cwrap('getScanResults', 'number', []),
        getResultType: this.mod.cwrap('getResultType', 'number', []),
      };

      // return the class
      return this;
    })();
  }

  /**
   * Decodes barcode from image data
   * @param {Uint8Array} imgData - Raw image data in RGBA format
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {Object|null} Decoded barcode result containing code and type, or null if no barcode found
   */
  decode(imgData, width, height) {
    const buffer = this.api.createBuffer(width * height * 4);
    this.mod.HEAPU8.set(imgData, buffer);
    const results = [];
    if (this.api.triggerDecode(buffer, width, height) > 0) {
      const resultAddress = this.api.getScanResults();
      results.push({
        code: this.mod.UTF8ToString(resultAddress),
        type: this.mod.UTF8ToString(this.api.getResultType())
      });
      this.api.deleteBuffer(resultAddress);
    }
    if (results.length > 0) return results[0];
    else return null;
  }
}