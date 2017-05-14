var helpers = require('./MyFileStoreHelper.js');
var fs = require('fs-extra');

/**
 * https://github.com/expressjs/session#session-store-implementation
 *
 * @param {object} session  express session
 * @return {Function} the `MyFileStore` extending `express`'s session Store
 *
 * @api public
 */
module.exports = function (session) {
  var Store = session.Store;

  /**
   * Initialize MyFileStore with the given `options`
   *
   * @param {Object} options (optional)
   *
   * @api public
   */
  function MyFileStore(options) {
    var self = this;
    console.log(options)

    options = options || {};
    Store.call(self, options);

    self.options = helpers.defaults(options);
    fs.mkdirsSync(self.options.path);
  }

  /**
   * Inherit from Store
   */
  MyFileStore.prototype.__proto__ = Store.prototype;

  /**
   * Attempts to fetch session from a session file by the given `sessionId`
   *
   * @param  {String}   sessionId
   * @param  {Function} callback
   *
   * @api public
   */
  MyFileStore.prototype.get = function (sessionId, callback) {
    console.log("MyFileStore get " + sessionId)
    helpers.get(sessionId, this.options, callback);
  };

  /**
   * Attempts to commit the given session associated with the given `sessionId` to a session file
   *
   * @param {String}   sessionId
   * @param {Object}   session
   * @param {Function} callback (optional)
   *
   * @api public
   */
  MyFileStore.prototype.set = function (sessionId, session, callback) {
    console.log("MyFileStore set " + sessionId + " " + session)
    helpers.set(sessionId, session, this.options, callback);
  };

  /**
   * Touch the given session object associated with the given `sessionId`
   *
   * @param {string} sessionId
   * @param {object} session
   * @param {function} callback
   *
   * @api public
   */

  MyFileStore.prototype.touch = function (sessionId, session, callback) {
    // will update last access time
    console.log("MyFileStore touch " + sessionId + " " + session)
    helpers.set(sessionId, session, this.options, callback);
  };

  /**
   * Attempts to unlink a given session by its id
   *
   * @param  {String}   sessionId   Files are serialized to disk by their
   *                                sessionId
   * @param  {Function} callback
   *
   * @api public
   */
  MyFileStore.prototype.destroy = function (sessionId, callback) {
    console.log("MyFileStore destroy " + sessionId)
    helpers.destroy(sessionId, this.options, callback);
  };

  /**
   * Attempts to fetch number of the session files
   *
   * @param  {Function} callback
   *
   * @api public
   */
  MyFileStore.prototype.length = function (callback) {
    console.log("MyFileStore length ")
    helpers.length(this.options, callback);
  };

  /**
   * Attempts to clear out all of the existing session files
   *
   * @param  {Function} callback
   *
   * @api public
   */
  MyFileStore.prototype.clear = function (callback) {
    console.log("MyFileStore clear ")
    helpers.clear(this.options, callback);
  };

  /**
   * Attempts to detect whether a session file is already expired or not
   *
   * @param  {String}   sessionId
   * @param  {Function} callback
   *
   * @api public
   */
  MyFileStore.prototype.expired = function (sessionId, callback) {
    console.log("MyFileStore expired " + sessionId)
    helpers.expired(sessionId, this.options, callback);
  };

  return MyFileStore;
};
