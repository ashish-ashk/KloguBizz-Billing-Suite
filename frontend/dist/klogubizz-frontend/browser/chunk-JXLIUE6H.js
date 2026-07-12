import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-I22U2CHU.js";
import {
  SkeletonRowsComponent,
  ToastService
} from "./chunk-JIDZ6YQM.js";
import {
  STATES
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  CommonModule,
  __spreadValues,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵconditional,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-KLA3EWNB.js";

// src/app/features/super-admin/masters.component.ts
var _forTrack0 = ($index, $item) => $item.rate;
var _forTrack1 = ($index, $item) => $item.code;
function SuperMastersComponent_Conditional_18_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 4);
    \u0275\u0275element(1, "app-skeleton-rows", 5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function SuperMastersComponent_Conditional_19_Case_0_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 12)(1, "div", 13);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 14);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_0_For_11_Template_input_ngModelChange_3_listener($event) {
      const r_r4 = \u0275\u0275restoreView(_r3).$implicit;
      \u0275\u0275twoWayBindingSet(r_r4.label, $event) || (r_r4.label = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "label", 15)(5, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_0_For_11_Template_input_ngModelChange_5_listener($event) {
      const r_r4 = \u0275\u0275restoreView(_r3).$implicit;
      \u0275\u0275twoWayBindingSet(r_r4.active, $event) || (r_r4.active = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(6, "span", 17);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const r_r4 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", r_r4.rate, "%");
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", r_r4.label);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", r_r4.active);
  }
}
function SuperMastersComponent_Conditional_19_Case_0_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 6)(1, "div", 7)(2, "div")(3, "div", 8);
    \u0275\u0275text(4, "GST Rate Slabs");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "Rates offered in invoice line items");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 10);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_0_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r1);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.save("gstRate", ctx_r1.gstRates));
    });
    \u0275\u0275text(8, "Save Changes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 11);
    \u0275\u0275repeaterCreate(10, SuperMastersComponent_Conditional_19_Case_0_For_11_Template, 7, 3, "div", 12, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.gstRates);
  }
}
function SuperMastersComponent_Conditional_19_Case_1_For_24_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 24);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r8 = ctx.$implicit;
    \u0275\u0275property("ngValue", r_r8.rate);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", r_r8.rate, "%");
  }
}
function SuperMastersComponent_Conditional_19_Case_1_For_24_Template(rf, ctx) {
  if (rf & 1) {
    const _r6 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td")(2, "input", 27);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_For_24_Template_input_ngModelChange_2_listener($event) {
      const h_r7 = \u0275\u0275restoreView(_r6).$implicit;
      \u0275\u0275twoWayBindingSet(h_r7.code, $event) || (h_r7.code = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "td")(4, "input", 28);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_For_24_Template_input_ngModelChange_4_listener($event) {
      const h_r7 = \u0275\u0275restoreView(_r6).$implicit;
      \u0275\u0275twoWayBindingSet(h_r7.description, $event) || (h_r7.description = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "td")(6, "select", 23);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_For_24_Template_select_ngModelChange_6_listener($event) {
      const h_r7 = \u0275\u0275restoreView(_r6).$implicit;
      \u0275\u0275twoWayBindingSet(h_r7.rate, $event) || (h_r7.rate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(7, SuperMastersComponent_Conditional_19_Case_1_For_24_For_8_Template, 2, 2, "option", 24, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "td")(10, "label", 15)(11, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_For_24_Template_input_ngModelChange_11_listener($event) {
      const h_r7 = \u0275\u0275restoreView(_r6).$implicit;
      \u0275\u0275twoWayBindingSet(h_r7.active, $event) || (h_r7.active = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275element(12, "span", 17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "td", 29)(14, "button", 30);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_1_For_24_Template_button_click_14_listener() {
      const \u0275$index_108_r9 = \u0275\u0275restoreView(_r6).$index;
      const ctx_r1 = \u0275\u0275nextContext(3);
      return \u0275\u0275resetView(ctx_r1.hsnCodes.splice(\u0275$index_108_r9, 1));
    });
    \u0275\u0275text(15, "\u2715");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const h_r7 = ctx.$implicit;
    const ctx_r1 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", h_r7.code);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", h_r7.description);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", h_r7.rate);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.gstRates);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", h_r7.active);
  }
}
function SuperMastersComponent_Conditional_19_Case_1_For_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 24);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r10 = ctx.$implicit;
    \u0275\u0275property("ngValue", r_r10.rate);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", r_r10.rate, "%");
  }
}
function SuperMastersComponent_Conditional_19_Case_1_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 4)(1, "div", 7)(2, "div")(3, "div", 8);
    \u0275\u0275text(4, "HSN / SAC Codes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "Service and goods classification codes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 10);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_1_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.save("hsn", ctx_r1.hsnCodes));
    });
    \u0275\u0275text(8, "Save Changes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 18)(10, "table", 19)(11, "thead")(12, "tr")(13, "th");
    \u0275\u0275text(14, "Code");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "th");
    \u0275\u0275text(16, "Description");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "th");
    \u0275\u0275text(18, "GST Rate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "th");
    \u0275\u0275text(20, "Active");
    \u0275\u0275elementEnd();
    \u0275\u0275element(21, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(22, "tbody");
    \u0275\u0275repeaterCreate(23, SuperMastersComponent_Conditional_19_Case_1_For_24_Template, 16, 4, "tr", null, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementStart(25, "tr", 20)(26, "td")(27, "input", 21);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_Template_input_ngModelChange_27_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.newHsn.code, $event) || (ctx_r1.newHsn.code = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(28, "td")(29, "input", 22);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_Template_input_ngModelChange_29_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.newHsn.description, $event) || (ctx_r1.newHsn.description = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(30, "td")(31, "select", 23);
    \u0275\u0275twoWayListener("ngModelChange", function SuperMastersComponent_Conditional_19_Case_1_Template_select_ngModelChange_31_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r1.newHsn.rate, $event) || (ctx_r1.newHsn.rate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(32, SuperMastersComponent_Conditional_19_Case_1_For_33_Template, 2, 2, "option", 24, _forTrack0);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(34, "td", 25)(35, "button", 26);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_1_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r5);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.addHsn());
    });
    \u0275\u0275text(36, "+ Add");
    \u0275\u0275elementEnd()()()()()()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance(16);
    \u0275\u0275repeater(ctx_r1.hsnCodes);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newHsn.code);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newHsn.description);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", ctx_r1.newHsn.rate);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r1.gstRates);
  }
}
function SuperMastersComponent_Conditional_19_Case_2_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 33);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_2_For_11_Template_button_click_0_listener() {
      const m_r13 = \u0275\u0275restoreView(_r12).$implicit;
      return \u0275\u0275resetView(m_r13.active = !m_r13.active);
    });
    \u0275\u0275elementStart(1, "div", 34);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 35);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const m_r13 = ctx.$implicit;
    \u0275\u0275styleProp("border", m_r13.active ? "2px solid var(--brand)" : "2px solid var(--border)")("background", m_r13.active ? "var(--brand-pale)" : "#fff");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(m_r13.label);
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", m_r13.active ? "var(--green)" : "var(--faint)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", m_r13.active ? "\u2713 Enabled" : "\u2717 Disabled", " ");
  }
}
function SuperMastersComponent_Conditional_19_Case_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r11 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 6)(1, "div", 7)(2, "div")(3, "div", 8);
    \u0275\u0275text(4, "Payment Methods");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "Click a method to enable or disable it platform-wide");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 10);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_2_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r11);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.save("paymentMethod", ctx_r1.paymentMethods));
    });
    \u0275\u0275text(8, "Save Changes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 31);
    \u0275\u0275repeaterCreate(10, SuperMastersComponent_Conditional_19_Case_2_For_11_Template, 5, 8, "button", 32, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.paymentMethods);
  }
}
function SuperMastersComponent_Conditional_19_Case_3_For_11_Template(rf, ctx) {
  if (rf & 1) {
    const _r15 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 37);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_3_For_11_Template_button_click_0_listener() {
      const u_r16 = \u0275\u0275restoreView(_r15).$implicit;
      return \u0275\u0275resetView(u_r16.active = !u_r16.active);
    });
    \u0275\u0275elementStart(1, "div", 38);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 39);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const u_r16 = ctx.$implicit;
    \u0275\u0275styleProp("border", u_r16.active ? "2px solid var(--brand)" : "2px solid var(--border)")("background", u_r16.active ? "var(--brand-pale)" : "#fff");
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", u_r16.active ? "var(--brand)" : "var(--faint)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(u_r16.code);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(u_r16.label);
  }
}
function SuperMastersComponent_Conditional_19_Case_3_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "section", 6)(1, "div", 7)(2, "div")(3, "div", 8);
    \u0275\u0275text(4, "Units of Measurement");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "Units available in bills and invoices");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "button", 10);
    \u0275\u0275listener("click", function SuperMastersComponent_Conditional_19_Case_3_Template_button_click_7_listener() {
      \u0275\u0275restoreView(_r14);
      const ctx_r1 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r1.save("unit", ctx_r1.units));
    });
    \u0275\u0275text(8, "Save Changes");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 31);
    \u0275\u0275repeaterCreate(10, SuperMastersComponent_Conditional_19_Case_3_For_11_Template, 5, 8, "button", 36, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(7);
    \u0275\u0275property("disabled", ctx_r1.saving());
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r1.units);
  }
}
function SuperMastersComponent_Conditional_19_Case_4_For_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42)(1, "span", 43);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 44);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const s_r17 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(s_r17.code);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(s_r17.name);
  }
}
function SuperMastersComponent_Conditional_19_Case_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "section", 6)(1, "div", 7)(2, "div")(3, "div", 8);
    \u0275\u0275text(4, "GST State Codes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 9);
    \u0275\u0275text(6, "All Indian states and union territories");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(7, "div", 40);
    \u0275\u0275text(8, "State codes are defined by GST law and cannot be edited.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "div", 41);
    \u0275\u0275repeaterCreate(10, SuperMastersComponent_Conditional_19_Case_4_For_11_Template, 5, 2, "div", 42, _forTrack1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r1 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(10);
    \u0275\u0275repeater(ctx_r1.states);
  }
}
function SuperMastersComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, SuperMastersComponent_Conditional_19_Case_0_Template, 12, 1, "section", 6)(1, SuperMastersComponent_Conditional_19_Case_1_Template, 37, 4, "section", 4)(2, SuperMastersComponent_Conditional_19_Case_2_Template, 12, 1, "section", 6)(3, SuperMastersComponent_Conditional_19_Case_3_Template, 12, 1, "section", 6)(4, SuperMastersComponent_Conditional_19_Case_4_Template, 12, 0, "section", 6);
  }
  if (rf & 2) {
    let tmp_1_0;
    const ctx_r1 = \u0275\u0275nextContext();
    \u0275\u0275conditional((tmp_1_0 = ctx_r1.tab()) === "gstRate" ? 0 : tmp_1_0 === "hsn" ? 1 : tmp_1_0 === "paymentMethod" ? 2 : tmp_1_0 === "unit" ? 3 : tmp_1_0 === "states" ? 4 : -1);
  }
}
var SuperMastersComponent = class _SuperMastersComponent {
  api;
  toast;
  tab = signal("gstRate");
  loading = signal(true);
  saving = signal(false);
  states = STATES;
  gstRates = [];
  hsnCodes = [];
  paymentMethods = [];
  units = [];
  newHsn = { code: "", description: "", rate: 18 };
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.api.superMasters().subscribe({
      next: (res) => {
        this.gstRates = res.masters.gstRate.map((m) => __spreadValues({}, m));
        this.hsnCodes = res.masters.hsn.map((m) => __spreadValues({}, m));
        this.paymentMethods = res.masters.paymentMethod.map((m) => __spreadValues({}, m));
        this.units = res.masters.unit.map((m) => __spreadValues({}, m));
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Could not load masters.");
      }
    });
  }
  addHsn() {
    if (!this.newHsn.code?.trim()) {
      this.toast.error("Enter an HSN/SAC code.");
      return;
    }
    this.hsnCodes.push({ type: "hsn", code: this.newHsn.code.trim(), description: this.newHsn.description || "", rate: this.newHsn.rate ?? 18, active: true });
    this.newHsn = { code: "", description: "", rate: 18 };
  }
  save(type, items) {
    this.saving.set(true);
    this.api.superSaveMasters(type, items).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success("Masters saved");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function SuperMastersComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _SuperMastersComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SuperMastersComponent, selectors: [["app-super-masters"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 20, vars: 11, consts: [[1, "page-head"], [1, "toolbar"], [1, "tabs"], ["type", "button", 3, "click"], [1, "card", "flush"], [3, "count"], [1, "card"], [1, "card-head"], [1, "card-title"], [1, "card-sub"], ["type", "button", 1, "btn", "primary", "sm", 3, "click", "disabled"], [2, "display", "grid", "gap", "10px"], [2, "display", "flex", "align-items", "center", "gap", "14px"], [2, "width", "50px", "height", "50px", "border-radius", "10px", "background", "var(--brand-pale)", "display", "grid", "place-items", "center", "font-weight", "800", "font-size", "15px", "color", "var(--brand)", "flex-shrink", "0"], ["placeholder", "Description", 1, "input", 2, "flex", "1", 3, "ngModelChange", "ngModel"], [1, "switch"], ["type", "checkbox", 3, "ngModelChange", "ngModel"], [1, "track"], [1, "table-wrap"], [1, "table"], [2, "background", "var(--brand-pale)"], ["placeholder", "9983xx", 1, "input", "mono", 2, "width", "110px", 3, "ngModelChange", "ngModel"], ["placeholder", "Description", 1, "input", 3, "ngModelChange", "ngModel"], [1, "input", 2, "width", "90px", 3, "ngModelChange", "ngModel"], [3, "ngValue"], ["colspan", "2"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], [1, "input", "mono", 2, "width", "110px", 3, "ngModelChange", "ngModel"], [1, "input", 3, "ngModelChange", "ngModel"], [1, "actions"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], [1, "grid", "grid-4"], ["type", "button", 2, "border-radius", "10px", "padding", "16px 14px", "text-align", "left", "cursor", "pointer", "transition", "all .15s", 3, "border", "background"], ["type", "button", 2, "border-radius", "10px", "padding", "16px 14px", "text-align", "left", "cursor", "pointer", "transition", "all .15s", 3, "click"], [2, "font-weight", "700", "font-size", "13px"], [2, "font-size", "11px", "margin-top", "4px"], ["type", "button", 2, "border-radius", "10px", "padding", "16px 14px", "text-align", "center", "cursor", "pointer", "transition", "all .15s", 3, "border", "background"], ["type", "button", 2, "border-radius", "10px", "padding", "16px 14px", "text-align", "center", "cursor", "pointer", "transition", "all .15s", 3, "click"], [2, "font-weight", "800", "font-size", "16px"], [2, "font-size", "11px", "color", "var(--muted)", "margin-top", "3px"], [1, "info-box", 2, "margin-bottom", "16px"], [1, "grid", "grid-4", 2, "gap", "8px"], [2, "display", "flex", "align-items", "center", "gap", "10px", "padding", "9px 12px", "border", "1px solid var(--border)", "border-radius", "8px"], [1, "pill", "mono"], [2, "font-size", "12px", "font-weight", "600"]], template: function SuperMastersComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div")(2, "h1");
      \u0275\u0275text(3, "Masters");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "p");
      \u0275\u0275text(5, "Global reference data used across all organizations");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(6, "div", 1)(7, "div", 2)(8, "button", 3);
      \u0275\u0275listener("click", function SuperMastersComponent_Template_button_click_8_listener() {
        return ctx.tab.set("gstRate");
      });
      \u0275\u0275text(9, "GST Rates");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "button", 3);
      \u0275\u0275listener("click", function SuperMastersComponent_Template_button_click_10_listener() {
        return ctx.tab.set("hsn");
      });
      \u0275\u0275text(11, "HSN/SAC Codes");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(12, "button", 3);
      \u0275\u0275listener("click", function SuperMastersComponent_Template_button_click_12_listener() {
        return ctx.tab.set("paymentMethod");
      });
      \u0275\u0275text(13, "Payment Methods");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(14, "button", 3);
      \u0275\u0275listener("click", function SuperMastersComponent_Template_button_click_14_listener() {
        return ctx.tab.set("unit");
      });
      \u0275\u0275text(15, "Units of Measure");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(16, "button", 3);
      \u0275\u0275listener("click", function SuperMastersComponent_Template_button_click_16_listener() {
        return ctx.tab.set("states");
      });
      \u0275\u0275text(17, "State Codes");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(18, SuperMastersComponent_Conditional_18_Template, 2, 1, "div", 4)(19, SuperMastersComponent_Conditional_19_Template, 5, 1);
    }
    if (rf & 2) {
      \u0275\u0275advance(8);
      \u0275\u0275classProp("active", ctx.tab() === "gstRate");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "hsn");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "paymentMethod");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "unit");
      \u0275\u0275advance(2);
      \u0275\u0275classProp("active", ctx.tab() === "states");
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 18 : 19);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgModel, SkeletonRowsComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SuperMastersComponent, { className: "SuperMastersComponent", filePath: "src\\app\\features\\super-admin\\masters.component.ts", lineNumber: 153 });
})();
export {
  SuperMastersComponent
};
//# sourceMappingURL=chunk-JXLIUE6H.js.map
