import * as fileUtils from "./fileUtils.js";
import metadata from "./metadata.js";

import GLib from "gi://GLib";
import Gio from "gi://Gio";

const getCacheDir = () => {
  // const cacheDir = `${GLib.get_user_cache_dir()}/${metadata.uuid}/${
  //     metadata.version
  // }`;
  // GLib.mkdir_with_parents(`${cacheDir}`, 0o774);
  // return cacheDir;
  return "/tmp";
};

const sortObj = (obj, criterion = (key) => key) => {
  return Object.keys(obj)
    .sort(criterion)
    .reduce(function (result, key) {
      result[key] = obj[key];
      return result;
    }, {});
};

export class Index {
  /** @type {GLib.Checksum} */
  #checksum;
  /** @type {() -> any} */
  #readyCallback;

  /**
   * Constructor for Index objects.
   *
   * An Index stores objects passed to it in JSON format.
   *
   * For searching purposes, specified keys' values are passed to a scorer function that returns
   * tokens mapped to scores. A reference to the object (sha256 hash) is stored for every token.
   *
   * Keys not specified at creation will be discarded.
   *
   * To search, a passed search query is split into tokens. This is handled by a tokenizer.
   *
   * Look at scorer.js and tokenizer.js for simple implementations.
   *
   * @param {string} indexId - A (file-path-safe) name/id for the index.
   * @param {string[]} keys - A list of keys that indexed objects will have.
   * @param {scorer} scorer - A function that returns tokens in an index object mapped to scores
   * @param {tokenizer} tokenizer - A function that returns the tokens in a query
   *
   * @return {Void}
   */
  constructor(indexId, keys, scorer, tokenizer) {
    this.indexId = indexId;
    this.keys = keys;

    this.scorer = scorer;
    this.tokenizer = tokenizer;

    this.indexPath = `${getCacheDir()}/${this.indexId}`;

    // this.indexed = Gio.File.new_for_path(
    //     `${this.indexPath}/tokenScores.json`,
    // ).query_exists(null);

    this.#checksum = GLib.Checksum.new(GLib.ChecksumType.SHA256);
    this.#readyCallback = () => {};

    GLib.mkdir_with_parents(`${this.indexPath}/known`, 0o774);

    this.loadTokenScorePromise = fileUtils
      .readFileOr(`${this.indexPath}/tokenScores.json`, "{}")
      .then(async (contents) => {
        try {
          this.tokenScores = JSON.parse(contents);
          this.markReady();
        } catch (error) {
          logError(
            error,
            `${metadata.uuid}: index failed to load previous state with error, deleting index and starting fresh`,
          );

          const indexFiles = await fileUtils.listDirectory(
            `${this.indexPath}/known`,
          );

          await Promise.all(
            [...indexFiles].map(
              (file) =>
                new Promise((resolve, reject) => {
                  // Priority 0
                  Gio.File.new_for_path(
                    `${this.indexPath}/known/${file}`,
                  ).delete_async(0, null, (file, res) => {
                    try {
                      resolve(file.delete_finish(res));
                    } catch (e) {
                      logError(
                        error,
                        `${metadata.uuid}: failed deleting ${file}`,
                      );
                      resolve(e);
                    }
                  });
                }),
            ),
          );
          this.tokenScores = {};
        }
      });
  }

  /**
   * Get relevant entry IDs and their scores for the passed token.
   *
   * @param {string} token - The token
   *
   * @return {string} Entry IDs mapped to their score in regards to this token
   */
  async getTokenScores(token) {
    await this.loadTokenScorePromise;

    if (token in this.tokenScores) {
      return this.tokenScores[token];
    }
    return {};
  }

  /**
   * Set the score of an entry ID for the passed token.
   *
   * @param {string} token - The token
   * @param {string} id - The ID of the entry
   * @param {?number} score - The score of the ID for the token, or null to unset
   */
  async setTokenScore(token, id, score) {
    await this.loadTokenScorePromise;

    if (score === null || score === undefined) {
      if (token in this.tokenScores && id in this.tokenScores[token]) {
        delete this.tokenScores[token][id];

        if (Object.keys(this.tokenScores[token]).length === 0) {
          delete this.tokenScores[token];
        }
      }

      return;
    }

    if (token in this.tokenScores) {
      this.tokenScores[token][id] = score;
    } else {
      this.tokenScores[token] = { [id]: score };
    }
  }

