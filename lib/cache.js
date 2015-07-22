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

	function get (route, id) {

		if (_.has(db, route)) {
 			return db[route];
 		}
	}

	function remove (route, id) {

		if (_.has(db, route) && !id) {
 			delete db[route];
 		}
	}

	function set (route, data)
 	{
 		// set the route and save to disk
 		db[route] = data;
 
 		// persist the data
 		save();
 	}

	function keys () {
		return _.keys(db);
	}

	function has (key) {
		return _.has(db, key);
	}


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