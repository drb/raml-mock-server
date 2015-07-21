var cache = (function(cacheID) {

	var _ 		= require('underscore'),
		fs 		= require('fs'),
		path 	= require('path'),
		db 		= {},
		store 	= [cacheID, '.json'].join('');

	try {
		db = JSON.parse(fs.readFileSync(path.resolve(store), 'utf8'));	
	} catch (e) {
		console.error(e);
	}

	// console.log('from disk', db);

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
			serialized = JSON.stringify(db, null, "\t");
		} else {
			serialized = db;
		}

		console.log("writing to %s", db);

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