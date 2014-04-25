/*
	JavaScript BigInteger2 library version 0.9
	http://silentmatt.com/BigInteger2/

	Copyright (c) 2009 Matthew Crumley <email@matthewcrumley.com>
	Copyright (c) 2010,2011 by John Tobey <John.Tobey@gmail.com>
	Licensed under the MIT license.

	Support for arbitrary internal representation base was added by
	Vitaly Magerya.
*/

/*
	File: BigInteger2.js

	Exports:

		<BigInteger2>
*/
(function(exports) {
"use strict";
/*
	Class: BigInteger2
	An arbitrarily-large integer.

	<BigInteger2> objects should be considered immutable. None of the "built-in"
	methods modify *this* or their arguments. All properties should be
	considered private.

	All the methods of <BigInteger2> instances can be called "statically". The
	static versions are convenient if you don't already have a <BigInteger2>
	object.

	As an example, these calls are equivalent.

	> BigInteger2(4).multiply(5); // returns BigInteger2(20);
	> BigInteger2.multiply(4, 5); // returns BigInteger2(20);

	> var a = 42;
	> var a = BigInteger2.toJSValue("0b101010"); // Not completely useless...
*/

var CONSTRUCT = {}; // Unique token to call "private" version of constructor

/*
	Constructor: BigInteger2()
	Convert a value to a <BigInteger2>.

	Although <BigInteger2()> is the constructor for <BigInteger2> objects, it is
	best not to call it as a constructor. If *n* is a <BigInteger2> object, it is
	simply returned as-is. Otherwise, <BigInteger2()> is equivalent to <parse>
	without a radix argument.

	> var n0 = BigInteger2();      // Same as <BigInteger2.ZERO>
	> var n1 = BigInteger2("123"); // Create a new <BigInteger2> with value 123
	> var n2 = BigInteger2(123);   // Create a new <BigInteger2> with value 123
	> var n3 = BigInteger2(n2);    // Return n2, unchanged

	The constructor form only takes an array and a sign. *n* must be an
	array of numbers in little-endian order, where each digit is between 0
	and BigInteger2.base.  The second parameter sets the sign: -1 for
	negative, +1 for positive, or 0 for zero. The array is *not copied and
	may be modified*. If the array contains only zeros, the sign parameter
	is ignored and is forced to zero.

	> new BigInteger2([5], -1): create a new BigInteger2 with value -5

	Parameters:

		n - Value to convert to a <BigInteger2>.

	Returns:

		A <BigInteger2> value.

	See Also:

		<parse>, <BigInteger2>
*/
function BigInteger2(n, s, token) {
	if (token !== CONSTRUCT) {
		if (n instanceof BigInteger2) {
			return n;
		}
		else if (typeof n === "undefined") {
			return ZERO;
		}
		return BigInteger2.parse(n);
	}

	n = n || [];  // Provide the nullary constructor for subclasses.
	while (n.length && !n[n.length - 1]) {
		--n.length;
	}
	this._d = n;
	this._s = n.length ? (s || 1) : 0;
}

BigInteger2._construct = function(n, s) {
	return new BigInteger2(n, s, CONSTRUCT);
};

// Base-10 speedup hacks in parse, toString, exp10 and log functions
// require base to be a power of 10. 10^7 is the largest such power
// that won't cause a precision loss when digits are multiplied.
var BigInteger2_base = 10000000;
var BigInteger2_base_log10 = 7;

BigInteger2.base = BigInteger2_base;
BigInteger2.base_log10 = BigInteger2_base_log10;

var ZERO = new BigInteger2([], 0, CONSTRUCT);
// Constant: ZERO
// <BigInteger2> 0.
BigInteger2.ZERO = ZERO;

var ONE = new BigInteger2([1], 1, CONSTRUCT);
// Constant: ONE
// <BigInteger2> 1.
BigInteger2.ONE = ONE;

var M_ONE = new BigInteger2(ONE._d, -1, CONSTRUCT);
// Constant: M_ONE
// <BigInteger2> -1.
BigInteger2.M_ONE = M_ONE;

// Constant: _0
// Shortcut for <ZERO>.
BigInteger2._0 = ZERO;

// Constant: _1
// Shortcut for <ONE>.
BigInteger2._1 = ONE;

/*
	Constant: small
	Array of <BigInteger2s> from 0 to 36.

	These are used internally for parsing, but useful when you need a "small"
	<BigInteger2>.

	See Also:

		<ZERO>, <ONE>, <_0>, <_1>
*/
BigInteger2.small = [
	ZERO,
	ONE,
	/* Assuming BigInteger2_base > 36 */
	new BigInteger2( [2], 1, CONSTRUCT),
	new BigInteger2( [3], 1, CONSTRUCT),
	new BigInteger2( [4], 1, CONSTRUCT),
	new BigInteger2( [5], 1, CONSTRUCT),
	new BigInteger2( [6], 1, CONSTRUCT),
	new BigInteger2( [7], 1, CONSTRUCT),
	new BigInteger2( [8], 1, CONSTRUCT),
	new BigInteger2( [9], 1, CONSTRUCT),
	new BigInteger2([10], 1, CONSTRUCT),
	new BigInteger2([11], 1, CONSTRUCT),
	new BigInteger2([12], 1, CONSTRUCT),
	new BigInteger2([13], 1, CONSTRUCT),
	new BigInteger2([14], 1, CONSTRUCT),
	new BigInteger2([15], 1, CONSTRUCT),
	new BigInteger2([16], 1, CONSTRUCT),
	new BigInteger2([17], 1, CONSTRUCT),
	new BigInteger2([18], 1, CONSTRUCT),
	new BigInteger2([19], 1, CONSTRUCT),
	new BigInteger2([20], 1, CONSTRUCT),
	new BigInteger2([21], 1, CONSTRUCT),
	new BigInteger2([22], 1, CONSTRUCT),
	new BigInteger2([23], 1, CONSTRUCT),
	new BigInteger2([24], 1, CONSTRUCT),
	new BigInteger2([25], 1, CONSTRUCT),
	new BigInteger2([26], 1, CONSTRUCT),
	new BigInteger2([27], 1, CONSTRUCT),
	new BigInteger2([28], 1, CONSTRUCT),
	new BigInteger2([29], 1, CONSTRUCT),
	new BigInteger2([30], 1, CONSTRUCT),
	new BigInteger2([31], 1, CONSTRUCT),
	new BigInteger2([32], 1, CONSTRUCT),
	new BigInteger2([33], 1, CONSTRUCT),
	new BigInteger2([34], 1, CONSTRUCT),
	new BigInteger2([35], 1, CONSTRUCT),
	new BigInteger2([36], 1, CONSTRUCT)
];

// Used for parsing/radix conversion
BigInteger2.digits = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/*
	Method: toString
	Convert a <BigInteger2> to a string.

	When *base* is greater than 10, letters are upper case.

	Parameters:

		base - Optional base to represent the number in (default is base 10).
		       Must be between 2 and 36 inclusive, or an Error will be thrown.

	Returns:

		The string representation of the <BigInteger2>.
*/
BigInteger2.prototype.toString = function(base) {
	base = +base || 10;
	if (base < 2 || base > 36) {
		throw new Error("illegal radix " + base + ".");
	}
	if (this._s === 0) {
		return "0";
	}
	if (base === 10) {
		var str = this._s < 0 ? "-" : "";
		str += this._d[this._d.length - 1].toString();
		for (var i = this._d.length - 2; i >= 0; i--) {
			var group = this._d[i].toString();
			while (group.length < BigInteger2_base_log10) group = '0' + group;
			str += group;
		}
		return str;
	}
	else {
		var numerals = BigInteger2.digits;
		base = BigInteger2.small[base];
		var sign = this._s;

		var n = this.abs();
		var digits = [];
		var digit;

		while (n._s !== 0) {
			var divmod = n.divRem(base);
			n = divmod[0];
			digit = divmod[1];
			// TODO: This could be changed to unshift instead of reversing at the end.
			// Benchmark both to compare speeds.
			digits.push(numerals[digit.valueOf()]);
		}
		return (sign < 0 ? "-" : "") + digits.reverse().join("");
	}
};

// Verify strings for parsing
BigInteger2.radixRegex = [
	/^$/,
	/^$/,
	/^[01]*$/,
	/^[012]*$/,
	/^[0-3]*$/,
	/^[0-4]*$/,
	/^[0-5]*$/,
	/^[0-6]*$/,
	/^[0-7]*$/,
	/^[0-8]*$/,
	/^[0-9]*$/,
	/^[0-9aA]*$/,
	/^[0-9abAB]*$/,
	/^[0-9abcABC]*$/,
	/^[0-9a-dA-D]*$/,
	/^[0-9a-eA-E]*$/,
	/^[0-9a-fA-F]*$/,
	/^[0-9a-gA-G]*$/,
	/^[0-9a-hA-H]*$/,
	/^[0-9a-iA-I]*$/,
	/^[0-9a-jA-J]*$/,
	/^[0-9a-kA-K]*$/,
	/^[0-9a-lA-L]*$/,
	/^[0-9a-mA-M]*$/,
	/^[0-9a-nA-N]*$/,
	/^[0-9a-oA-O]*$/,
	/^[0-9a-pA-P]*$/,
	/^[0-9a-qA-Q]*$/,
	/^[0-9a-rA-R]*$/,
	/^[0-9a-sA-S]*$/,
	/^[0-9a-tA-T]*$/,
	/^[0-9a-uA-U]*$/,
	/^[0-9a-vA-V]*$/,
	/^[0-9a-wA-W]*$/,
	/^[0-9a-xA-X]*$/,
	/^[0-9a-yA-Y]*$/,
	/^[0-9a-zA-Z]*$/
];

/*
	Function: parse
	Parse a string into a <BigInteger2>.

	*base* is optional but, if provided, must be from 2 to 36 inclusive. If
	*base* is not provided, it will be guessed based on the leading characters
	of *s* as follows:

	- "0x" or "0X": *base* = 16
	- "0c" or "0C": *base* = 8
	- "0b" or "0B": *base* = 2
	- else: *base* = 10

	If no base is provided, or *base* is 10, the number can be in exponential
	form. For example, these are all valid:

	> BigInteger2.parse("1e9");              // Same as "1000000000"
	> BigInteger2.parse("1.234*10^3");       // Same as 1234
	> BigInteger2.parse("56789 * 10 ** -2"); // Same as 567

	If any characters fall outside the range defined by the radix, an exception
	will be thrown.

	Parameters:

		s - The string to parse.
		base - Optional radix (default is to guess based on *s*).

	Returns:

		a <BigInteger2> instance.
*/
BigInteger2.parse = function(s, base) {
	// Expands a number in exponential form to decimal form.
	// expandExponential("-13.441*10^5") === "1344100";
	// expandExponential("1.12300e-1") === "0.112300";
	// expandExponential(1000000000000000000000000000000) === "1000000000000000000000000000000";
	function expandExponential(str) {
		str = str.replace(/\s*[*xX]\s*10\s*(\^|\*\*)\s*/, "e");

		return str.replace(/^([+\-])?(\d+)\.?(\d*)[eE]([+\-]?\d+)$/, function(x, s, n, f, c) {
			c = +c;
			var l = c < 0;
			var i = n.length + c;
			x = (l ? n : f).length;
			c = ((c = Math.abs(c)) >= x ? c - x + l : 0);
			var z = (new Array(c + 1)).join("0");
			var r = n + f;
			return (s || "") + (l ? r = z + r : r += z).substr(0, i += l ? z.length : 0) + (i < r.length ? "." + r.substr(i) : "");
		});
	}

	s = s.toString();
	if (typeof base === "undefined" || +base === 10) {
		s = expandExponential(s);
	}

	var prefixRE;
	if (typeof base === "undefined") {
		prefixRE = '0[xcb]';
	}
	else if (base == 16) {
		prefixRE = '0x';
	}
	else if (base == 8) {
		prefixRE = '0c';
	}
	else if (base == 2) {
		prefixRE = '0b';
	}
	else {
		prefixRE = '';
	}
	var parts = new RegExp('^([+\\-]?)(' + prefixRE + ')?([0-9a-z]*)(?:\\.\\d*)?$', 'i').exec(s);
	if (parts) {
		var sign = parts[1] || "+";
		var baseSection = parts[2] || "";
		var digits = parts[3] || "";

		if (typeof base === "undefined") {
			// Guess base
			if (baseSection === "0x" || baseSection === "0X") { // Hex
				base = 16;
			}
			else if (baseSection === "0c" || baseSection === "0C") { // Octal
				base = 8;
			}
			else if (baseSection === "0b" || baseSection === "0B") { // Binary
				base = 2;
			}
			else {
				base = 10;
			}
		}
		else if (base < 2 || base > 36) {
			throw new Error("Illegal radix " + base + ".");
		}

		base = +base;

		// Check for digits outside the range
		if (!(BigInteger2.radixRegex[base].test(digits))) {
			throw new Error("Bad digit for radix " + base);
		}

		// Strip leading zeros, and convert to array
		digits = digits.replace(/^0+/, "").split("");
		if (digits.length === 0) {
			return ZERO;
		}

		// Get the sign (we know it's not zero)
		sign = (sign === "-") ? -1 : 1;

		// Optimize 10
		if (base == 10) {
			var d = [];
			while (digits.length >= BigInteger2_base_log10) {
				d.push(parseInt(digits.splice(digits.length-BigInteger2.base_log10, BigInteger2.base_log10).join(''), 10));
			}
			d.push(parseInt(digits.join(''), 10));
			return new BigInteger2(d, sign, CONSTRUCT);
		}

		// Do the conversion
		var d = ZERO;
		base = BigInteger2.small[base];
		var small = BigInteger2.small;
		for (var i = 0; i < digits.length; i++) {
			d = d.multiply(base).add(small[parseInt(digits[i], 36)]);
		}
		return new BigInteger2(d._d, sign, CONSTRUCT);
	}
	else {
		throw new Error("Invalid BigInteger2 format: " + s);
	}
};

/*
	Function: add
	Add two <BigInteger2s>.

	Parameters:

		n - The number to add to *this*. Will be converted to a <BigInteger2>.

	Returns:

		The numbers added together.

	See Also:

		<subtract>, <multiply>, <quotient>, <next>
*/
BigInteger2.prototype.add = function(n) {
	if (this._s === 0) {
		return BigInteger2(n);
	}

	n = BigInteger2(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.subtract(n);
	}

	var a = this._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var sum = new Array(Math.max(al, bl) + 1);
	var size = Math.min(al, bl);
	var carry = 0;
	var digit;

	for (var i = 0; i < size; i++) {
		digit = a[i] + b[i] + carry;
		sum[i] = digit % BigInteger2_base;
		carry = (digit / BigInteger2_base) | 0;
	}
	if (bl > al) {
		a = b;
		al = bl;
	}
	for (i = size; carry && i < al; i++) {
		digit = a[i] + carry;
		sum[i] = digit % BigInteger2_base;
		carry = (digit / BigInteger2_base) | 0;
	}
	if (carry) {
		sum[i] = carry;
	}

	for ( ; i < al; i++) {
		sum[i] = a[i];
	}

	return new BigInteger2(sum, this._s, CONSTRUCT);
};

/*
	Function: negate
	Get the additive inverse of a <BigInteger2>.

	Returns:

		A <BigInteger2> with the same magnatude, but with the opposite sign.

	See Also:

		<abs>
*/
BigInteger2.prototype.negate = function() {
	return new BigInteger2(this._d, (-this._s) | 0, CONSTRUCT);
};

/*
	Function: abs
	Get the absolute value of a <BigInteger2>.

	Returns:

		A <BigInteger2> with the same magnatude, but always positive (or zero).

	See Also:

		<negate>
*/
BigInteger2.prototype.abs = function() {
	return (this._s < 0) ? this.negate() : this;
};

/*
	Function: subtract
	Subtract two <BigInteger2s>.

	Parameters:

		n - The number to subtract from *this*. Will be converted to a <BigInteger2>.

	Returns:

		The *n* subtracted from *this*.

	See Also:

		<add>, <multiply>, <quotient>, <prev>
*/
BigInteger2.prototype.subtract = function(n) {
	if (this._s === 0) {
		return BigInteger2(n).negate();
	}

	n = BigInteger2(n);
	if (n._s === 0) {
		return this;
	}
	if (this._s !== n._s) {
		n = n.negate();
		return this.add(n);
	}

	var m = this;
	// negative - negative => -|a| - -|b| => -|a| + |b| => |b| - |a|
	if (this._s < 0) {
		m = new BigInteger2(n._d, 1, CONSTRUCT);
		n = new BigInteger2(this._d, 1, CONSTRUCT);
	}

	// Both are positive => a - b
	var sign = m.compareAbs(n);
	if (sign === 0) {
		return ZERO;
	}
	else if (sign < 0) {
		// swap m and n
		var t = n;
		n = m;
		m = t;
	}

	// a > b
	var a = m._d;
	var b = n._d;
	var al = a.length;
	var bl = b.length;
	var diff = new Array(al); // al >= bl since a > b
	var borrow = 0;
	var i;
	var digit;

	for (i = 0; i < bl; i++) {
		digit = a[i] - borrow - b[i];
		if (digit < 0) {
			digit += BigInteger2_base;
			borrow = 1;
		}
		else {
			borrow = 0;
		}
		diff[i] = digit;
	}
	for (i = bl; i < al; i++) {
		digit = a[i] - borrow;
		if (digit < 0) {
			digit += BigInteger2_base;
		}
		else {
			diff[i++] = digit;
			break;
		}
		diff[i] = digit;
	}
	for ( ; i < al; i++) {
		diff[i] = a[i];
	}

	return new BigInteger2(diff, sign, CONSTRUCT);
};

(function() {
	function addOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var carry = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) + 1;
			sum[i] = digit % BigInteger2_base;
			if (digit <= BigInteger2_base - 1) {
				break;
			}
			++i;
		}

		return new BigInteger2(sum, sign, CONSTRUCT);
	}

	function subtractOne(n, sign) {
		var a = n._d;
		var sum = a.slice();
		var borrow = true;
		var i = 0;

		while (true) {
			var digit = (a[i] || 0) - 1;
			if (digit < 0) {
				sum[i] = digit + BigInteger2_base;
			}
			else {
				sum[i] = digit;
				break;
			}
			++i;
		}

		return new BigInteger2(sum, sign, CONSTRUCT);
	}

	/*
		Function: next
		Get the next <BigInteger2> (add one).

		Returns:

			*this* + 1.

		See Also:

			<add>, <prev>
	*/
	BigInteger2.prototype.next = function() {
		switch (this._s) {
		case 0:
			return ONE;
		case -1:
			return subtractOne(this, -1);
		// case 1:
		default:
			return addOne(this, 1);
		}
	};

	/*
		Function: prev
		Get the previous <BigInteger2> (subtract one).

		Returns:

			*this* - 1.

		See Also:

			<next>, <subtract>
	*/
	BigInteger2.prototype.prev = function() {
		switch (this._s) {
		case 0:
			return M_ONE;
		case -1:
			return addOne(this, -1);
		// case 1:
		default:
			return subtractOne(this, 1);
		}
	};
})();

