import GLib from "gi://GLib";
import Gio from "gi://Gio";

/**
 * Return a Promise that resolves with the contents of a file or a default
 * value if the file doesn't exist, or another error occurs.
 *
 * This promise never rejects, but instead returns the given defaultValue,
 * which is `undefined` if not passed.
 *
 * @param {string} path - The path of the file to read
 * @param {string} defaultValue - The value to return if an error occurs
 *
 * @return {Promise.<string>} A Promise that resolves to the file's contents (or the default)
 */
export const readFileOr = (path, defaultValue) => {
  const file = Gio.File.new_for_path(path);

  return new Promise((resolve) => {
    file.load_contents_async(null, (_src, res) => {
      try {
        const contentBytes = file.load_contents_finish(res)[1];
        resolve(new TextDecoder().decode(contentBytes));
      } catch (e) {
        resolve(defaultValue);
      }
    });
  });
};

/**
 * Write a string to a file, overwriting or creating where necessary, return an (empty) Promise.
 *
 * Does not create parent folder, rejects on error.
 *
 * @param {string} path - The path of the file to write
 * @param {string} string - The string to write into the file
 *
 * @return {Promise} A Promise that resolves once the file has been written.
 */
export const writeToFile = (path, string) => {
  const file = Gio.File.new_for_path(path);

  return new Promise((resolve, reject) => {
    file.replace_contents_bytes_async(
      new GLib.Bytes(string),
      null,
      false,
      Gio.FileCreateFlags.REPLACE_DESTINATION,
      null,
      (_src, res) => {
        try {
          file.replace_contents_finish(res);
        } catch (e) {
          reject(e);
        }
        resolve();
      },
    );
  });
};

/**
 * List the files in a specified directory, in a Promise.
 *
 * If an error occurs, this promise rejects.
 *
 * @param {string} - The path of the directory
 *
 * @return {Promise.<Set<string>} - A Promise resolving to an array of the
 *                                filenames inside the directory.
 */
export const listDirectory = (path) => {
  const files = new Set();

  const dirFile = Gio.File.new_for_path(path);

  return new Promise((resolve, reject) => {
    dirFile.enumerate_children_async(
      Gio.FILE_ATTRIBUTE_STANDARD_NAME,
      Gio.FileQueryInfoFlags.NONE,
      0, // priority 0
      null,
      (_src, res) => {
        try {
          resolve(dirFile.enumerate_children_finish(res));
        } catch (e) {
          reject(e);
        }
      },
    );
  }).then((enumerator) => {
    let fileInfo;
    while ((fileInfo = enumerator.next_file(null))) {
      const name = fileInfo.get_attribute_as_string(
        Gio.FILE_ATTRIBUTE_STANDARD_NAME,
      );
      files.add(name);
    }

    return files;
  });
};
