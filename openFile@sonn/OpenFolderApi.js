/*
 * The content of this file is licensed. You may obtain a copy of
 * the license at https://github.com/thsmi/sieve/ or request it via
 * email from the author.
 *
 * Do not remove or change this comment.
 *
 * The initial author of the code is:
 *   Thomas Schmid <schmid-thomas@gmx.net>
 */

(function (exports) {

  "use strict";

  /* global ExtensionCommon */
  /* global Components */

  const Cc = Components.classes;
  const Ci = Components.interfaces;

  /**
   * Implements a webextension api for sieve session and connection management.
   */
  class OpenFolderApi extends ExtensionCommon.ExtensionAPI {
    /**
     * @inheritdoc
     */
    getAPI() {

      return {
          OpenFolder: {
            async showItemInFolder(path) {

              const f = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsIFile);
              try {
                f.initWithPath(path);
              } catch (e) {
                throw new Error("Invalid path");
              }

              if (!f.exists())
                throw new Error("Path does not exist");

              await f.reveal();
            }
          }
      };
    }
  }

  exports.OpenFolderApi = OpenFolderApi;

})(this);
