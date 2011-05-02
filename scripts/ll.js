/* baroslized LL parser */

var ll_table = {}
var ll_starter = '';

/*
function ll_create_table(text) {
	ll_table = {
		'E\0id': ['T', 'E\''],
		'E\0(': ['T', 'E\''],
		'E\'\0+': ['+', 'T', 'E\''],
		'E\'\0)': [],
		'E\'\0': [],
		'T\0id': ['F', 'T\''],
		'T\0(': ['F', 'T\''],
		'T\'\0+': [],
		'T\'\0*': ['*', 'F', 'T\''],
		'T\'\0)': [],
		'T\'\0': [],
		'F\0id': ['id'],
		'F\0(': ['(', 'E', ')'],
	};

	ll_starter = 'E';

	for (var key in ll_table) ll_table[key].reverse();
}
*/

var NIL = 'nil';

if (String.prototype.strip === undefined) {
	String.prototype.strip = function() {
		return String(this).replace(/^\s+|\s+$/g, '');
	};
}

if (Array.prototype.concat_uniq === undefined) {
	Array.prototype.concat_uniq = function(other) {
		var res = this.slice();

		vals = {};
		for (var i=0;i<res.length;i++) vals[res[i]] = null;

		for (var i=0;i<other.length;i++) {
			var val = other[i];
			if (!(val in vals)) res.push(val);
		}

		return res;
	};
}

if (Array.prototype.concat_uniq_except_nil === undefined) {
	Array.prototype.concat_uniq_except_nil = function(other) {
		var res = this.slice();

		vals = {};
		for (var i=0;i<res.length;i++) vals[res[i]] = null;

		for (var i=0;i<other.length;i++) {
			var val = other[i];
			if (!(val in vals) && val != NIL) res.push(val);
		}

		return res;
	};
}

first_cache = {};

function ll_get_firsts(syms) {
	if (typeof(syms) == 'string') syms = [syms];

	if (syms in first_cache) return first_cache[syms];

	var res = [];

	if (syms.length == 1) {
		var sym = syms[0];

		if (!(sym in rules)) {
			res = [sym];
		} else {
			for (var i=0;i<rules[sym].length;i++) {
				var cur_syms = rules[sym][i];
				res = res.concat_uniq(ll_get_firsts(cur_syms));
			}
		}
	} else {
		var found = false;

		for (var j=0;j<syms.length;j++) {
			var firsts = ll_get_firsts([syms[j]]);

			found = false;
			for (var k=0;k<firsts.length;k++) {
				var first = firsts[k];

				if (first == NIL) found = true;
				else res.push(first);
			}

			if (!found) break;
		}

		if (found) {
			res.push(NIL);
		}
	}

	first_cache[syms] = res;
	return res;
}

function ll_get_arr_size(arr) {
	var cnt = 0;
	for (var key in arr) cnt += arr[key].length;
	return cnt;
}

var follow_cache = {};

function ll_calc_follows() {
	for (var non_term in rules) {
		follow_cache[non_term] = [];
	}

	follow_cache[ll_starter].push('eos');
	var prev_size = ll_get_arr_size(follow_cache);

	while (1) {
		for (var non_term in rules) {
			for (var i=0;i<rules[non_term].length;i++) {
				var syms = rules[non_term][i];

				for (var j=0;j<syms.length;j++) {
					var sym = syms[j];
					if (sym in rules) {
						var first = null;
						if (j != syms.length-1) {
							var firsts = ll_get_firsts(syms.slice(j+1));
							follow_cache[sym] = follow_cache[sym].concat_uniq_except_nil(firsts);
						}

						if (j == syms.length-1 || firsts.indexOf(NIL) != -1) {
							follow_cache[sym] = follow_cache[sym].concat_uniq(follow_cache[non_term]);
						}
					}
				}
			}
		}

		var cur_size = ll_get_arr_size(follow_cache);
		if (prev_size == cur_size) break;
		prev_size = cur_size;
	}
}

var rules = {};

function ll_create_table(text) {
	var lines = text.split('\n');

	var starter = '';

	rules = {};
	first_cache = {};
	follow_cache = {};

	for (var i=0;i<lines.length;i++) {
		var line = lines[i].strip();
		if (!line) continue;

		var words = line.split('->', 2);
		if (words.length != 2) return false;

		var non_term = words[0].strip();
		var groups_of_syms = words[1].split('|');

		if (!starter) starter = non_term;

		for (var j=0;j<groups_of_syms.length;j++) {
			var syms = groups_of_syms[j].strip().split(' ');

			if (rules[non_term] == undefined) rules[non_term] = []
			rules[non_term].push(syms);
		}
	}

	if (!starter) return false;

	ll_table = {};
	ll_starter = starter;

	try {
		ll_calc_follows();

		for (var non_term in rules) {
			for (var i=0;i<rules[non_term].length;i++) {
				var syms = rules[non_term][i];
				var terms = ll_get_firsts(syms);

				for (var j=0;j<terms.length;j++) {
					var term = terms[j];
					if (term != NIL) ll_table[non_term+'\0'+(term=='eos'?'':term)] = syms[0] == NIL ? [] : syms; /* FIXME */
				}

				if (terms.indexOf(NIL) != -1) {
					var terms = follow_cache[non_term];
					for (var j=0;j<terms.length;j++) {
						var term = terms[j];
						ll_table[non_term+'\0'+(term=='eos'?'':term)] = syms[0] == NIL ? [] : syms;
					}
				}
			}
		}
	} catch (e) { return false; } /* too much recursion */

	for (var key in ll_table) {
		var arr = ll_table[key].slice();
		arr.reverse();
		ll_table[key] = arr;
	}

//	var text = '';
//	for (var key in ll_table) text += key+' => '+ll_table[key]+'\n';
//	alert(text);

	return true;
}

function ll_tree_repr(node) {
	var res = node.name;
	res += '(';
	for (var i=0;i<node.childs.length;i++) {
		res += ll_tree_repr(node.childs[i]);
	}
	res += ')';
	return res;
}

function ll_parse(toks) {
	stack = [ll_starter];

	tree = {type: ll_starter, name: ll_starter, childs: []};
	tree_stack = [tree];

	while (stack.length) {
		var stack_top = stack.pop();
		var next_inp = toks.length ? toks[0] : {'type': ''};

		var cur_node = tree_stack.pop();

		if (stack_top == next_inp.type) {
			cur_node.tok = next_inp;
			if (cur_node.type == 'num') cur_node.name = cur_node.tok.str;
			else if (cur_node.type == 'id') cur_node.name = cur_node.tok.str;
			toks.shift();
			continue;
		}

		var key = stack_top+'\0'+next_inp.type;
		if (!(key in ll_table)) break;
		var val = ll_table[key];

		var childs = []

		for (var i=0;i<val.length;i++) {
			var x = val[i];

			stack.push(x);

			var node = {type: x, name: x, childs: []};
			tree_stack.push(node);
			childs.push(node);
		}

		childs.reverse();

		if (!childs.length) {
			childs = [{type: NIL, name: 'nil', childs: []}]
		}

		cur_node.childs = childs;
	}

	if (stack.length || toks.length) return false;

	return tree;
}
