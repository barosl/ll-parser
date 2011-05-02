function lexer_open(stc) {
	return {stc: stc, stc_pos: 0};
}

var syms = [];

function get_sym_idx(name) {
	var i;

	for (i=0;i<syms.length;i++) {
		if (syms[i].name == name) break;
	}

	if (i == syms.length) {
		syms.push({name: name});
	}

	return i;
}

var kws = [
	'if', 'else', 'while', 'do', 'for', 'typedef', 'struct', 'int', 'char', 'float',
	'double', 'void', 'return', 'static', 'enum', 'continue', 'break', 'unsigned', 'sizeof', 'goto',
	'short', 'const', 'extern', 'case', 'long', 'switch', 'default', 'union',
];

function get_kw_idx(name) {
	for (var i=0;i<kws.length;i++) {
		if (kws[i] == name) return i;
	}

	return -1;
}

function lexer_get_next_tok(handle) {
	var state = 0;
	var buf = '';
	var num_int, num_frac, num_frac_unit, num_exp, num_exp_sign;

	tok = {};

	while (1) {
		var ch = handle.stc[handle.stc_pos++];
		if (ch == undefined) ch = '\0'; /* FIXME: Only in lexer.js */
		buf += ch;

		switch (state) {
			case 0:
				buf = ch;

				if (ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r') {
					/* Nothing done here */

				} else if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_') {
					state = 1;

				} else if (ch == '/') {
					state = 2;

				} else if (ch == '#') {
					state = 3; /* Preprocessor indicator: Delegates the process to '//' state */

				} else if (ch == '"') {
//					buf = '';

					state = 6;

				} else if (ch == '(') {
					tok.type = '(';//'par_1';
					return tok;

				} else if (ch == ')') {
					tok.type = ')';//'par_2';
					return tok;

				} else if (ch == '{') {
					tok.type = '{';//'brace_1';
					return tok;

				} else if (ch == '}') {
					tok.type = '}';//'brace_2';
					return tok;

				} else if (ch == '[') {
					tok.type = '[';//'bracket_1';
					return tok;

				} else if (ch == ']') {
					tok.type = ']';//'bracket_2';
					return tok;

				} else if (ch == '*') {
					state = 25;

				} else if (ch == '=') {
					state = 12;

				} else if (ch >= '0' && ch <= '9') {
					num_int = parseInt(ch);
					num_frac = 0;
					num_frac_unit = 1;
					num_exp = 0;
					num_exp_sign = 1;

					state = 7;

				} else if (ch == ';') {
					tok.type = ';';//'semic';
					return tok;

				} else if (ch == ',') {
					tok.type = ',';//'comma';
					return tok;

				} else if (ch == '\'') {
					state = 13;

				} else if (ch == '+') {
					state = 16;

				} else if (ch == '!') {
					state = 17;

				} else if (ch == '-') {
					state = 18;

				} else if (ch == '&') {
					state = 19;

				} else if (ch == '|') {
					state = 20;

				} else if (ch == '<') {
					state = 21;

				} else if (ch == '>') {
					state = 22;

				} else if (ch == '?') {
					tok.type = '?';//'ques';
					return tok;

				} else if (ch == ':') {
					tok.type = ':';//'colon';
					return tok;

				} else if (ch == '.') {
					tok.type = '.';//'dot';
					return tok;

				} else if (ch == '%') {
					state = 23;

				} else if (ch == '^') {
					state = 24;

				} else if (ch == '\0') {
					tok.type = 'eof';
					return tok;

				} else {
					alert('Unrecognized: '+ch);
					return null;
				}

				break;

			case 1: /* Identifier tok */
				if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch == '_' || (ch >= '0' && ch <= '9')) {
//					buf += ch;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					var idx = get_kw_idx(buf);
					if (idx != -1) {
						tok.type = 'kw';
						tok.num = idx;
						tok.str = buf; /* FIXME: Only in lexer.js */
						return tok;
					} else {
						idx = get_sym_idx(buf);
						if (idx == -1) return null;

						tok.type = 'id';
						tok.num = idx;
						tok.str = buf; /* FIXME: Only in lexer.js */
						return tok;
					}
				}
				break;

			case 2: /* Starts with '/' */
				if (ch == '/') {
					tok.num = '/';
					cb(1, tok, user_data);
					cb(1, tok, user_data);

					state = 3;
				} else if (ch == '*') {
					tok.num = '/';
					cb(1, tok, user_data);
					tok.num = '*';
					cb(1, tok, user_data);

					state = 4;
				} else if (ch == '=') {
					tok.type = '/=';//'div_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '/';//'div';
					return tok;
				}
				break;

			case 3: /* Starts with '//' */
				if (ch == '\n' || ch == '\r') {
					state = 0;
				} else if (ch == EOF) {
					tok.type = 'eof';
					return tok;
				}

				tok.num = ch;
				cb(1, tok, user_data);

				break;

			case 4: /* Starts with '/*' */
				if (ch == '*') state = 5;
				else if (ch == EOF) {
					tok.type = 'eof';
					return tok;
				}

				tok.num = ch;
				cb(1, tok, user_data);

				break;

			case 5: /* Ends with '*' */
				if (ch == '/') {
					tok.num = ch;
					cb(1, tok, user_data);

					state = 0;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 4;
				}

				break;

			case 6: /* String tok */
				if (ch == '"') {
					buf = buf.substr(1, buf.length-2);
					tok.type = 'str';
//3					buf_pos[-1] = '"'; /* FIXME */
//					*buf_pos++ = ch;
					return tok;
				} else {
//					*buf_pos++ = ch;
				}
				break;

			case 7: /* Numeric token: Integer part */
				if (ch >= '0' && ch <= '9') {
					num_int = num_int*10 + parseInt(ch);
				} else if (ch == '.') {
					state = 8;
				} else if (ch == 'e' || ch == 'E') {
					state = 9;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 11;
				}
				break;

			case 8: /* Numeric token: Fraction part */
				if (ch >= '0' && ch <= '9') {
					num_frac_unit /= 10;
					num_frac += num_frac_unit*parseInt(ch);
				} else if (ch == 'e' || ch == 'E') {
					state = 9;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 11;
				}
				break;

			case 9: /* Numeric token: Exponent part */
				if (ch == '+' || ch == '-') {
					num_exp_sign = ch == '-' ? -1 : 1;

					state = 10;
				} else if (ch >= '0' && ch <= '9') {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 10;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 11;
				}
				break;

			case 10: /* Numeric token: Exponent part after sign */
				if (ch >= '0' && ch <= '9') {
					num_exp = num_exp*10 + parseInt(ch);
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					state = 11;
				}
				break;

			case 11: /* Numeric token: Synthesize the parts */
				handle.stc_pos--;
				buf = buf.substr(0, buf.length-1);

				tok.type = 'num';
				if (num_frac || num_exp) {
					tok.num = 1;
					tok.str = (num_int + num_frac)*Math.pow(10.0, num_exp*num_exp_sign);
				} else {
					tok.num = 0;
					tok.str = num_int;
				}
				return tok;
				break;

			case 12: /* Starts with '=' */
				if (ch == '=') {
					tok.type = '==';//'rop';
//					tok.num = ROP_EQ;
					tok.str = '=='; /* FIXME: Only in lexer.js */
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '=';//'assign';
					return tok;
				}
				break;

			case 13: /* Starts with '\'' */
				if (ch == '\'') return 2;
				else if (ch == '\\') state = 14;
				else {
					buf = ch;
					state = 15;
				}
				break;

			case 14: /* Starts with '\'\\' */
				if (ch == 'a') buf = '\a';
				else if (ch == 'b') buf = '\b';
				else if (ch == 'n') buf = '\n';
				else if (ch == 'r') buf = '\r';
				else if (ch == '0') buf = '\0'; /* FIXME */
				else buf = ch;
				state = 15;
				break;

			case 15: /* Ends with '\'' */
				if (ch != '\'') return 2;
				tok.type = 'ch';
				tok.num = buf;
				buf = '\''; /* FIXME */
				return tok;
				break;

			case 16: /* Starts with '+' */
				if (ch == '+') {
					tok.type = '++';//'inc';
					return tok;
				} else if (ch == '=') {
					tok.type = '+=';//'add_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '+';//'add';
					return tok;
				}
				break;

			case 17: /* Starts with '!' */
				if (ch == '=') {
					tok.type = '!=';//'rop';
//					tok.num = ROP_NE;
					tok.str = '!='; /* FIXME: Only in lexer.js */
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '!';//'lop';
//					tok.num = LOP_NOT;
					tok.str = '!'; /* FIXME: Only in lexer.js */
					return tok;
				}
				break;

			case 18: /* Starts with '-' */
				if (ch == '-') {
					tok.type = '--';//'dec';
					return tok;
				} else if (ch == '=') {
					tok.type = '-=';//'sub_asn';
					return tok;
				} else if (ch == '>') {
					tok.type = '->';//'arrow';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '-';//'sub';
					return tok;
				}
				break;

			case 19: /* Starts with '&' */
				if (ch == '&') {
					tok.type = '&&';//'lop';
//					tok.num = LOP_AND;
					tok.str = '&&'; /* FIXME: Only in lexer.js */
					return tok;
				} else if (ch == '=') {
					tok.type = '&=';//'and_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '&';//'and';
					return tok;
				}
				break;

			case 20: /* Starts with '|' */
				if (ch == '|') {
					tok.type = '||';//'lop';
//					tok.num = LOP_OR;
					tok.str = '||'; /* FIXME: Only in lexer.js */
					return tok;
				} else if (ch == '=') {
					tok.type = '|=';//'or_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '|';//'or';
					return tok;
				}
				break;

			case 21: /* Starts with '<' */
				if (ch == '=') {
					tok.type = '<=';//'rop';
//					tok.num = ROP_LE;
					tok.str = '<='; /* FIXME: Only in lexer.js */
					return tok;
				} else if (ch == '<') {
					state = 26;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '<';//'rop';
//					tok.num = ROP_LT;
					tok.str = '<'; /* FIXME: Only in lexer.js */
					return tok;
				}
				break;

			case 22: /* Starts with '>' */
				if (ch == '=') {
					tok.type = '>=';//'rop';
//					tok.num = ROP_GE;
					tok.str = '>='; /* FIXME: Only in lexer.js */
					return tok;
				} else if (ch == '>') {
					state = 27;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '>';//'rop';
//					tok.num = ROP_GT;
					tok.str = '>'; /* FIXME: Only in lexer.js */
					return tok;
				}
				break;

			case 23: /* Starts with '%' */
				if (ch == '=') {
					tok.type = '%=';//'mod_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '%';//'mod';
					return tok;
				}
				break;

			case 24: /* Starts with '^' */
				if (ch == '=') {
					tok.type = '^=';//'not_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '^';//'not';
					return tok;
				}
				break;

			case 25: /* Starts with '*' */
				if (ch == '=') {
					tok.type = '*=';//'mul_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '*';//'mul';
					return tok;
				}
				break;

			case 26: /* Starts with '<<' */
				if (ch == '=') {
					tok.type = '<<=';//'lshft_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '<<';//'lshft';
					return tok;
				}
				break;

			case 27: /* Starts with '>>' */
				if (ch == '=') {
					tok.type = '>>=';//'rshft_asn';
					return tok;
				} else {
					handle.stc_pos--;
					buf = buf.substr(0, buf.length-1);

					tok.type = '>>';//'rshft';
					return tok;
				}
				break;
		}
	}
}