/*
	Function: compareAbs
	Compare the absolute value of two <BigInteger2s>.

	Calling <compareAbs> is faster than calling <abs> twice, then <compare>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger2>.

	Returns:

		-1, 0, or +1 if *|this|* is less than, equal to, or greater than *|n|*.

	See Also:

		<compare>, <abs>
*/
BigInteger2.prototype.compareAbs = function(n) {
	if (this === n) {
		return 0;
	}

	if (!(n instanceof BigInteger2)) {
		if (!isFinite(n)) {
			return(isNaN(n) ? n : -1);
		}
		n = BigInteger2(n);
	}

	if (this._s === 0) {
		return (n._s !== 0) ? -1 : 0;
	}
	if (n._s === 0) {
		return 1;
	}

	var l = this._d.length;
	var nl = n._d.length;
	if (l < nl) {
		return -1;
	}
	else if (l > nl) {
		return 1;
	}

	var a = this._d;
	var b = n._d;
	for (var i = l-1; i >= 0; i--) {
		if (a[i] !== b[i]) {
			return a[i] < b[i] ? -1 : 1;
		}
	}

	return 0;
};

/*
	Function: compare
	Compare two <BigInteger2s>.

	Parameters:

		n - The number to compare to *this*. Will be converted to a <BigInteger2>.

	Returns:

		-1, 0, or +1 if *this* is less than, equal to, or greater than *n*.

	See Also:

		<compareAbs>, <isPositive>, <isNegative>, <isUnit>
*/
BigInteger2.prototype.compare = function(n) {
	if (this === n) {
		return 0;
	}

	n = BigInteger2(n);

	if (this._s === 0) {
		return -n._s;
	}

	if (this._s === n._s) { // both positive or both negative
		var cmp = this.compareAbs(n);
		return cmp * this._s;
	}
	else {
		return this._s;
	}
};

