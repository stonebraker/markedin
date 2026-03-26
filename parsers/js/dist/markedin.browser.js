var markedin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // node_modules/js-yaml/lib/common.js
  var require_common = __commonJS({
    "node_modules/js-yaml/lib/common.js"(exports, module) {
      "use strict";
      function isNothing(subject) {
        return typeof subject === "undefined" || subject === null;
      }
      function isObject(subject) {
        return typeof subject === "object" && subject !== null;
      }
      function toArray(sequence) {
        if (Array.isArray(sequence)) return sequence;
        else if (isNothing(sequence)) return [];
        return [sequence];
      }
      function extend(target, source) {
        var index, length, key, sourceKeys;
        if (source) {
          sourceKeys = Object.keys(source);
          for (index = 0, length = sourceKeys.length; index < length; index += 1) {
            key = sourceKeys[index];
            target[key] = source[key];
          }
        }
        return target;
      }
      function repeat(string, count) {
        var result = "", cycle;
        for (cycle = 0; cycle < count; cycle += 1) {
          result += string;
        }
        return result;
      }
      function isNegativeZero(number) {
        return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
      }
      module.exports.isNothing = isNothing;
      module.exports.isObject = isObject;
      module.exports.toArray = toArray;
      module.exports.repeat = repeat;
      module.exports.isNegativeZero = isNegativeZero;
      module.exports.extend = extend;
    }
  });

  // node_modules/js-yaml/lib/exception.js
  var require_exception = __commonJS({
    "node_modules/js-yaml/lib/exception.js"(exports, module) {
      "use strict";
      function formatError(exception, compact) {
        var where = "", message = exception.reason || "(unknown reason)";
        if (!exception.mark) return message;
        if (exception.mark.name) {
          where += 'in "' + exception.mark.name + '" ';
        }
        where += "(" + (exception.mark.line + 1) + ":" + (exception.mark.column + 1) + ")";
        if (!compact && exception.mark.snippet) {
          where += "\n\n" + exception.mark.snippet;
        }
        return message + " " + where;
      }
      function YAMLException(reason, mark) {
        Error.call(this);
        this.name = "YAMLException";
        this.reason = reason;
        this.mark = mark;
        this.message = formatError(this, false);
        if (Error.captureStackTrace) {
          Error.captureStackTrace(this, this.constructor);
        } else {
          this.stack = new Error().stack || "";
        }
      }
      YAMLException.prototype = Object.create(Error.prototype);
      YAMLException.prototype.constructor = YAMLException;
      YAMLException.prototype.toString = function toString(compact) {
        return this.name + ": " + formatError(this, compact);
      };
      module.exports = YAMLException;
    }
  });

  // node_modules/js-yaml/lib/snippet.js
  var require_snippet = __commonJS({
    "node_modules/js-yaml/lib/snippet.js"(exports, module) {
      "use strict";
      var common = require_common();
      function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
        var head = "";
        var tail = "";
        var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
        if (position - lineStart > maxHalfLength) {
          head = " ... ";
          lineStart = position - maxHalfLength + head.length;
        }
        if (lineEnd - position > maxHalfLength) {
          tail = " ...";
          lineEnd = position + maxHalfLength - tail.length;
        }
        return {
          str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
          pos: position - lineStart + head.length
          // relative position
        };
      }
      function padStart(string, max) {
        return common.repeat(" ", max - string.length) + string;
      }
      function makeSnippet(mark, options) {
        options = Object.create(options || null);
        if (!mark.buffer) return null;
        if (!options.maxLength) options.maxLength = 79;
        if (typeof options.indent !== "number") options.indent = 1;
        if (typeof options.linesBefore !== "number") options.linesBefore = 3;
        if (typeof options.linesAfter !== "number") options.linesAfter = 2;
        var re2 = /\r?\n|\r|\0/g;
        var lineStarts = [0];
        var lineEnds = [];
        var match;
        var foundLineNo = -1;
        while (match = re2.exec(mark.buffer)) {
          lineEnds.push(match.index);
          lineStarts.push(match.index + match[0].length);
          if (mark.position <= match.index && foundLineNo < 0) {
            foundLineNo = lineStarts.length - 2;
          }
        }
        if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
        var result = "", i, line;
        var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
        var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
        for (i = 1; i <= options.linesBefore; i++) {
          if (foundLineNo - i < 0) break;
          line = getLine(
            mark.buffer,
            lineStarts[foundLineNo - i],
            lineEnds[foundLineNo - i],
            mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
            maxLineLength
          );
          result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
        }
        line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
        result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
        result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
        for (i = 1; i <= options.linesAfter; i++) {
          if (foundLineNo + i >= lineEnds.length) break;
          line = getLine(
            mark.buffer,
            lineStarts[foundLineNo + i],
            lineEnds[foundLineNo + i],
            mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
            maxLineLength
          );
          result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
        }
        return result.replace(/\n$/, "");
      }
      module.exports = makeSnippet;
    }
  });

  // node_modules/js-yaml/lib/type.js
  var require_type = __commonJS({
    "node_modules/js-yaml/lib/type.js"(exports, module) {
      "use strict";
      var YAMLException = require_exception();
      var TYPE_CONSTRUCTOR_OPTIONS = [
        "kind",
        "multi",
        "resolve",
        "construct",
        "instanceOf",
        "predicate",
        "represent",
        "representName",
        "defaultStyle",
        "styleAliases"
      ];
      var YAML_NODE_KINDS = [
        "scalar",
        "sequence",
        "mapping"
      ];
      function compileStyleAliases(map) {
        var result = {};
        if (map !== null) {
          Object.keys(map).forEach(function(style) {
            map[style].forEach(function(alias) {
              result[String(alias)] = style;
            });
          });
        }
        return result;
      }
      function Type(tag, options) {
        options = options || {};
        Object.keys(options).forEach(function(name) {
          if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
            throw new YAMLException('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
          }
        });
        this.options = options;
        this.tag = tag;
        this.kind = options["kind"] || null;
        this.resolve = options["resolve"] || function() {
          return true;
        };
        this.construct = options["construct"] || function(data) {
          return data;
        };
        this.instanceOf = options["instanceOf"] || null;
        this.predicate = options["predicate"] || null;
        this.represent = options["represent"] || null;
        this.representName = options["representName"] || null;
        this.defaultStyle = options["defaultStyle"] || null;
        this.multi = options["multi"] || false;
        this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
        if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
          throw new YAMLException('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
        }
      }
      module.exports = Type;
    }
  });

  // node_modules/js-yaml/lib/schema.js
  var require_schema = __commonJS({
    "node_modules/js-yaml/lib/schema.js"(exports, module) {
      "use strict";
      var YAMLException = require_exception();
      var Type = require_type();
      function compileList(schema, name) {
        var result = [];
        schema[name].forEach(function(currentType) {
          var newIndex = result.length;
          result.forEach(function(previousType, previousIndex) {
            if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
              newIndex = previousIndex;
            }
          });
          result[newIndex] = currentType;
        });
        return result;
      }
      function compileMap() {
        var result = {
          scalar: {},
          sequence: {},
          mapping: {},
          fallback: {},
          multi: {
            scalar: [],
            sequence: [],
            mapping: [],
            fallback: []
          }
        }, index, length;
        function collectType(type) {
          if (type.multi) {
            result.multi[type.kind].push(type);
            result.multi["fallback"].push(type);
          } else {
            result[type.kind][type.tag] = result["fallback"][type.tag] = type;
          }
        }
        for (index = 0, length = arguments.length; index < length; index += 1) {
          arguments[index].forEach(collectType);
        }
        return result;
      }
      function Schema(definition) {
        return this.extend(definition);
      }
      Schema.prototype.extend = function extend(definition) {
        var implicit = [];
        var explicit = [];
        if (definition instanceof Type) {
          explicit.push(definition);
        } else if (Array.isArray(definition)) {
          explicit = explicit.concat(definition);
        } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
          if (definition.implicit) implicit = implicit.concat(definition.implicit);
          if (definition.explicit) explicit = explicit.concat(definition.explicit);
        } else {
          throw new YAMLException("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
        }
        implicit.forEach(function(type) {
          if (!(type instanceof Type)) {
            throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
          }
          if (type.loadKind && type.loadKind !== "scalar") {
            throw new YAMLException("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
          }
          if (type.multi) {
            throw new YAMLException("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
          }
        });
        explicit.forEach(function(type) {
          if (!(type instanceof Type)) {
            throw new YAMLException("Specified list of YAML types (or a single Type object) contains a non-Type object.");
          }
        });
        var result = Object.create(Schema.prototype);
        result.implicit = (this.implicit || []).concat(implicit);
        result.explicit = (this.explicit || []).concat(explicit);
        result.compiledImplicit = compileList(result, "implicit");
        result.compiledExplicit = compileList(result, "explicit");
        result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
        return result;
      };
      module.exports = Schema;
    }
  });

  // node_modules/js-yaml/lib/type/str.js
  var require_str = __commonJS({
    "node_modules/js-yaml/lib/type/str.js"(exports, module) {
      "use strict";
      var Type = require_type();
      module.exports = new Type("tag:yaml.org,2002:str", {
        kind: "scalar",
        construct: function(data) {
          return data !== null ? data : "";
        }
      });
    }
  });

  // node_modules/js-yaml/lib/type/seq.js
  var require_seq = __commonJS({
    "node_modules/js-yaml/lib/type/seq.js"(exports, module) {
      "use strict";
      var Type = require_type();
      module.exports = new Type("tag:yaml.org,2002:seq", {
        kind: "sequence",
        construct: function(data) {
          return data !== null ? data : [];
        }
      });
    }
  });

  // node_modules/js-yaml/lib/type/map.js
  var require_map = __commonJS({
    "node_modules/js-yaml/lib/type/map.js"(exports, module) {
      "use strict";
      var Type = require_type();
      module.exports = new Type("tag:yaml.org,2002:map", {
        kind: "mapping",
        construct: function(data) {
          return data !== null ? data : {};
        }
      });
    }
  });

  // node_modules/js-yaml/lib/schema/failsafe.js
  var require_failsafe = __commonJS({
    "node_modules/js-yaml/lib/schema/failsafe.js"(exports, module) {
      "use strict";
      var Schema = require_schema();
      module.exports = new Schema({
        explicit: [
          require_str(),
          require_seq(),
          require_map()
        ]
      });
    }
  });

  // node_modules/js-yaml/lib/type/null.js
  var require_null = __commonJS({
    "node_modules/js-yaml/lib/type/null.js"(exports, module) {
      "use strict";
      var Type = require_type();
      function resolveYamlNull(data) {
        if (data === null) return true;
        var max = data.length;
        return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
      }
      function constructYamlNull() {
        return null;
      }
      function isNull(object) {
        return object === null;
      }
      module.exports = new Type("tag:yaml.org,2002:null", {
        kind: "scalar",
        resolve: resolveYamlNull,
        construct: constructYamlNull,
        predicate: isNull,
        represent: {
          canonical: function() {
            return "~";
          },
          lowercase: function() {
            return "null";
          },
          uppercase: function() {
            return "NULL";
          },
          camelcase: function() {
            return "Null";
          },
          empty: function() {
            return "";
          }
        },
        defaultStyle: "lowercase"
      });
    }
  });

  // node_modules/js-yaml/lib/type/bool.js
  var require_bool = __commonJS({
    "node_modules/js-yaml/lib/type/bool.js"(exports, module) {
      "use strict";
      var Type = require_type();
      function resolveYamlBoolean(data) {
        if (data === null) return false;
        var max = data.length;
        return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
      }
      function constructYamlBoolean(data) {
        return data === "true" || data === "True" || data === "TRUE";
      }
      function isBoolean(object) {
        return Object.prototype.toString.call(object) === "[object Boolean]";
      }
      module.exports = new Type("tag:yaml.org,2002:bool", {
        kind: "scalar",
        resolve: resolveYamlBoolean,
        construct: constructYamlBoolean,
        predicate: isBoolean,
        represent: {
          lowercase: function(object) {
            return object ? "true" : "false";
          },
          uppercase: function(object) {
            return object ? "TRUE" : "FALSE";
          },
          camelcase: function(object) {
            return object ? "True" : "False";
          }
        },
        defaultStyle: "lowercase"
      });
    }
  });

  // node_modules/js-yaml/lib/type/int.js
  var require_int = __commonJS({
    "node_modules/js-yaml/lib/type/int.js"(exports, module) {
      "use strict";
      var common = require_common();
      var Type = require_type();
      function isHexCode(c) {
        return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
      }
      function isOctCode(c) {
        return 48 <= c && c <= 55;
      }
      function isDecCode(c) {
        return 48 <= c && c <= 57;
      }
      function resolveYamlInteger(data) {
        if (data === null) return false;
        var max = data.length, index = 0, hasDigits = false, ch;
        if (!max) return false;
        ch = data[index];
        if (ch === "-" || ch === "+") {
          ch = data[++index];
        }
        if (ch === "0") {
          if (index + 1 === max) return true;
          ch = data[++index];
          if (ch === "b") {
            index++;
            for (; index < max; index++) {
              ch = data[index];
              if (ch === "_") continue;
              if (ch !== "0" && ch !== "1") return false;
              hasDigits = true;
            }
            return hasDigits && ch !== "_";
          }
          if (ch === "x") {
            index++;
            for (; index < max; index++) {
              ch = data[index];
              if (ch === "_") continue;
              if (!isHexCode(data.charCodeAt(index))) return false;
              hasDigits = true;
            }
            return hasDigits && ch !== "_";
          }
          if (ch === "o") {
            index++;
            for (; index < max; index++) {
              ch = data[index];
              if (ch === "_") continue;
              if (!isOctCode(data.charCodeAt(index))) return false;
              hasDigits = true;
            }
            return hasDigits && ch !== "_";
          }
        }
        if (ch === "_") return false;
        for (; index < max; index++) {
          ch = data[index];
          if (ch === "_") continue;
          if (!isDecCode(data.charCodeAt(index))) {
            return false;
          }
          hasDigits = true;
        }
        if (!hasDigits || ch === "_") return false;
        return true;
      }
      function constructYamlInteger(data) {
        var value = data, sign = 1, ch;
        if (value.indexOf("_") !== -1) {
          value = value.replace(/_/g, "");
        }
        ch = value[0];
        if (ch === "-" || ch === "+") {
          if (ch === "-") sign = -1;
          value = value.slice(1);
          ch = value[0];
        }
        if (value === "0") return 0;
        if (ch === "0") {
          if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
          if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
          if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
        }
        return sign * parseInt(value, 10);
      }
      function isInteger(object) {
        return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
      }
      module.exports = new Type("tag:yaml.org,2002:int", {
        kind: "scalar",
        resolve: resolveYamlInteger,
        construct: constructYamlInteger,
        predicate: isInteger,
        represent: {
          binary: function(obj) {
            return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
          },
          octal: function(obj) {
            return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
          },
          decimal: function(obj) {
            return obj.toString(10);
          },
          /* eslint-disable max-len */
          hexadecimal: function(obj) {
            return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
          }
        },
        defaultStyle: "decimal",
        styleAliases: {
          binary: [2, "bin"],
          octal: [8, "oct"],
          decimal: [10, "dec"],
          hexadecimal: [16, "hex"]
        }
      });
    }
  });

  // node_modules/js-yaml/lib/type/float.js
  var require_float = __commonJS({
    "node_modules/js-yaml/lib/type/float.js"(exports, module) {
      "use strict";
      var common = require_common();
      var Type = require_type();
      var YAML_FLOAT_PATTERN = new RegExp(
        // 2.5e4, 2.5 and integers
        "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
      );
      function resolveYamlFloat(data) {
        if (data === null) return false;
        if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
        // Probably should update regexp & check speed
        data[data.length - 1] === "_") {
          return false;
        }
        return true;
      }
      function constructYamlFloat(data) {
        var value, sign;
        value = data.replace(/_/g, "").toLowerCase();
        sign = value[0] === "-" ? -1 : 1;
        if ("+-".indexOf(value[0]) >= 0) {
          value = value.slice(1);
        }
        if (value === ".inf") {
          return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        } else if (value === ".nan") {
          return NaN;
        }
        return sign * parseFloat(value, 10);
      }
      var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
      function representYamlFloat(object, style) {
        var res;
        if (isNaN(object)) {
          switch (style) {
            case "lowercase":
              return ".nan";
            case "uppercase":
              return ".NAN";
            case "camelcase":
              return ".NaN";
          }
        } else if (Number.POSITIVE_INFINITY === object) {
          switch (style) {
            case "lowercase":
              return ".inf";
            case "uppercase":
              return ".INF";
            case "camelcase":
              return ".Inf";
          }
        } else if (Number.NEGATIVE_INFINITY === object) {
          switch (style) {
            case "lowercase":
              return "-.inf";
            case "uppercase":
              return "-.INF";
            case "camelcase":
              return "-.Inf";
          }
        } else if (common.isNegativeZero(object)) {
          return "-0.0";
        }
        res = object.toString(10);
        return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
      }
      function isFloat(object) {
        return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
      }
      module.exports = new Type("tag:yaml.org,2002:float", {
        kind: "scalar",
        resolve: resolveYamlFloat,
        construct: constructYamlFloat,
        predicate: isFloat,
        represent: representYamlFloat,
        defaultStyle: "lowercase"
      });
    }
  });

  // node_modules/js-yaml/lib/schema/json.js
  var require_json = __commonJS({
    "node_modules/js-yaml/lib/schema/json.js"(exports, module) {
      "use strict";
      module.exports = require_failsafe().extend({
        implicit: [
          require_null(),
          require_bool(),
          require_int(),
          require_float()
        ]
      });
    }
  });

  // node_modules/js-yaml/lib/schema/core.js
  var require_core = __commonJS({
    "node_modules/js-yaml/lib/schema/core.js"(exports, module) {
      "use strict";
      module.exports = require_json();
    }
  });

  // node_modules/js-yaml/lib/type/timestamp.js
  var require_timestamp = __commonJS({
    "node_modules/js-yaml/lib/type/timestamp.js"(exports, module) {
      "use strict";
      var Type = require_type();
      var YAML_DATE_REGEXP = new RegExp(
        "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
      );
      var YAML_TIMESTAMP_REGEXP = new RegExp(
        "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
      );
      function resolveYamlTimestamp(data) {
        if (data === null) return false;
        if (YAML_DATE_REGEXP.exec(data) !== null) return true;
        if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
        return false;
      }
      function constructYamlTimestamp(data) {
        var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
        match = YAML_DATE_REGEXP.exec(data);
        if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
        if (match === null) throw new Error("Date resolve error");
        year = +match[1];
        month = +match[2] - 1;
        day = +match[3];
        if (!match[4]) {
          return new Date(Date.UTC(year, month, day));
        }
        hour = +match[4];
        minute = +match[5];
        second = +match[6];
        if (match[7]) {
          fraction = match[7].slice(0, 3);
          while (fraction.length < 3) {
            fraction += "0";
          }
          fraction = +fraction;
        }
        if (match[9]) {
          tz_hour = +match[10];
          tz_minute = +(match[11] || 0);
          delta = (tz_hour * 60 + tz_minute) * 6e4;
          if (match[9] === "-") delta = -delta;
        }
        date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
        if (delta) date.setTime(date.getTime() - delta);
        return date;
      }
      function representYamlTimestamp(object) {
        return object.toISOString();
      }
      module.exports = new Type("tag:yaml.org,2002:timestamp", {
        kind: "scalar",
        resolve: resolveYamlTimestamp,
        construct: constructYamlTimestamp,
        instanceOf: Date,
        represent: representYamlTimestamp
      });
    }
  });

  // node_modules/js-yaml/lib/type/merge.js
  var require_merge = __commonJS({
    "node_modules/js-yaml/lib/type/merge.js"(exports, module) {
      "use strict";
      var Type = require_type();
      function resolveYamlMerge(data) {
        return data === "<<" || data === null;
      }
      module.exports = new Type("tag:yaml.org,2002:merge", {
        kind: "scalar",
        resolve: resolveYamlMerge
      });
    }
  });

  // node_modules/js-yaml/lib/type/binary.js
  var require_binary = __commonJS({
    "node_modules/js-yaml/lib/type/binary.js"(exports, module) {
      "use strict";
      var Type = require_type();
      var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
      function resolveYamlBinary(data) {
        if (data === null) return false;
        var code, idx, bitlen = 0, max = data.length, map = BASE64_MAP;
        for (idx = 0; idx < max; idx++) {
          code = map.indexOf(data.charAt(idx));
          if (code > 64) continue;
          if (code < 0) return false;
          bitlen += 6;
        }
        return bitlen % 8 === 0;
      }
      function constructYamlBinary(data) {
        var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map = BASE64_MAP, bits = 0, result = [];
        for (idx = 0; idx < max; idx++) {
          if (idx % 4 === 0 && idx) {
            result.push(bits >> 16 & 255);
            result.push(bits >> 8 & 255);
            result.push(bits & 255);
          }
          bits = bits << 6 | map.indexOf(input.charAt(idx));
        }
        tailbits = max % 4 * 6;
        if (tailbits === 0) {
          result.push(bits >> 16 & 255);
          result.push(bits >> 8 & 255);
          result.push(bits & 255);
        } else if (tailbits === 18) {
          result.push(bits >> 10 & 255);
          result.push(bits >> 2 & 255);
        } else if (tailbits === 12) {
          result.push(bits >> 4 & 255);
        }
        return new Uint8Array(result);
      }
      function representYamlBinary(object) {
        var result = "", bits = 0, idx, tail, max = object.length, map = BASE64_MAP;
        for (idx = 0; idx < max; idx++) {
          if (idx % 3 === 0 && idx) {
            result += map[bits >> 18 & 63];
            result += map[bits >> 12 & 63];
            result += map[bits >> 6 & 63];
            result += map[bits & 63];
          }
          bits = (bits << 8) + object[idx];
        }
        tail = max % 3;
        if (tail === 0) {
          result += map[bits >> 18 & 63];
          result += map[bits >> 12 & 63];
          result += map[bits >> 6 & 63];
          result += map[bits & 63];
        } else if (tail === 2) {
          result += map[bits >> 10 & 63];
          result += map[bits >> 4 & 63];
          result += map[bits << 2 & 63];
          result += map[64];
        } else if (tail === 1) {
          result += map[bits >> 2 & 63];
          result += map[bits << 4 & 63];
          result += map[64];
          result += map[64];
        }
        return result;
      }
      function isBinary(obj) {
        return Object.prototype.toString.call(obj) === "[object Uint8Array]";
      }
      module.exports = new Type("tag:yaml.org,2002:binary", {
        kind: "scalar",
        resolve: resolveYamlBinary,
        construct: constructYamlBinary,
        predicate: isBinary,
        represent: representYamlBinary
      });
    }
  });

  // node_modules/js-yaml/lib/type/omap.js
  var require_omap = __commonJS({
    "node_modules/js-yaml/lib/type/omap.js"(exports, module) {
      "use strict";
      var Type = require_type();
      var _hasOwnProperty = Object.prototype.hasOwnProperty;
      var _toString = Object.prototype.toString;
      function resolveYamlOmap(data) {
        if (data === null) return true;
        var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
        for (index = 0, length = object.length; index < length; index += 1) {
          pair = object[index];
          pairHasKey = false;
          if (_toString.call(pair) !== "[object Object]") return false;
          for (pairKey in pair) {
            if (_hasOwnProperty.call(pair, pairKey)) {
              if (!pairHasKey) pairHasKey = true;
              else return false;
            }
          }
          if (!pairHasKey) return false;
          if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
          else return false;
        }
        return true;
      }
      function constructYamlOmap(data) {
        return data !== null ? data : [];
      }
      module.exports = new Type("tag:yaml.org,2002:omap", {
        kind: "sequence",
        resolve: resolveYamlOmap,
        construct: constructYamlOmap
      });
    }
  });

  // node_modules/js-yaml/lib/type/pairs.js
  var require_pairs = __commonJS({
    "node_modules/js-yaml/lib/type/pairs.js"(exports, module) {
      "use strict";
      var Type = require_type();
      var _toString = Object.prototype.toString;
      function resolveYamlPairs(data) {
        if (data === null) return true;
        var index, length, pair, keys, result, object = data;
        result = new Array(object.length);
        for (index = 0, length = object.length; index < length; index += 1) {
          pair = object[index];
          if (_toString.call(pair) !== "[object Object]") return false;
          keys = Object.keys(pair);
          if (keys.length !== 1) return false;
          result[index] = [keys[0], pair[keys[0]]];
        }
        return true;
      }
      function constructYamlPairs(data) {
        if (data === null) return [];
        var index, length, pair, keys, result, object = data;
        result = new Array(object.length);
        for (index = 0, length = object.length; index < length; index += 1) {
          pair = object[index];
          keys = Object.keys(pair);
          result[index] = [keys[0], pair[keys[0]]];
        }
        return result;
      }
      module.exports = new Type("tag:yaml.org,2002:pairs", {
        kind: "sequence",
        resolve: resolveYamlPairs,
        construct: constructYamlPairs
      });
    }
  });

  // node_modules/js-yaml/lib/type/set.js
  var require_set = __commonJS({
    "node_modules/js-yaml/lib/type/set.js"(exports, module) {
      "use strict";
      var Type = require_type();
      var _hasOwnProperty = Object.prototype.hasOwnProperty;
      function resolveYamlSet(data) {
        if (data === null) return true;
        var key, object = data;
        for (key in object) {
          if (_hasOwnProperty.call(object, key)) {
            if (object[key] !== null) return false;
          }
        }
        return true;
      }
      function constructYamlSet(data) {
        return data !== null ? data : {};
      }
      module.exports = new Type("tag:yaml.org,2002:set", {
        kind: "mapping",
        resolve: resolveYamlSet,
        construct: constructYamlSet
      });
    }
  });

  // node_modules/js-yaml/lib/schema/default.js
  var require_default = __commonJS({
    "node_modules/js-yaml/lib/schema/default.js"(exports, module) {
      "use strict";
      module.exports = require_core().extend({
        implicit: [
          require_timestamp(),
          require_merge()
        ],
        explicit: [
          require_binary(),
          require_omap(),
          require_pairs(),
          require_set()
        ]
      });
    }
  });

  // node_modules/js-yaml/lib/loader.js
  var require_loader = __commonJS({
    "node_modules/js-yaml/lib/loader.js"(exports, module) {
      "use strict";
      var common = require_common();
      var YAMLException = require_exception();
      var makeSnippet = require_snippet();
      var DEFAULT_SCHEMA = require_default();
      var _hasOwnProperty = Object.prototype.hasOwnProperty;
      var CONTEXT_FLOW_IN = 1;
      var CONTEXT_FLOW_OUT = 2;
      var CONTEXT_BLOCK_IN = 3;
      var CONTEXT_BLOCK_OUT = 4;
      var CHOMPING_CLIP = 1;
      var CHOMPING_STRIP = 2;
      var CHOMPING_KEEP = 3;
      var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
      var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
      var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
      var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
      var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
      function _class(obj) {
        return Object.prototype.toString.call(obj);
      }
      function is_EOL(c) {
        return c === 10 || c === 13;
      }
      function is_WHITE_SPACE(c) {
        return c === 9 || c === 32;
      }
      function is_WS_OR_EOL(c) {
        return c === 9 || c === 32 || c === 10 || c === 13;
      }
      function is_FLOW_INDICATOR(c) {
        return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
      }
      function fromHexCode(c) {
        var lc;
        if (48 <= c && c <= 57) {
          return c - 48;
        }
        lc = c | 32;
        if (97 <= lc && lc <= 102) {
          return lc - 97 + 10;
        }
        return -1;
      }
      function escapedHexLen(c) {
        if (c === 120) {
          return 2;
        }
        if (c === 117) {
          return 4;
        }
        if (c === 85) {
          return 8;
        }
        return 0;
      }
      function fromDecimalCode(c) {
        if (48 <= c && c <= 57) {
          return c - 48;
        }
        return -1;
      }
      function simpleEscapeSequence(c) {
        return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
      }
      function charFromCodepoint(c) {
        if (c <= 65535) {
          return String.fromCharCode(c);
        }
        return String.fromCharCode(
          (c - 65536 >> 10) + 55296,
          (c - 65536 & 1023) + 56320
        );
      }
      function setProperty(object, key, value) {
        if (key === "__proto__") {
          Object.defineProperty(object, key, {
            configurable: true,
            enumerable: true,
            writable: true,
            value
          });
        } else {
          object[key] = value;
        }
      }
      var simpleEscapeCheck = new Array(256);
      var simpleEscapeMap = new Array(256);
      for (i = 0; i < 256; i++) {
        simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
        simpleEscapeMap[i] = simpleEscapeSequence(i);
      }
      var i;
      function State(input, options) {
        this.input = input;
        this.filename = options["filename"] || null;
        this.schema = options["schema"] || DEFAULT_SCHEMA;
        this.onWarning = options["onWarning"] || null;
        this.legacy = options["legacy"] || false;
        this.json = options["json"] || false;
        this.listener = options["listener"] || null;
        this.implicitTypes = this.schema.compiledImplicit;
        this.typeMap = this.schema.compiledTypeMap;
        this.length = input.length;
        this.position = 0;
        this.line = 0;
        this.lineStart = 0;
        this.lineIndent = 0;
        this.firstTabInLine = -1;
        this.documents = [];
      }
      function generateError(state, message) {
        var mark = {
          name: state.filename,
          buffer: state.input.slice(0, -1),
          // omit trailing \0
          position: state.position,
          line: state.line,
          column: state.position - state.lineStart
        };
        mark.snippet = makeSnippet(mark);
        return new YAMLException(message, mark);
      }
      function throwError(state, message) {
        throw generateError(state, message);
      }
      function throwWarning(state, message) {
        if (state.onWarning) {
          state.onWarning.call(null, generateError(state, message));
        }
      }
      var directiveHandlers = {
        YAML: function handleYamlDirective(state, name, args) {
          var match, major, minor;
          if (state.version !== null) {
            throwError(state, "duplication of %YAML directive");
          }
          if (args.length !== 1) {
            throwError(state, "YAML directive accepts exactly one argument");
          }
          match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
          if (match === null) {
            throwError(state, "ill-formed argument of the YAML directive");
          }
          major = parseInt(match[1], 10);
          minor = parseInt(match[2], 10);
          if (major !== 1) {
            throwError(state, "unacceptable YAML version of the document");
          }
          state.version = args[0];
          state.checkLineBreaks = minor < 2;
          if (minor !== 1 && minor !== 2) {
            throwWarning(state, "unsupported YAML version of the document");
          }
        },
        TAG: function handleTagDirective(state, name, args) {
          var handle, prefix;
          if (args.length !== 2) {
            throwError(state, "TAG directive accepts exactly two arguments");
          }
          handle = args[0];
          prefix = args[1];
          if (!PATTERN_TAG_HANDLE.test(handle)) {
            throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
          }
          if (_hasOwnProperty.call(state.tagMap, handle)) {
            throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
          }
          if (!PATTERN_TAG_URI.test(prefix)) {
            throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
          }
          try {
            prefix = decodeURIComponent(prefix);
          } catch (err) {
            throwError(state, "tag prefix is malformed: " + prefix);
          }
          state.tagMap[handle] = prefix;
        }
      };
      function captureSegment(state, start, end, checkJson) {
        var _position, _length, _character, _result;
        if (start < end) {
          _result = state.input.slice(start, end);
          if (checkJson) {
            for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
              _character = _result.charCodeAt(_position);
              if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
                throwError(state, "expected valid JSON character");
              }
            }
          } else if (PATTERN_NON_PRINTABLE.test(_result)) {
            throwError(state, "the stream contains non-printable characters");
          }
          state.result += _result;
        }
      }
      function mergeMappings(state, destination, source, overridableKeys) {
        var sourceKeys, key, index, quantity;
        if (!common.isObject(source)) {
          throwError(state, "cannot merge mappings; the provided source object is unacceptable");
        }
        sourceKeys = Object.keys(source);
        for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
          key = sourceKeys[index];
          if (!_hasOwnProperty.call(destination, key)) {
            setProperty(destination, key, source[key]);
            overridableKeys[key] = true;
          }
        }
      }
      function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
        var index, quantity;
        if (Array.isArray(keyNode)) {
          keyNode = Array.prototype.slice.call(keyNode);
          for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
            if (Array.isArray(keyNode[index])) {
              throwError(state, "nested arrays are not supported inside keys");
            }
            if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
              keyNode[index] = "[object Object]";
            }
          }
        }
        if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
          keyNode = "[object Object]";
        }
        keyNode = String(keyNode);
        if (_result === null) {
          _result = {};
        }
        if (keyTag === "tag:yaml.org,2002:merge") {
          if (Array.isArray(valueNode)) {
            for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
              mergeMappings(state, _result, valueNode[index], overridableKeys);
            }
          } else {
            mergeMappings(state, _result, valueNode, overridableKeys);
          }
        } else {
          if (!state.json && !_hasOwnProperty.call(overridableKeys, keyNode) && _hasOwnProperty.call(_result, keyNode)) {
            state.line = startLine || state.line;
            state.lineStart = startLineStart || state.lineStart;
            state.position = startPos || state.position;
            throwError(state, "duplicated mapping key");
          }
          setProperty(_result, keyNode, valueNode);
          delete overridableKeys[keyNode];
        }
        return _result;
      }
      function readLineBreak(state) {
        var ch;
        ch = state.input.charCodeAt(state.position);
        if (ch === 10) {
          state.position++;
        } else if (ch === 13) {
          state.position++;
          if (state.input.charCodeAt(state.position) === 10) {
            state.position++;
          }
        } else {
          throwError(state, "a line break is expected");
        }
        state.line += 1;
        state.lineStart = state.position;
        state.firstTabInLine = -1;
      }
      function skipSeparationSpace(state, allowComments, checkIndent) {
        var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
        while (ch !== 0) {
          while (is_WHITE_SPACE(ch)) {
            if (ch === 9 && state.firstTabInLine === -1) {
              state.firstTabInLine = state.position;
            }
            ch = state.input.charCodeAt(++state.position);
          }
          if (allowComments && ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (ch !== 10 && ch !== 13 && ch !== 0);
          }
          if (is_EOL(ch)) {
            readLineBreak(state);
            ch = state.input.charCodeAt(state.position);
            lineBreaks++;
            state.lineIndent = 0;
            while (ch === 32) {
              state.lineIndent++;
              ch = state.input.charCodeAt(++state.position);
            }
          } else {
            break;
          }
        }
        if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
          throwWarning(state, "deficient indentation");
        }
        return lineBreaks;
      }
      function testDocumentSeparator(state) {
        var _position = state.position, ch;
        ch = state.input.charCodeAt(_position);
        if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
          _position += 3;
          ch = state.input.charCodeAt(_position);
          if (ch === 0 || is_WS_OR_EOL(ch)) {
            return true;
          }
        }
        return false;
      }
      function writeFoldedLines(state, count) {
        if (count === 1) {
          state.result += " ";
        } else if (count > 1) {
          state.result += common.repeat("\n", count - 1);
        }
      }
      function readPlainScalar(state, nodeIndent, withinFlowCollection) {
        var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
        ch = state.input.charCodeAt(state.position);
        if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
          return false;
        }
        if (ch === 63 || ch === 45) {
          following = state.input.charCodeAt(state.position + 1);
          if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
            return false;
          }
        }
        state.kind = "scalar";
        state.result = "";
        captureStart = captureEnd = state.position;
        hasPendingContent = false;
        while (ch !== 0) {
          if (ch === 58) {
            following = state.input.charCodeAt(state.position + 1);
            if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
              break;
            }
          } else if (ch === 35) {
            preceding = state.input.charCodeAt(state.position - 1);
            if (is_WS_OR_EOL(preceding)) {
              break;
            }
          } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
            break;
          } else if (is_EOL(ch)) {
            _line = state.line;
            _lineStart = state.lineStart;
            _lineIndent = state.lineIndent;
            skipSeparationSpace(state, false, -1);
            if (state.lineIndent >= nodeIndent) {
              hasPendingContent = true;
              ch = state.input.charCodeAt(state.position);
              continue;
            } else {
              state.position = captureEnd;
              state.line = _line;
              state.lineStart = _lineStart;
              state.lineIndent = _lineIndent;
              break;
            }
          }
          if (hasPendingContent) {
            captureSegment(state, captureStart, captureEnd, false);
            writeFoldedLines(state, state.line - _line);
            captureStart = captureEnd = state.position;
            hasPendingContent = false;
          }
          if (!is_WHITE_SPACE(ch)) {
            captureEnd = state.position + 1;
          }
          ch = state.input.charCodeAt(++state.position);
        }
        captureSegment(state, captureStart, captureEnd, false);
        if (state.result) {
          return true;
        }
        state.kind = _kind;
        state.result = _result;
        return false;
      }
      function readSingleQuotedScalar(state, nodeIndent) {
        var ch, captureStart, captureEnd;
        ch = state.input.charCodeAt(state.position);
        if (ch !== 39) {
          return false;
        }
        state.kind = "scalar";
        state.result = "";
        state.position++;
        captureStart = captureEnd = state.position;
        while ((ch = state.input.charCodeAt(state.position)) !== 0) {
          if (ch === 39) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);
            if (ch === 39) {
              captureStart = state.position;
              state.position++;
              captureEnd = state.position;
            } else {
              return true;
            }
          } else if (is_EOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;
          } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
            throwError(state, "unexpected end of the document within a single quoted scalar");
          } else {
            state.position++;
            captureEnd = state.position;
          }
        }
        throwError(state, "unexpected end of the stream within a single quoted scalar");
      }
      function readDoubleQuotedScalar(state, nodeIndent) {
        var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch !== 34) {
          return false;
        }
        state.kind = "scalar";
        state.result = "";
        state.position++;
        captureStart = captureEnd = state.position;
        while ((ch = state.input.charCodeAt(state.position)) !== 0) {
          if (ch === 34) {
            captureSegment(state, captureStart, state.position, true);
            state.position++;
            return true;
          } else if (ch === 92) {
            captureSegment(state, captureStart, state.position, true);
            ch = state.input.charCodeAt(++state.position);
            if (is_EOL(ch)) {
              skipSeparationSpace(state, false, nodeIndent);
            } else if (ch < 256 && simpleEscapeCheck[ch]) {
              state.result += simpleEscapeMap[ch];
              state.position++;
            } else if ((tmp = escapedHexLen(ch)) > 0) {
              hexLength = tmp;
              hexResult = 0;
              for (; hexLength > 0; hexLength--) {
                ch = state.input.charCodeAt(++state.position);
                if ((tmp = fromHexCode(ch)) >= 0) {
                  hexResult = (hexResult << 4) + tmp;
                } else {
                  throwError(state, "expected hexadecimal character");
                }
              }
              state.result += charFromCodepoint(hexResult);
              state.position++;
            } else {
              throwError(state, "unknown escape sequence");
            }
            captureStart = captureEnd = state.position;
          } else if (is_EOL(ch)) {
            captureSegment(state, captureStart, captureEnd, true);
            writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
            captureStart = captureEnd = state.position;
          } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
            throwError(state, "unexpected end of the document within a double quoted scalar");
          } else {
            state.position++;
            captureEnd = state.position;
          }
        }
        throwError(state, "unexpected end of the stream within a double quoted scalar");
      }
      function readFlowCollection(state, nodeIndent) {
        var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch === 91) {
          terminator = 93;
          isMapping = false;
          _result = [];
        } else if (ch === 123) {
          terminator = 125;
          isMapping = true;
          _result = {};
        } else {
          return false;
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = _result;
        }
        ch = state.input.charCodeAt(++state.position);
        while (ch !== 0) {
          skipSeparationSpace(state, true, nodeIndent);
          ch = state.input.charCodeAt(state.position);
          if (ch === terminator) {
            state.position++;
            state.tag = _tag;
            state.anchor = _anchor;
            state.kind = isMapping ? "mapping" : "sequence";
            state.result = _result;
            return true;
          } else if (!readNext) {
            throwError(state, "missed comma between flow collection entries");
          } else if (ch === 44) {
            throwError(state, "expected the node content, but found ','");
          }
          keyTag = keyNode = valueNode = null;
          isPair = isExplicitPair = false;
          if (ch === 63) {
            following = state.input.charCodeAt(state.position + 1);
            if (is_WS_OR_EOL(following)) {
              isPair = isExplicitPair = true;
              state.position++;
              skipSeparationSpace(state, true, nodeIndent);
            }
          }
          _line = state.line;
          _lineStart = state.lineStart;
          _pos = state.position;
          composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
          keyTag = state.tag;
          keyNode = state.result;
          skipSeparationSpace(state, true, nodeIndent);
          ch = state.input.charCodeAt(state.position);
          if ((isExplicitPair || state.line === _line) && ch === 58) {
            isPair = true;
            ch = state.input.charCodeAt(++state.position);
            skipSeparationSpace(state, true, nodeIndent);
            composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
            valueNode = state.result;
          }
          if (isMapping) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
          } else if (isPair) {
            _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
          } else {
            _result.push(keyNode);
          }
          skipSeparationSpace(state, true, nodeIndent);
          ch = state.input.charCodeAt(state.position);
          if (ch === 44) {
            readNext = true;
            ch = state.input.charCodeAt(++state.position);
          } else {
            readNext = false;
          }
        }
        throwError(state, "unexpected end of the stream within a flow collection");
      }
      function readBlockScalar(state, nodeIndent) {
        var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch === 124) {
          folding = false;
        } else if (ch === 62) {
          folding = true;
        } else {
          return false;
        }
        state.kind = "scalar";
        state.result = "";
        while (ch !== 0) {
          ch = state.input.charCodeAt(++state.position);
          if (ch === 43 || ch === 45) {
            if (CHOMPING_CLIP === chomping) {
              chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
            } else {
              throwError(state, "repeat of a chomping mode identifier");
            }
          } else if ((tmp = fromDecimalCode(ch)) >= 0) {
            if (tmp === 0) {
              throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
            } else if (!detectedIndent) {
              textIndent = nodeIndent + tmp - 1;
              detectedIndent = true;
            } else {
              throwError(state, "repeat of an indentation width identifier");
            }
          } else {
            break;
          }
        }
        if (is_WHITE_SPACE(ch)) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (is_WHITE_SPACE(ch));
          if (ch === 35) {
            do {
              ch = state.input.charCodeAt(++state.position);
            } while (!is_EOL(ch) && ch !== 0);
          }
        }
        while (ch !== 0) {
          readLineBreak(state);
          state.lineIndent = 0;
          ch = state.input.charCodeAt(state.position);
          while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
            state.lineIndent++;
            ch = state.input.charCodeAt(++state.position);
          }
          if (!detectedIndent && state.lineIndent > textIndent) {
            textIndent = state.lineIndent;
          }
          if (is_EOL(ch)) {
            emptyLines++;
            continue;
          }
          if (state.lineIndent < textIndent) {
            if (chomping === CHOMPING_KEEP) {
              state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            } else if (chomping === CHOMPING_CLIP) {
              if (didReadContent) {
                state.result += "\n";
              }
            }
            break;
          }
          if (folding) {
            if (is_WHITE_SPACE(ch)) {
              atMoreIndented = true;
              state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
            } else if (atMoreIndented) {
              atMoreIndented = false;
              state.result += common.repeat("\n", emptyLines + 1);
            } else if (emptyLines === 0) {
              if (didReadContent) {
                state.result += " ";
              }
            } else {
              state.result += common.repeat("\n", emptyLines);
            }
          } else {
            state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
          }
          didReadContent = true;
          detectedIndent = true;
          emptyLines = 0;
          captureStart = state.position;
          while (!is_EOL(ch) && ch !== 0) {
            ch = state.input.charCodeAt(++state.position);
          }
          captureSegment(state, captureStart, state.position, false);
        }
        return true;
      }
      function readBlockSequence(state, nodeIndent) {
        var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
        if (state.firstTabInLine !== -1) return false;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = _result;
        }
        ch = state.input.charCodeAt(state.position);
        while (ch !== 0) {
          if (state.firstTabInLine !== -1) {
            state.position = state.firstTabInLine;
            throwError(state, "tab characters must not be used in indentation");
          }
          if (ch !== 45) {
            break;
          }
          following = state.input.charCodeAt(state.position + 1);
          if (!is_WS_OR_EOL(following)) {
            break;
          }
          detected = true;
          state.position++;
          if (skipSeparationSpace(state, true, -1)) {
            if (state.lineIndent <= nodeIndent) {
              _result.push(null);
              ch = state.input.charCodeAt(state.position);
              continue;
            }
          }
          _line = state.line;
          composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
          _result.push(state.result);
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
          if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
            throwError(state, "bad indentation of a sequence entry");
          } else if (state.lineIndent < nodeIndent) {
            break;
          }
        }
        if (detected) {
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = "sequence";
          state.result = _result;
          return true;
        }
        return false;
      }
      function readBlockMapping(state, nodeIndent, flowIndent) {
        var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
        if (state.firstTabInLine !== -1) return false;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = _result;
        }
        ch = state.input.charCodeAt(state.position);
        while (ch !== 0) {
          if (!atExplicitKey && state.firstTabInLine !== -1) {
            state.position = state.firstTabInLine;
            throwError(state, "tab characters must not be used in indentation");
          }
          following = state.input.charCodeAt(state.position + 1);
          _line = state.line;
          if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
            if (ch === 63) {
              if (atExplicitKey) {
                storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                keyTag = keyNode = valueNode = null;
              }
              detected = true;
              atExplicitKey = true;
              allowCompact = true;
            } else if (atExplicitKey) {
              atExplicitKey = false;
              allowCompact = true;
            } else {
              throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
            }
            state.position += 1;
            ch = following;
          } else {
            _keyLine = state.line;
            _keyLineStart = state.lineStart;
            _keyPos = state.position;
            if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
              break;
            }
            if (state.line === _line) {
              ch = state.input.charCodeAt(state.position);
              while (is_WHITE_SPACE(ch)) {
                ch = state.input.charCodeAt(++state.position);
              }
              if (ch === 58) {
                ch = state.input.charCodeAt(++state.position);
                if (!is_WS_OR_EOL(ch)) {
                  throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
                }
                if (atExplicitKey) {
                  storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
                  keyTag = keyNode = valueNode = null;
                }
                detected = true;
                atExplicitKey = false;
                allowCompact = false;
                keyTag = state.tag;
                keyNode = state.result;
              } else if (detected) {
                throwError(state, "can not read an implicit mapping pair; a colon is missed");
              } else {
                state.tag = _tag;
                state.anchor = _anchor;
                return true;
              }
            } else if (detected) {
              throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
            } else {
              state.tag = _tag;
              state.anchor = _anchor;
              return true;
            }
          }
          if (state.line === _line || state.lineIndent > nodeIndent) {
            if (atExplicitKey) {
              _keyLine = state.line;
              _keyLineStart = state.lineStart;
              _keyPos = state.position;
            }
            if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
              if (atExplicitKey) {
                keyNode = state.result;
              } else {
                valueNode = state.result;
              }
            }
            if (!atExplicitKey) {
              storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
              keyTag = keyNode = valueNode = null;
            }
            skipSeparationSpace(state, true, -1);
            ch = state.input.charCodeAt(state.position);
          }
          if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
            throwError(state, "bad indentation of a mapping entry");
          } else if (state.lineIndent < nodeIndent) {
            break;
          }
        }
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
        }
        if (detected) {
          state.tag = _tag;
          state.anchor = _anchor;
          state.kind = "mapping";
          state.result = _result;
        }
        return detected;
      }
      function readTagProperty(state) {
        var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch !== 33) return false;
        if (state.tag !== null) {
          throwError(state, "duplication of a tag property");
        }
        ch = state.input.charCodeAt(++state.position);
        if (ch === 60) {
          isVerbatim = true;
          ch = state.input.charCodeAt(++state.position);
        } else if (ch === 33) {
          isNamed = true;
          tagHandle = "!!";
          ch = state.input.charCodeAt(++state.position);
        } else {
          tagHandle = "!";
        }
        _position = state.position;
        if (isVerbatim) {
          do {
            ch = state.input.charCodeAt(++state.position);
          } while (ch !== 0 && ch !== 62);
          if (state.position < state.length) {
            tagName = state.input.slice(_position, state.position);
            ch = state.input.charCodeAt(++state.position);
          } else {
            throwError(state, "unexpected end of the stream within a verbatim tag");
          }
        } else {
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            if (ch === 33) {
              if (!isNamed) {
                tagHandle = state.input.slice(_position - 1, state.position + 1);
                if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
                  throwError(state, "named tag handle cannot contain such characters");
                }
                isNamed = true;
                _position = state.position + 1;
              } else {
                throwError(state, "tag suffix cannot contain exclamation marks");
              }
            }
            ch = state.input.charCodeAt(++state.position);
          }
          tagName = state.input.slice(_position, state.position);
          if (PATTERN_FLOW_INDICATORS.test(tagName)) {
            throwError(state, "tag suffix cannot contain flow indicator characters");
          }
        }
        if (tagName && !PATTERN_TAG_URI.test(tagName)) {
          throwError(state, "tag name cannot contain such characters: " + tagName);
        }
        try {
          tagName = decodeURIComponent(tagName);
        } catch (err) {
          throwError(state, "tag name is malformed: " + tagName);
        }
        if (isVerbatim) {
          state.tag = tagName;
        } else if (_hasOwnProperty.call(state.tagMap, tagHandle)) {
          state.tag = state.tagMap[tagHandle] + tagName;
        } else if (tagHandle === "!") {
          state.tag = "!" + tagName;
        } else if (tagHandle === "!!") {
          state.tag = "tag:yaml.org,2002:" + tagName;
        } else {
          throwError(state, 'undeclared tag handle "' + tagHandle + '"');
        }
        return true;
      }
      function readAnchorProperty(state) {
        var _position, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch !== 38) return false;
        if (state.anchor !== null) {
          throwError(state, "duplication of an anchor property");
        }
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (state.position === _position) {
          throwError(state, "name of an anchor node must contain at least one character");
        }
        state.anchor = state.input.slice(_position, state.position);
        return true;
      }
      function readAlias(state) {
        var _position, alias, ch;
        ch = state.input.charCodeAt(state.position);
        if (ch !== 42) return false;
        ch = state.input.charCodeAt(++state.position);
        _position = state.position;
        while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (state.position === _position) {
          throwError(state, "name of an alias node must contain at least one character");
        }
        alias = state.input.slice(_position, state.position);
        if (!_hasOwnProperty.call(state.anchorMap, alias)) {
          throwError(state, 'unidentified alias "' + alias + '"');
        }
        state.result = state.anchorMap[alias];
        skipSeparationSpace(state, true, -1);
        return true;
      }
      function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
        var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type, flowIndent, blockIndent;
        if (state.listener !== null) {
          state.listener("open", state);
        }
        state.tag = null;
        state.anchor = null;
        state.kind = null;
        state.result = null;
        allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
        if (allowToSeek) {
          if (skipSeparationSpace(state, true, -1)) {
            atNewLine = true;
            if (state.lineIndent > parentIndent) {
              indentStatus = 1;
            } else if (state.lineIndent === parentIndent) {
              indentStatus = 0;
            } else if (state.lineIndent < parentIndent) {
              indentStatus = -1;
            }
          }
        }
        if (indentStatus === 1) {
          while (readTagProperty(state) || readAnchorProperty(state)) {
            if (skipSeparationSpace(state, true, -1)) {
              atNewLine = true;
              allowBlockCollections = allowBlockStyles;
              if (state.lineIndent > parentIndent) {
                indentStatus = 1;
              } else if (state.lineIndent === parentIndent) {
                indentStatus = 0;
              } else if (state.lineIndent < parentIndent) {
                indentStatus = -1;
              }
            } else {
              allowBlockCollections = false;
            }
          }
        }
        if (allowBlockCollections) {
          allowBlockCollections = atNewLine || allowCompact;
        }
        if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
          if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
            flowIndent = parentIndent;
          } else {
            flowIndent = parentIndent + 1;
          }
          blockIndent = state.position - state.lineStart;
          if (indentStatus === 1) {
            if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
              hasContent = true;
            } else {
              if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
                hasContent = true;
              } else if (readAlias(state)) {
                hasContent = true;
                if (state.tag !== null || state.anchor !== null) {
                  throwError(state, "alias node should not have any properties");
                }
              } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
                hasContent = true;
                if (state.tag === null) {
                  state.tag = "?";
                }
              }
              if (state.anchor !== null) {
                state.anchorMap[state.anchor] = state.result;
              }
            }
          } else if (indentStatus === 0) {
            hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
          }
        }
        if (state.tag === null) {
          if (state.anchor !== null) {
            state.anchorMap[state.anchor] = state.result;
          }
        } else if (state.tag === "?") {
          if (state.result !== null && state.kind !== "scalar") {
            throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
          }
          for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
            type = state.implicitTypes[typeIndex];
            if (type.resolve(state.result)) {
              state.result = type.construct(state.result);
              state.tag = type.tag;
              if (state.anchor !== null) {
                state.anchorMap[state.anchor] = state.result;
              }
              break;
            }
          }
        } else if (state.tag !== "!") {
          if (_hasOwnProperty.call(state.typeMap[state.kind || "fallback"], state.tag)) {
            type = state.typeMap[state.kind || "fallback"][state.tag];
          } else {
            type = null;
            typeList = state.typeMap.multi[state.kind || "fallback"];
            for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
              if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
                type = typeList[typeIndex];
                break;
              }
            }
          }
          if (!type) {
            throwError(state, "unknown tag !<" + state.tag + ">");
          }
          if (state.result !== null && type.kind !== state.kind) {
            throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type.kind + '", not "' + state.kind + '"');
          }
          if (!type.resolve(state.result, state.tag)) {
            throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
          } else {
            state.result = type.construct(state.result, state.tag);
            if (state.anchor !== null) {
              state.anchorMap[state.anchor] = state.result;
            }
          }
        }
        if (state.listener !== null) {
          state.listener("close", state);
        }
        return state.tag !== null || state.anchor !== null || hasContent;
      }
      function readDocument(state) {
        var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
        state.version = null;
        state.checkLineBreaks = state.legacy;
        state.tagMap = /* @__PURE__ */ Object.create(null);
        state.anchorMap = /* @__PURE__ */ Object.create(null);
        while ((ch = state.input.charCodeAt(state.position)) !== 0) {
          skipSeparationSpace(state, true, -1);
          ch = state.input.charCodeAt(state.position);
          if (state.lineIndent > 0 || ch !== 37) {
            break;
          }
          hasDirectives = true;
          ch = state.input.charCodeAt(++state.position);
          _position = state.position;
          while (ch !== 0 && !is_WS_OR_EOL(ch)) {
            ch = state.input.charCodeAt(++state.position);
          }
          directiveName = state.input.slice(_position, state.position);
          directiveArgs = [];
          if (directiveName.length < 1) {
            throwError(state, "directive name must not be less than one character in length");
          }
          while (ch !== 0) {
            while (is_WHITE_SPACE(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            if (ch === 35) {
              do {
                ch = state.input.charCodeAt(++state.position);
              } while (ch !== 0 && !is_EOL(ch));
              break;
            }
            if (is_EOL(ch)) break;
            _position = state.position;
            while (ch !== 0 && !is_WS_OR_EOL(ch)) {
              ch = state.input.charCodeAt(++state.position);
            }
            directiveArgs.push(state.input.slice(_position, state.position));
          }
          if (ch !== 0) readLineBreak(state);
          if (_hasOwnProperty.call(directiveHandlers, directiveName)) {
            directiveHandlers[directiveName](state, directiveName, directiveArgs);
          } else {
            throwWarning(state, 'unknown document directive "' + directiveName + '"');
          }
        }
        skipSeparationSpace(state, true, -1);
        if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
          state.position += 3;
          skipSeparationSpace(state, true, -1);
        } else if (hasDirectives) {
          throwError(state, "directives end mark is expected");
        }
        composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
        skipSeparationSpace(state, true, -1);
        if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
          throwWarning(state, "non-ASCII line breaks are interpreted as content");
        }
        state.documents.push(state.result);
        if (state.position === state.lineStart && testDocumentSeparator(state)) {
          if (state.input.charCodeAt(state.position) === 46) {
            state.position += 3;
            skipSeparationSpace(state, true, -1);
          }
          return;
        }
        if (state.position < state.length - 1) {
          throwError(state, "end of the stream or a document separator is expected");
        } else {
          return;
        }
      }
      function loadDocuments(input, options) {
        input = String(input);
        options = options || {};
        if (input.length !== 0) {
          if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
            input += "\n";
          }
          if (input.charCodeAt(0) === 65279) {
            input = input.slice(1);
          }
        }
        var state = new State(input, options);
        var nullpos = input.indexOf("\0");
        if (nullpos !== -1) {
          state.position = nullpos;
          throwError(state, "null byte is not allowed in input");
        }
        state.input += "\0";
        while (state.input.charCodeAt(state.position) === 32) {
          state.lineIndent += 1;
          state.position += 1;
        }
        while (state.position < state.length - 1) {
          readDocument(state);
        }
        return state.documents;
      }
      function loadAll(input, iterator, options) {
        if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
          options = iterator;
          iterator = null;
        }
        var documents = loadDocuments(input, options);
        if (typeof iterator !== "function") {
          return documents;
        }
        for (var index = 0, length = documents.length; index < length; index += 1) {
          iterator(documents[index]);
        }
      }
      function load(input, options) {
        var documents = loadDocuments(input, options);
        if (documents.length === 0) {
          return void 0;
        } else if (documents.length === 1) {
          return documents[0];
        }
        throw new YAMLException("expected a single document in the stream, but found more");
      }
      module.exports.loadAll = loadAll;
      module.exports.load = load;
    }
  });

  // node_modules/js-yaml/lib/dumper.js
  var require_dumper = __commonJS({
    "node_modules/js-yaml/lib/dumper.js"(exports, module) {
      "use strict";
      var common = require_common();
      var YAMLException = require_exception();
      var DEFAULT_SCHEMA = require_default();
      var _toString = Object.prototype.toString;
      var _hasOwnProperty = Object.prototype.hasOwnProperty;
      var CHAR_BOM = 65279;
      var CHAR_TAB = 9;
      var CHAR_LINE_FEED = 10;
      var CHAR_CARRIAGE_RETURN = 13;
      var CHAR_SPACE = 32;
      var CHAR_EXCLAMATION = 33;
      var CHAR_DOUBLE_QUOTE = 34;
      var CHAR_SHARP = 35;
      var CHAR_PERCENT = 37;
      var CHAR_AMPERSAND = 38;
      var CHAR_SINGLE_QUOTE = 39;
      var CHAR_ASTERISK = 42;
      var CHAR_COMMA = 44;
      var CHAR_MINUS = 45;
      var CHAR_COLON = 58;
      var CHAR_EQUALS = 61;
      var CHAR_GREATER_THAN = 62;
      var CHAR_QUESTION = 63;
      var CHAR_COMMERCIAL_AT = 64;
      var CHAR_LEFT_SQUARE_BRACKET = 91;
      var CHAR_RIGHT_SQUARE_BRACKET = 93;
      var CHAR_GRAVE_ACCENT = 96;
      var CHAR_LEFT_CURLY_BRACKET = 123;
      var CHAR_VERTICAL_LINE = 124;
      var CHAR_RIGHT_CURLY_BRACKET = 125;
      var ESCAPE_SEQUENCES = {};
      ESCAPE_SEQUENCES[0] = "\\0";
      ESCAPE_SEQUENCES[7] = "\\a";
      ESCAPE_SEQUENCES[8] = "\\b";
      ESCAPE_SEQUENCES[9] = "\\t";
      ESCAPE_SEQUENCES[10] = "\\n";
      ESCAPE_SEQUENCES[11] = "\\v";
      ESCAPE_SEQUENCES[12] = "\\f";
      ESCAPE_SEQUENCES[13] = "\\r";
      ESCAPE_SEQUENCES[27] = "\\e";
      ESCAPE_SEQUENCES[34] = '\\"';
      ESCAPE_SEQUENCES[92] = "\\\\";
      ESCAPE_SEQUENCES[133] = "\\N";
      ESCAPE_SEQUENCES[160] = "\\_";
      ESCAPE_SEQUENCES[8232] = "\\L";
      ESCAPE_SEQUENCES[8233] = "\\P";
      var DEPRECATED_BOOLEANS_SYNTAX = [
        "y",
        "Y",
        "yes",
        "Yes",
        "YES",
        "on",
        "On",
        "ON",
        "n",
        "N",
        "no",
        "No",
        "NO",
        "off",
        "Off",
        "OFF"
      ];
      var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
      function compileStyleMap(schema, map) {
        var result, keys, index, length, tag, style, type;
        if (map === null) return {};
        result = {};
        keys = Object.keys(map);
        for (index = 0, length = keys.length; index < length; index += 1) {
          tag = keys[index];
          style = String(map[tag]);
          if (tag.slice(0, 2) === "!!") {
            tag = "tag:yaml.org,2002:" + tag.slice(2);
          }
          type = schema.compiledTypeMap["fallback"][tag];
          if (type && _hasOwnProperty.call(type.styleAliases, style)) {
            style = type.styleAliases[style];
          }
          result[tag] = style;
        }
        return result;
      }
      function encodeHex(character) {
        var string, handle, length;
        string = character.toString(16).toUpperCase();
        if (character <= 255) {
          handle = "x";
          length = 2;
        } else if (character <= 65535) {
          handle = "u";
          length = 4;
        } else if (character <= 4294967295) {
          handle = "U";
          length = 8;
        } else {
          throw new YAMLException("code point within a string may not be greater than 0xFFFFFFFF");
        }
        return "\\" + handle + common.repeat("0", length - string.length) + string;
      }
      var QUOTING_TYPE_SINGLE = 1;
      var QUOTING_TYPE_DOUBLE = 2;
      function State(options) {
        this.schema = options["schema"] || DEFAULT_SCHEMA;
        this.indent = Math.max(1, options["indent"] || 2);
        this.noArrayIndent = options["noArrayIndent"] || false;
        this.skipInvalid = options["skipInvalid"] || false;
        this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
        this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
        this.sortKeys = options["sortKeys"] || false;
        this.lineWidth = options["lineWidth"] || 80;
        this.noRefs = options["noRefs"] || false;
        this.noCompatMode = options["noCompatMode"] || false;
        this.condenseFlow = options["condenseFlow"] || false;
        this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
        this.forceQuotes = options["forceQuotes"] || false;
        this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
        this.implicitTypes = this.schema.compiledImplicit;
        this.explicitTypes = this.schema.compiledExplicit;
        this.tag = null;
        this.result = "";
        this.duplicates = [];
        this.usedDuplicates = null;
      }
      function indentString(string, spaces) {
        var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
        while (position < length) {
          next = string.indexOf("\n", position);
          if (next === -1) {
            line = string.slice(position);
            position = length;
          } else {
            line = string.slice(position, next + 1);
            position = next + 1;
          }
          if (line.length && line !== "\n") result += ind;
          result += line;
        }
        return result;
      }
      function generateNextLine(state, level) {
        return "\n" + common.repeat(" ", state.indent * level);
      }
      function testImplicitResolving(state, str) {
        var index, length, type;
        for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
          type = state.implicitTypes[index];
          if (type.resolve(str)) {
            return true;
          }
        }
        return false;
      }
      function isWhitespace(c) {
        return c === CHAR_SPACE || c === CHAR_TAB;
      }
      function isPrintable(c) {
        return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
      }
      function isNsCharOrWhitespace(c) {
        return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
      }
      function isPlainSafe(c, prev, inblock) {
        var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
        var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
        return (
          // ns-plain-safe
          (inblock ? (
            // c = flow-in
            cIsNsCharOrWhitespace
          ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
        );
      }
      function isPlainSafeFirst(c) {
        return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
      }
      function isPlainSafeLast(c) {
        return !isWhitespace(c) && c !== CHAR_COLON;
      }
      function codePointAt(string, pos) {
        var first = string.charCodeAt(pos), second;
        if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
          second = string.charCodeAt(pos + 1);
          if (second >= 56320 && second <= 57343) {
            return (first - 55296) * 1024 + second - 56320 + 65536;
          }
        }
        return first;
      }
      function needIndentIndicator(string) {
        var leadingSpaceRe = /^\n* /;
        return leadingSpaceRe.test(string);
      }
      var STYLE_PLAIN = 1;
      var STYLE_SINGLE = 2;
      var STYLE_LITERAL = 3;
      var STYLE_FOLDED = 4;
      var STYLE_DOUBLE = 5;
      function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
        var i;
        var char = 0;
        var prevChar = null;
        var hasLineBreak = false;
        var hasFoldableLine = false;
        var shouldTrackWidth = lineWidth !== -1;
        var previousLineBreak = -1;
        var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
        if (singleLineOnly || forceQuotes) {
          for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
            char = codePointAt(string, i);
            if (!isPrintable(char)) {
              return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char, prevChar, inblock);
            prevChar = char;
          }
        } else {
          for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
            char = codePointAt(string, i);
            if (char === CHAR_LINE_FEED) {
              hasLineBreak = true;
              if (shouldTrackWidth) {
                hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
                i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
                previousLineBreak = i;
              }
            } else if (!isPrintable(char)) {
              return STYLE_DOUBLE;
            }
            plain = plain && isPlainSafe(char, prevChar, inblock);
            prevChar = char;
          }
          hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
        }
        if (!hasLineBreak && !hasFoldableLine) {
          if (plain && !forceQuotes && !testAmbiguousType(string)) {
            return STYLE_PLAIN;
          }
          return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
        }
        if (indentPerLevel > 9 && needIndentIndicator(string)) {
          return STYLE_DOUBLE;
        }
        if (!forceQuotes) {
          return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
        }
        return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
      }
      function writeScalar(state, string, level, iskey, inblock) {
        state.dump = (function() {
          if (string.length === 0) {
            return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
          }
          if (!state.noCompatMode) {
            if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
              return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
            }
          }
          var indent = state.indent * Math.max(1, level);
          var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
          var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
          function testAmbiguity(string2) {
            return testImplicitResolving(state, string2);
          }
          switch (chooseScalarStyle(
            string,
            singleLineOnly,
            state.indent,
            lineWidth,
            testAmbiguity,
            state.quotingType,
            state.forceQuotes && !iskey,
            inblock
          )) {
            case STYLE_PLAIN:
              return string;
            case STYLE_SINGLE:
              return "'" + string.replace(/'/g, "''") + "'";
            case STYLE_LITERAL:
              return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
            case STYLE_FOLDED:
              return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
            case STYLE_DOUBLE:
              return '"' + escapeString(string, lineWidth) + '"';
            default:
              throw new YAMLException("impossible error: invalid scalar style");
          }
        })();
      }
      function blockHeader(string, indentPerLevel) {
        var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
        var clip = string[string.length - 1] === "\n";
        var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
        var chomp = keep ? "+" : clip ? "" : "-";
        return indentIndicator + chomp + "\n";
      }
      function dropEndingNewline(string) {
        return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
      }
      function foldString(string, width) {
        var lineRe = /(\n+)([^\n]*)/g;
        var result = (function() {
          var nextLF = string.indexOf("\n");
          nextLF = nextLF !== -1 ? nextLF : string.length;
          lineRe.lastIndex = nextLF;
          return foldLine(string.slice(0, nextLF), width);
        })();
        var prevMoreIndented = string[0] === "\n" || string[0] === " ";
        var moreIndented;
        var match;
        while (match = lineRe.exec(string)) {
          var prefix = match[1], line = match[2];
          moreIndented = line[0] === " ";
          result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
          prevMoreIndented = moreIndented;
        }
        return result;
      }
      function foldLine(line, width) {
        if (line === "" || line[0] === " ") return line;
        var breakRe = / [^ ]/g;
        var match;
        var start = 0, end, curr = 0, next = 0;
        var result = "";
        while (match = breakRe.exec(line)) {
          next = match.index;
          if (next - start > width) {
            end = curr > start ? curr : next;
            result += "\n" + line.slice(start, end);
            start = end + 1;
          }
          curr = next;
        }
        result += "\n";
        if (line.length - start > width && curr > start) {
          result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
        } else {
          result += line.slice(start);
        }
        return result.slice(1);
      }
      function escapeString(string) {
        var result = "";
        var char = 0;
        var escapeSeq;
        for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
          char = codePointAt(string, i);
          escapeSeq = ESCAPE_SEQUENCES[char];
          if (!escapeSeq && isPrintable(char)) {
            result += string[i];
            if (char >= 65536) result += string[i + 1];
          } else {
            result += escapeSeq || encodeHex(char);
          }
        }
        return result;
      }
      function writeFlowSequence(state, level, object) {
        var _result = "", _tag = state.tag, index, length, value;
        for (index = 0, length = object.length; index < length; index += 1) {
          value = object[index];
          if (state.replacer) {
            value = state.replacer.call(object, String(index), value);
          }
          if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
            if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
            _result += state.dump;
          }
        }
        state.tag = _tag;
        state.dump = "[" + _result + "]";
      }
      function writeBlockSequence(state, level, object, compact) {
        var _result = "", _tag = state.tag, index, length, value;
        for (index = 0, length = object.length; index < length; index += 1) {
          value = object[index];
          if (state.replacer) {
            value = state.replacer.call(object, String(index), value);
          }
          if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
            if (!compact || _result !== "") {
              _result += generateNextLine(state, level);
            }
            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
              _result += "-";
            } else {
              _result += "- ";
            }
            _result += state.dump;
          }
        }
        state.tag = _tag;
        state.dump = _result || "[]";
      }
      function writeFlowMapping(state, level, object) {
        var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          pairBuffer = "";
          if (_result !== "") pairBuffer += ", ";
          if (state.condenseFlow) pairBuffer += '"';
          objectKey = objectKeyList[index];
          objectValue = object[objectKey];
          if (state.replacer) {
            objectValue = state.replacer.call(object, objectKey, objectValue);
          }
          if (!writeNode(state, level, objectKey, false, false)) {
            continue;
          }
          if (state.dump.length > 1024) pairBuffer += "? ";
          pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
          if (!writeNode(state, level, objectValue, false, false)) {
            continue;
          }
          pairBuffer += state.dump;
          _result += pairBuffer;
        }
        state.tag = _tag;
        state.dump = "{" + _result + "}";
      }
      function writeBlockMapping(state, level, object, compact) {
        var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
        if (state.sortKeys === true) {
          objectKeyList.sort();
        } else if (typeof state.sortKeys === "function") {
          objectKeyList.sort(state.sortKeys);
        } else if (state.sortKeys) {
          throw new YAMLException("sortKeys must be a boolean or a function");
        }
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          pairBuffer = "";
          if (!compact || _result !== "") {
            pairBuffer += generateNextLine(state, level);
          }
          objectKey = objectKeyList[index];
          objectValue = object[objectKey];
          if (state.replacer) {
            objectValue = state.replacer.call(object, objectKey, objectValue);
          }
          if (!writeNode(state, level + 1, objectKey, true, true, true)) {
            continue;
          }
          explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
          if (explicitPair) {
            if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
              pairBuffer += "?";
            } else {
              pairBuffer += "? ";
            }
          }
          pairBuffer += state.dump;
          if (explicitPair) {
            pairBuffer += generateNextLine(state, level);
          }
          if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
            continue;
          }
          if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
            pairBuffer += ":";
          } else {
            pairBuffer += ": ";
          }
          pairBuffer += state.dump;
          _result += pairBuffer;
        }
        state.tag = _tag;
        state.dump = _result || "{}";
      }
      function detectType(state, object, explicit) {
        var _result, typeList, index, length, type, style;
        typeList = explicit ? state.explicitTypes : state.implicitTypes;
        for (index = 0, length = typeList.length; index < length; index += 1) {
          type = typeList[index];
          if ((type.instanceOf || type.predicate) && (!type.instanceOf || typeof object === "object" && object instanceof type.instanceOf) && (!type.predicate || type.predicate(object))) {
            if (explicit) {
              if (type.multi && type.representName) {
                state.tag = type.representName(object);
              } else {
                state.tag = type.tag;
              }
            } else {
              state.tag = "?";
            }
            if (type.represent) {
              style = state.styleMap[type.tag] || type.defaultStyle;
              if (_toString.call(type.represent) === "[object Function]") {
                _result = type.represent(object, style);
              } else if (_hasOwnProperty.call(type.represent, style)) {
                _result = type.represent[style](object, style);
              } else {
                throw new YAMLException("!<" + type.tag + '> tag resolver accepts not "' + style + '" style');
              }
              state.dump = _result;
            }
            return true;
          }
        }
        return false;
      }
      function writeNode(state, level, object, block, compact, iskey, isblockseq) {
        state.tag = null;
        state.dump = object;
        if (!detectType(state, object, false)) {
          detectType(state, object, true);
        }
        var type = _toString.call(state.dump);
        var inblock = block;
        var tagStr;
        if (block) {
          block = state.flowLevel < 0 || state.flowLevel > level;
        }
        var objectOrArray = type === "[object Object]" || type === "[object Array]", duplicateIndex, duplicate;
        if (objectOrArray) {
          duplicateIndex = state.duplicates.indexOf(object);
          duplicate = duplicateIndex !== -1;
        }
        if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
          compact = false;
        }
        if (duplicate && state.usedDuplicates[duplicateIndex]) {
          state.dump = "*ref_" + duplicateIndex;
        } else {
          if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
            state.usedDuplicates[duplicateIndex] = true;
          }
          if (type === "[object Object]") {
            if (block && Object.keys(state.dump).length !== 0) {
              writeBlockMapping(state, level, state.dump, compact);
              if (duplicate) {
                state.dump = "&ref_" + duplicateIndex + state.dump;
              }
            } else {
              writeFlowMapping(state, level, state.dump);
              if (duplicate) {
                state.dump = "&ref_" + duplicateIndex + " " + state.dump;
              }
            }
          } else if (type === "[object Array]") {
            if (block && state.dump.length !== 0) {
              if (state.noArrayIndent && !isblockseq && level > 0) {
                writeBlockSequence(state, level - 1, state.dump, compact);
              } else {
                writeBlockSequence(state, level, state.dump, compact);
              }
              if (duplicate) {
                state.dump = "&ref_" + duplicateIndex + state.dump;
              }
            } else {
              writeFlowSequence(state, level, state.dump);
              if (duplicate) {
                state.dump = "&ref_" + duplicateIndex + " " + state.dump;
              }
            }
          } else if (type === "[object String]") {
            if (state.tag !== "?") {
              writeScalar(state, state.dump, level, iskey, inblock);
            }
          } else if (type === "[object Undefined]") {
            return false;
          } else {
            if (state.skipInvalid) return false;
            throw new YAMLException("unacceptable kind of an object to dump " + type);
          }
          if (state.tag !== null && state.tag !== "?") {
            tagStr = encodeURI(
              state.tag[0] === "!" ? state.tag.slice(1) : state.tag
            ).replace(/!/g, "%21");
            if (state.tag[0] === "!") {
              tagStr = "!" + tagStr;
            } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
              tagStr = "!!" + tagStr.slice(18);
            } else {
              tagStr = "!<" + tagStr + ">";
            }
            state.dump = tagStr + " " + state.dump;
          }
        }
        return true;
      }
      function getDuplicateReferences(object, state) {
        var objects = [], duplicatesIndexes = [], index, length;
        inspectNode(object, objects, duplicatesIndexes);
        for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
          state.duplicates.push(objects[duplicatesIndexes[index]]);
        }
        state.usedDuplicates = new Array(length);
      }
      function inspectNode(object, objects, duplicatesIndexes) {
        var objectKeyList, index, length;
        if (object !== null && typeof object === "object") {
          index = objects.indexOf(object);
          if (index !== -1) {
            if (duplicatesIndexes.indexOf(index) === -1) {
              duplicatesIndexes.push(index);
            }
          } else {
            objects.push(object);
            if (Array.isArray(object)) {
              for (index = 0, length = object.length; index < length; index += 1) {
                inspectNode(object[index], objects, duplicatesIndexes);
              }
            } else {
              objectKeyList = Object.keys(object);
              for (index = 0, length = objectKeyList.length; index < length; index += 1) {
                inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
              }
            }
          }
        }
      }
      function dump(input, options) {
        options = options || {};
        var state = new State(options);
        if (!state.noRefs) getDuplicateReferences(input, state);
        var value = input;
        if (state.replacer) {
          value = state.replacer.call({ "": value }, "", value);
        }
        if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
        return "";
      }
      module.exports.dump = dump;
    }
  });

  // node_modules/js-yaml/index.js
  var require_js_yaml = __commonJS({
    "node_modules/js-yaml/index.js"(exports, module) {
      "use strict";
      var loader = require_loader();
      var dumper = require_dumper();
      function renamed(from, to) {
        return function() {
          throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
        };
      }
      module.exports.Type = require_type();
      module.exports.Schema = require_schema();
      module.exports.FAILSAFE_SCHEMA = require_failsafe();
      module.exports.JSON_SCHEMA = require_json();
      module.exports.CORE_SCHEMA = require_core();
      module.exports.DEFAULT_SCHEMA = require_default();
      module.exports.load = loader.load;
      module.exports.loadAll = loader.loadAll;
      module.exports.dump = dumper.dump;
      module.exports.YAMLException = require_exception();
      module.exports.types = {
        binary: require_binary(),
        float: require_float(),
        map: require_map(),
        null: require_null(),
        pairs: require_pairs(),
        set: require_set(),
        timestamp: require_timestamp(),
        bool: require_bool(),
        int: require_int(),
        merge: require_merge(),
        omap: require_omap(),
        seq: require_seq(),
        str: require_str()
      };
      module.exports.safeLoad = renamed("safeLoad", "load");
      module.exports.safeLoadAll = renamed("safeLoadAll", "loadAll");
      module.exports.safeDump = renamed("safeDump", "dump");
    }
  });

  // node_modules/marked/lib/marked.esm.js
  var marked_esm_exports = {};
  __export(marked_esm_exports, {
    Hooks: () => P,
    Lexer: () => x,
    Marked: () => B,
    Parser: () => b,
    Renderer: () => y,
    TextRenderer: () => $,
    Tokenizer: () => w,
    defaults: () => T,
    getDefaults: () => M,
    lexer: () => en,
    marked: () => g,
    options: () => Ut,
    parse: () => Vt,
    parseInline: () => Jt,
    parser: () => Yt,
    setOptions: () => Kt,
    use: () => Wt,
    walkTokens: () => Xt
  });
  function M() {
    return { async: false, breaks: false, extensions: null, gfm: true, hooks: null, pedantic: false, renderer: null, silent: false, tokenizer: null, walkTokens: null };
  }
  function G(u3) {
    T = u3;
  }
  function k(u3, e = "") {
    let t = typeof u3 == "string" ? u3 : u3.source, n = { replace: (r, i) => {
      let s = typeof i == "string" ? i : i.source;
      return s = s.replace(m.caret, "$1"), t = t.replace(r, s), n;
    }, getRegex: () => new RegExp(t, e) };
    return n;
  }
  function O(u3, e) {
    if (e) {
      if (m.escapeTest.test(u3)) return u3.replace(m.escapeReplace, de);
    } else if (m.escapeTestNoEncode.test(u3)) return u3.replace(m.escapeReplaceNoEncode, de);
    return u3;
  }
  function X(u3) {
    try {
      u3 = encodeURI(u3).replace(m.percentDecode, "%");
    } catch {
      return null;
    }
    return u3;
  }
  function J(u3, e) {
    let t = u3.replace(m.findPipe, (i, s, a) => {
      let o = false, l = s;
      for (; --l >= 0 && a[l] === "\\"; ) o = !o;
      return o ? "|" : " |";
    }), n = t.split(m.splitPipe), r = 0;
    if (n[0].trim() || n.shift(), n.length > 0 && !n.at(-1)?.trim() && n.pop(), e) if (n.length > e) n.splice(e);
    else for (; n.length < e; ) n.push("");
    for (; r < n.length; r++) n[r] = n[r].trim().replace(m.slashPipe, "|");
    return n;
  }
  function E(u3, e, t) {
    let n = u3.length;
    if (n === 0) return "";
    let r = 0;
    for (; r < n; ) {
      let i = u3.charAt(n - r - 1);
      if (i === e && !t) r++;
      else if (i !== e && t) r++;
      else break;
    }
    return u3.slice(0, n - r);
  }
  function ge(u3, e) {
    if (u3.indexOf(e[1]) === -1) return -1;
    let t = 0;
    for (let n = 0; n < u3.length; n++) if (u3[n] === "\\") n++;
    else if (u3[n] === e[0]) t++;
    else if (u3[n] === e[1] && (t--, t < 0)) return n;
    return t > 0 ? -2 : -1;
  }
  function fe(u3, e = 0) {
    let t = e, n = "";
    for (let r of u3) if (r === "	") {
      let i = 4 - t % 4;
      n += " ".repeat(i), t += i;
    } else n += r, t++;
    return n;
  }
  function me(u3, e, t, n, r) {
    let i = e.href, s = e.title || null, a = u3[1].replace(r.other.outputLinkReplace, "$1");
    n.state.inLink = true;
    let o = { type: u3[0].charAt(0) === "!" ? "image" : "link", raw: t, href: i, title: s, text: a, tokens: n.inlineTokens(a) };
    return n.state.inLink = false, o;
  }
  function it(u3, e, t) {
    let n = u3.match(t.other.indentCodeCompensation);
    if (n === null) return e;
    let r = n[1];
    return e.split(`
`).map((i) => {
      let s = i.match(t.other.beginningSpace);
      if (s === null) return i;
      let [a] = s;
      return a.length >= r.length ? i.slice(r.length) : i;
    }).join(`
`);
  }
  function g(u3, e) {
    return L.parse(u3, e);
  }
  var T, _, Re, m, Te, Oe, we, A, ye, N, re, se, Pe, Q, Se, j, $e, _e, q, F, Le, ie, Me, U, te, ze, Ee, Ie, Ae, oe, Ce, v, K, ae, Be, le, De, qe, ue, ve, He, Ge, pe, Ze, Ne, ce, Qe, je, Fe, Ue, Ke, We, Xe, Je, Ve, Ye, D, et, he, ke, tt, ne, W, nt, Z, rt, C, z, st, de, w, x, y, $, b, P, B, L, Ut, Kt, Wt, Xt, Jt, Vt, Yt, en;
  var init_marked_esm = __esm({
    "node_modules/marked/lib/marked.esm.js"() {
      T = M();
      _ = { exec: () => null };
      Re = (() => {
        try {
          return !!new RegExp("(?<=1)(?<!1)");
        } catch {
          return false;
        }
      })();
      m = { codeRemoveIndent: /^(?: {1,4}| {0,3}\t)/gm, outputLinkReplace: /\\([\[\]])/g, indentCodeCompensation: /^(\s+)(?:```)/, beginningSpace: /^\s+/, endingHash: /#$/, startingSpaceChar: /^ /, endingSpaceChar: / $/, nonSpaceChar: /[^ ]/, newLineCharGlobal: /\n/g, tabCharGlobal: /\t/g, multipleSpaceGlobal: /\s+/g, blankLine: /^[ \t]*$/, doubleBlankLine: /\n[ \t]*\n[ \t]*$/, blockquoteStart: /^ {0,3}>/, blockquoteSetextReplace: /\n {0,3}((?:=+|-+) *)(?=\n|$)/g, blockquoteSetextReplace2: /^ {0,3}>[ \t]?/gm, listReplaceNesting: /^ {1,4}(?=( {4})*[^ ])/g, listIsTask: /^\[[ xX]\] +\S/, listReplaceTask: /^\[[ xX]\] +/, listTaskCheckbox: /\[[ xX]\]/, anyLine: /\n.*\n/, hrefBrackets: /^<(.*)>$/, tableDelimiter: /[:|]/, tableAlignChars: /^\||\| *$/g, tableRowBlankLine: /\n[ \t]*$/, tableAlignRight: /^ *-+: *$/, tableAlignCenter: /^ *:-+: *$/, tableAlignLeft: /^ *:-+ *$/, startATag: /^<a /i, endATag: /^<\/a>/i, startPreScriptTag: /^<(pre|code|kbd|script)(\s|>)/i, endPreScriptTag: /^<\/(pre|code|kbd|script)(\s|>)/i, startAngleBracket: /^</, endAngleBracket: />$/, pedanticHrefTitle: /^([^'"]*[^\s])\s+(['"])(.*)\2/, unicodeAlphaNumeric: /[\p{L}\p{N}]/u, escapeTest: /[&<>"']/, escapeReplace: /[&<>"']/g, escapeTestNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/, escapeReplaceNoEncode: /[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g, caret: /(^|[^\[])\^/g, percentDecode: /%25/g, findPipe: /\|/g, splitPipe: / \|/, slashPipe: /\\\|/g, carriageReturn: /\r\n|\r/g, spaceLine: /^ +$/gm, notSpaceStart: /^\S*/, endingNewline: /\n$/, listItemRegex: (u3) => new RegExp(`^( {0,3}${u3})((?:[	 ][^\\n]*)?(?:\\n|$))`), nextBulletRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`), hrRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`), fencesBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}(?:\`\`\`|~~~)`), headingBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}#`), htmlBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}<(?:[a-z].*>|!--)`, "i"), blockquoteBeginRegex: (u3) => new RegExp(`^ {0,${Math.min(3, u3 - 1)}}>`) };
      Te = /^(?:[ \t]*(?:\n|$))+/;
      Oe = /^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/;
      we = /^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/;
      A = /^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/;
      ye = /^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/;
      N = / {0,3}(?:[*+-]|\d{1,9}[.)])/;
      re = /^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/;
      se = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/\|table/g, "").getRegex();
      Pe = k(re).replace(/bull/g, N).replace(/blockCode/g, /(?: {4}| {0,3}\t)/).replace(/fences/g, / {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g, / {0,3}>/).replace(/heading/g, / {0,3}#{1,6}/).replace(/html/g, / {0,3}<[^\n>]+>\n/).replace(/table/g, / {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex();
      Q = /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/;
      Se = /^[^\n]+/;
      j = /(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/;
      $e = k(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label", j).replace("title", /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex();
      _e = k(/^(bull)([ \t][^\n]+?)?(?:\n|$)/).replace(/bull/g, N).getRegex();
      q = "address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul";
      F = /<!--(?:-?>|[\s\S]*?(?:-->|$))/;
      Le = k("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))", "i").replace("comment", F).replace("tag", q).replace("attribute", / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex();
      ie = k(Q).replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("|table", "").replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex();
      Me = k(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph", ie).getRegex();
      U = { blockquote: Me, code: Oe, def: $e, fences: we, heading: ye, hr: A, html: Le, lheading: se, list: _e, newline: Te, paragraph: ie, table: _, text: Se };
      te = k("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("blockquote", " {0,3}>").replace("code", "(?: {4}| {0,3}	)[^\\n]").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex();
      ze = { ...U, lheading: Pe, table: te, paragraph: k(Q).replace("hr", A).replace("heading", " {0,3}#{1,6}(?:\\s|$)").replace("|lheading", "").replace("table", te).replace("blockquote", " {0,3}>").replace("fences", " {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list", " {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html", "</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag", q).getRegex() };
      Ee = { ...U, html: k(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment", F).replace(/tag/g, "(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(), def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/, heading: /^(#{1,6})(.*)(?:\n+|$)/, fences: _, lheading: /^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/, paragraph: k(Q).replace("hr", A).replace("heading", ` *#{1,6} *[^
]`).replace("lheading", se).replace("|table", "").replace("blockquote", " {0,3}>").replace("|fences", "").replace("|list", "").replace("|html", "").replace("|tag", "").getRegex() };
      Ie = /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/;
      Ae = /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/;
      oe = /^( {2,}|\\)\n(?!\s*$)/;
      Ce = /^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/;
      v = /[\p{P}\p{S}]/u;
      K = /[\s\p{P}\p{S}]/u;
      ae = /[^\s\p{P}\p{S}]/u;
      Be = k(/^((?![*_])punctSpace)/, "u").replace(/punctSpace/g, K).getRegex();
      le = /(?!~)[\p{P}\p{S}]/u;
      De = /(?!~)[\s\p{P}\p{S}]/u;
      qe = /(?:[^\s\p{P}\p{S}]|~)/u;
      ue = /(?![*_])[\p{P}\p{S}]/u;
      ve = /(?![*_])[\s\p{P}\p{S}]/u;
      He = /(?:[^\s\p{P}\p{S}]|[*_])/u;
      Ge = k(/link|precode-code|html/, "g").replace("link", /\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-", Re ? "(?<!`)()" : "(^^|[^`])").replace("code", /(?<b>`+)[^`]+\k<b>(?!`)/).replace("html", /<(?! )[^<>]*?>/).getRegex();
      pe = /^(?:\*+(?:((?!\*)punct)|[^\s*]))|^_+(?:((?!_)punct)|([^\s_]))/;
      Ze = k(pe, "u").replace(/punct/g, v).getRegex();
      Ne = k(pe, "u").replace(/punct/g, le).getRegex();
      ce = "^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)";
      Qe = k(ce, "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, v).getRegex();
      je = k(ce, "gu").replace(/notPunctSpace/g, qe).replace(/punctSpace/g, De).replace(/punct/g, le).getRegex();
      Fe = k("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)", "gu").replace(/notPunctSpace/g, ae).replace(/punctSpace/g, K).replace(/punct/g, v).getRegex();
      Ue = k(/^~~?(?:((?!~)punct)|[^\s~])/, "u").replace(/punct/g, ue).getRegex();
      Ke = "^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)";
      We = k(Ke, "gu").replace(/notPunctSpace/g, He).replace(/punctSpace/g, ve).replace(/punct/g, ue).getRegex();
      Xe = k(/\\(punct)/, "gu").replace(/punct/g, v).getRegex();
      Je = k(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme", /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email", /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex();
      Ve = k(F).replace("(?:-->|$)", "-->").getRegex();
      Ye = k("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment", Ve).replace("attribute", /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex();
      D = /(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+[^`]*?`+(?!`)|[^\[\]\\`])*?/;
      et = k(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label", D).replace("href", /<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title", /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex();
      he = k(/^!?\[(label)\]\[(ref)\]/).replace("label", D).replace("ref", j).getRegex();
      ke = k(/^!?\[(ref)\](?:\[\])?/).replace("ref", j).getRegex();
      tt = k("reflink|nolink(?!\\()", "g").replace("reflink", he).replace("nolink", ke).getRegex();
      ne = /[hH][tT][tT][pP][sS]?|[fF][tT][pP]/;
      W = { _backpedal: _, anyPunctuation: Xe, autolink: Je, blockSkip: Ge, br: oe, code: Ae, del: _, delLDelim: _, delRDelim: _, emStrongLDelim: Ze, emStrongRDelimAst: Qe, emStrongRDelimUnd: Fe, escape: Ie, link: et, nolink: ke, punctuation: Be, reflink: he, reflinkSearch: tt, tag: Ye, text: Ce, url: _ };
      nt = { ...W, link: k(/^!?\[(label)\]\((.*?)\)/).replace("label", D).getRegex(), reflink: k(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label", D).getRegex() };
      Z = { ...W, emStrongRDelimAst: je, emStrongLDelim: Ne, delLDelim: Ue, delRDelim: We, url: k(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol", ne).replace("email", /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(), _backpedal: /(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/, del: /^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/, text: k(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol", ne).getRegex() };
      rt = { ...Z, br: k(oe).replace("{2,}", "*").getRegex(), text: k(Z.text).replace("\\b_", "\\b_| {2,}\\n").replace(/\{2,\}/g, "*").getRegex() };
      C = { normal: U, gfm: ze, pedantic: Ee };
      z = { normal: W, gfm: Z, breaks: rt, pedantic: nt };
      st = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
      de = (u3) => st[u3];
      w = class {
        options;
        rules;
        lexer;
        constructor(e) {
          this.options = e || T;
        }
        space(e) {
          let t = this.rules.block.newline.exec(e);
          if (t && t[0].length > 0) return { type: "space", raw: t[0] };
        }
        code(e) {
          let t = this.rules.block.code.exec(e);
          if (t) {
            let n = t[0].replace(this.rules.other.codeRemoveIndent, "");
            return { type: "code", raw: t[0], codeBlockStyle: "indented", text: this.options.pedantic ? n : E(n, `
`) };
          }
        }
        fences(e) {
          let t = this.rules.block.fences.exec(e);
          if (t) {
            let n = t[0], r = it(n, t[3] || "", this.rules);
            return { type: "code", raw: n, lang: t[2] ? t[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : t[2], text: r };
          }
        }
        heading(e) {
          let t = this.rules.block.heading.exec(e);
          if (t) {
            let n = t[2].trim();
            if (this.rules.other.endingHash.test(n)) {
              let r = E(n, "#");
              (this.options.pedantic || !r || this.rules.other.endingSpaceChar.test(r)) && (n = r.trim());
            }
            return { type: "heading", raw: t[0], depth: t[1].length, text: n, tokens: this.lexer.inline(n) };
          }
        }
        hr(e) {
          let t = this.rules.block.hr.exec(e);
          if (t) return { type: "hr", raw: E(t[0], `
`) };
        }
        blockquote(e) {
          let t = this.rules.block.blockquote.exec(e);
          if (t) {
            let n = E(t[0], `
`).split(`
`), r = "", i = "", s = [];
            for (; n.length > 0; ) {
              let a = false, o = [], l;
              for (l = 0; l < n.length; l++) if (this.rules.other.blockquoteStart.test(n[l])) o.push(n[l]), a = true;
              else if (!a) o.push(n[l]);
              else break;
              n = n.slice(l);
              let p = o.join(`
`), c = p.replace(this.rules.other.blockquoteSetextReplace, `
    $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
              r = r ? `${r}
${p}` : p, i = i ? `${i}
${c}` : c;
              let d = this.lexer.state.top;
              if (this.lexer.state.top = true, this.lexer.blockTokens(c, s, true), this.lexer.state.top = d, n.length === 0) break;
              let h = s.at(-1);
              if (h?.type === "code") break;
              if (h?.type === "blockquote") {
                let R = h, f = R.raw + `
` + n.join(`
`), S = this.blockquote(f);
                s[s.length - 1] = S, r = r.substring(0, r.length - R.raw.length) + S.raw, i = i.substring(0, i.length - R.text.length) + S.text;
                break;
              } else if (h?.type === "list") {
                let R = h, f = R.raw + `
` + n.join(`
`), S = this.list(f);
                s[s.length - 1] = S, r = r.substring(0, r.length - h.raw.length) + S.raw, i = i.substring(0, i.length - R.raw.length) + S.raw, n = f.substring(s.at(-1).raw.length).split(`
`);
                continue;
              }
            }
            return { type: "blockquote", raw: r, tokens: s, text: i };
          }
        }
        list(e) {
          let t = this.rules.block.list.exec(e);
          if (t) {
            let n = t[1].trim(), r = n.length > 1, i = { type: "list", raw: "", ordered: r, start: r ? +n.slice(0, -1) : "", loose: false, items: [] };
            n = r ? `\\d{1,9}\\${n.slice(-1)}` : `\\${n}`, this.options.pedantic && (n = r ? n : "[*+-]");
            let s = this.rules.other.listItemRegex(n), a = false;
            for (; e; ) {
              let l = false, p = "", c = "";
              if (!(t = s.exec(e)) || this.rules.block.hr.test(e)) break;
              p = t[0], e = e.substring(p.length);
              let d = fe(t[2].split(`
`, 1)[0], t[1].length), h = e.split(`
`, 1)[0], R = !d.trim(), f = 0;
              if (this.options.pedantic ? (f = 2, c = d.trimStart()) : R ? f = t[1].length + 1 : (f = d.search(this.rules.other.nonSpaceChar), f = f > 4 ? 1 : f, c = d.slice(f), f += t[1].length), R && this.rules.other.blankLine.test(h) && (p += h + `
`, e = e.substring(h.length + 1), l = true), !l) {
                let S = this.rules.other.nextBulletRegex(f), V = this.rules.other.hrRegex(f), Y = this.rules.other.fencesBeginRegex(f), ee = this.rules.other.headingBeginRegex(f), xe = this.rules.other.htmlBeginRegex(f), be = this.rules.other.blockquoteBeginRegex(f);
                for (; e; ) {
                  let H = e.split(`
`, 1)[0], I;
                  if (h = H, this.options.pedantic ? (h = h.replace(this.rules.other.listReplaceNesting, "  "), I = h) : I = h.replace(this.rules.other.tabCharGlobal, "    "), Y.test(h) || ee.test(h) || xe.test(h) || be.test(h) || S.test(h) || V.test(h)) break;
                  if (I.search(this.rules.other.nonSpaceChar) >= f || !h.trim()) c += `
` + I.slice(f);
                  else {
                    if (R || d.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4 || Y.test(d) || ee.test(d) || V.test(d)) break;
                    c += `
` + h;
                  }
                  R = !h.trim(), p += H + `
`, e = e.substring(H.length + 1), d = I.slice(f);
                }
              }
              i.loose || (a ? i.loose = true : this.rules.other.doubleBlankLine.test(p) && (a = true)), i.items.push({ type: "list_item", raw: p, task: !!this.options.gfm && this.rules.other.listIsTask.test(c), loose: false, text: c, tokens: [] }), i.raw += p;
            }
            let o = i.items.at(-1);
            if (o) o.raw = o.raw.trimEnd(), o.text = o.text.trimEnd();
            else return;
            i.raw = i.raw.trimEnd();
            for (let l of i.items) {
              if (this.lexer.state.top = false, l.tokens = this.lexer.blockTokens(l.text, []), l.task) {
                if (l.text = l.text.replace(this.rules.other.listReplaceTask, ""), l.tokens[0]?.type === "text" || l.tokens[0]?.type === "paragraph") {
                  l.tokens[0].raw = l.tokens[0].raw.replace(this.rules.other.listReplaceTask, ""), l.tokens[0].text = l.tokens[0].text.replace(this.rules.other.listReplaceTask, "");
                  for (let c = this.lexer.inlineQueue.length - 1; c >= 0; c--) if (this.rules.other.listIsTask.test(this.lexer.inlineQueue[c].src)) {
                    this.lexer.inlineQueue[c].src = this.lexer.inlineQueue[c].src.replace(this.rules.other.listReplaceTask, "");
                    break;
                  }
                }
                let p = this.rules.other.listTaskCheckbox.exec(l.raw);
                if (p) {
                  let c = { type: "checkbox", raw: p[0] + " ", checked: p[0] !== "[ ]" };
                  l.checked = c.checked, i.loose ? l.tokens[0] && ["paragraph", "text"].includes(l.tokens[0].type) && "tokens" in l.tokens[0] && l.tokens[0].tokens ? (l.tokens[0].raw = c.raw + l.tokens[0].raw, l.tokens[0].text = c.raw + l.tokens[0].text, l.tokens[0].tokens.unshift(c)) : l.tokens.unshift({ type: "paragraph", raw: c.raw, text: c.raw, tokens: [c] }) : l.tokens.unshift(c);
                }
              }
              if (!i.loose) {
                let p = l.tokens.filter((d) => d.type === "space"), c = p.length > 0 && p.some((d) => this.rules.other.anyLine.test(d.raw));
                i.loose = c;
              }
            }
            if (i.loose) for (let l of i.items) {
              l.loose = true;
              for (let p of l.tokens) p.type === "text" && (p.type = "paragraph");
            }
            return i;
          }
        }
        html(e) {
          let t = this.rules.block.html.exec(e);
          if (t) return { type: "html", block: true, raw: t[0], pre: t[1] === "pre" || t[1] === "script" || t[1] === "style", text: t[0] };
        }
        def(e) {
          let t = this.rules.block.def.exec(e);
          if (t) {
            let n = t[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "), r = t[2] ? t[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "", i = t[3] ? t[3].substring(1, t[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : t[3];
            return { type: "def", tag: n, raw: t[0], href: r, title: i };
          }
        }
        table(e) {
          let t = this.rules.block.table.exec(e);
          if (!t || !this.rules.other.tableDelimiter.test(t[2])) return;
          let n = J(t[1]), r = t[2].replace(this.rules.other.tableAlignChars, "").split("|"), i = t[3]?.trim() ? t[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [], s = { type: "table", raw: t[0], header: [], align: [], rows: [] };
          if (n.length === r.length) {
            for (let a of r) this.rules.other.tableAlignRight.test(a) ? s.align.push("right") : this.rules.other.tableAlignCenter.test(a) ? s.align.push("center") : this.rules.other.tableAlignLeft.test(a) ? s.align.push("left") : s.align.push(null);
            for (let a = 0; a < n.length; a++) s.header.push({ text: n[a], tokens: this.lexer.inline(n[a]), header: true, align: s.align[a] });
            for (let a of i) s.rows.push(J(a, s.header.length).map((o, l) => ({ text: o, tokens: this.lexer.inline(o), header: false, align: s.align[l] })));
            return s;
          }
        }
        lheading(e) {
          let t = this.rules.block.lheading.exec(e);
          if (t) return { type: "heading", raw: t[0], depth: t[2].charAt(0) === "=" ? 1 : 2, text: t[1], tokens: this.lexer.inline(t[1]) };
        }
        paragraph(e) {
          let t = this.rules.block.paragraph.exec(e);
          if (t) {
            let n = t[1].charAt(t[1].length - 1) === `
` ? t[1].slice(0, -1) : t[1];
            return { type: "paragraph", raw: t[0], text: n, tokens: this.lexer.inline(n) };
          }
        }
        text(e) {
          let t = this.rules.block.text.exec(e);
          if (t) return { type: "text", raw: t[0], text: t[0], tokens: this.lexer.inline(t[0]) };
        }
        escape(e) {
          let t = this.rules.inline.escape.exec(e);
          if (t) return { type: "escape", raw: t[0], text: t[1] };
        }
        tag(e) {
          let t = this.rules.inline.tag.exec(e);
          if (t) return !this.lexer.state.inLink && this.rules.other.startATag.test(t[0]) ? this.lexer.state.inLink = true : this.lexer.state.inLink && this.rules.other.endATag.test(t[0]) && (this.lexer.state.inLink = false), !this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(t[0]) ? this.lexer.state.inRawBlock = true : this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(t[0]) && (this.lexer.state.inRawBlock = false), { type: "html", raw: t[0], inLink: this.lexer.state.inLink, inRawBlock: this.lexer.state.inRawBlock, block: false, text: t[0] };
        }
        link(e) {
          let t = this.rules.inline.link.exec(e);
          if (t) {
            let n = t[2].trim();
            if (!this.options.pedantic && this.rules.other.startAngleBracket.test(n)) {
              if (!this.rules.other.endAngleBracket.test(n)) return;
              let s = E(n.slice(0, -1), "\\");
              if ((n.length - s.length) % 2 === 0) return;
            } else {
              let s = ge(t[2], "()");
              if (s === -2) return;
              if (s > -1) {
                let o = (t[0].indexOf("!") === 0 ? 5 : 4) + t[1].length + s;
                t[2] = t[2].substring(0, s), t[0] = t[0].substring(0, o).trim(), t[3] = "";
              }
            }
            let r = t[2], i = "";
            if (this.options.pedantic) {
              let s = this.rules.other.pedanticHrefTitle.exec(r);
              s && (r = s[1], i = s[3]);
            } else i = t[3] ? t[3].slice(1, -1) : "";
            return r = r.trim(), this.rules.other.startAngleBracket.test(r) && (this.options.pedantic && !this.rules.other.endAngleBracket.test(n) ? r = r.slice(1) : r = r.slice(1, -1)), me(t, { href: r && r.replace(this.rules.inline.anyPunctuation, "$1"), title: i && i.replace(this.rules.inline.anyPunctuation, "$1") }, t[0], this.lexer, this.rules);
          }
        }
        reflink(e, t) {
          let n;
          if ((n = this.rules.inline.reflink.exec(e)) || (n = this.rules.inline.nolink.exec(e))) {
            let r = (n[2] || n[1]).replace(this.rules.other.multipleSpaceGlobal, " "), i = t[r.toLowerCase()];
            if (!i) {
              let s = n[0].charAt(0);
              return { type: "text", raw: s, text: s };
            }
            return me(n, i, n[0], this.lexer, this.rules);
          }
        }
        emStrong(e, t, n = "") {
          let r = this.rules.inline.emStrongLDelim.exec(e);
          if (!r || r[3] && n.match(this.rules.other.unicodeAlphaNumeric)) return;
          if (!(r[1] || r[2] || "") || !n || this.rules.inline.punctuation.exec(n)) {
            let s = [...r[0]].length - 1, a, o, l = s, p = 0, c = r[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
            for (c.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = c.exec(t)) != null; ) {
              if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a) continue;
              if (o = [...a].length, r[3] || r[4]) {
                l += o;
                continue;
              } else if ((r[5] || r[6]) && s % 3 && !((s + o) % 3)) {
                p += o;
                continue;
              }
              if (l -= o, l > 0) continue;
              o = Math.min(o, o + l + p);
              let d = [...r[0]][0].length, h = e.slice(0, s + r.index + d + o);
              if (Math.min(s, o) % 2) {
                let f = h.slice(1, -1);
                return { type: "em", raw: h, text: f, tokens: this.lexer.inlineTokens(f) };
              }
              let R = h.slice(2, -2);
              return { type: "strong", raw: h, text: R, tokens: this.lexer.inlineTokens(R) };
            }
          }
        }
        codespan(e) {
          let t = this.rules.inline.code.exec(e);
          if (t) {
            let n = t[2].replace(this.rules.other.newLineCharGlobal, " "), r = this.rules.other.nonSpaceChar.test(n), i = this.rules.other.startingSpaceChar.test(n) && this.rules.other.endingSpaceChar.test(n);
            return r && i && (n = n.substring(1, n.length - 1)), { type: "codespan", raw: t[0], text: n };
          }
        }
        br(e) {
          let t = this.rules.inline.br.exec(e);
          if (t) return { type: "br", raw: t[0] };
        }
        del(e, t, n = "") {
          let r = this.rules.inline.delLDelim.exec(e);
          if (!r) return;
          if (!(r[1] || "") || !n || this.rules.inline.punctuation.exec(n)) {
            let s = [...r[0]].length - 1, a, o, l = s, p = this.rules.inline.delRDelim;
            for (p.lastIndex = 0, t = t.slice(-1 * e.length + s); (r = p.exec(t)) != null; ) {
              if (a = r[1] || r[2] || r[3] || r[4] || r[5] || r[6], !a || (o = [...a].length, o !== s)) continue;
              if (r[3] || r[4]) {
                l += o;
                continue;
              }
              if (l -= o, l > 0) continue;
              o = Math.min(o, o + l);
              let c = [...r[0]][0].length, d = e.slice(0, s + r.index + c + o), h = d.slice(s, -s);
              return { type: "del", raw: d, text: h, tokens: this.lexer.inlineTokens(h) };
            }
          }
        }
        autolink(e) {
          let t = this.rules.inline.autolink.exec(e);
          if (t) {
            let n, r;
            return t[2] === "@" ? (n = t[1], r = "mailto:" + n) : (n = t[1], r = n), { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
          }
        }
        url(e) {
          let t;
          if (t = this.rules.inline.url.exec(e)) {
            let n, r;
            if (t[2] === "@") n = t[0], r = "mailto:" + n;
            else {
              let i;
              do
                i = t[0], t[0] = this.rules.inline._backpedal.exec(t[0])?.[0] ?? "";
              while (i !== t[0]);
              n = t[0], t[1] === "www." ? r = "http://" + t[0] : r = t[0];
            }
            return { type: "link", raw: t[0], text: n, href: r, tokens: [{ type: "text", raw: n, text: n }] };
          }
        }
        inlineText(e) {
          let t = this.rules.inline.text.exec(e);
          if (t) {
            let n = this.lexer.state.inRawBlock;
            return { type: "text", raw: t[0], text: t[0], escaped: n };
          }
        }
      };
      x = class u {
        tokens;
        options;
        state;
        inlineQueue;
        tokenizer;
        constructor(e) {
          this.tokens = [], this.tokens.links = /* @__PURE__ */ Object.create(null), this.options = e || T, this.options.tokenizer = this.options.tokenizer || new w(), this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = { inLink: false, inRawBlock: false, top: true };
          let t = { other: m, block: C.normal, inline: z.normal };
          this.options.pedantic ? (t.block = C.pedantic, t.inline = z.pedantic) : this.options.gfm && (t.block = C.gfm, this.options.breaks ? t.inline = z.breaks : t.inline = z.gfm), this.tokenizer.rules = t;
        }
        static get rules() {
          return { block: C, inline: z };
        }
        static lex(e, t) {
          return new u(t).lex(e);
        }
        static lexInline(e, t) {
          return new u(t).inlineTokens(e);
        }
        lex(e) {
          e = e.replace(m.carriageReturn, `
`), this.blockTokens(e, this.tokens);
          for (let t = 0; t < this.inlineQueue.length; t++) {
            let n = this.inlineQueue[t];
            this.inlineTokens(n.src, n.tokens);
          }
          return this.inlineQueue = [], this.tokens;
        }
        blockTokens(e, t = [], n = false) {
          for (this.options.pedantic && (e = e.replace(m.tabCharGlobal, "    ").replace(m.spaceLine, "")); e; ) {
            let r;
            if (this.options.extensions?.block?.some((s) => (r = s.call({ lexer: this }, e, t)) ? (e = e.substring(r.raw.length), t.push(r), true) : false)) continue;
            if (r = this.tokenizer.space(e)) {
              e = e.substring(r.raw.length);
              let s = t.at(-1);
              r.raw.length === 1 && s !== void 0 ? s.raw += `
` : t.push(r);
              continue;
            }
            if (r = this.tokenizer.code(e)) {
              e = e.substring(r.raw.length);
              let s = t.at(-1);
              s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.at(-1).src = s.text) : t.push(r);
              continue;
            }
            if (r = this.tokenizer.fences(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.heading(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.hr(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.blockquote(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.list(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.html(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.def(e)) {
              e = e.substring(r.raw.length);
              let s = t.at(-1);
              s?.type === "paragraph" || s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.raw, this.inlineQueue.at(-1).src = s.text) : this.tokens.links[r.tag] || (this.tokens.links[r.tag] = { href: r.href, title: r.title }, t.push(r));
              continue;
            }
            if (r = this.tokenizer.table(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            if (r = this.tokenizer.lheading(e)) {
              e = e.substring(r.raw.length), t.push(r);
              continue;
            }
            let i = e;
            if (this.options.extensions?.startBlock) {
              let s = 1 / 0, a = e.slice(1), o;
              this.options.extensions.startBlock.forEach((l) => {
                o = l.call({ lexer: this }, a), typeof o == "number" && o >= 0 && (s = Math.min(s, o));
              }), s < 1 / 0 && s >= 0 && (i = e.substring(0, s + 1));
            }
            if (this.state.top && (r = this.tokenizer.paragraph(i))) {
              let s = t.at(-1);
              n && s?.type === "paragraph" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r), n = i.length !== e.length, e = e.substring(r.raw.length);
              continue;
            }
            if (r = this.tokenizer.text(e)) {
              e = e.substring(r.raw.length);
              let s = t.at(-1);
              s?.type === "text" ? (s.raw += (s.raw.endsWith(`
`) ? "" : `
`) + r.raw, s.text += `
` + r.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = s.text) : t.push(r);
              continue;
            }
            if (e) {
              let s = "Infinite loop on byte: " + e.charCodeAt(0);
              if (this.options.silent) {
                console.error(s);
                break;
              } else throw new Error(s);
            }
          }
          return this.state.top = true, t;
        }
        inline(e, t = []) {
          return this.inlineQueue.push({ src: e, tokens: t }), t;
        }
        inlineTokens(e, t = []) {
          let n = e, r = null;
          if (this.tokens.links) {
            let o = Object.keys(this.tokens.links);
            if (o.length > 0) for (; (r = this.tokenizer.rules.inline.reflinkSearch.exec(n)) != null; ) o.includes(r[0].slice(r[0].lastIndexOf("[") + 1, -1)) && (n = n.slice(0, r.index) + "[" + "a".repeat(r[0].length - 2) + "]" + n.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex));
          }
          for (; (r = this.tokenizer.rules.inline.anyPunctuation.exec(n)) != null; ) n = n.slice(0, r.index) + "++" + n.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
          let i;
          for (; (r = this.tokenizer.rules.inline.blockSkip.exec(n)) != null; ) i = r[2] ? r[2].length : 0, n = n.slice(0, r.index + i) + "[" + "a".repeat(r[0].length - i - 2) + "]" + n.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
          n = this.options.hooks?.emStrongMask?.call({ lexer: this }, n) ?? n;
          let s = false, a = "";
          for (; e; ) {
            s || (a = ""), s = false;
            let o;
            if (this.options.extensions?.inline?.some((p) => (o = p.call({ lexer: this }, e, t)) ? (e = e.substring(o.raw.length), t.push(o), true) : false)) continue;
            if (o = this.tokenizer.escape(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.tag(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.link(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.reflink(e, this.tokens.links)) {
              e = e.substring(o.raw.length);
              let p = t.at(-1);
              o.type === "text" && p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
              continue;
            }
            if (o = this.tokenizer.emStrong(e, n, a)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.codespan(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.br(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.del(e, n, a)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (o = this.tokenizer.autolink(e)) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            if (!this.state.inLink && (o = this.tokenizer.url(e))) {
              e = e.substring(o.raw.length), t.push(o);
              continue;
            }
            let l = e;
            if (this.options.extensions?.startInline) {
              let p = 1 / 0, c = e.slice(1), d;
              this.options.extensions.startInline.forEach((h) => {
                d = h.call({ lexer: this }, c), typeof d == "number" && d >= 0 && (p = Math.min(p, d));
              }), p < 1 / 0 && p >= 0 && (l = e.substring(0, p + 1));
            }
            if (o = this.tokenizer.inlineText(l)) {
              e = e.substring(o.raw.length), o.raw.slice(-1) !== "_" && (a = o.raw.slice(-1)), s = true;
              let p = t.at(-1);
              p?.type === "text" ? (p.raw += o.raw, p.text += o.text) : t.push(o);
              continue;
            }
            if (e) {
              let p = "Infinite loop on byte: " + e.charCodeAt(0);
              if (this.options.silent) {
                console.error(p);
                break;
              } else throw new Error(p);
            }
          }
          return t;
        }
      };
      y = class {
        options;
        parser;
        constructor(e) {
          this.options = e || T;
        }
        space(e) {
          return "";
        }
        code({ text: e, lang: t, escaped: n }) {
          let r = (t || "").match(m.notSpaceStart)?.[0], i = e.replace(m.endingNewline, "") + `
`;
          return r ? '<pre><code class="language-' + O(r) + '">' + (n ? i : O(i, true)) + `</code></pre>
` : "<pre><code>" + (n ? i : O(i, true)) + `</code></pre>
`;
        }
        blockquote({ tokens: e }) {
          return `<blockquote>
${this.parser.parse(e)}</blockquote>
`;
        }
        html({ text: e }) {
          return e;
        }
        def(e) {
          return "";
        }
        heading({ tokens: e, depth: t }) {
          return `<h${t}>${this.parser.parseInline(e)}</h${t}>
`;
        }
        hr(e) {
          return `<hr>
`;
        }
        list(e) {
          let t = e.ordered, n = e.start, r = "";
          for (let a = 0; a < e.items.length; a++) {
            let o = e.items[a];
            r += this.listitem(o);
          }
          let i = t ? "ol" : "ul", s = t && n !== 1 ? ' start="' + n + '"' : "";
          return "<" + i + s + `>
` + r + "</" + i + `>
`;
        }
        listitem(e) {
          return `<li>${this.parser.parse(e.tokens)}</li>
`;
        }
        checkbox({ checked: e }) {
          return "<input " + (e ? 'checked="" ' : "") + 'disabled="" type="checkbox"> ';
        }
        paragraph({ tokens: e }) {
          return `<p>${this.parser.parseInline(e)}</p>
`;
        }
        table(e) {
          let t = "", n = "";
          for (let i = 0; i < e.header.length; i++) n += this.tablecell(e.header[i]);
          t += this.tablerow({ text: n });
          let r = "";
          for (let i = 0; i < e.rows.length; i++) {
            let s = e.rows[i];
            n = "";
            for (let a = 0; a < s.length; a++) n += this.tablecell(s[a]);
            r += this.tablerow({ text: n });
          }
          return r && (r = `<tbody>${r}</tbody>`), `<table>
<thead>
` + t + `</thead>
` + r + `</table>
`;
        }
        tablerow({ text: e }) {
          return `<tr>
${e}</tr>
`;
        }
        tablecell(e) {
          let t = this.parser.parseInline(e.tokens), n = e.header ? "th" : "td";
          return (e.align ? `<${n} align="${e.align}">` : `<${n}>`) + t + `</${n}>
`;
        }
        strong({ tokens: e }) {
          return `<strong>${this.parser.parseInline(e)}</strong>`;
        }
        em({ tokens: e }) {
          return `<em>${this.parser.parseInline(e)}</em>`;
        }
        codespan({ text: e }) {
          return `<code>${O(e, true)}</code>`;
        }
        br(e) {
          return "<br>";
        }
        del({ tokens: e }) {
          return `<del>${this.parser.parseInline(e)}</del>`;
        }
        link({ href: e, title: t, tokens: n }) {
          let r = this.parser.parseInline(n), i = X(e);
          if (i === null) return r;
          e = i;
          let s = '<a href="' + e + '"';
          return t && (s += ' title="' + O(t) + '"'), s += ">" + r + "</a>", s;
        }
        image({ href: e, title: t, text: n, tokens: r }) {
          r && (n = this.parser.parseInline(r, this.parser.textRenderer));
          let i = X(e);
          if (i === null) return O(n);
          e = i;
          let s = `<img src="${e}" alt="${O(n)}"`;
          return t && (s += ` title="${O(t)}"`), s += ">", s;
        }
        text(e) {
          return "tokens" in e && e.tokens ? this.parser.parseInline(e.tokens) : "escaped" in e && e.escaped ? e.text : O(e.text);
        }
      };
      $ = class {
        strong({ text: e }) {
          return e;
        }
        em({ text: e }) {
          return e;
        }
        codespan({ text: e }) {
          return e;
        }
        del({ text: e }) {
          return e;
        }
        html({ text: e }) {
          return e;
        }
        text({ text: e }) {
          return e;
        }
        link({ text: e }) {
          return "" + e;
        }
        image({ text: e }) {
          return "" + e;
        }
        br() {
          return "";
        }
        checkbox({ raw: e }) {
          return e;
        }
      };
      b = class u2 {
        options;
        renderer;
        textRenderer;
        constructor(e) {
          this.options = e || T, this.options.renderer = this.options.renderer || new y(), this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new $();
        }
        static parse(e, t) {
          return new u2(t).parse(e);
        }
        static parseInline(e, t) {
          return new u2(t).parseInline(e);
        }
        parse(e) {
          let t = "";
          for (let n = 0; n < e.length; n++) {
            let r = e[n];
            if (this.options.extensions?.renderers?.[r.type]) {
              let s = r, a = this.options.extensions.renderers[s.type].call({ parser: this }, s);
              if (a !== false || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "def", "paragraph", "text"].includes(s.type)) {
                t += a || "";
                continue;
              }
            }
            let i = r;
            switch (i.type) {
              case "space": {
                t += this.renderer.space(i);
                break;
              }
              case "hr": {
                t += this.renderer.hr(i);
                break;
              }
              case "heading": {
                t += this.renderer.heading(i);
                break;
              }
              case "code": {
                t += this.renderer.code(i);
                break;
              }
              case "table": {
                t += this.renderer.table(i);
                break;
              }
              case "blockquote": {
                t += this.renderer.blockquote(i);
                break;
              }
              case "list": {
                t += this.renderer.list(i);
                break;
              }
              case "checkbox": {
                t += this.renderer.checkbox(i);
                break;
              }
              case "html": {
                t += this.renderer.html(i);
                break;
              }
              case "def": {
                t += this.renderer.def(i);
                break;
              }
              case "paragraph": {
                t += this.renderer.paragraph(i);
                break;
              }
              case "text": {
                t += this.renderer.text(i);
                break;
              }
              default: {
                let s = 'Token with "' + i.type + '" type was not found.';
                if (this.options.silent) return console.error(s), "";
                throw new Error(s);
              }
            }
          }
          return t;
        }
        parseInline(e, t = this.renderer) {
          let n = "";
          for (let r = 0; r < e.length; r++) {
            let i = e[r];
            if (this.options.extensions?.renderers?.[i.type]) {
              let a = this.options.extensions.renderers[i.type].call({ parser: this }, i);
              if (a !== false || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(i.type)) {
                n += a || "";
                continue;
              }
            }
            let s = i;
            switch (s.type) {
              case "escape": {
                n += t.text(s);
                break;
              }
              case "html": {
                n += t.html(s);
                break;
              }
              case "link": {
                n += t.link(s);
                break;
              }
              case "image": {
                n += t.image(s);
                break;
              }
              case "checkbox": {
                n += t.checkbox(s);
                break;
              }
              case "strong": {
                n += t.strong(s);
                break;
              }
              case "em": {
                n += t.em(s);
                break;
              }
              case "codespan": {
                n += t.codespan(s);
                break;
              }
              case "br": {
                n += t.br(s);
                break;
              }
              case "del": {
                n += t.del(s);
                break;
              }
              case "text": {
                n += t.text(s);
                break;
              }
              default: {
                let a = 'Token with "' + s.type + '" type was not found.';
                if (this.options.silent) return console.error(a), "";
                throw new Error(a);
              }
            }
          }
          return n;
        }
      };
      P = class {
        options;
        block;
        constructor(e) {
          this.options = e || T;
        }
        static passThroughHooks = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens", "emStrongMask"]);
        static passThroughHooksRespectAsync = /* @__PURE__ */ new Set(["preprocess", "postprocess", "processAllTokens"]);
        preprocess(e) {
          return e;
        }
        postprocess(e) {
          return e;
        }
        processAllTokens(e) {
          return e;
        }
        emStrongMask(e) {
          return e;
        }
        provideLexer() {
          return this.block ? x.lex : x.lexInline;
        }
        provideParser() {
          return this.block ? b.parse : b.parseInline;
        }
      };
      B = class {
        defaults = M();
        options = this.setOptions;
        parse = this.parseMarkdown(true);
        parseInline = this.parseMarkdown(false);
        Parser = b;
        Renderer = y;
        TextRenderer = $;
        Lexer = x;
        Tokenizer = w;
        Hooks = P;
        constructor(...e) {
          this.use(...e);
        }
        walkTokens(e, t) {
          let n = [];
          for (let r of e) switch (n = n.concat(t.call(this, r)), r.type) {
            case "table": {
              let i = r;
              for (let s of i.header) n = n.concat(this.walkTokens(s.tokens, t));
              for (let s of i.rows) for (let a of s) n = n.concat(this.walkTokens(a.tokens, t));
              break;
            }
            case "list": {
              let i = r;
              n = n.concat(this.walkTokens(i.items, t));
              break;
            }
            default: {
              let i = r;
              this.defaults.extensions?.childTokens?.[i.type] ? this.defaults.extensions.childTokens[i.type].forEach((s) => {
                let a = i[s].flat(1 / 0);
                n = n.concat(this.walkTokens(a, t));
              }) : i.tokens && (n = n.concat(this.walkTokens(i.tokens, t)));
            }
          }
          return n;
        }
        use(...e) {
          let t = this.defaults.extensions || { renderers: {}, childTokens: {} };
          return e.forEach((n) => {
            let r = { ...n };
            if (r.async = this.defaults.async || r.async || false, n.extensions && (n.extensions.forEach((i) => {
              if (!i.name) throw new Error("extension name required");
              if ("renderer" in i) {
                let s = t.renderers[i.name];
                s ? t.renderers[i.name] = function(...a) {
                  let o = i.renderer.apply(this, a);
                  return o === false && (o = s.apply(this, a)), o;
                } : t.renderers[i.name] = i.renderer;
              }
              if ("tokenizer" in i) {
                if (!i.level || i.level !== "block" && i.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
                let s = t[i.level];
                s ? s.unshift(i.tokenizer) : t[i.level] = [i.tokenizer], i.start && (i.level === "block" ? t.startBlock ? t.startBlock.push(i.start) : t.startBlock = [i.start] : i.level === "inline" && (t.startInline ? t.startInline.push(i.start) : t.startInline = [i.start]));
              }
              "childTokens" in i && i.childTokens && (t.childTokens[i.name] = i.childTokens);
            }), r.extensions = t), n.renderer) {
              let i = this.defaults.renderer || new y(this.defaults);
              for (let s in n.renderer) {
                if (!(s in i)) throw new Error(`renderer '${s}' does not exist`);
                if (["options", "parser"].includes(s)) continue;
                let a = s, o = n.renderer[a], l = i[a];
                i[a] = (...p) => {
                  let c = o.apply(i, p);
                  return c === false && (c = l.apply(i, p)), c || "";
                };
              }
              r.renderer = i;
            }
            if (n.tokenizer) {
              let i = this.defaults.tokenizer || new w(this.defaults);
              for (let s in n.tokenizer) {
                if (!(s in i)) throw new Error(`tokenizer '${s}' does not exist`);
                if (["options", "rules", "lexer"].includes(s)) continue;
                let a = s, o = n.tokenizer[a], l = i[a];
                i[a] = (...p) => {
                  let c = o.apply(i, p);
                  return c === false && (c = l.apply(i, p)), c;
                };
              }
              r.tokenizer = i;
            }
            if (n.hooks) {
              let i = this.defaults.hooks || new P();
              for (let s in n.hooks) {
                if (!(s in i)) throw new Error(`hook '${s}' does not exist`);
                if (["options", "block"].includes(s)) continue;
                let a = s, o = n.hooks[a], l = i[a];
                P.passThroughHooks.has(s) ? i[a] = (p) => {
                  if (this.defaults.async && P.passThroughHooksRespectAsync.has(s)) return (async () => {
                    let d = await o.call(i, p);
                    return l.call(i, d);
                  })();
                  let c = o.call(i, p);
                  return l.call(i, c);
                } : i[a] = (...p) => {
                  if (this.defaults.async) return (async () => {
                    let d = await o.apply(i, p);
                    return d === false && (d = await l.apply(i, p)), d;
                  })();
                  let c = o.apply(i, p);
                  return c === false && (c = l.apply(i, p)), c;
                };
              }
              r.hooks = i;
            }
            if (n.walkTokens) {
              let i = this.defaults.walkTokens, s = n.walkTokens;
              r.walkTokens = function(a) {
                let o = [];
                return o.push(s.call(this, a)), i && (o = o.concat(i.call(this, a))), o;
              };
            }
            this.defaults = { ...this.defaults, ...r };
          }), this;
        }
        setOptions(e) {
          return this.defaults = { ...this.defaults, ...e }, this;
        }
        lexer(e, t) {
          return x.lex(e, t ?? this.defaults);
        }
        parser(e, t) {
          return b.parse(e, t ?? this.defaults);
        }
        parseMarkdown(e) {
          return (n, r) => {
            let i = { ...r }, s = { ...this.defaults, ...i }, a = this.onError(!!s.silent, !!s.async);
            if (this.defaults.async === true && i.async === false) return a(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
            if (typeof n > "u" || n === null) return a(new Error("marked(): input parameter is undefined or null"));
            if (typeof n != "string") return a(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(n) + ", string expected"));
            if (s.hooks && (s.hooks.options = s, s.hooks.block = e), s.async) return (async () => {
              let o = s.hooks ? await s.hooks.preprocess(n) : n, p = await (s.hooks ? await s.hooks.provideLexer() : e ? x.lex : x.lexInline)(o, s), c = s.hooks ? await s.hooks.processAllTokens(p) : p;
              s.walkTokens && await Promise.all(this.walkTokens(c, s.walkTokens));
              let h = await (s.hooks ? await s.hooks.provideParser() : e ? b.parse : b.parseInline)(c, s);
              return s.hooks ? await s.hooks.postprocess(h) : h;
            })().catch(a);
            try {
              s.hooks && (n = s.hooks.preprocess(n));
              let l = (s.hooks ? s.hooks.provideLexer() : e ? x.lex : x.lexInline)(n, s);
              s.hooks && (l = s.hooks.processAllTokens(l)), s.walkTokens && this.walkTokens(l, s.walkTokens);
              let c = (s.hooks ? s.hooks.provideParser() : e ? b.parse : b.parseInline)(l, s);
              return s.hooks && (c = s.hooks.postprocess(c)), c;
            } catch (o) {
              return a(o);
            }
          };
        }
        onError(e, t) {
          return (n) => {
            if (n.message += `
Please report this to https://github.com/markedjs/marked.`, e) {
              let r = "<p>An error occurred:</p><pre>" + O(n.message + "", true) + "</pre>";
              return t ? Promise.resolve(r) : r;
            }
            if (t) return Promise.reject(n);
            throw n;
          };
        }
      };
      L = new B();
      g.options = g.setOptions = function(u3) {
        return L.setOptions(u3), g.defaults = L.defaults, G(g.defaults), g;
      };
      g.getDefaults = M;
      g.defaults = T;
      g.use = function(...u3) {
        return L.use(...u3), g.defaults = L.defaults, G(g.defaults), g;
      };
      g.walkTokens = function(u3, e) {
        return L.walkTokens(u3, e);
      };
      g.parseInline = L.parseInline;
      g.Parser = b;
      g.parser = b.parse;
      g.Renderer = y;
      g.TextRenderer = $;
      g.Lexer = x;
      g.lexer = x.lex;
      g.Tokenizer = w;
      g.Hooks = P;
      g.parse = g;
      Ut = g.options;
      Kt = g.setOptions;
      Wt = g.use;
      Xt = g.walkTokens;
      Jt = g.parseInline;
      Vt = g;
      Yt = b.parse;
      en = x.lex;
    }
  });

  // parse.js
  var require_parse = __commonJS({
    "parse.js"(exports, module) {
      var SPEC_VERSION = "0.4.0";
      var yaml = require_js_yaml();
      var { marked } = (init_marked_esm(), __toCommonJS(marked_esm_exports));
      function parse(source) {
        const EMPTY_FM_RE = /^---\r?\n---\r?\n?([\s\S]*)$/;
        const emptyMatch = source.match(EMPTY_FM_RE);
        if (emptyMatch) return { data: {}, body: emptyMatch[1] };
        const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
        const match = source.match(FM_RE);
        if (!match) {
          return { data: {}, body: source };
        }
        const data = yaml.load(match[1]) ?? {};
        const body = match[2];
        return { data, body };
      }
      function resolvePath(obj, path) {
        const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
        let cur = obj;
        for (const part of parts) {
          if (cur == null) return void 0;
          cur = cur[part];
        }
        return cur;
      }
      function isTruthy(val) {
        if (val == null) return false;
        if (typeof val === "boolean") return val;
        if (typeof val === "number") return val !== 0;
        if (typeof val === "string") return val !== "";
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === "object") return Object.keys(val).length > 0;
        return true;
      }
      function formatValue(val) {
        if (val == null) return "";
        if (Array.isArray(val)) return val.join(", ");
        if (typeof val === "object") return JSON.stringify(val);
        return String(val);
      }
      function isStandalone(str, tagStart, tagEnd) {
        let lineStart = tagStart;
        while (lineStart > 0 && str[lineStart - 1] !== "\n") lineStart--;
        for (let i = lineStart; i < tagStart; i++) {
          if (str[i] !== " " && str[i] !== "	") return null;
        }
        let pos = tagEnd;
        while (pos < str.length && str[pos] !== "\n" && str[pos] !== "\r") {
          if (str[pos] !== " " && str[pos] !== "	") return null;
          pos++;
        }
        if (pos < str.length && str[pos] === "\r") pos++;
        if (pos < str.length && str[pos] === "\n") pos++;
        return { lineStart, lineEnd: pos };
      }
      function findClose(str, nestedOpenRe, closeTag, from) {
        let depth = 1;
        let pos = from;
        while (depth > 0) {
          const closeIdx = str.indexOf(closeTag, pos);
          if (closeIdx === -1) return -1;
          nestedOpenRe.lastIndex = pos;
          let nm;
          while ((nm = nestedOpenRe.exec(str)) !== null && nm.index < closeIdx) {
            depth++;
          }
          if (--depth === 0) return closeIdx;
          pos = closeIdx + closeTag.length;
        }
        return -1;
      }
      function findTopLevelElse(content) {
        const re2 = /\{\{#if [\w.[\]]+\}\}|\{\{\/if\}\}|\{\{else\}\}/g;
        let depth = 0, m2;
        while ((m2 = re2.exec(content)) !== null) {
          if (m2[0].startsWith("{{#if ")) depth++;
          else if (m2[0] === "{{/if}}") depth--;
          else if (m2[0] === "{{else}}" && depth === 0) return m2.index;
        }
        return -1;
      }
      function processBlocks(str, openRe, nestedOpenRe, closeTag, fn) {
        let result = "";
        let lastEnd = 0;
        let m2;
        while ((m2 = openRe.exec(str)) !== null) {
          const openStart = m2.index;
          const openEnd = m2.index + m2[0].length;
          const closeIdx = findClose(str, nestedOpenRe, closeTag, openEnd);
          if (closeIdx === -1) continue;
          const closeEnd = closeIdx + closeTag.length;
          let consumeFrom = openStart;
          let consumeTo = closeEnd;
          let innerStart = openEnd;
          let innerEnd = closeIdx;
          const openSA = isStandalone(str, openStart, openEnd);
          if (openSA) {
            consumeFrom = openSA.lineStart;
            innerStart = openSA.lineEnd;
          }
          const closeSA = isStandalone(str, closeIdx, closeEnd);
          if (closeSA) {
            consumeTo = closeSA.lineEnd;
          }
          const inner = str.slice(innerStart, innerEnd);
          result += str.slice(lastEnd, consumeFrom);
          result += fn(m2[1], inner);
          lastEnd = consumeTo;
          openRe.lastIndex = lastEnd;
        }
        return result + str.slice(lastEnd);
      }
      function render(source, { embed = false } = {}) {
        const { data, body } = parse(source);
        let out = renderTemplate(body, data);
        if (embed) {
          out = out.trimEnd() + "\n\n<!-- frontmatter\n" + JSON.stringify(data, null, 2) + "\n-->\n";
        }
        return out;
      }
      function renderHtmlFrag(source) {
        const md = render(source);
        return marked.parse(md, { gfm: true });
      }
      function renderHtml(source, { embed = false } = {}) {
        const { data, body } = parse(source);
        const rendered = renderTemplate(body, data);
        const htmlBody = marked.parse(rendered, { gfm: true });
        const title = data.title || "";
        let dataBlock = "";
        if (embed) {
          dataBlock = '\n<script type="application/json" id="frontmatter">\n' + JSON.stringify(data, null, 2) + "\n<\/script>";
        }
        return HTML_TEMPLATE.replace("%TITLE%", title).replace("%DATA_BLOCK%", dataBlock).replace("%BODY%", htmlBody);
      }
      var HTML_TEMPLATE = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>%TITLE%</title>%DATA_BLOCK%
<style>
  body { max-width: 720px; margin: 0 auto; padding: 3rem 1.5rem; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 1.0625rem; line-height: 1.65; color: #1f2937; }
  h1, h2, h3 { color: #111827; letter-spacing: -.02em; }
  h1 { font-size: 2rem; margin-bottom: .5rem; }
  h2 { font-size: 1.4rem; margin-top: 2.5rem; }
  h3 { font-size: 1.1rem; margin-top: 2rem; }
  code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: .875em; background: #f3f4f6; padding: .1em .35em; border-radius: 3px; }
  pre { background: #f3f4f6; border-radius: 6px; padding: 1.25rem; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: .5rem .75rem; border-bottom: 1px solid #e5e7eb; }
  th { font-size: .8125rem; text-transform: uppercase; letter-spacing: .05em; color: #6b7280; }
  a { color: #2563eb; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 2.5rem 0; }
</style>
</head>
<body>
%BODY%
</body>
</html>`;
      var _registry;
      var _seq;
      function renderTemplate(template, ctx, _isRoot) {
        const isRoot = _isRoot !== false;
        if (isRoot) {
          _registry = /* @__PURE__ */ new Map();
          _seq = 0;
        }
        function protect(str) {
          const tok = `${_seq++}`;
          _registry.set(tok, str);
          return tok;
        }
        function restore(str) {
          let out2 = str;
          for (const [tok, val] of [..._registry.entries()].reverse()) {
            out2 = out2.split(tok).join(val);
          }
          return out2;
        }
        let out = template;
        out = out.replace(/\\\{\{/g, () => protect("{{"));
        out = processBlocks(
          out,
          /\{\{#each ([\w.[\]]+)\}\}/g,
          /\{\{#each [\w.[\]]+\}\}/g,
          "{{/each}}",
          (key, inner) => {
            const arr = resolvePath(ctx, key);
            if (!Array.isArray(arr)) return protect("");
            return protect(arr.map((item, i) => {
              const itemCtx = { ...ctx, this: item, "@index": i, "@first": i === 0, "@last": i === arr.length - 1 };
              if (item && typeof item === "object" && !Array.isArray(item)) Object.assign(itemCtx, item);
              return renderTemplate(inner, itemCtx, false);
            }).join(""));
          }
        );
        out = processBlocks(
          out,
          /\{\{#if ([\w.[\]]+)\}\}/g,
          /\{\{#if [\w.[\]]+\}\}/g,
          "{{/if}}",
          (key, inner) => {
            const val = resolvePath(ctx, key);
            const elseIdx = findTopLevelElse(inner);
            let truthy, falsy;
            if (elseIdx === -1) {
              truthy = inner;
              falsy = "";
            } else {
              const elseEnd = elseIdx + "{{else}}".length;
              const elseSA = isStandalone(inner, elseIdx, elseEnd);
              if (elseSA) {
                truthy = inner.slice(0, elseSA.lineStart);
                falsy = inner.slice(elseSA.lineEnd);
              } else {
                truthy = inner.slice(0, elseIdx);
                falsy = inner.slice(elseEnd);
              }
            }
            return protect(renderTemplate(isTruthy(val) ? truthy : falsy, ctx, false));
          }
        );
        out = out.replace(/\{\{> ?([\w.[\]]+)\}\}/g, (_2, path) => {
          const val = resolvePath(ctx, path);
          return val != null ? protect(String(val)) : "";
        });
        out = out.replace(/\{\{([\w.[\]@]+)\}\}/g, (_2, path) => {
          const val = resolvePath(ctx, path);
          if (val == null) return "";
          return protect(formatValue(val));
        });
        return isRoot ? restore(out) : out;
      }
      module.exports = { SPEC_VERSION, parse, render, renderHtmlFrag, renderHtml, renderTemplate, resolvePath, yaml, marked };
    }
  });
  return require_parse();
})();