  /**
   * Store the current score index to the file system.
   * @async
   */
  async dumpTokenScores() {
    await this.loadTokenScorePromise;
    await fileUtils.writeToFile(
      `${this.indexPath}/tokenScores.json`,
      JSON.stringify(this.tokenScores),
    );
  }

  /**
     * Create an index entry for an object.
     *

     * @async
     *
     * @param {Object} indexObject - An object containing the keys specified at creation.
     *
     * @return {string} - The created entry's sha256 hash
     */
  async createIndexEntry(indexObject) {
    await this.loadTokenScorePromise;

    const tokenScores = this.scorer(indexObject);

    const indexObjectHash = this.#hashIndexObject(indexObject);

    for (const token in tokenScores) {
      await this.setTokenScore(token, indexObjectHash, tokenScores[token]);
    }

    await this.#saveHash(indexObjectHash, indexObject);

    return indexObjectHash;
  }

  /**
   * Remove an index entry by sha256 hash.
   *
   * @async
   *
   * @param {string} hash - The hash identifying the entry.
   */
  async removeIndexEntry(hash) {
    await this.loadTokenScorePromise;

    const fileContents = await fileUtils.readFileOr(
      `${this.indexPath}/known/${hash}`,
    );
    const indexObject = JSON.parse(fileContents);
    const tokenScores = this.scorer(indexObject);

    for (const token in tokenScores) {
      await this.setTokenScore(token, hash, null);
    }

    await new Promise((resolve, reject) => {
      // Priority 0
      Gio.File.new_for_path(`${this.indexPath}/known/${hash}`).delete_async(
        0,
        null,
        (file, res) => {
          try {
            resolve(file.delete_finish(res));
          } catch (e) {
            reject(e);
          }
        },
      );
    });
  }

  /**
   * Get whether the index has finished creating.
   *
   * This will be set to true once updateIndex finishes.
   * You can also manually mark an Index as ready by calling {@link markReady}
   *
   * @return {boolean} Whether the Index object is ready to be used.
   */
  isReady() {
    return this.indexed;
  }

