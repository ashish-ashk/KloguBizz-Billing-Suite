import {
  ItemPickerComponent
} from "./chunk-OCGYUZVC.js";
import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  STATES,
  UNITS,
  addDays,
  fmtINR,
  numberToWords,
  stateName,
  today
} from "./chunk-7F65RAZH.js";
import {
  IconComponent
} from "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  MaxValidator,
  MinValidator,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import {
  ActivatedRoute,
  AuthService,
  Router,
  RouterLink
} from "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  CommonModule,
  __spreadProps,
  __spreadValues,
  signal,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵadvance,
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
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/bill-generator/bill-generator.component.ts
var _forTrack0 = ($index, $item) => $item.key;
var _forTrack1 = ($index, $item) => $item._id;
var _forTrack2 = ($index, $item) => $item.code;
var _forTrack3 = ($index, $item) => $item.rate;
var _c0 = (a0) => ["/invoices", a0, "print"];
function BillGeneratorComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 1);
    \u0275\u0275element(1, "app-icon", 4);
    \u0275\u0275text(2, " Preview");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(2, _c0, ctx_r0.invoiceId()));
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function BillGeneratorComponent_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 3);
    \u0275\u0275element(1, "app-skeleton-rows", 5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function BillGeneratorComponent_Conditional_5_For_2_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 43);
    \u0275\u0275listener("click", function BillGeneratorComponent_Conditional_5_For_2_Template_button_click_0_listener() {
      const m_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(!ctx_r0.isEdit() && ctx_r0.mode.set(m_r4.key));
    });
    \u0275\u0275elementStart(1, "div", 44);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 17);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const m_r4 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275styleProp("opacity", ctx_r0.isEdit() && ctx_r0.mode() !== m_r4.key ? 0.5 : 1)("border-color", ctx_r0.mode() === m_r4.key ? "var(--brand)" : "")("background", ctx_r0.mode() === m_r4.key ? "var(--brand-pale)" : "");
    \u0275\u0275property("disabled", ctx_r0.isEdit());
    \u0275\u0275advance();
    \u0275\u0275styleProp("color", ctx_r0.mode() === m_r4.key ? "var(--brand)" : "var(--text)");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(m_r4.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(m_r4.sub);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 47);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r6 = ctx.$implicit;
    \u0275\u0275property("value", c_r6._id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r6.companyName);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0, " GSTIN: ");
    \u0275\u0275elementStart(1, "span", 49);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "br");
  }
  if (rf & 2) {
    const sc_r7 = \u0275\u0275nextContext();
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(sc_r7.gstin);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
    \u0275\u0275element(1, "br");
  }
  if (rf & 2) {
    const sc_r7 = \u0275\u0275nextContext();
    \u0275\u0275textInterpolate1(" ", sc_r7.address, "");
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41);
    \u0275\u0275element(1, "app-icon", 50);
    \u0275\u0275text(2, " Inter-state supply \u2014 IGST will be applied ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 48)(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275element(3, "br");
    \u0275\u0275template(4, BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_4_Template, 4, 1)(5, BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_5_Template, 2, 1, "br");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275template(7, BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Conditional_7_Template, 3, 1, "div", 41);
  }
  if (rf & 2) {
    const sc_r7 = ctx;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(sc_r7.companyName);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(sc_r7.gstin ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(sc_r7.address ? 5 : -1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" ", ctx_r0.stateName(sc_r7.stateCode), " (", sc_r7.stateCode, ") ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isIGST() ? 7 : -1);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 14)(2, "label");
    \u0275\u0275text(3, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "select", 45);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_29_Template_select_ngModelChange_4_listener($event) {
      \u0275\u0275restoreView(_r5);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.clientId, $event) || (ctx_r0.clientId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(5, "option", 46);
    \u0275\u0275text(6, "\u2014 Select a client \u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(7, BillGeneratorComponent_Conditional_5_Conditional_29_For_8_Template, 2, 2, "option", 47, _forTrack1);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(9, BillGeneratorComponent_Conditional_5_Conditional_29_Conditional_9_Template, 8, 6);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.clientId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.clients());
    \u0275\u0275advance(2);
    \u0275\u0275conditional((tmp_4_0 = ctx_r0.selectedClient()) ? 9 : -1, tmp_4_0);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_6_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 14)(1, "label");
    \u0275\u0275text(2, "Phone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 53);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_6_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r9);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerPhone, $event) || (ctx_r0.buyerPhone = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerPhone);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_7_Template(rf, ctx) {
  if (rf & 1) {
    const _r10 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 14)(1, "label");
    \u0275\u0275text(2, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 54);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_7_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r10);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerEmail, $event) || (ctx_r0.buyerEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerEmail);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_30_For_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 47);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r11 = ctx.$implicit;
    \u0275\u0275property("value", s_r11.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r11.name, " (", s_r11.code, ")");
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_21_Template(rf, ctx) {
  if (rf & 1) {
    const _r12 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 14)(1, "label");
    \u0275\u0275text(2, "Email");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "input", 54);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_21_Template_input_ngModelChange_3_listener($event) {
      \u0275\u0275restoreView(_r12);
      const ctx_r0 = \u0275\u0275nextContext(3);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerEmail, $event) || (ctx_r0.buyerEmail = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(3);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerEmail);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    const _r8 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 18)(1, "div", 25)(2, "div", 14)(3, "label");
    \u0275\u0275text(4, "Name *");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "input", 51);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Template_input_ngModelChange_5_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerName, $event) || (ctx_r0.buyerName = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275template(6, BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_6_Template, 4, 1, "div", 14)(7, BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_7_Template, 4, 1, "div", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "div", 14)(9, "label");
    \u0275\u0275text(10, "Address");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "input", 52);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Template_input_ngModelChange_11_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerAddress, $event) || (ctx_r0.buyerAddress = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "div", 25)(13, "div", 14)(14, "label");
    \u0275\u0275text(15, "State");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "select", 45);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Conditional_30_Template_select_ngModelChange_16_listener($event) {
      \u0275\u0275restoreView(_r8);
      const ctx_r0 = \u0275\u0275nextContext(2);
      \u0275\u0275twoWayBindingSet(ctx_r0.buyerStateCode, $event) || (ctx_r0.buyerStateCode = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(17, "option", 46);
    \u0275\u0275text(18, "\u2014 Select state \u2014");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(19, BillGeneratorComponent_Conditional_5_Conditional_30_For_20_Template, 2, 3, "option", 47, _forTrack2);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(21, BillGeneratorComponent_Conditional_5_Conditional_30_Conditional_21_Template, 4, 1, "div", 14);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerName);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.mode() === "b2b-unreg" ? 6 : 7);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerAddress);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.buyerStateCode);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.states);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.mode() === "b2b-unreg" ? 21 : -1);
  }
}
function BillGeneratorComponent_Conditional_5_For_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 23);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const h_r13 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(h_r13);
  }
}
function BillGeneratorComponent_Conditional_5_For_43_For_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 47);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const u_r17 = ctx.$implicit;
    \u0275\u0275property("value", u_r17);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(u_r17);
  }
}
function BillGeneratorComponent_Conditional_5_For_43_For_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 60);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const g_r18 = ctx.$implicit;
    \u0275\u0275property("ngValue", g_r18);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", g_r18, "%");
  }
}
function BillGeneratorComponent_Conditional_5_For_43_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    const _r19 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 63);
    \u0275\u0275listener("click", function BillGeneratorComponent_Conditional_5_For_43_Conditional_13_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r19);
      const \u0275$index_197_r16 = \u0275\u0275nextContext().$index;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.removeRow(\u0275$index_197_r16));
    });
    \u0275\u0275text(1, "\u2715");
    \u0275\u0275elementEnd();
  }
}
function BillGeneratorComponent_Conditional_5_For_43_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span");
  }
}
function BillGeneratorComponent_Conditional_5_For_43_Template(rf, ctx) {
  if (rf & 1) {
    const _r14 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 24)(1, "app-item-picker", 55);
    \u0275\u0275twoWayListener("valueChange", function BillGeneratorComponent_Conditional_5_For_43_Template_app_item_picker_valueChange_1_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.desc, $event) || (r_r15.desc = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("picked", function BillGeneratorComponent_Conditional_5_For_43_Template_app_item_picker_picked_1_listener($event) {
      const \u0275$index_197_r16 = \u0275\u0275restoreView(_r14).$index;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.applyItem(\u0275$index_197_r16, $event));
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(2, "input", 56);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_For_43_Template_input_ngModelChange_2_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.hsn, $event) || (r_r15.hsn = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "select", 57);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_For_43_Template_select_ngModelChange_3_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.unit, $event) || (r_r15.unit = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(4, BillGeneratorComponent_Conditional_5_For_43_For_5_Template, 2, 2, "option", 47, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "input", 58);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_For_43_Template_input_ngModelChange_6_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.qty, $event) || (r_r15.qty = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "input", 59);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_For_43_Template_input_ngModelChange_7_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.rate, $event) || (r_r15.rate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "select", 57);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_For_43_Template_select_ngModelChange_8_listener($event) {
      const r_r15 = \u0275\u0275restoreView(_r14).$implicit;
      \u0275\u0275twoWayBindingSet(r_r15.gstRate, $event) || (r_r15.gstRate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(9, BillGeneratorComponent_Conditional_5_For_43_For_10_Template, 2, 2, "option", 60, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "div", 61);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275template(13, BillGeneratorComponent_Conditional_5_For_43_Conditional_13_Template, 2, 0, "button", 62)(14, BillGeneratorComponent_Conditional_5_For_43_Conditional_14_Template, 1, 0, "span");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r15 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("items", ctx_r0.catalogItems());
    \u0275\u0275twoWayProperty("value", r_r15.desc);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", r_r15.hsn);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", r_r15.unit);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.units);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", r_r15.qty);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", r_r15.rate);
    \u0275\u0275advance();
    \u0275\u0275twoWayProperty("ngModel", r_r15.gstRate);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.gstRates);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.rowTaxable(r_r15)));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.rows.length > 1 ? 13 : 14);
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_71_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "span");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("Discount (", ctx_r0.discount, "%)");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("\u2212", ctx_r0.fmtINR(ctx_r0.discountAmount()), "");
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_72_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "span", 32);
    \u0275\u0275text(2, "IGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 33);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.totalTax()));
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_73_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "span", 32);
    \u0275\u0275text(2, "CGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 33);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 31)(6, "span", 32);
    \u0275\u0275text(7, "SGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 33);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.halfTax()));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.halfTax()));
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_87_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 39);
    \u0275\u0275text(1, "Add items to see the tax breakdown.");
    \u0275\u0275elementEnd();
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_88_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 65);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 66);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 67);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const t_r20 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", t_r20.rate, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(t_r20.taxable));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(t_r20.tax));
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_88_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 40)(1, "table", 64)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Rate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Taxable");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Tax");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "tbody");
    \u0275\u0275repeaterCreate(11, BillGeneratorComponent_Conditional_5_Conditional_88_For_12_Template, 7, 3, "tr", null, _forTrack3);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(11);
    \u0275\u0275repeater(ctx_r0.taxRows());
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_89_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41);
    \u0275\u0275element(1, "app-icon", 50);
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3, "IGST Applied");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" \u2014 Inter-state: ", ctx_r0.orgStateName(), " \u2192 ", ctx_r0.buyerStateName(), " ");
  }
}
function BillGeneratorComponent_Conditional_5_Conditional_90_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 42);
    \u0275\u0275element(1, "app-icon", 68);
    \u0275\u0275elementStart(2, "strong");
    \u0275\u0275text(3, "CGST + SGST Applied");
    \u0275\u0275elementEnd();
    \u0275\u0275text(4, " \u2014 Intra-state supply ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function BillGeneratorComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275repeaterCreate(1, BillGeneratorComponent_Conditional_5_For_2_Template, 5, 11, "button", 7, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 8)(4, "div", 9)(5, "div", 10)(6, "div", 11)(7, "div", 12);
    \u0275\u0275text(8, "Bill Details");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 13)(10, "div", 14)(11, "label");
    \u0275\u0275text(12, "Bill Number");
    \u0275\u0275elementEnd();
    \u0275\u0275element(13, "input", 15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "div", 14)(15, "label");
    \u0275\u0275text(16, "Bill Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.billDate, $event) || (ctx_r0.billDate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 14)(19, "label");
    \u0275\u0275text(20, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Template_input_ngModelChange_21_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.dueDate, $event) || (ctx_r0.dueDate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(22, "div", 10)(23, "div", 11)(24, "div")(25, "div", 12);
    \u0275\u0275text(26, "Buyer");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(27, "div", 17);
    \u0275\u0275text(28);
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(29, BillGeneratorComponent_Conditional_5_Conditional_29_Template, 10, 2, "div", 18)(30, BillGeneratorComponent_Conditional_5_Conditional_30_Template, 22, 5, "div", 18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "div", 3)(32, "div", 11)(33, "div", 12);
    \u0275\u0275text(34, "Items");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 19);
    \u0275\u0275listener("click", function BillGeneratorComponent_Conditional_5_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.addRow());
    });
    \u0275\u0275text(36, "+ Add row");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "div", 20)(38, "div", 21)(39, "div", 22);
    \u0275\u0275repeaterCreate(40, BillGeneratorComponent_Conditional_5_For_41_Template, 2, 1, "span", 23, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(42, BillGeneratorComponent_Conditional_5_For_43_Template, 15, 9, "div", 24, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(44, "div", 10)(45, "div", 11)(46, "div", 12);
    \u0275\u0275text(47, "Additional");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(48, "div", 18)(49, "div", 25)(50, "div", 14)(51, "label");
    \u0275\u0275text(52, "Discount %");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "input", 26);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Template_input_ngModelChange_53_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.discount, $event) || (ctx_r0.discount = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(54, "span", 27);
    \u0275\u0275text(55, "Discount is applied to item rates when saving.");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(56, "div", 14)(57, "label");
    \u0275\u0275text(58, "Notes");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(59, "textarea", 28);
    \u0275\u0275twoWayListener("ngModelChange", function BillGeneratorComponent_Conditional_5_Template_textarea_ngModelChange_59_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.notes, $event) || (ctx_r0.notes = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()()();
    \u0275\u0275elementStart(60, "div", 29)(61, "div", 10)(62, "div", 11)(63, "div", 12);
    \u0275\u0275text(64, "Bill Summary");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(65, "div", 30)(66, "div", 31)(67, "span", 32);
    \u0275\u0275text(68, "Subtotal");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(69, "span", 33);
    \u0275\u0275text(70);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(71, BillGeneratorComponent_Conditional_5_Conditional_71_Template, 5, 2, "div", 34)(72, BillGeneratorComponent_Conditional_5_Conditional_72_Template, 5, 1, "div", 31)(73, BillGeneratorComponent_Conditional_5_Conditional_73_Template, 10, 2);
    \u0275\u0275elementStart(74, "div", 35)(75, "span", 36);
    \u0275\u0275text(76, "Total");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(77, "span", 37);
    \u0275\u0275text(78);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(79, "div", 38)(80, "strong");
    \u0275\u0275text(81, "In words:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(82);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(83, "div", 3)(84, "div", 11)(85, "div", 12);
    \u0275\u0275text(86, "GST Breakdown");
    \u0275\u0275elementEnd()();
    \u0275\u0275template(87, BillGeneratorComponent_Conditional_5_Conditional_87_Template, 2, 0, "div", 39)(88, BillGeneratorComponent_Conditional_5_Conditional_88_Template, 13, 0, "div", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275template(89, BillGeneratorComponent_Conditional_5_Conditional_89_Template, 5, 3, "div", 41)(90, BillGeneratorComponent_Conditional_5_Conditional_90_Template, 5, 1, "div", 42);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.modes);
    \u0275\u0275advance(12);
    \u0275\u0275property("value", ctx_r0.invoiceNumber());
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.billDate);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.dueDate);
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate1(" ", ctx_r0.mode() === "b2b-reg" ? "Pick a registered client from your list" : ctx_r0.mode() === "b2b-unreg" ? "Business buyer without a GSTIN" : "Retail consumer details", " ");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.mode() === "b2b-reg" ? 29 : 30);
    \u0275\u0275advance(11);
    \u0275\u0275repeater(ctx_r0.itemHeads);
    \u0275\u0275advance(2);
    \u0275\u0275repeater(ctx_r0.rows);
    \u0275\u0275advance(11);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.discount);
    \u0275\u0275advance(6);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.notes);
    \u0275\u0275advance(11);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.subtotal()));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.discountAmount() > 0 ? 71 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isIGST() ? 72 : 73);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.total()));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.numberToWords(ctx_r0.total()), " ");
    \u0275\u0275advance(5);
    \u0275\u0275conditional(ctx_r0.taxRows().length === 0 ? 87 : 88);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.isIGST() ? 89 : 90);
  }
}
var BillGeneratorComponent = class _BillGeneratorComponent {
  api;
  auth;
  toast;
  router;
  route;
  clients = signal([]);
  mode = signal("b2b-reg");
  saving = signal(false);
  loading = signal(false);
  invoiceId = signal(null);
  invoiceNumber = signal("");
  isEdit() {
    return !!this.invoiceId();
  }
  // Bill details
  billDate = today();
  dueDate = addDays(15);
  // Buyer (B2B registered)
  clientId = "";
  // Buyer (free-input modes)
  buyerName = "";
  buyerPhone = "";
  buyerAddress = "";
  buyerEmail = "";
  buyerStateCode = "";
  // Items and extras
  rows = [this.blankRow()];
  discount = 0;
  notes = "";
  modes = [
    { key: "b2b-reg", label: "B2B \u2014 Registered", sub: "GSTIN buyer from your client list" },
    { key: "b2b-unreg", label: "B2B \u2014 Unregistered", sub: "Business buyer without a GSTIN" },
    { key: "b2c", label: "B2C Consumer", sub: "Retail sale to an individual" }
  ];
  units = UNITS;
  catalogItems = signal([]);
  gstRates = [0, 5, 12, 18, 28];
  itemHeads = ["Description *", "HSN", "Unit", "Qty", "Rate \u20B9", "GST %", "Taxable", ""];
  states = STATES;
  fmtINR = fmtINR;
  numberToWords = numberToWords;
  stateName = stateName;
  constructor(api, auth, toast, router, route) {
    this.api = api;
    this.auth = auth;
    this.toast = toast;
    this.router = router;
    this.route = route;
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get("id");
    this.invoiceId.set(id);
    this.api.clients().subscribe({
      next: (list) => {
        this.clients.set(list);
        if (id)
          this.loadForEdit(id);
      },
      error: (err) => this.toast.httpError(err)
    });
    this.api.items().subscribe({ next: (list) => this.catalogItems.set(list), error: () => {
    } });
  }
  loadForEdit(id) {
    this.loading.set(true);
    this.api.invoice(id).subscribe({
      next: (inv) => {
        this.loading.set(false);
        this.mode.set("b2b-reg");
        this.invoiceNumber.set(inv.invoiceNumber);
        this.billDate = inv.date?.slice(0, 10) || today();
        this.dueDate = inv.dueDate?.slice(0, 10) || addDays(15);
        this.clientId = typeof inv.clientId === "string" ? inv.clientId : inv.clientId._id;
        this.rows = inv.items.length ? inv.items.map((i) => ({ desc: i.desc, hsn: i.hsn || "", unit: "Nos", qty: i.qty, rate: i.rate, gstRate: i.gstRate })) : [this.blankRow()];
        this.discount = 0;
        this.notes = inv.notes || "";
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Bill not found.");
        this.router.navigateByUrl("/invoices");
      }
    });
  }
  // ── Rows ─────────────────────────────────────
  blankRow() {
    return { desc: "", hsn: "", unit: "Nos", qty: 1, rate: 0, gstRate: 18 };
  }
  addRow() {
    this.rows.push(this.blankRow());
  }
  removeRow(i) {
    if (this.rows.length > 1)
      this.rows.splice(i, 1);
  }
  applyItem(i, it) {
    const row = this.rows[i];
    row.hsn = it.hsn || row.hsn;
    row.unit = it.unit || row.unit;
    row.rate = it.sellingPrice;
    row.gstRate = it.gstRate;
  }
  // ── Buyer / GST type ─────────────────────────
  selectedClient() {
    return this.clients().find((c) => c._id === this.clientId) || null;
  }
  orgState() {
    return this.auth.organisation()?.stateCode || "";
  }
  buyerState() {
    return this.mode() === "b2b-reg" ? this.selectedClient()?.stateCode || "" : this.buyerStateCode;
  }
  isIGST() {
    const org = this.orgState();
    const buyer = this.buyerState();
    return !!org && !!buyer && org !== buyer;
  }
  orgStateName() {
    return this.orgState() ? stateName(this.orgState()) : "\u2014";
  }
  buyerStateName() {
    return this.buyerState() ? stateName(this.buyerState()) : "\u2014";
  }
  // ── Calculation ──────────────────────────────
  r2(n) {
    return Math.round(n * 100) / 100;
  }
  discFactor() {
    const d = Math.min(100, Math.max(0, this.discount || 0));
    return 1 - d / 100;
  }
  rowTaxable(r) {
    return this.r2((r.qty || 0) * (r.rate || 0));
  }
  subtotal() {
    return this.r2(this.rows.reduce((s, r) => s + (r.qty || 0) * (r.rate || 0), 0));
  }
  discountAmount() {
    return this.r2(this.subtotal() * (1 - this.discFactor()));
  }
  taxRows() {
    const f = this.discFactor();
    const map = /* @__PURE__ */ new Map();
    for (const r of this.rows) {
      const base = (r.qty || 0) * (r.rate || 0) * f;
      if (base <= 0)
        continue;
      const entry = map.get(r.gstRate) || { taxable: 0, tax: 0 };
      entry.taxable += base;
      entry.tax += base * r.gstRate / 100;
      map.set(r.gstRate, entry);
    }
    return [...map.entries()].map(([rate, e]) => ({ rate, taxable: this.r2(e.taxable), tax: this.r2(e.tax) })).sort((a, b) => a.rate - b.rate);
  }
  totalTax() {
    const f = this.discFactor();
    return this.r2(this.rows.reduce((s, r) => s + (r.qty || 0) * (r.rate || 0) * f * (r.gstRate || 0) / 100, 0));
  }
  halfTax() {
    return this.r2(this.totalTax() / 2);
  }
  total() {
    return this.r2(this.subtotal() - this.discountAmount() + this.totalTax());
  }
  // ── Save as invoice ──────────────────────────
  validItems() {
    return this.rows.filter((r) => r.desc.trim() && (r.qty || 0) > 0 && (r.rate || 0) > 0);
  }
  canSave() {
    return this.mode() === "b2b-reg" && !!this.clientId && this.validItems().length > 0;
  }
  save() {
    if (!this.canSave() || this.saving())
      return;
    const f = this.discFactor();
    const hasDiscount = (this.discount || 0) > 0;
    const items = this.validItems().map((r) => ({
      desc: r.desc.trim(),
      hsn: r.hsn.trim(),
      qty: r.qty,
      rate: hasDiscount ? this.r2(r.rate * f) : r.rate,
      gstRate: r.gstRate
    }));
    const payload = {
      clientId: this.clientId,
      date: this.billDate,
      dueDate: this.dueDate,
      items,
      notes: this.notes.trim(),
      paymentTerms: "Net 15"
    };
    this.saving.set(true);
    const id = this.invoiceId();
    const request = id ? this.api.updateInvoice(id, payload) : this.api.createInvoice(__spreadProps(__spreadValues({}, payload), { status: "pending" }));
    request.subscribe({
      next: (inv) => {
        this.saving.set(false);
        if (id) {
          this.toast.success(`${inv.invoiceNumber} updated`);
          this.router.navigateByUrl("/invoices");
        } else {
          this.toast.success("Invoice created");
          this.resetForm();
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  resetForm() {
    this.billDate = today();
    this.dueDate = addDays(15);
    this.clientId = "";
    this.buyerName = "";
    this.buyerPhone = "";
    this.buyerAddress = "";
    this.buyerEmail = "";
    this.buyerStateCode = "";
    this.rows = [this.blankRow()];
    this.discount = 0;
    this.notes = "";
  }
  static \u0275fac = function BillGeneratorComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _BillGeneratorComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(Router), \u0275\u0275directiveInject(ActivatedRoute));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _BillGeneratorComponent, selectors: [["app-bill-generator"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 6, vars: 6, consts: [[3, "title", "subtitle"], ["actions", "", 1, "btn", "ghost", 3, "routerLink"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "card", "flush"], ["name", "printer", 3, "size"], [3, "count"], [1, "grid", "grid-3", 2, "margin-bottom", "20px"], ["type", "button", 1, "card", "hoverable", 2, "text-align", "left", "cursor", "pointer", "padding", "14px 18px", 3, "disabled", "opacity", "borderColor", "background"], [2, "display", "grid", "grid-template-columns", "1.6fr 1fr", "gap", "20px", "align-items", "start"], [2, "display", "grid", "gap", "16px"], [1, "card"], [1, "card-head"], [1, "card-title"], [1, "grid", "grid-3"], [1, "field"], ["readonly", "", "placeholder", "Auto-generated on save", 3, "value"], ["type", "date", 3, "ngModelChange", "ngModel"], [1, "card-sub"], [1, "form"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], [2, "padding", "14px 16px", "overflow-x", "auto"], [2, "min-width", "760px"], [2, "display", "grid", "grid-template-columns", "2.2fr .8fr .7fr .55fr .85fr .7fr .95fr 30px", "gap", "8px", "margin-bottom", "6px"], [2, "font-size", "10.5px", "font-weight", "600", "text-transform", "uppercase", "letter-spacing", ".5px", "color", "var(--faint)"], [2, "display", "grid", "grid-template-columns", "2.2fr .8fr .7fr .55fr .85fr .7fr .95fr 30px", "gap", "8px", "margin-bottom", "8px", "align-items", "center"], [1, "grid", "grid-2"], ["type", "number", "min", "0", "max", "100", 3, "ngModelChange", "ngModel"], [1, "hint"], ["rows", "2", "placeholder", "Terms, remarks\u2026", 3, "ngModelChange", "ngModel"], [2, "display", "grid", "gap", "16px", "position", "sticky", "top", "20px"], [2, "display", "grid", "gap", "9px", "font-size", "13px"], [2, "display", "flex", "justify-content", "space-between"], [2, "color", "var(--muted)"], [2, "font-weight", "600"], [2, "display", "flex", "justify-content", "space-between", "color", "var(--red)"], [2, "display", "flex", "justify-content", "space-between", "align-items", "center", "border-top", "1px solid var(--border)", "padding-top", "10px", "margin-top", "2px"], [2, "font-weight", "700"], [2, "font-weight", "800", "font-size", "16px", "color", "var(--brand)"], [1, "info-box", 2, "font-size", "11.5px"], [2, "padding", "16px 20px", "color", "var(--muted)", "font-size", "12.5px"], [1, "table-wrap"], [1, "info-box", "warn", 2, "display", "flex", "gap", "8px", "align-items", "center"], [1, "info-box", "ok", 2, "display", "flex", "gap", "8px", "align-items", "center"], ["type", "button", 1, "card", "hoverable", 2, "text-align", "left", "cursor", "pointer", "padding", "14px 18px", 3, "click", "disabled"], [2, "font-weight", "700", "font-family", "var(--font-display)", "font-size", "13.5px"], [3, "ngModelChange", "ngModel"], ["value", ""], [3, "value"], [1, "info-box"], [1, "mono"], ["name", "alertTriangle", 3, "size"], ["placeholder", "Buyer name", 3, "ngModelChange", "ngModel"], ["placeholder", "Street, city, PIN", 3, "ngModelChange", "ngModel"], ["placeholder", "98765 43210", 3, "ngModelChange", "ngModel"], ["placeholder", "buyer@example.com", 3, "ngModelChange", "ngModel"], ["placeholder", "Item or service description", 3, "valueChange", "picked", "items", "value"], ["placeholder", "HSN", 1, "input", 3, "ngModelChange", "ngModel"], [1, "input", 3, "ngModelChange", "ngModel"], ["type", "number", "min", "1", 1, "input", 3, "ngModelChange", "ngModel"], ["type", "number", "min", "0", "step", "0.01", 1, "input", 3, "ngModelChange", "ngModel"], [3, "ngValue"], [2, "font-size", "12.5px", "font-weight", "600", "text-align", "right"], ["type", "button", "aria-label", "Remove row", 1, "btn", "ghost", "sm", 2, "padding", "4px 8px"], ["type", "button", "aria-label", "Remove row", 1, "btn", "ghost", "sm", 2, "padding", "4px 8px", 3, "click"], [1, "table", "stack-mobile"], ["data-label", "Rate", 1, "num"], ["data-label", "Taxable"], ["data-label", "Tax", 1, "strong"], ["name", "check", 3, "size"]], template: function BillGeneratorComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0);
      \u0275\u0275template(1, BillGeneratorComponent_Conditional_1_Template, 3, 4, "a", 1);
      \u0275\u0275elementStart(2, "button", 2);
      \u0275\u0275listener("click", function BillGeneratorComponent_Template_button_click_2_listener() {
        return ctx.save();
      });
      \u0275\u0275text(3);
      \u0275\u0275elementEnd();
      \u0275\u0275template(4, BillGeneratorComponent_Conditional_4_Template, 2, 1, "div", 3)(5, BillGeneratorComponent_Conditional_5_Template, 91, 14);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("title", ctx.isEdit() ? "Edit Bill" : "Bill Generator")("subtitle", ctx.isEdit() ? "Update this bill\u2019s items, buyer and totals" : "Create GST-compliant bills for B2B and B2C");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isEdit() ? 1 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", !ctx.canSave() || ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.saving() ? "Saving\u2026" : ctx.isEdit() ? "Update Invoice" : "Save as Invoice", " ");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.loading() ? 4 : 5);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, MinValidator, MaxValidator, NgModel, RouterLink, AppShellComponent, IconComponent, SkeletonRowsComponent, ItemPickerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(BillGeneratorComponent, { className: "BillGeneratorComponent", filePath: "src\\app\\features\\bill-generator\\bill-generator.component.ts", lineNumber: 298 });
})();
export {
  BillGeneratorComponent
};
//# sourceMappingURL=chunk-STOOC3W5.js.map
