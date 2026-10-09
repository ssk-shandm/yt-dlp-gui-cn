'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var defineProperty = require('../_chunks/dep-10fbe5a9.js');
var Vue = require('vue');
var utils_renderFn = require('../utils/render-fn.js');
var utils_useSizeProps = require('../utils/use-size-props.js');
require('../utils/use-common-classname.js');
require('../utils/config-context.js');

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () {
            return e[k];
          }
        });
      }
    });
  }
  n['default'] = e;
  return Object.freeze(n);
}

var Vue__namespace = /*#__PURE__*/_interopNamespace(Vue);

function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { defineProperty._defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
var element = {
  "tag": "svg",
  "attrs": {
    "fill": "none",
    "viewBox": "0 0 24 24",
    "width": "1em",
    "height": "1em"
  },
  "children": [{
    "tag": "defs",
    "attrs": {},
    "children": [{
      "tag": "mask",
      "attrs": {
        "id": "props.overlapMaskId_fill1",
        "maskUnits": "userSpaceOnUse",
        "maskContentUnits": "userSpaceOnUse",
        "mask-type": "luminance",
        "x": "0",
        "y": "0",
        "width": "24",
        "height": "24"
      },
      "children": [{
        "tag": "rect",
        "attrs": {
          "x": "0",
          "y": "0",
          "width": "24",
          "height": "24",
          "fill": "#fff"
        }
      }, {
        "tag": "path",
        "attrs": {
          "stroke": "#000",
          "d": "M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z",
          "strokeLinecap": "square",
          "strokeWidth": "props.strokeWidth",
          "fill": "none"
        }
      }, {
        "tag": "path",
        "attrs": {
          "stroke": "#000",
          "d": "M15.1816 15.1827C13.4243 16.9401 10.575 16.9401 8.81768 15.1827C7.06032 13.4254 7.06032 10.5761 8.81768 8.81875C10.575 7.06139 13.4243 7.06139 15.1816 8.81875",
          "strokeLinecap": "square",
          "strokeWidth": "props.strokeWidth",
          "fill": "none"
        }
      }]
    }]
  }, {
    "tag": "g",
    "attrs": {
      "id": "copyright"
    },
    "children": [{
      "tag": "path",
      "attrs": {
        "id": "fill1",
        "fill": "props.fillColor1",
        "d": "M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z",
        "mask": "props.overlapMaskUrl_fill1"
      }
    }, {
      "tag": "path",
      "attrs": {
        "id": "stroke1",
        "stroke": "props.strokeColor1",
        "d": "M2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z",
        "strokeLinecap": "square",
        "strokeWidth": "props.strokeWidth"
      }
    }, {
      "tag": "path",
      "attrs": {
        "id": "stroke2",
        "stroke": "props.strokeColor2",
        "d": "M15.1816 15.1827C13.4243 16.9401 10.575 16.9401 8.81768 15.1827C7.06032 13.4254 7.06032 10.5761 8.81768 8.81875C10.575 7.06139 13.4243 7.06139 15.1816 8.81875",
        "strokeLinecap": "square",
        "strokeWidth": "props.strokeWidth"
      }
    }]
  }]
};
var copyright = Vue.defineComponent({
  name: "CopyrightIcon",
  props: {
    size: {
      type: String
    },
    onClick: {
      type: Function
    },
    fillColor: {
      type: [Array, String]
    },
    strokeColor: {
      type: [Array, String]
    },
    strokeWidth: {
      type: Number
    }
  },
  setup(props, _ref) {
    var _getCurrentInstance$u, _getCurrentInstance;
    var {
      attrs
    } = _ref;
    var useId = Vue__namespace.useId;
    var rawInstanceId = useId ? useId() : "".concat((_getCurrentInstance$u = (_getCurrentInstance = Vue.getCurrentInstance()) === null || _getCurrentInstance === void 0 ? void 0 : _getCurrentInstance.uid) !== null && _getCurrentInstance$u !== void 0 ? _getCurrentInstance$u : "unknown");
    var overlapMaskInstanceId = rawInstanceId.replace(/[^a-zA-Z0-9_]/g, "");
    var propsSize = Vue.computed(() => props.size);
    var strokeColor1 = Vue.computed(() => {
      if (!props.strokeColor) return "currentColor";
      return Array.isArray(props.strokeColor) ? props.strokeColor[0] : props.strokeColor;
    });
    var strokeColor2 = Vue.computed(() => {
      var _props$strokeColor$;
      if (!props.strokeColor) return "currentColor";
      return Array.isArray(props.strokeColor) ? (_props$strokeColor$ = props.strokeColor[1]) !== null && _props$strokeColor$ !== void 0 ? _props$strokeColor$ : props.strokeColor[0] : props.strokeColor;
    });
    var fillColor1 = Vue.computed(() => {
      if (!props.fillColor) return "transparent";
      return Array.isArray(props.fillColor) ? props.fillColor[0] : props.fillColor;
    });
    var fillColor2 = Vue.computed(() => {
      var _props$fillColor$;
      if (!props.fillColor) return "transparent";
      return Array.isArray(props.fillColor) ? (_props$fillColor$ = props.fillColor[1]) !== null && _props$fillColor$ !== void 0 ? _props$fillColor$ : props.fillColor[0] : props.fillColor;
    });
    var filledColor = Vue.computed(() => {
      if (!props.fillColor) return "currentColor";
      return Array.isArray(props.fillColor) ? props.fillColor[0] : props.fillColor;
    });
    var {
      className,
      style
    } = utils_useSizeProps['default'](propsSize);
    var finalCls = Vue.computed(() => ["t-icon", "t-icon-copyright", className.value]);
    var finalStyle = Vue.computed(() => _objectSpread(_objectSpread({
      fill: "none"
    }, style.value), attrs.style));
    var finalProps = Vue.computed(() => ({
      class: finalCls.value,
      style: finalStyle.value,
      onClick: e => {
        var _props$onClick;
        return (_props$onClick = props.onClick) === null || _props$onClick === void 0 ? void 0 : _props$onClick.call(props, {
          e
        });
      },
      strokeColor1: strokeColor1.value,
      strokeColor2: strokeColor2.value,
      fillColor1: fillColor1.value,
      fillColor2: fillColor2.value,
      strokeWidth: props.strokeWidth || 2,
      filledColor: filledColor.value,
      iconId: "copyright",
      overlapMaskInstanceId
    }));
    return () => utils_renderFn['default'](element, finalProps.value);
  }
});

exports.default = copyright;
//# sourceMappingURL=copyright.js.map
