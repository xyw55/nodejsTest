var fs = require('fs-extra');
var writeFileAtomic = require('write-file-atomic');
var path = require('path');
var retry = require('retry');

var helpers = {

  sessionPath: function (options, sessionId) {
    //return path.join(basepath, sessionId + '.json');
    return path.join(options.path, sessionId + options.fileExtension);
  },

  sessionId: function (options, file) {
    //return file.substring(0, file.lastIndexOf('.json'));
    if ( options.fileExtension.length === 0 ) return file;
    var id = file.replace(options.filePattern, '');
    return id === file ? '' : id;
  },

  getLastAccess: function (session) {
    return session.__lastAccess;
  },

  setLastAccess: function (session) {
    session.__lastAccess = new Date().getTime();
  },

  escapeForRegExp: function (str) {
    return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
  },

  getFilePatternFromFileExtension: function (fileExtension) {
    return new RegExp( helpers.escapeForRegExp(fileExtension) + '$' );
  },

  defaults: function (options) {
    options = options || {};

    var NOOP_FN = function () {
    };

    return {
      path: path.normalize(options.path || './sessions'),
      ttl: options.ttl || 3600,
      retries: options.retries || 5,
      factor: options.factor || 1,
      minTimeout: options.minTimeout || 50,
      maxTimeout: options.maxTimeout || 100,
      logFn: options.logFn || console.log || NOOP_FN,
      fallbackSessionFn: options.fallbackSessionFn,
      encoding: options.encoding !== undefined
        ? options.encoding
        : 'utf8',
      encoder: options.encoder || JSON.stringify,
      decoder: options.decoder || JSON.parse,
      secret: options.secret,
      encryptEncoding: options.encryptEncoding !== undefined
        ? options.encryptEncoding
        : 'hex',
      fileExtension: options.fileExtension || '.json',
      filePattern: options.fileExtension
        ? helpers.getFilePatternFromFileExtension(options.fileExtension)
        : /\.json$/
    };
  },

  /**
   * Attempts to fetch session from a session file by the given `sessionId`
   *
   * @param  {String}   sessionId
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @api public
   */
  get: function (sessionId, options, callback) {
    var sessionPath = helpers.sessionPath(options, sessionId);

    var operation = retry.operation({
      retries: options.retries,
      factor: options.factor,
      minTimeout: options.minTimeout,
      maxTimeout: options.maxTimeout
    });

    operation.attempt(function () {
      fs.readFile(sessionPath, options.encoding, function readCallback(err, data) {
        if (!err) {
          var json;
          try {
            json = options.decoder(data);
          } catch (parseError) {
            return fs.remove(sessionPath, function (removeError) {
              if (removeError) {
                return callback(removeError);
              }

              callback(parseError);
            });
          }
          if (!err) {
            return callback(null, helpers.isExpired(json, options) ? null : json);
          }
        }

        if (operation.retry(err)) {
          options.logFn('[session-file-store] will retry, error on last attempt: ' + err);
        } else if (options.fallbackSessionFn) {
          var session = options.fallbackSessionFn(sessionId);
          helpers.setLastAccess(session);
          callback(null, session);
        } else {
          callback(err);
        }
      });
    });
  },

  /**
   * Attempts to commit the given `session` associated with the given `sessionId` to a session file
   *
   * @param {String}   sessionId
   * @param {Object}   session
   * @param  {Object}  options
   * @param {Function} callback (optional)
   *
   * @api public
   */
  set: function (sessionId, session, options, callback) {
    try {
      helpers.setLastAccess(session);

      var sessionPath = helpers.sessionPath(options, sessionId);
      var json = options.encoder(session);
      
      writeFileAtomic(sessionPath, json, function (err) {
        if (callback) {
          err ? callback(err) : callback(null, session);
        }
      });
    } catch (err) {
      if (callback) callback(err);
    }
  },

  /**
   * Attempts to unlink a given session by its id
   *
   * @param  {String}   sessionId   Files are serialized to disk by their sessionId
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @api public
   */
  destroy: function (sessionId, options, callback) {
    var sessionPath = helpers.sessionPath(options, sessionId);
    fs.remove(sessionPath, callback);
  },

  /**
   * Attempts to fetch number of the session files
   *
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @api public
   */
  length: function (options, callback) {
    fs.readdir(options.path, function (err, files) {
      if (err) return callback(err);

      var result = 0;
      files.forEach(function (file) {
        if (options.filePattern.exec(file)) {
          ++result;
        }
      });

      callback(null, result);
    });
  },

  /**
   * Attempts to clear out all of the existing session files
   *
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @api public
   */
  clear: function (options, callback) {
    fs.readdir(options.path, function (err, files) {
      if (err) return callback([err]);
      if (files.length <= 0) return callback();

      var errors = [];
      files.forEach(function (file, i) {
        if (options.filePattern.exec(file)) {
          fs.remove(path.join(options.path, file), function (err) {
            if (err) {
              errors.push(err);
            }
            // TODO: wrong call condition (call after all completed attempts to remove instead of after completed attempt with last index)
            if (i >= files.length - 1) {
              errors.length > 0 ? callback(errors) : callback();
            }
          });
        } else {
          // TODO: wrong call condition (call after all completed attempts to remove instead of after completed attempt with last index)
          if (i >= files.length - 1) {
            errors.length > 0 ? callback(errors) : callback();
          }
        }
      });
    });
  },

  /**
   * Attempts to detect whether a session file is already expired or not
   *
   * @param  {String}   sessionId
   * @param  {Object}   options
   * @param  {Function} callback
   *
   * @api public
   */
  expired: function (sessionId, options, callback) {
    helpers.get(sessionId, options, function (err, session) {
      if (err) return callback(err);

      err ? callback(err) : callback(null, helpers.isExpired(session, options));
    });
  },

  isExpired: function (session, options) {
    if (!session) return true;

    var ttl = session.cookie && session.cookie.originalMaxAge ? session.cookie.originalMaxAge : options.ttl * 1000;
    return !ttl || helpers.getLastAccess(session) + ttl < new Date().getTime();
  },
};

module.exports = helpers;
