var sprom = require('sprom');
var Promise = require('bluebird');

/**
 * Gets the most recent data for a key.
 *
 * @param {ForkDB} db A ForkDB connection
 * @param {String} key The uri that is used as key
 * @returns {Promise} A promise which evaluates to the result value.
 */
exports.get = function (db, key)
{
    if (db === "undefined")
        throw "A fork db handle must be supplied!";

    if (key === "undefined")
        throw "A key must be supplied!";

    return new Promise(function(accept, reject)
    {
        sprom.arr(db.forks(key)).then(function(headsArr)
        {
            if (headsArr.length == 0) {
                reject("No data for the given key!");
                return;
            }

            var readStream = db.createReadStream(headsArr[0].hash);

            sprom.buf(readStream).then(function(data)
            {
                accept(JSON.parse(data.toString()));
            });
        });
    });
};

/**
 * Appends new data to a key. If previous data is found, it is linked
 * correspondingly.
 *
 * @param {ForkDB} db A ForkDB connection
 * @param {Object} doc The document that should be stored
 * @param {String} key The uri that should be used as key
 * @returns {Promise} A promise which evaluates to the insert hash.
 */
exports.put = function (db, doc, key)
{
    if (db === "undefined")
        throw "A fork db handle must be supplied!";

    if (key === "undefined")
        throw "A key must be supplied!";

    if (doc === "undefined")
        throw "A document must be supplied!";

    return new Promise(function(resolve,reject)
    {
        var meta = {
            "key" : key
        };

        sprom.arr(db.forks(key)).then(function(headsArr)
        {
            if (headsArr.length > 0)
            {
                meta.prev = headsArr[0];
            }

            var writeStream = db.createWriteStream(meta, function(err, id)
            {
                if (err) reject(err);
                else resolve(id)
            });

            writeStream.end(JSON.stringify(doc));
        });
    });
};