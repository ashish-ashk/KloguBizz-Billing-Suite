import {
  ItemPickerComponent
} from "./chunk-OCGYUZVC.js";
import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  AvatarComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  addDays,
  fmtDate,
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
  ɵɵpureFunction1,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵrepeaterTrackByIndex,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/invoices/invoice-editor.component.ts
var _forTrack0 = ($index, $item) => $item._id;
var _c0 = (a0) => ["/invoices", a0, "print"];
function InvoiceEditorComponent_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "a", 1);
    \u0275\u0275element(1, "app-icon", 8);
    \u0275\u0275text(2, " Preview / Print");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(2, _c0, ctx_r0.invoiceId()));
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function InvoiceEditorComponent_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 4);
  }
}
function InvoiceEditorComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 6);
    \u0275\u0275element(1, "app-skeleton-rows", 9);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("count", 5);
  }
}
function InvoiceEditorComponent_Conditional_10_For_28_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 19);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r3 = ctx.$implicit;
    \u0275\u0275property("value", c_r3._id);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r3.companyName);
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_29_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 20);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r0.clientError());
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_30_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r4 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r4.address);
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_30_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 54);
    \u0275\u0275element(1, "app-icon", 55);
    \u0275\u0275text(2, " Inter-state supply \u2014 IGST applicable ");
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    \u0275\u0275advance();
    \u0275\u0275property("size", 14);
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 49);
    \u0275\u0275element(1, "app-avatar", 50);
    \u0275\u0275elementStart(2, "div", 51)(3, "div", 52);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, InvoiceEditorComponent_Conditional_10_Conditional_30_Conditional_5_Template, 2, 1, "div");
    \u0275\u0275elementStart(6, "div");
    \u0275\u0275text(7, "GSTIN: ");
    \u0275\u0275elementStart(8, "span", 53);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(11, InvoiceEditorComponent_Conditional_10_Conditional_30_Conditional_11_Template, 3, 1, "div", 54);
  }
  if (rf & 2) {
    const c_r4 = ctx;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance();
    \u0275\u0275property("name", c_r4.companyName)("size", 36);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(c_r4.companyName);
    \u0275\u0275advance();
    \u0275\u0275conditional(c_r4.address ? 5 : -1);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(c_r4.gstin || "\u2014");
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2(" \xB7 ", ctx_r0.stateName(c_r4.stateCode), " (", c_r4.stateCode, ")");
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isIGST() ? 11 : -1);
  }
}
function InvoiceEditorComponent_Conditional_10_For_56_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 61);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r8 = ctx.$implicit;
    \u0275\u0275property("ngValue", r_r8);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", r_r8, "%");
  }
}
function InvoiceEditorComponent_Conditional_10_For_56_Conditional_16_Template(rf, ctx) {
  if (rf & 1) {
    const _r9 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "button", 64);
    \u0275\u0275listener("click", function InvoiceEditorComponent_Conditional_10_For_56_Conditional_16_Template_button_click_0_listener() {
      \u0275\u0275restoreView(_r9);
      const \u0275$index_149_r7 = \u0275\u0275nextContext().$index;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.removeItem(\u0275$index_149_r7));
    });
    \u0275\u0275text(1, "\u2715");
    \u0275\u0275elementEnd();
  }
}
function InvoiceEditorComponent_Conditional_10_For_56_Template(rf, ctx) {
  if (rf & 1) {
    const _r5 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td")(2, "app-item-picker", 56);
    \u0275\u0275twoWayListener("valueChange", function InvoiceEditorComponent_Conditional_10_For_56_Template_app_item_picker_valueChange_2_listener($event) {
      const item_r6 = \u0275\u0275restoreView(_r5).$implicit;
      \u0275\u0275twoWayBindingSet(item_r6.desc, $event) || (item_r6.desc = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("picked", function InvoiceEditorComponent_Conditional_10_For_56_Template_app_item_picker_picked_2_listener($event) {
      const \u0275$index_149_r7 = \u0275\u0275restoreView(_r5).$index;
      const ctx_r0 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r0.applyItem(\u0275$index_149_r7, $event));
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(3, "td")(4, "input", 57);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_For_56_Template_input_ngModelChange_4_listener($event) {
      const item_r6 = \u0275\u0275restoreView(_r5).$implicit;
      \u0275\u0275twoWayBindingSet(item_r6.hsn, $event) || (item_r6.hsn = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "td")(6, "input", 58);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_For_56_Template_input_ngModelChange_6_listener($event) {
      const item_r6 = \u0275\u0275restoreView(_r5).$implicit;
      \u0275\u0275twoWayBindingSet(item_r6.qty, $event) || (item_r6.qty = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(7, "td")(8, "input", 59);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_For_56_Template_input_ngModelChange_8_listener($event) {
      const item_r6 = \u0275\u0275restoreView(_r5).$implicit;
      \u0275\u0275twoWayBindingSet(item_r6.rate, $event) || (item_r6.rate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "td")(10, "select", 60);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_For_56_Template_select_ngModelChange_10_listener($event) {
      const item_r6 = \u0275\u0275restoreView(_r5).$implicit;
      \u0275\u0275twoWayBindingSet(item_r6.gstRate, $event) || (item_r6.gstRate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(11, InvoiceEditorComponent_Conditional_10_For_56_For_12_Template, 2, 2, "option", 61, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "td", 62);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 27);
    \u0275\u0275template(16, InvoiceEditorComponent_Conditional_10_For_56_Conditional_16_Template, 2, 0, "button", 63);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r6 = ctx.$implicit;
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275property("items", ctx_r0.catalogItems());
    \u0275\u0275twoWayProperty("value", item_r6.desc);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", item_r6.hsn);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", item_r6.qty);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", item_r6.rate);
    \u0275\u0275advance(2);
    \u0275\u0275twoWayProperty("ngModel", item_r6.gstRate);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.gstRates);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.lineAmount(item_r6)));
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.items.length > 1 ? 16 : -1);
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_57_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "span", 20);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r0.itemsError());
  }
}
function InvoiceEditorComponent_Conditional_10_For_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 19);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const t_r10 = ctx.$implicit;
    \u0275\u0275property("value", t_r10);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(t_r10);
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_94_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38)(1, "span", 65);
    \u0275\u0275text(2, "IGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 40);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.totalTax()));
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_95_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 38)(1, "span", 65);
    \u0275\u0275text(2, "CGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 40);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(5, "div", 38)(6, "span", 65);
    \u0275\u0275text(7, "SGST");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "span", 40);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.totalTax() / 2));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.totalTax() / 2));
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_121_Conditional_0_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 66)(1, "strong");
    \u0275\u0275element(2, "app-icon", 68);
    \u0275\u0275text(3, " IGST Applied");
    \u0275\u0275elementEnd();
    \u0275\u0275element(4, "br");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 13);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate2(" Inter-state: ", ctx_r0.stateName(ctx_r0.orgStateCode), " \u2192 ", ctx_r0.stateName(ctx_r0.selectedClient().stateCode), " ");
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_121_Conditional_1_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 67)(1, "strong");
    \u0275\u0275element(2, "app-icon", 69);
    \u0275\u0275text(3, " CGST + SGST Applied");
    \u0275\u0275elementEnd();
    \u0275\u0275element(4, "br");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(3);
    \u0275\u0275advance(2);
    \u0275\u0275property("size", 13);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate1(" Intra-state supply: ", ctx_r0.stateName(ctx_r0.orgStateCode), " ");
  }
}
function InvoiceEditorComponent_Conditional_10_Conditional_121_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275template(0, InvoiceEditorComponent_Conditional_10_Conditional_121_Conditional_0_Template, 6, 3, "div", 66)(1, InvoiceEditorComponent_Conditional_10_Conditional_121_Conditional_1_Template, 6, 2, "div", 67);
  }
  if (rf & 2) {
    const ctx_r0 = \u0275\u0275nextContext(2);
    \u0275\u0275conditional(ctx_r0.isIGST() ? 0 : 1);
  }
}
function InvoiceEditorComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 7)(1, "div", 10)(2, "section", 11)(3, "div", 12);
    \u0275\u0275text(4, "Invoice Details");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "div", 13)(6, "div", 14)(7, "label");
    \u0275\u0275text(8, "Invoice Number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "input", 15);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_9_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.invoiceNumber, $event) || (ctx_r0.invoiceNumber = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(10, "div", 14)(11, "label");
    \u0275\u0275text(12, "Invoice Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_13_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.date, $event) || (ctx_r0.date = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(14, "div", 14)(15, "label");
    \u0275\u0275text(16, "Due Date");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "input", 16);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_17_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.dueDate, $event) || (ctx_r0.dueDate = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(18, "section", 11)(19, "div", 12);
    \u0275\u0275text(20, "Bill To");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "div", 14)(22, "label");
    \u0275\u0275text(23, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "select", 17);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_select_ngModelChange_24_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.clientId, $event) || (ctx_r0.clientId = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275listener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_select_ngModelChange_24_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.clientError.set(""));
    });
    \u0275\u0275elementStart(25, "option", 18);
    \u0275\u0275text(26, "Select a client\u2026");
    \u0275\u0275elementEnd();
    \u0275\u0275repeaterCreate(27, InvoiceEditorComponent_Conditional_10_For_28_Template, 2, 2, "option", 19, _forTrack0);
    \u0275\u0275elementEnd();
    \u0275\u0275template(29, InvoiceEditorComponent_Conditional_10_Conditional_29_Template, 2, 1, "span", 20);
    \u0275\u0275elementEnd();
    \u0275\u0275template(30, InvoiceEditorComponent_Conditional_10_Conditional_30_Template, 12, 8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(31, "section", 11)(32, "div", 21)(33, "div", 22);
    \u0275\u0275text(34, "Line Items");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(35, "button", 23);
    \u0275\u0275listener("click", function InvoiceEditorComponent_Conditional_10_Template_button_click_35_listener() {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r0.addItem());
    });
    \u0275\u0275text(36, "+ Add item");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(37, "div", 24)(38, "table", 25)(39, "thead")(40, "tr")(41, "th", 26);
    \u0275\u0275text(42, "Description");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "th");
    \u0275\u0275text(44, "HSN/SAC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(45, "th");
    \u0275\u0275text(46, "Qty");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(47, "th");
    \u0275\u0275text(48, "Rate (\u20B9)");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(49, "th");
    \u0275\u0275text(50, "GST %");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(51, "th", 27);
    \u0275\u0275text(52, "Amount");
    \u0275\u0275elementEnd();
    \u0275\u0275element(53, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(54, "tbody");
    \u0275\u0275repeaterCreate(55, InvoiceEditorComponent_Conditional_10_For_56_Template, 17, 8, "tr", null, \u0275\u0275repeaterTrackByIndex);
    \u0275\u0275elementEnd()()();
    \u0275\u0275template(57, InvoiceEditorComponent_Conditional_10_Conditional_57_Template, 3, 1, "div", 28);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "section", 11)(59, "div", 12);
    \u0275\u0275text(60, "Additional Details");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(61, "div", 29)(62, "div", 14)(63, "label");
    \u0275\u0275text(64, "Payment Terms");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(65, "select", 17);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_select_ngModelChange_65_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.paymentTerms, $event) || (ctx_r0.paymentTerms = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275repeaterCreate(66, InvoiceEditorComponent_Conditional_10_For_67_Template, 2, 2, "option", 19, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(68, "div", 14)(69, "label");
    \u0275\u0275text(70, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(71, "select", 17);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_select_ngModelChange_71_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.status, $event) || (ctx_r0.status = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementStart(72, "option", 30);
    \u0275\u0275text(73, "Draft");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(74, "option", 31);
    \u0275\u0275text(75, "Pending");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(76, "option", 32);
    \u0275\u0275text(77, "Paid");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(78, "option", 33);
    \u0275\u0275text(79, "Overdue");
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(80, "div", 34)(81, "label");
    \u0275\u0275text(82, "Notes / Terms");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(83, "textarea", 35);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_textarea_ngModelChange_83_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.notes, $event) || (ctx_r0.notes = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(84, "div", 36)(85, "section", 11)(86, "div", 12);
    \u0275\u0275text(87, "Invoice Summary");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(88, "div", 37)(89, "div", 38)(90, "span", 39);
    \u0275\u0275text(91, "Subtotal");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(92, "span", 40);
    \u0275\u0275text(93);
    \u0275\u0275elementEnd()();
    \u0275\u0275template(94, InvoiceEditorComponent_Conditional_10_Conditional_94_Template, 5, 1, "div", 38)(95, InvoiceEditorComponent_Conditional_10_Conditional_95_Template, 10, 2);
    \u0275\u0275elementStart(96, "div", 41)(97, "span", 42);
    \u0275\u0275text(98, "Total");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(99, "span", 43);
    \u0275\u0275text(100);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(101, "div", 44)(102, "strong");
    \u0275\u0275text(103, "In words:");
    \u0275\u0275elementEnd();
    \u0275\u0275text(104);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(105, "section", 11)(106, "div", 12);
    \u0275\u0275text(107, "Bank Details");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(108, "div", 45)(109, "div", 14)(110, "label");
    \u0275\u0275text(111, "Bank Name");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(112, "input", 46);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_112_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.bank.bank, $event) || (ctx_r0.bank.bank = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(113, "div", 14)(114, "label");
    \u0275\u0275text(115, "Account Number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(116, "input", 47);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_116_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.bank.account, $event) || (ctx_r0.bank.account = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(117, "div", 14)(118, "label");
    \u0275\u0275text(119, "IFSC Code");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(120, "input", 48);
    \u0275\u0275twoWayListener("ngModelChange", function InvoiceEditorComponent_Conditional_10_Template_input_ngModelChange_120_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r0 = \u0275\u0275nextContext();
      \u0275\u0275twoWayBindingSet(ctx_r0.bank.ifsc, $event) || (ctx_r0.bank.ifsc = $event);
      return \u0275\u0275resetView($event);
    });
    \u0275\u0275elementEnd()()()();
    \u0275\u0275template(121, InvoiceEditorComponent_Conditional_10_Conditional_121_Template, 2, 1);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    let tmp_10_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance(9);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.invoiceNumber);
    \u0275\u0275property("readOnly", true)("placeholder", ctx_r0.isEdit() ? "" : "Auto-generated on save");
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.date);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.dueDate);
    \u0275\u0275advance(7);
    \u0275\u0275classProp("invalid", !!ctx_r0.clientError());
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.clientId);
    \u0275\u0275advance(3);
    \u0275\u0275repeater(ctx_r0.clients());
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.clientError() ? 29 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional((tmp_10_0 = ctx_r0.selectedClient()) ? 30 : -1, tmp_10_0);
    \u0275\u0275advance(25);
    \u0275\u0275repeater(ctx_r0.items);
    \u0275\u0275advance(2);
    \u0275\u0275conditional(ctx_r0.itemsError() ? 57 : -1);
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.paymentTerms);
    \u0275\u0275advance();
    \u0275\u0275repeater(ctx_r0.terms);
    \u0275\u0275advance(5);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.status);
    \u0275\u0275advance(12);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.notes);
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.subtotal()));
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.isIGST() ? 94 : 95);
    \u0275\u0275advance(6);
    \u0275\u0275textInterpolate(ctx_r0.fmtINR(ctx_r0.grandTotal()));
    \u0275\u0275advance(4);
    \u0275\u0275textInterpolate1(" ", ctx_r0.numberToWords(ctx_r0.grandTotal()), " ");
    \u0275\u0275advance(8);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.bank.bank);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.bank.account);
    \u0275\u0275advance(4);
    \u0275\u0275twoWayProperty("ngModel", ctx_r0.bank.ifsc);
    \u0275\u0275advance();
    \u0275\u0275conditional(ctx_r0.selectedClient() ? 121 : -1);
  }
}
var InvoiceEditorComponent = class _InvoiceEditorComponent {
  api;
  auth;
  toast;
  router;
  route;
  gstRates = [0, 5, 12, 18, 28];
  terms = ["Net 15", "Net 30", "Net 45", "Due on receipt", "Advance"];
  clients = signal([]);
  catalogItems = signal([]);
  loading = signal(true);
  saving = signal(false);
  invoiceId = signal(null);
  isEdit = signal(false);
  clientError = signal("");
  itemsError = signal("");
  invoiceNumber = "";
  clientId = "";
  date = today();
  dueDate = addDays(15);
  status = "pending";
  paymentTerms = "Net 15";
  notes = "Thank you for your business!";
  items = [this.blankItem()];
  bank = { bank: "", account: "", ifsc: "" };
  fmtINR = fmtINR;
  fmtDate = fmtDate;
  numberToWords = numberToWords;
  stateName = stateName;
  constructor(api, auth, toast, router, route) {
    this.api = api;
    this.auth = auth;
    this.toast = toast;
    this.router = router;
    this.route = route;
  }
  get orgStateCode() {
    return this.auth.organisation()?.stateCode || "27";
  }
  ngOnInit() {
    const id = this.route.snapshot.paramMap.get("id");
    this.invoiceId.set(id);
    this.isEdit.set(!!id);
    this.api.clients().subscribe({
      next: (clients) => {
        this.clients.set(clients);
        if (id) {
          this.loadInvoice(id);
        } else {
          this.loading.set(false);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Could not load clients.");
      }
    });
    this.api.items().subscribe({ next: (list) => this.catalogItems.set(list), error: () => {
    } });
  }
  loadInvoice(id) {
    this.api.invoice(id).subscribe({
      next: (inv) => {
        this.invoiceNumber = inv.invoiceNumber;
        this.clientId = typeof inv.clientId === "string" ? inv.clientId : inv.clientId._id;
        this.date = inv.date?.slice(0, 10) || today();
        this.dueDate = inv.dueDate?.slice(0, 10) || addDays(15);
        this.status = inv.status;
        this.paymentTerms = inv.paymentTerms || "Net 15";
        this.notes = inv.notes || "";
        this.items = inv.items.length ? inv.items.map((i) => __spreadValues({}, i)) : [this.blankItem()];
        this.bank = {
          bank: inv.bankDetails?.bank || "",
          account: inv.bankDetails?.account || "",
          ifsc: inv.bankDetails?.ifsc || ""
        };
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Invoice not found.");
        this.router.navigateByUrl("/invoices");
      }
    });
  }
  blankItem() {
    return { desc: "", hsn: "998314", qty: 1, rate: 0, gstRate: 18 };
  }
  addItem() {
    this.items = [...this.items, this.blankItem()];
  }
  removeItem(i) {
    this.items = this.items.filter((_, idx) => idx !== i);
  }
  applyItem(i, it) {
    const row = this.items[i];
    row.hsn = it.hsn || row.hsn;
    row.rate = it.sellingPrice;
    row.gstRate = it.gstRate;
  }
  selectedClient() {
    return this.clients().find((c) => c._id === this.clientId) || null;
  }
  isIGST() {
    const client = this.selectedClient();
    return !!client && client.stateCode !== this.orgStateCode;
  }
  lineAmount(item) {
    return (Number(item.qty) || 0) * (Number(item.rate) || 0);
  }
  subtotal() {
    return this.items.reduce((s, i) => s + this.lineAmount(i), 0);
  }
  totalTax() {
    return this.items.reduce((s, i) => s + this.lineAmount(i) * (Number(i.gstRate) || 0) / 100, 0);
  }
  grandTotal() {
    return this.subtotal() + this.totalTax();
  }
  save(intent) {
    if (!this.clientId) {
      this.clientError.set("Select a client for this invoice.");
      return;
    }
    const validItems = this.items.filter((i) => i.desc.trim() && this.lineAmount(i) > 0);
    if (!validItems.length) {
      this.itemsError.set("Add at least one line item with a description and amount.");
      return;
    }
    this.itemsError.set("");
    const payload = {
      clientId: this.clientId,
      date: this.date,
      dueDate: this.dueDate,
      status: this.isEdit() ? this.status : intent,
      paymentTerms: this.paymentTerms,
      notes: this.notes,
      items: validItems.map((i) => ({ desc: i.desc.trim(), hsn: i.hsn, qty: Number(i.qty), rate: Number(i.rate), gstRate: Number(i.gstRate) })),
      bankDetails: __spreadValues({}, this.bank)
    };
    this.saving.set(true);
    const request = this.isEdit() ? this.api.updateInvoice(this.invoiceId(), payload) : this.api.createInvoice(payload);
    request.subscribe({
      next: (inv) => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? `${inv.invoiceNumber} updated` : `${inv.invoiceNumber} created`);
        this.router.navigateByUrl("/invoices");
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function InvoiceEditorComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoiceEditorComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(Router), \u0275\u0275directiveInject(ActivatedRoute));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoiceEditorComponent, selectors: [["app-invoice-editor"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 11, vars: 8, consts: [[3, "title", "subtitle"], ["actions", "", 1, "btn", "secondary", 3, "routerLink"], ["actions", "", "type", "button", 1, "btn", "ghost", 3, "click", "disabled"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["routerLink", "/invoices", 1, "no-print", 2, "display", "inline-block", "color", "var(--muted)", "font-size", "12.5px", "margin", "-12px 0 16px"], [1, "card", "flush"], [1, "grid", "grid-main"], ["name", "printer", 3, "size"], [3, "count"], [2, "display", "grid", "gap", "16px"], [1, "card"], [1, "card-title", 2, "margin-bottom", "14px"], [1, "grid", "grid-3"], [1, "field"], [3, "ngModelChange", "ngModel", "readOnly", "placeholder"], ["type", "date", 3, "ngModelChange", "ngModel"], [3, "ngModelChange", "ngModel"], ["value", "", "disabled", ""], [3, "value"], [1, "error"], [1, "card-head", 2, "margin-bottom", "10px"], [1, "card-title"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], [1, "table-wrap"], [1, "table", 2, "min-width", "640px"], [2, "min-width", "200px"], [2, "text-align", "right"], [1, "field", 2, "margin-top", "8px"], [1, "grid", "grid-2"], ["value", "draft"], ["value", "pending"], ["value", "paid"], ["value", "overdue"], [1, "field", 2, "margin-top", "12px"], ["rows", "3", "placeholder", "Thank you for your business!", 3, "ngModelChange", "ngModel"], [2, "display", "grid", "gap", "16px", "align-content", "start"], [2, "display", "grid", "gap", "9px", "font-size", "13px"], [2, "display", "flex", "justify-content", "space-between"], [1, "muted", 2, "color", "var(--muted)"], [2, "font-weight", "600"], [2, "display", "flex", "justify-content", "space-between", "border-top", "2px solid var(--border)", "padding-top", "10px", "margin-top", "4px"], [2, "font-weight", "700"], [2, "font-weight", "800", "font-size", "16px", "color", "var(--brand)"], [1, "info-box", 2, "margin-top", "14px"], [1, "form"], ["placeholder", "HDFC Bank", 3, "ngModelChange", "ngModel"], ["placeholder", "50100XXXXXXXXX", 1, "mono", 3, "ngModelChange", "ngModel"], ["placeholder", "HDFC0001234", 1, "mono", 3, "ngModelChange", "ngModel"], [1, "info-box", 2, "margin-top", "12px", "display", "flex", "gap", "12px", "align-items", "flex-start"], [3, "name", "size"], [2, "line-height", "1.6"], [2, "font-weight", "700", "font-size", "13px", "color", "var(--text)"], [1, "mono"], [1, "info-box", "warn", 2, "margin-top", "10px", "display", "flex", "gap", "8px", "align-items", "center"], ["name", "alertTriangle", 3, "size"], [3, "valueChange", "picked", "items", "value"], ["placeholder", "9983xx", 1, "input", "mono", 2, "width", "88px", 3, "ngModelChange", "ngModel"], ["type", "number", "min", "0", 1, "input", 2, "width", "64px", 3, "ngModelChange", "ngModel"], ["type", "number", "min", "0", 1, "input", 2, "width", "104px", 3, "ngModelChange", "ngModel"], [1, "input", 2, "width", "76px", 3, "ngModelChange", "ngModel"], [3, "ngValue"], [2, "text-align", "right", "font-weight", "600"], ["type", "button", 1, "btn", "danger", "sm"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], [2, "color", "var(--muted)"], [1, "info-box", "warn"], [1, "info-box", "ok"], ["name", "alertTriangle", 2, "vertical-align", "-2px", 3, "size"], ["name", "check", 2, "vertical-align", "-2px", 3, "size"]], template: function InvoiceEditorComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0);
      \u0275\u0275template(1, InvoiceEditorComponent_Conditional_1_Template, 3, 4, "a", 1);
      \u0275\u0275elementStart(2, "button", 2);
      \u0275\u0275listener("click", function InvoiceEditorComponent_Template_button_click_2_listener() {
        return ctx.save("draft");
      });
      \u0275\u0275text(3, "Save Draft");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "button", 3);
      \u0275\u0275listener("click", function InvoiceEditorComponent_Template_button_click_4_listener() {
        return ctx.save("pending");
      });
      \u0275\u0275template(5, InvoiceEditorComponent_Conditional_5_Template, 1, 0, "span", 4);
      \u0275\u0275text(6);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(7, "a", 5);
      \u0275\u0275text(8, "\u2190 Back to invoices");
      \u0275\u0275elementEnd();
      \u0275\u0275template(9, InvoiceEditorComponent_Conditional_9_Template, 2, 1, "div", 6)(10, InvoiceEditorComponent_Conditional_10_Template, 122, 22, "div", 7);
      \u0275\u0275elementEnd();
    }
    if (rf & 2) {
      \u0275\u0275property("title", ctx.isEdit() ? "Edit " + (ctx.invoiceNumber || "Invoice") : "New Invoice")("subtitle", ctx.isEdit() ? "Update details and line items" : "GST is calculated automatically from state codes");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.isEdit() ? 1 : -1);
      \u0275\u0275advance();
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance(2);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.saving() ? 5 : -1);
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.isEdit() ? "Save Changes" : "Save Invoice", " ");
      \u0275\u0275advance(3);
      \u0275\u0275conditional(ctx.loading() ? 9 : 10);
    }
  }, dependencies: [CommonModule, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, SelectControlValueAccessor, NgControlStatus, MinValidator, NgModel, RouterLink, AppShellComponent, IconComponent, AvatarComponent, SkeletonRowsComponent, ItemPickerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoiceEditorComponent, { className: "InvoiceEditorComponent", filePath: "src\\app\\features\\invoices\\invoice-editor.component.ts", lineNumber: 197 });
})();
export {
  InvoiceEditorComponent
};
//# sourceMappingURL=chunk-7R3VFJFV.js.map
