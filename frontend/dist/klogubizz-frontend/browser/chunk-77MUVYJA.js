import {
  input,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵstyleProp,
  ɵɵtext
} from "./chunk-6VNHH65J.js";

// src/app/shared/auth-preview-card.component.ts
var AuthPreviewCardComponent = class _AuthPreviewCardComponent {
  accentColor = input("#4f46e5");
  static \u0275fac = function AuthPreviewCardComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AuthPreviewCardComponent)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AuthPreviewCardComponent, selectors: [["app-auth-preview-card"]], inputs: { accentColor: [1, "accentColor"] }, standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 38, vars: 6, consts: [[1, "auth-mockup"], [1, "auth-mockup-head"], [1, "am-dot", "red"], [1, "am-dot", "amber"], [1, "am-dot", "green"], [1, "am-head-label"], [1, "auth-mockup-body"], [1, "auth-mockup-row"], [1, "am-label"], [1, "am-value"], [1, "am-pill"], [1, "am-divider"], [1, "am-line"], [1, "am-line", "muted"], [1, "am-line", "total"]], template: function AuthPreviewCardComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
      \u0275\u0275element(2, "span", 2)(3, "span", 3)(4, "span", 4);
      \u0275\u0275elementStart(5, "span", 5);
      \u0275\u0275text(6, "invoice.klogubizz.app");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(7, "div", 6)(8, "div", 7)(9, "div")(10, "div", 8);
      \u0275\u0275text(11, "Tax Invoice");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "div", 9);
      \u0275\u0275text(13, "INV-2026-0842");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(14, "span", 10);
      \u0275\u0275text(15, "Paid");
      \u0275\u0275elementEnd()();
      \u0275\u0275element(16, "div", 11);
      \u0275\u0275elementStart(17, "div", 12)(18, "span");
      \u0275\u0275text(19, "Consulting Services");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "span");
      \u0275\u0275text(21, "\u20B945,000.00");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(22, "div", 13)(23, "span");
      \u0275\u0275text(24, "CGST (9%)");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(25, "span");
      \u0275\u0275text(26, "\u20B94,050.00");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(27, "div", 13)(28, "span");
      \u0275\u0275text(29, "SGST (9%)");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(30, "span");
      \u0275\u0275text(31, "\u20B94,050.00");
      \u0275\u0275elementEnd()();
      \u0275\u0275element(32, "div", 11);
      \u0275\u0275elementStart(33, "div", 14)(34, "span");
      \u0275\u0275text(35, "Total Due");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(36, "span");
      \u0275\u0275text(37, "\u20B953,100.00");
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      \u0275\u0275advance(14);
      \u0275\u0275styleProp("background", ctx.accentColor())("color", "#fff");
      \u0275\u0275advance(22);
      \u0275\u0275styleProp("color", ctx.accentColor());
    }
  }, encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AuthPreviewCardComponent, { className: "AuthPreviewCardComponent", filePath: "src\\app\\shared\\auth-preview-card.component.ts", lineNumber: 37 });
})();

export {
  AuthPreviewCardComponent
};
//# sourceMappingURL=chunk-77MUVYJA.js.map
