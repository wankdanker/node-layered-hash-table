var crypto = require('crypto')
	, sortkeys = require('sortkeys')
	;

module.exports = LayeredHashTable;

function LayeredHashTable(options) {
	var self = this;
	
	self.options = options || {};
	self.options.caseSensitive = (self.options.caseSensitive === false) ? false : true;
	self.cache = null;
	
	self.reset();
}

LayeredHashTable.prototype.addLayer = function(newLayer) {
	var self = this;
	
	self.cache = null;
	
	newLayer = newLayer || {};
	
	//check to see if we are case-insensitive
	if (!self.options.caseSensitive) {
		var tmp = {};
		
		//we are so we should re-create the object, normalizing the keys in the processess
		for (var key in newLayer) {
			if (newLayer.hasOwnProperty(key)) {
				tmp[self.normalize(key)] = newLayer[key];
			}
		}
		
		newLayer = tmp;
	}
	
	self.layers.push(newLayer);
	
	return newLayer;
}

LayeredHashTable.prototype.setLayer = function(objLayer, index) {
	var self = this, o = {};
	
	self.cache = null;
	//TODO: check index exists
	
	for (var key in objLayer) {
		if (objLayer.hasOwnProperty(key)) {
			o[self.normalize(key)] = objLayer[key];
		}
	}
	
	self.layers[index] = o;

	return self;
};

LayeredHashTable.prototype.reset = function() {
	var self = this;
	
	self.layers = [];
	self.cache = null;
	
	for (var x = 0; x < (self.options.layers || 1); x ++) {
		self.addLayer();
	}
	
	if (self.options.caseSensitive) {
		self.normalize = function (str) { return str }
	}
	else {
		self.normalize = function (str) { return (new String(str)).toLowerCase(); }
	}
	
	return self;
};

LayeredHashTable.prototype.set = function(key, value, layer) {
	var self = this;
	
	self.cache = null;
	
	layer = layer || 0;
	
	if (layer < 0 || layer >= self.layers.length) {
		throw new Error("[LayeredHashTable] An attempt was made to set a pair at a layer that does not exist.");
	}
	
	self.layers[layer][self.normalize(key)] = value;
	
	return self;
};

LayeredHashTable.prototype.add = LayeredHashTable.prototype.set;

LayeredHashTable.prototype.get = function (lookupKey) {
	var self = this, x, key, layer;
	
	lookupKey = self.normalize(lookupKey);
	
	if (arguments.length != 0) {
		//search from top to bottom to find the key
		//top is 0, bottom is self.layers.length
		if (self.cache) {
			return self.cache[lookupKey];
		}
		
		for ( x = 0; x < self.layers.length; x++ ) {
			if (lookupKey in self.layers[x] || self.layers[x][lookupKey]) {//[lookupKey] || self.layers[x][lookupKey] === false || self.layers[x][lookupKey] === 0) {
				return self.layers[x][lookupKey];
			}
		}
		
		return null;
	}
	else {
		if (self.cache) {
			return self.cache;
		}
		
		//build an object by looping from bottom to top where higher layers will over ride lower layers
		var o = {};
		
		for ( x = self.layers.length - 1; x >= 0; x-- ) {
			layer = self.layers[x];
			
			for ( key in layer ) {
				o[self.normalize(key)] = layer[key];
			}
		}
		
		self.cache = o;
		
		return o;
	}
};

LayeredHashTable.prototype.has = function (lookupKey) {
	var self = this, x, key, layer;
	
	lookupKey = self.normalize(lookupKey);
	
	if (self.cache && self.cache.hasOwnProperty(lookupKey)) {
		return true;
	}
	
	for ( x = 0; x < self.layers.length; x++ ) {
		var layer = self.layers[x];
		
		for (key in layer) {
			if (key == lookupKey) {
				return true;
			}
		}
	}
	
	return false;
}

LayeredHashTable.prototype.hash = function () {
	var self = this;
	
	var serial = JSON.stringify(sortkeys(self.get()));
	
	return crypto.createHash('md5').update(serial).digest('hex')
}

LayeredHashTable.prototype.length = function () {
	var self = this;
	
	return self.layers.length;
};

LayeredHashTable.prototype.normalize = function (str) {
	return str;
};

LayeredHashTable.prototype.count = function () {
	var self = this;
	
	var obj = self.get();
	
	var x = 0;
	
	for (key in obj) {
		x++;
	}
	
	return x;
};

LayeredHashTable.prototype.toTable = function () {
	var self = this, x, key, layer, fields = {}, output = [];
	
	//get a list of all fields from all layers
	for ( x = 0; x < self.layers.length; x++ ) {
		layer = self.layers[x];
		
		for ( key in layer ) {
			fields[key] = key;
		}
	}
	
	output.push('\t');
	
	//display header
	for ( key in fields ) {
		output.push(key + '\t');
	}
	
	output.push('\n');
	
	//loop through all layers listing all fields
	for ( x = 0; x < self.layers.length; x++ ) {
		layer = self.layers[x];
		
		output.push(x + '\t');
		
		for ( key in fields ) {
			output.push((layer[key] || '') + '\t');
		}
		
		output.push('\n');
	}
	
	return output.join('');
}

LayeredHashTable.prototype.dump = function (stream) {
	var self = this, output = stream || process.stdout;
	
	output.write(self.toTable());
	
	return self;
}
