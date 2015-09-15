var cache = (function(cacheWriteDir, cacheID) {

	var _ 		= require('underscore'),
		fs 		= require('fs'),
		path 	= require('path'),
		db 		= {},
		store 	= path.resolve(cacheWriteDir, [cacheID, '.json'].join(''));

	// load any previously cached data
	try {

		if (fs.existsSync(store)) {
			db = JSON.parse(fs.readFileSync(store, 'utf8'));	
		}
	} catch (e) {
		throw e;
	}

	/**
	 * get
	 *
	 * retrieves a block of data relating to a key
	 * 
	 * @param  {[type]} route [description]
	 * @param  {[type]} id    [description]
	 * @return {[type]}       [description]
	 */
	function get (route) {

		if (_.has(db, route)) {
 			return db[route];
 		}
	}


	/**
	 * remove
	 *
	 * removes a key
	 * 
	 * @param  {[type]} route [description]
	 * @param  {[type]} id    [description]
	 * @return {[type]}       [description]
	 */
	function remove (route) {

		if (has(route)) {
 			delete db[route];
 		}
 		save();
	}

	function set (route, data)
 	{
 		// set the route and save to disk
 		db[route] = data;
 
 		// persist the data
 		save();
 	}

 	/**
 	 * keys
 	 *
 	 * returns all keys in the cache
 	 * 
 	 * @return {[type]} [description]
 	 */
	function keys () {
		return _.keys(db);
	}


	/**
	 * has
	 *
	 * check if a key exists
	 * 
	 * @param  {[type]}  key [description]
	 * @return {Boolean}     [description]
	 */
	function has (key) {
		return _.has(db, key);
	}


	/**
	 * save
	 *
	 * writes the intenal json to disk
	 * 
	 * @return {[type]} [description]
	 */
	function save () {

		var serialized;

		if (_.isObject(db)) {
			// prettifies the json before printing
			serialized = JSON.stringify(db, null, "\t");
		} else {
			serialized = db;
		}

		fs.writeFile(store, serialized, function(err) {
			if(err) {
				return console.log(err);
			}
		}); 
	}

	return {
		set: 	set,
		keys:   keys,
		get: 	get,
		has: 	has,
		remove: remove
	};
});

module.exports = cache;