/*
	Function: isUnit
	Return true iff *this* is either 1 or -1.

	Returns:

		true if *this* compares equal to <BigInteger2.ONE> or <BigInteger2.M_ONE>.

	See Also:

		<isZero>, <isNegative>, <isPositive>, <compareAbs>, <compare>,
		<BigInteger2.ONE>, <BigInteger2.M_ONE>
*/
BigInteger2.prototype.isUnit = function() {
	return this === ONE ||
		this === M_ONE ||
		(this._d.length === 1 && this._d[0] === 1);
};

/*
	Function: multiply
	Multiply two <BigInteger2s>.

	Parameters:

		n - The number to multiply *this* by. Will be converted to a
		<BigInteger2>.

	Returns:

		The numbers multiplied together.

	See Also:

		<add>, <subtract>, <quotient>, <square>
*/
BigInteger2.prototype.multiply = function(n) {
	// TODO: Consider adding Karatsuba multiplication for large numbers
	if (this._s === 0) {
		return ZERO;
	}

	n = BigInteger2(n);
	if (n._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		if (this._s < 0) {
			return n.negate();
		}
		return n;
	}
	if (n.isUnit()) {
		if (n._s < 0) {
			return this.negate();
		}
		return this;
	}
	if (this === n) {
		return this.square();
	}

	var r = (this._d.length >= n._d.length);
	var a = (r ? this : n)._d; // a will be longer than b
	var b = (r ? n : this)._d;
	var al = a.length;
	var bl = b.length;

	var pl = al + bl;
	var partial = new Array(pl);
	var i;
	for (i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	for (i = 0; i < bl; i++) {
		var carry = 0;
		var bi = b[i];
		var jlimit = al + i;
		var digit;
		for (var j = i; j < jlimit; j++) {
			digit = partial[j] + bi * a[j - i] + carry;
			carry = (digit / BigInteger2_base) | 0;
			partial[j] = (digit % BigInteger2_base) | 0;
		}
		if (carry) {
			digit = partial[j] + carry;
			carry = (digit / BigInteger2_base) | 0;
			partial[j] = digit % BigInteger2_base;
		}
	}
	return new BigInteger2(partial, this._s * n._s, CONSTRUCT);
};

// Multiply a BigInteger2 by a single-digit native number
// Assumes that this and n are >= 0
// This is not really intended to be used outside the library itself
BigInteger2.prototype.multiplySingleDigit = function(n) {
	if (n === 0 || this._s === 0) {
		return ZERO;
	}
	if (n === 1) {
		return this;
	}

	var digit;
	if (this._d.length === 1) {
		digit = this._d[0] * n;
		if (digit >= BigInteger2_base) {
			return new BigInteger2([(digit % BigInteger2_base)|0,
					(digit / BigInteger2_base)|0], 1, CONSTRUCT);
		}
		return new BigInteger2([digit], 1, CONSTRUCT);
	}

	if (n === 2) {
		return this.add(this);
	}
	if (this.isUnit()) {
		return new BigInteger2([n], 1, CONSTRUCT);
	}

	var a = this._d;
	var al = a.length;

	var pl = al + 1;
	var partial = new Array(pl);
	for (var i = 0; i < pl; i++) {
		partial[i] = 0;
	}

	var carry = 0;
	for (var j = 0; j < al; j++) {
		digit = n * a[j] + carry;
		carry = (digit / BigInteger2_base) | 0;
		partial[j] = (digit % BigInteger2_base) | 0;
	}
	if (carry) {
		partial[j] = carry;
	}

	return new BigInteger2(partial, 1, CONSTRUCT);
};

/*
	Function: square
	Multiply a <BigInteger2> by itself.

	This is slightly faster than regular multiplication, since it removes the
	duplicated multiplcations.

	Returns:

		> this.multiply(this)

	See Also:
		<multiply>
*/
BigInteger2.prototype.square = function() {
	// Normally, squaring a 10-digit number would take 100 multiplications.
	// Of these 10 are unique diagonals, of the remaining 90 (100-10), 45 are repeated.
	// This procedure saves (N*(N-1))/2 multiplications, (e.g., 45 of 100 multiplies).
	// Based on code by Gary Darby, Intellitech Systems Inc., www.DelphiForFun.org

	if (this._s === 0) {
		return ZERO;
	}
	if (this.isUnit()) {
		return ONE;
	}

	var digits = this._d;
	var length = digits.length;
	var imult1 = new Array(length + length + 1);
	var product, carry, k;
	var i;

	// Calculate diagonal
	for (i = 0; i < length; i++) {
		k = i * 2;
		product = digits[i] * digits[i];
		carry = (product / BigInteger2_base) | 0;
		imult1[k] = product % BigInteger2_base;
		imult1[k + 1] = carry;
	}

	// Calculate repeating part
	for (i = 0; i < length; i++) {
		carry = 0;
		k = i * 2 + 1;
		for (var j = i + 1; j < length; j++, k++) {
			product = digits[j] * digits[i] * 2 + imult1[k] + carry;
			carry = (product / BigInteger2_base) | 0;
			imult1[k] = product % BigInteger2_base;
		}
		k = length + i;
		var digit = carry + imult1[k];
		carry = (digit / BigInteger2_base) | 0;
		imult1[k] = digit % BigInteger2_base;
		imult1[k + 1] += carry;
	}

	return new BigInteger2(imult1, 1, CONSTRUCT);
};

/*
	Function: quotient
	Divide two <BigInteger2s> and truncate towards zero.

	<quotient> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger2>.

	Returns:

		The *this* / *n*, truncated to an integer.

	See Also:

		<add>, <subtract>, <multiply>, <divRem>, <remainder>
*/
BigInteger2.prototype.quotient = function(n) {
	return this.divRem(n)[0];
};

/*
	Function: divide
	Deprecated synonym for <quotient>.
*/
BigInteger2.prototype.divide = BigInteger2.prototype.quotient;

/*
	Function: remainder
	Calculate the remainder of two <BigInteger2s>.

	<remainder> throws an exception if *n* is zero.

	Parameters:

		n - The remainder after *this* is divided *this* by *n*. Will be
		    converted to a <BigInteger2>.

	Returns:

		*this* % *n*.

	See Also:

		<divRem>, <quotient>
*/
BigInteger2.prototype.remainder = function(n) {
	return this.divRem(n)[1];
};

/*
	Function: divRem
	Calculate the integer quotient and remainder of two <BigInteger2s>.

	<divRem> throws an exception if *n* is zero.

	Parameters:

		n - The number to divide *this* by. Will be converted to a <BigInteger2>.

	Returns:

		A two-element array containing the quotient and the remainder.

		> a.divRem(b)

		is exactly equivalent to

		> [a.quotient(b), a.remainder(b)]

		except it is faster, because they are calculated at the same time.

	See Also:

		<quotient>, <remainder>
*/
BigInteger2.prototype.divRem = function(n) {
	n = BigInteger2(n);
	if (n._s === 0) {
		throw new Error("Divide by zero");
	}
	if (this._s === 0) {
		return [ZERO, ZERO];
	}
	if (n._d.length === 1) {
		return this.divRemSmall(n._s * n._d[0]);
	}

	// Test for easy cases -- |n1| <= |n2|
	switch (this.compareAbs(n)) {
	case 0: // n1 == n2
		return [this._s === n._s ? ONE : M_ONE, ZERO];
	case -1: // |n1| < |n2|
		return [ZERO, this];
	}

	var sign = this._s * n._s;
	var a = n.abs();
	var b_digits = this._d;
	var b_index = b_digits.length;
	var digits = n._d.length;
	var quot = [];
	var guess;

	var part = new BigInteger2([], 0, CONSTRUCT);
	part._s = 1;

	while (b_index) {
		part._d.unshift(b_digits[--b_index]);

		if (part.compareAbs(n) < 0) {
			quot.push(0);
			continue;
		}
		if (part._s === 0) {
			guess = 0;
		}
		else {
			var xlen = part._d.length, ylen = a._d.length;
			var highx = part._d[xlen-1]*BigInteger2_base + part._d[xlen-2];
			var highy = a._d[ylen-1]*BigInteger2_base + a._d[ylen-2];
			if (part._d.length > a._d.length) {
				// The length of part._d can either match a._d length,
				// or exceed it by one.
				highx = (highx+1)*BigInteger2_base;
			}
			guess = Math.ceil(highx/highy);
		}
		do {
			var check = a.multiplySingleDigit(guess);
			if (check.compareAbs(part) <= 0) {
				break;
			}
			guess--;
		} while (guess);

		quot.push(guess);
		if (!guess) {
			continue;
		}
		var diff = part.subtract(check);
		part._d = diff._d.slice();
		if (part._d.length === 0) {
			part._s = 0;
		}
	}

	return [new BigInteger2(quot.reverse(), sign, CONSTRUCT),
		   new BigInteger2(part._d, this._s, CONSTRUCT)];
};

// Throws an exception if n is outside of (-BigInteger2.base, -1] or
// [1, BigInteger2.base).  It's not necessary to call this, since the
// other division functions will call it if they are able to.
BigInteger2.prototype.divRemSmall = function(n) {
	var r;
	n = +n;
	if (n === 0) {
		throw new Error("Divide by zero");
	}

	var n_s = n < 0 ? -1 : 1;
	var sign = this._s * n_s;
	n = Math.abs(n);

	if (n < 1 || n >= BigInteger2_base) {
		throw new Error("Argument out of range");
	}

	if (this._s === 0) {
		return [ZERO, ZERO];
	}

	if (n === 1 || n === -1) {
		return [(sign === 1) ? this.abs() : new BigInteger2(this._d, sign, CONSTRUCT), ZERO];
	}

	// 2 <= n < BigInteger2_base

	// divide a single digit by a single digit
	if (this._d.length === 1) {
		var q = new BigInteger2([(this._d[0] / n) | 0], 1, CONSTRUCT);
		r = new BigInteger2([(this._d[0] % n) | 0], 1, CONSTRUCT);
		if (sign < 0) {
			q = q.negate();
		}
		if (this._s < 0) {
			r = r.negate();
		}
		return [q, r];
	}

	var digits = this._d.slice();
	var quot = new Array(digits.length);
	var part = 0;
	var diff = 0;
	var i = 0;
	var guess;

	while (digits.length) {
		part = part * BigInteger2_base + digits[digits.length - 1];
		if (part < n) {
			quot[i++] = 0;
			digits.pop();
			diff = BigInteger2_base * diff + part;
			continue;
		}
		if (part === 0) {
			guess = 0;
		}
		else {
			guess = (part / n) | 0;
		}

		var check = n * guess;
		diff = part - check;
		quot[i++] = guess;
		if (!guess) {
			digits.pop();
			continue;
		}

		digits.pop();
		part = diff;
	}

	r = new BigInteger2([diff], 1, CONSTRUCT);
	if (this._s < 0) {
		r = r.negate();
	}
	return [new BigInteger2(quot.reverse(), sign, CONSTRUCT), r];
};

/*
	Function: isEven
	Return true iff *this* is divisible by two.

	Note that <BigInteger2.ZERO> is even.

	Returns:

		true if *this* is even, false otherwise.

	See Also:

		<isOdd>
*/
BigInteger2.prototype.isEven = function() {
	var digits = this._d;
	return this._s === 0 || digits.length === 0 || (digits[0] % 2) === 0;
};

/*
	Function: isOdd
	Return true iff *this* is not divisible by two.

	Returns:

		true if *this* is odd, false otherwise.

	See Also:

		<isEven>
*/
BigInteger2.prototype.isOdd = function() {
	return !this.isEven();
};

/*
	Function: sign
	Get the sign of a <BigInteger2>.

	Returns:

		* -1 if *this* < 0
		* 0 if *this* == 0
		* +1 if *this* > 0

	See Also:

		<isZero>, <isPositive>, <isNegative>, <compare>, <BigInteger2.ZERO>
*/
BigInteger2.prototype.sign = function() {
	return this._s;
};

/*
	Function: isPositive
	Return true iff *this* > 0.

	Returns:

		true if *this*.compare(<BigInteger2.ZERO>) == 1.

	See Also:

		<sign>, <isZero>, <isNegative>, <isUnit>, <compare>, <BigInteger2.ZERO>
*/
BigInteger2.prototype.isPositive = function() {
	return this._s > 0;
};

/*
	Function: isNegative
	Return true iff *this* < 0.

	Returns:

		true if *this*.compare(<BigInteger2.ZERO>) == -1.

	See Also:

		<sign>, <isPositive>, <isZero>, <isUnit>, <compare>, <BigInteger2.ZERO>
*/
BigInteger2.prototype.isNegative = function() {
	return this._s < 0;
};

/*
	Function: isZero
	Return true iff *this* == 0.

	Returns:

		true if *this*.compare(<BigInteger2.ZERO>) == 0.

	See Also:

		<sign>, <isPositive>, <isNegative>, <isUnit>, <BigInteger2.ZERO>
*/
BigInteger2.prototype.isZero = function() {
	return this._s === 0;
};

/*
	Function: exp10
	Multiply a <BigInteger2> by a power of 10.

	This is equivalent to, but faster than

	> if (n >= 0) {
	>     return this.multiply(BigInteger2("1e" + n));
	> }
	> else { // n <= 0
	>     return this.quotient(BigInteger2("1e" + -n));
	> }

	Parameters:

		n - The power of 10 to multiply *this* by. *n* is converted to a
		javascipt number and must be no greater than <BigInteger2.MAX_EXP>
		(0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* * (10 ** *n*), truncated to an integer if necessary.

	See Also:

		<pow>, <multiply>
*/
BigInteger2.prototype.exp10 = function(n) {
	n = +n;
	if (n === 0) {
		return this;
	}
	if (Math.abs(n) > Number(MAX_EXP)) {
		throw new Error("exponent too large in BigInteger2.exp10");
	}
	if (n > 0) {
		var k = new BigInteger2(this._d.slice(), this._s, CONSTRUCT);

		for (; n >= BigInteger2_base_log10; n -= BigInteger2_base_log10) {
			k._d.unshift(0);
		}
		if (n == 0)
			return k;
		k._s = 1;
		k = k.multiplySingleDigit(Math.pow(10, n));
		return (this._s < 0 ? k.negate() : k);
	} else if (-n >= this._d.length*BigInteger2_base_log10) {
		return ZERO;
	} else {
		var k = new BigInteger2(this._d.slice(), this._s, CONSTRUCT);

		for (n = -n; n >= BigInteger2_base_log10; n -= BigInteger2_base_log10) {
			k._d.shift();
		}
		return (n == 0) ? k : k.divRemSmall(Math.pow(10, n))[0];
	}
};

/*
	Function: pow
	Raise a <BigInteger2> to a power.

	In this implementation, 0**0 is 1.

	Parameters:

		n - The exponent to raise *this* by. *n* must be no greater than
		<BigInteger2.MAX_EXP> (0x7FFFFFFF), or an exception will be thrown.

	Returns:

		*this* raised to the *nth* power.

	See Also:

		<modPow>
*/
BigInteger2.prototype.pow = function(n) {
	if (this.isUnit()) {
		if (this._s > 0) {
			return this;
		}
		else {
			return BigInteger2(n).isOdd() ? this : this.negate();
		}
	}

	n = BigInteger2(n);
	if (n._s === 0) {
		return ONE;
	}
	else if (n._s < 0) {
		if (this._s === 0) {
			throw new Error("Divide by zero");
		}
		else {
			return ZERO;
		}
	}
	if (this._s === 0) {
		return ZERO;
	}
	if (n.isUnit()) {
		return this;
	}

	if (n.compareAbs(MAX_EXP) > 0) {
		throw new Error("exponent too large in BigInteger2.pow");
	}
	var x = this;
	var aux = ONE;
	var two = BigInteger2.small[2];

	while (n.isPositive()) {
		if (n.isOdd()) {
			aux = aux.multiply(x);
			if (n.isUnit()) {
				return aux;
			}
		}
		x = x.square();
		n = n.quotient(two);
	}

	return aux;
};

/*
	Function: modPow
	Raise a <BigInteger2> to a power (mod m).

	Because it is reduced by a modulus, <modPow> is not limited by
	<BigInteger2.MAX_EXP> like <pow>.

	Parameters:

		exponent - The exponent to raise *this* by. Must be positive.
		modulus - The modulus.

	Returns:

		*this* ^ *exponent* (mod *modulus*).

	See Also:

		<pow>, <mod>
*/
BigInteger2.prototype.modPow = function(exponent, modulus) {
	var result = ONE;
	var base = this;

	while (exponent.isPositive()) {
		if (exponent.isOdd()) {
			result = result.multiply(base).remainder(modulus);
		}

		exponent = exponent.quotient(BigInteger2.small[2]);
		if (exponent.isPositive()) {
			base = base.square().remainder(modulus);
		}
	}

	return result;
};

/*
	Function: log
	Get the natural logarithm of a <BigInteger2> as a native JavaScript number.

	This is equivalent to

	> Math.log(this.toJSValue())

	but handles values outside of the native number range.

	Returns:

		log( *this* )

	See Also:

		<toJSValue>
*/
BigInteger2.prototype.log = function() {
	switch (this._s) {
	case 0:	 return -Infinity;
	case -1: return NaN;
	default: // Fall through.
	}

	var l = this._d.length;

	if (l*BigInteger2_base_log10 < 30) {
		return Math.log(this.valueOf());
	}

	var N = Math.ceil(30/BigInteger2_base_log10);
	var firstNdigits = this._d.slice(l - N);
	return Math.log((new BigInteger2(firstNdigits, 1, CONSTRUCT)).valueOf()) + (l - N) * Math.log(BigInteger2_base);
};

/*
	Function: valueOf
	Convert a <BigInteger2> to a native JavaScript integer.

	This is called automatically by JavaScipt to convert a <BigInteger2> to a
	native value.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <toJSValue>
*/
BigInteger2.prototype.valueOf = function() {
	return parseInt(this.toString(), 10);
};

/*
	Function: toJSValue
	Convert a <BigInteger2> to a native JavaScript integer.

	This is the same as valueOf, but more explicitly named.

	Returns:

		> parseInt(this.toString(), 10)

	See Also:

		<toString>, <valueOf>
*/
BigInteger2.prototype.toJSValue = function() {
	return parseInt(this.toString(), 10);
};

var MAX_EXP = BigInteger2(0x7FFFFFFF);
// Constant: MAX_EXP
// The largest exponent allowed in <pow> and <exp10> (0x7FFFFFFF or 2147483647).
BigInteger2.MAX_EXP = MAX_EXP;

(function() {
	function makeUnary(fn) {
		return function(a) {
			return fn.call(BigInteger2(a));
		};
	}

	function makeBinary(fn) {
		return function(a, b) {
			return fn.call(BigInteger2(a), BigInteger2(b));
		};
	}

	function makeTrinary(fn) {
		return function(a, b, c) {
			return fn.call(BigInteger2(a), BigInteger2(b), BigInteger2(c));
		};
	}

	(function() {
		var i, fn;
		var unary = "toJSValue,isEven,isOdd,sign,isZero,isNegative,abs,isUnit,square,negate,isPositive,toString,next,prev,log".split(",");
		var binary = "compare,remainder,divRem,subtract,add,quotient,divide,multiply,pow,compareAbs".split(",");
		var trinary = ["modPow"];

		for (i = 0; i < unary.length; i++) {
			fn = unary[i];
			BigInteger2[fn] = makeUnary(BigInteger2.prototype[fn]);
		}

		for (i = 0; i < binary.length; i++) {
			fn = binary[i];
			BigInteger2[fn] = makeBinary(BigInteger2.prototype[fn]);
		}

		for (i = 0; i < trinary.length; i++) {
			fn = trinary[i];
			BigInteger2[fn] = makeTrinary(BigInteger2.prototype[fn]);
		}

		BigInteger2.exp10 = function(x, n) {
			return BigInteger2(x).exp10(n);
		};
	})();
})();

exports.BigInteger2 = BigInteger2;
})(typeof exports !== 'undefined' ? exports : this);

