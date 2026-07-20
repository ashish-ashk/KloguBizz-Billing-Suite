import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  AvatarComponent,
  EmptyStateComponent,
  ModalComponent,
  PagerComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  STATES,
  isValidEmail,
  isValidGSTIN,
  stateName
} from "./chunk-7F65RAZH.js";
import "./chunk-NLVJQDBR.js";
import {
  DefaultValueAccessor,
  FormsModule,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-XAFCZYPI.js";
import "./chunk-6FSA7WVR.js";
import "./chunk-FVB5LDTQ.js";
import {
  ApiService
} from "./chunk-36HDS2M4.js";
import {
  CommonModule,
  computed,
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

// src/app/features/clients/clients.component.ts
var _forTrack0 = ($index, $item) => $item.code;
var _forTrack1 = ($index, $item) => $item._id;
function ClientsComponent_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 7);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function ClientsComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 8);
  }
}
function ClientsComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 9);
  }
}
function ClientsComponent_Conditional_12_For_15_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 38);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const c_r3 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(c_r3.gstin);
  }
}
function ClientsComponent_Conditional_12_For_15_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 39);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function ClientsComponent_Conditional_12_For_15_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 32)(2, "div", 33);
    \u0275\u0275element(3, "app-avatar", 34);
    \u0275\u0275elementStart(4, "div")(5, "div", 35);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 36);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(9, "td", 37);
    \u0275\u0275template(10, ClientsComponent_Conditional_12_For_15_Conditional_10_Template, 2, 1, "span", 38)(11, ClientsComponent_Conditional_12_For_15_Conditional_11_Template, 2, 0, "span", 39);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "td", 40);
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td", 41);
    \u0275\u0275text(15);
    \u0275\u0275elementStart(16, "span", 39);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "td", 42)(19, "div", 43)(20, "button", 44);
    \u0275\u0275listener("click", function ClientsComponent_Conditional_12_For_15_Template_button_click_20_listener() {
      const c_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.openEdit(c_r3));
    });
    \u0275\u0275text(21, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(22, "button", 45);
    \u0275\u0275listener("click", function ClientsComponent_Conditional_12_For_15_Template_button_click_22_listener() {
      const c_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r3.deleteTarget.set(c_r3));
    });
    \u0275\u0275text(23, "Delete");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const c_r3 = ctx.$implicit;
    const ctx_r3 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275property("name", c_r3.companyName)("size", 32);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(c_r3.companyName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(c_r3.email || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(c_r3.gstin ? 10 : 11);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(c_r3.phone || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", ctx_r3.stateName(c_r3.stateCode), " ");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("(", c_r3.stateCode, ")");
  }
}
function ClientsComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 29)(1, "table", 30)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Client");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "GSTIN");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Phone");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "State");
    \u0275\u0275elementEnd();
    \u0275\u0275element(12, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(13, "tbody");
    \u0275\u0275repeaterCreate(14, ClientsComponent_Conditional_12_For_15_Template, 24, 8, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(16, "app-pager", 31);
    \u0275\u0275listener("pageChange", function ClientsComponent_Conditional_12_Template_app_pager_pageChange_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.page.set($event));
    })("pageSizeChange", function ClientsComponent_Conditional_12_Template_app_pager_pageSizeChange_16_listener($event) {
      \u0275\u0275restoreView(_r1);
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.onPageSize($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r3 = \u0275\u0275nextContext();
    \u0275\u0275advance(14);
    \u0275\u0275repeater(ctx_r3.paged());
    \u0275\u0275advance(2);
    \u0275\u0275property("page", ctx_r3.page())("pageSize", ctx_r3.pageSize())("total", ctx_r3.filtered().length);
  }
}
function ClientsComponent_Conditional_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1, "Company name is required.");
    \u0275\u0275elementEnd();
  }
}
function ClientsComponent_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1, "Enter a valid email address.");
    \u0275\u0275elementEnd();
  }
}
function ClientsComponent_Conditional_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 14);
    \u0275\u0275text(1, "Enter a valid 15-character GSTIN.");
    \u0275\u0275elementEnd();
  }
}
function ClientsComponent_For_44_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 21);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const s_r5 = ctx.$implicit;
    \u0275\u0275property("value", s_r5.code);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate2("", s_r5.name, " (", s_r5.code, ")");
  }
}
var ClientsComponent = class _ClientsComponent {
  api;
  toast;
  loading = signal(true);
  clients = signal([]);
  search = signal("");
  modalOpen = signal(false);
  editing = signal(null);
  saving = signal(false);
  submitted = signal(false);
  deleteTarget = signal(null);
  deleting = signal(false);
  form = this.blankForm();
  states = STATES;
  stateName = stateName;
  page = signal(1);
  pageSize = signal(10);
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q)
      return this.clients();
    return this.clients().filter((c) => (c.companyName || "").toLowerCase().includes(q) || (c.gstin || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q));
  });
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  onSearch(v) {
    this.search.set(v);
    this.page.set(1);
  }
  onPageSize(v) {
    this.pageSize.set(v);
    this.page.set(1);
  }
  ngOnInit() {
    this.load();
  }
  load() {
    this.loading.set(true);
    this.api.clients().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  blankForm() {
    return { companyName: "", email: "", phone: "", gstin: "", address: "", stateCode: "27" };
  }
  openAdd() {
    this.editing.set(null);
    this.form = this.blankForm();
    this.submitted.set(false);
    this.modalOpen.set(true);
  }
  openEdit(c) {
    this.editing.set(c);
    this.form = {
      companyName: c.companyName || "",
      email: c.email || "",
      phone: c.phone || "",
      gstin: c.gstin || "",
      address: c.address || "",
      stateCode: c.stateCode || "27"
    };
    this.submitted.set(false);
    this.modalOpen.set(true);
  }
  emailInvalid() {
    return !!this.form.email.trim() && !isValidEmail(this.form.email.trim());
  }
  gstinInvalid() {
    return !!this.form.gstin.trim() && !isValidGSTIN(this.form.gstin.trim());
  }
  save() {
    this.submitted.set(true);
    if (!this.form.companyName.trim() || this.emailInvalid() || this.gstinInvalid())
      return;
    const payload = {
      companyName: this.form.companyName.trim(),
      email: this.form.email.trim(),
      phone: this.form.phone.trim(),
      gstin: this.form.gstin.trim().toUpperCase(),
      address: this.form.address.trim(),
      stateCode: this.form.stateCode,
      state: stateName(this.form.stateCode)
    };
    const editing = this.editing();
    this.saving.set(true);
    const req = editing ? this.api.updateClient(editing._id, payload) : this.api.createClient(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? "Client updated" : "Client added");
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.httpError(err);
      }
    });
  }
  confirmDelete() {
    const target = this.deleteTarget();
    if (!target)
      return;
    this.deleting.set(true);
    this.api.deleteClient(target._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success("Client deleted");
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.httpError(err);
      }
    });
  }
  static \u0275fac = function ClientsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ClientsComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ClientsComponent, selectors: [["app-clients"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 63, vars: 27, consts: [["title", "Clients", 3, "subtitle"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click"], [1, "toolbar"], [1, "search-box"], [1, "search-icon"], ["type", "text", "placeholder", "Search name, GSTIN or email", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], ["icon", "\u25EB", "title", "No clients yet", "message", "Add your first client to start invoicing."], ["icon", "\u2315", "title", "No matching clients", "message", "Try a different search term."], [3, "close", "open", "title"], [1, "form", 3, "ngSubmit"], [1, "field"], ["name", "companyName", "placeholder", "Acme Traders Pvt Ltd", 3, "ngModelChange", "ngModel"], [1, "error"], [1, "grid", "grid-2"], ["name", "email", "placeholder", "billing@acme.in", 3, "ngModelChange", "ngModel"], ["name", "phone", "placeholder", "98765 43210", 3, "ngModelChange", "ngModel"], ["name", "gstin", "placeholder", "27ABCDE1234F1Z5", 1, "mono", 3, "ngModelChange", "ngModel"], ["name", "address", "placeholder", "Street, city, PIN", 3, "ngModelChange", "ngModel"], ["name", "stateCode", 3, "ngModelChange", "ngModel"], [3, "value"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "submit", 1, "btn", "primary", 3, "disabled"], ["title", "Delete Client", 3, "close", "open", "width"], [2, "margin", "0 0 8px", "font-size", "13.5px"], [2, "margin", "0", "font-size", "12.5px", "color", "var(--muted)"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], [1, "table-wrap"], [1, "table", "stack-mobile"], [3, "pageChange", "pageSizeChange", "page", "pageSize", "total"], ["data-label", "Client"], [2, "display", "flex", "align-items", "center", "gap", "10px"], [3, "name", "size"], [1, "strong"], [1, "muted", 2, "font-size", "11.5px"], ["data-label", "GSTIN"], [1, "mono"], [1, "muted"], ["data-label", "Phone"], ["data-label", "State"], ["data-label", ""], [1, "actions"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"]], template: function ClientsComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "app-shell", 0)(1, "button", 1);
      \u0275\u0275listener("click", function ClientsComponent_Template_button_click_1_listener() {
        return ctx.openAdd();
      });
      \u0275\u0275text(2, "+ Add Client");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(3, "div", 2)(4, "div", 3)(5, "span", 4);
      \u0275\u0275text(6, "\u2315");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(7, "input", 5);
      \u0275\u0275listener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_7_listener($event) {
        return ctx.onSearch($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(8, "div", 6);
      \u0275\u0275template(9, ClientsComponent_Conditional_9_Template, 1, 1, "app-skeleton-rows", 7)(10, ClientsComponent_Conditional_10_Template, 1, 0, "app-empty-state", 8)(11, ClientsComponent_Conditional_11_Template, 1, 0, "app-empty-state", 9)(12, ClientsComponent_Conditional_12_Template, 17, 3);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(13, "app-modal", 10);
      \u0275\u0275listener("close", function ClientsComponent_Template_app_modal_close_13_listener() {
        return ctx.modalOpen.set(false);
      });
      \u0275\u0275elementStart(14, "form", 11);
      \u0275\u0275listener("ngSubmit", function ClientsComponent_Template_form_ngSubmit_14_listener() {
        return ctx.save();
      });
      \u0275\u0275elementStart(15, "div", 12)(16, "label");
      \u0275\u0275text(17, "Company Name *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(18, "input", 13);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_18_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.companyName, $event) || (ctx.form.companyName = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(19, ClientsComponent_Conditional_19_Template, 2, 0, "span", 14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "div", 15)(21, "div", 12)(22, "label");
      \u0275\u0275text(23, "Email");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "input", 16);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_24_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.email, $event) || (ctx.form.email = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(25, ClientsComponent_Conditional_25_Template, 2, 0, "span", 14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "div", 12)(27, "label");
      \u0275\u0275text(28, "Phone");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "input", 17);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_29_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.phone, $event) || (ctx.form.phone = $event);
        return $event;
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(30, "div", 12)(31, "label");
      \u0275\u0275text(32, "GSTIN");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "input", 18);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_33_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.gstin, $event) || (ctx.form.gstin = $event);
        return $event;
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(34, ClientsComponent_Conditional_34_Template, 2, 0, "span", 14);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(35, "div", 12)(36, "label");
      \u0275\u0275text(37, "Address");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(38, "input", 19);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_input_ngModelChange_38_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.address, $event) || (ctx.form.address = $event);
        return $event;
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(39, "div", 12)(40, "label");
      \u0275\u0275text(41, "State");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(42, "select", 20);
      \u0275\u0275twoWayListener("ngModelChange", function ClientsComponent_Template_select_ngModelChange_42_listener($event) {
        \u0275\u0275twoWayBindingSet(ctx.form.stateCode, $event) || (ctx.form.stateCode = $event);
        return $event;
      });
      \u0275\u0275repeaterCreate(43, ClientsComponent_For_44_Template, 2, 3, "option", 21, _forTrack0);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(45, "div", 22)(46, "button", 23);
      \u0275\u0275listener("click", function ClientsComponent_Template_button_click_46_listener() {
        return ctx.modalOpen.set(false);
      });
      \u0275\u0275text(47, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(48, "button", 24);
      \u0275\u0275text(49);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(50, "app-modal", 25);
      \u0275\u0275listener("close", function ClientsComponent_Template_app_modal_close_50_listener() {
        return ctx.deleteTarget.set(null);
      });
      \u0275\u0275elementStart(51, "p", 26);
      \u0275\u0275text(52, " Delete ");
      \u0275\u0275elementStart(53, "strong");
      \u0275\u0275text(54);
      \u0275\u0275elementEnd();
      \u0275\u0275text(55, "? ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(56, "p", 27);
      \u0275\u0275text(57, " Invoices already raised for this client will remain on file \u2014 only the client record is removed. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(58, "div", 22)(59, "button", 23);
      \u0275\u0275listener("click", function ClientsComponent_Template_button_click_59_listener() {
        return ctx.deleteTarget.set(null);
      });
      \u0275\u0275text(60, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(61, "button", 28);
      \u0275\u0275listener("click", function ClientsComponent_Template_button_click_61_listener() {
        return ctx.confirmDelete();
      });
      \u0275\u0275text(62);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_22_0;
      \u0275\u0275property("subtitle", ctx.clients().length + " clients on file");
      \u0275\u0275advance(7);
      \u0275\u0275property("ngModel", ctx.search());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 9 : ctx.clients().length === 0 ? 10 : ctx.filtered().length === 0 ? 11 : 12);
      \u0275\u0275advance(4);
      \u0275\u0275property("open", ctx.modalOpen())("title", ctx.editing() ? "Edit Client" : "Add Client");
      \u0275\u0275advance(5);
      \u0275\u0275classProp("invalid", ctx.submitted() && !ctx.form.companyName.trim());
      \u0275\u0275twoWayProperty("ngModel", ctx.form.companyName);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.submitted() && !ctx.form.companyName.trim() ? 19 : -1);
      \u0275\u0275advance(5);
      \u0275\u0275classProp("invalid", ctx.emailInvalid());
      \u0275\u0275twoWayProperty("ngModel", ctx.form.email);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.emailInvalid() ? 25 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.phone);
      \u0275\u0275advance(4);
      \u0275\u0275classProp("invalid", ctx.gstinInvalid());
      \u0275\u0275twoWayProperty("ngModel", ctx.form.gstin);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.gstinInvalid() ? 34 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.address);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.stateCode);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.states);
      \u0275\u0275advance(5);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.saving() ? "Saving\u2026" : ctx.editing() ? "Save Changes" : "Add Client", " ");
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.deleteTarget())("width", 420);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate((tmp_22_0 = ctx.deleteTarget()) == null ? null : tmp_22_0.companyName);
      \u0275\u0275advance(7);
      \u0275\u0275property("disabled", ctx.deleting());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.deleting() ? "Deleting\u2026" : "Delete Client", " ");
    }
  }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, NgModel, NgForm, AppShellComponent, ModalComponent, AvatarComponent, EmptyStateComponent, SkeletonRowsComponent, PagerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ClientsComponent, { className: "ClientsComponent", filePath: "src\\app\\features\\clients\\clients.component.ts", lineNumber: 155 });
})();
export {
  ClientsComponent
};
//# sourceMappingURL=chunk-MVND2BII.js.map