  /**
   * Mark the Index as ready to use. Will call the Index's readyCallback, if set.
   *
   * @return {Void}
   */
  async markReady() {
    this.indexed = true;

    if (this.#readyCallback) this.#readyCallback();
  }

  /**
   * Update the entire index to match an array of objects.
   *
   * This will remove all pre-existing index entries that are not
   * in the array and create new entries where necessary.
   *
   * @async
   */
  async updateIndex(allIndexObjects) {
    await this.loadTokenScorePromise;

    log(
      `${metadata.uuid}: updating index '${this.indexId}' with ${allIndexObjects.length} items`,
    );

    const files = await fileUtils.listDirectory(`${this.indexPath}/known`);
    const obsoleteIndexObjectHashes = files;

    for (const indexObject of allIndexObjects) {
      const indexObjectHash = this.#hashIndexObject(indexObject);

      if (!obsoleteIndexObjectHashes.delete(indexObjectHash)) {
        await this.createIndexEntry(indexObject);
      }
    }

    log(`${metadata.uuid}: Done adding to index '${this.indexId}'`);

    this.markReady();
    for (const obsoleteIndexObjectHash of obsoleteIndexObjectHashes) {
      try {
        await this.removeIndexEntry(obsoleteIndexObjectHash);
      } catch (error) {
        logError(
          error,
          `${metadata.uuid}: could not remove index entry '${obsoleteIndexObjectHash}' of '${this.indexId}' due to error:`,
        );
      }
    }

    await this.dumpTokenScores();
  }

  /**
   * Get list of index objects by string query (split into words)
   *
   * Uses the tokenizer passed to the constructor
   *
   * @async
   *
   * @param  {string[]} query - The query, split into words
   * @param  {number} limit - How many matches to return at most, default 10
   * @param  {number} cutoffAt - At what fraction of the score of the highest-ranking result to cut off
   *                             results. 1.0 for only equal-ranking results, default: 0.0 for no cutoff
   *
   * @return {Object[]} - An array of index objects that match the query, ranked from best to worst
   */
  async find(query, limit = 10, cutoffAt = 0.0) {
    const indexObjectScores = {};
    const indexObjectResults = [];

    for (const { token, weight: tokenWeight } of this.tokenizer(query)) {
      const tokenScoreObj = await this.getTokenScores(token);

      Object.keys(tokenScoreObj)
        .slice(0, limit - 1)
        .forEach((hash) => {
          if (indexObjectScores[hash] === undefined)
            indexObjectScores[hash] = 0;

          indexObjectScores[hash] +=
            (tokenWeight * token.length * tokenScoreObj[hash]) /
            Math.sqrt(Object.keys(tokenScoreObj).length);
        });
    }

    for (const hash of Object.keys(indexObjectScores)
      .sort((a, b) => indexObjectScores[b] - indexObjectScores[a])
      .filter(
        (hash, _index, hashes) =>
          indexObjectScores[hash] > cutoffAt * indexObjectScores[hashes[0]],
      )
      .slice(0, limit - 1)) {
      indexObjectResults.push(await this.getObjectForHash(hash));
    }

    // console.log(indexObjectResults);

    return indexObjectResults;
  }

  /**
   * Get the object that an entry refers to, by hash.
   *
   * @async
   *
   * @param  {string} hash - The sha256 hash to look up
   *
   * @return {Object} - The entry's object
   */
  async getObjectForHash(hash) {
    const fileContents = await fileUtils.readFileOr(
      `${this.indexPath}/known/${hash}`,
    );
    try {
      return JSON.parse(fileContents);
    } catch {
      throw `Couldn't load index entry for hash ${hash}`;
    }
  }

  /**
   * Function to be called once the index is populated
   * @callback readyCallback
   */

  /**
   * Call a function when updateIndex() finishes or markIndexed() is called.
   *
   * Overwrites any previous functions passed to this method.
   *
   * @param {readyCallback} callback - The function to call once the search is up and running
   * @return {Void}
   */
  setReadyCallback(callback = () => {}) {
    this.#readyCallback = callback;
  }

  /**
   * Return an object containing only the keys passed at creation, in order passed at creation.
   *
   * @param {Object} indexObject - An object contining any keys in any order
   * @return {Object} An object containing only this.keys, in order of this.keys
   */
  #normalizeIndexObject(indexObject) {
    const strippedObject = {};

    this.keys.forEach((key) => {
      strippedObject[key] = indexObject[key];
    });

    return strippedObject;
  }

  /**
   * Normalize an index object, then turn it into JSON.
   *
   * @param {Object} indexObject - An object contining any keys in any order
   * @return {string} The object's normalized JSON representation.
   */
  #indexObjectToString(indexObject) {
    return JSON.stringify(this.#normalizeIndexObject(indexObject));
  }

  /**
   * Normalize, JSONify and sha256-hash an object. Used for index entry "ID"s.
   *
   * @param {Object} indexObject - An object contining any keys in any order
   * @return {string} A hash unique to the index-relevant values in the object.
   */
  #hashIndexObject(indexObject) {
    this.#checksum.reset();
    this.#checksum.update(this.#indexObjectToString(indexObject));
    const hash = this.#checksum.get_string();
    this.#checksum.reset();
    return hash;
  }

  /**
   * Save the (normalized) JSON of an index object under a hash
   *
   * @param {string} hash        - The hash to be used as entry "ID"
   * @param {Object} indexObject - The object to store
   * @return {Promise} A promise that resolves once the object has been stored.
   */
  #saveHash(hash, indexObject) {
    return fileUtils.writeToFile(
      `${this.indexPath}/known/${hash}`,
      this.#indexObjectToString(indexObject),
    );
  }
}
