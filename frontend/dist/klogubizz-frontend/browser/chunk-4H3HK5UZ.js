import {
  AppShellComponent
} from "./chunk-YNECOBXO.js";
import "./chunk-4KISL3AY.js";
import "./chunk-FOTQGH3M.js";
import {
  EmptyStateComponent,
  ModalComponent,
  PagerComponent,
  PillComponent,
  SkeletonRowsComponent,
  ToastService
} from "./chunk-OBVHAWX5.js";
import {
  UNITS,
  downloadBlob,
  fmtINR
} from "./chunk-7F65RAZH.js";
import "./chunk-NLVJQDBR.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormsModule,
  MinValidator,
  NgControlStatus,
  NgControlStatusGroup,
  NgForm,
  NgModel,
  NgSelectOption,
  NumberValueAccessor,
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
  ɵɵreference,
  ɵɵrepeater,
  ɵɵrepeaterCreate,
  ɵɵrepeaterTrackByIdentity,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-6VNHH65J.js";

// src/app/features/items/items.component.ts
var _forTrack0 = ($index, $item) => $item._id;
var _forTrack1 = ($index, $item) => $item.row;
function ItemsComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-skeleton-rows", 9);
  }
  if (rf & 2) {
    \u0275\u0275property("count", 5);
  }
}
function ItemsComponent_Conditional_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 10);
  }
}
function ItemsComponent_Conditional_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "app-empty-state", 11);
  }
}
function ItemsComponent_Conditional_14_For_23_Conditional_9_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 52);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const it_r4 = \u0275\u0275nextContext().$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(it_r4.hsn);
  }
}
function ItemsComponent_Conditional_14_For_23_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 72);
    \u0275\u0275text(1, "\u2014");
    \u0275\u0275elementEnd();
  }
}
function ItemsComponent_Conditional_14_For_23_Template(rf, ctx) {
  if (rf & 1) {
    const _r3 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td", 67)(2, "div", 68);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 69);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "td", 70);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "td", 71);
    \u0275\u0275template(9, ItemsComponent_Conditional_14_For_23_Conditional_9_Template, 2, 1, "span", 52)(10, ItemsComponent_Conditional_14_For_23_Conditional_10_Template, 2, 0, "span", 72);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td", 73);
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td", 74);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(15, "td", 75);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 76);
    \u0275\u0275text(18);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "td", 77);
    \u0275\u0275element(20, "app-pill", 78);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "td", 79)(22, "div", 80)(23, "button", 81);
    \u0275\u0275listener("click", function ItemsComponent_Conditional_14_For_23_Template_button_click_23_listener() {
      const it_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.openEdit(it_r4));
    });
    \u0275\u0275text(24, "Edit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(25, "button", 82);
    \u0275\u0275listener("click", function ItemsComponent_Conditional_14_For_23_Template_button_click_25_listener() {
      const it_r4 = \u0275\u0275restoreView(_r3).$implicit;
      const ctx_r4 = \u0275\u0275nextContext(2);
      return \u0275\u0275resetView(ctx_r4.deleteTarget.set(it_r4));
    });
    \u0275\u0275text(26, "Delete");
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    let tmp_19_0;
    const it_r4 = ctx.$implicit;
    const ctx_r4 = \u0275\u0275nextContext(2);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(it_r4.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(it_r4.itemCode || "\u2014");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(it_r4.type === "service" ? "Service" : "Goods");
    \u0275\u0275advance(2);
    \u0275\u0275conditional(it_r4.hsn ? 9 : 10);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(it_r4.unit);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(ctx_r4.fmtINR(it_r4.sellingPrice));
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", it_r4.gstRate, "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate((tmp_19_0 = it_r4.stockQty) !== null && tmp_19_0 !== void 0 ? tmp_19_0 : 0);
    \u0275\u0275advance(2);
    \u0275\u0275property("status", it_r4.status || "active");
  }
}
function ItemsComponent_Conditional_14_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 63)(1, "table", 64)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Item");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Type");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "HSN/SAC");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "th");
    \u0275\u0275text(11, "Unit");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "th", 65);
    \u0275\u0275text(13, "Rate");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "th");
    \u0275\u0275text(15, "GST%");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "th", 65);
    \u0275\u0275text(17, "Stock");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(18, "th");
    \u0275\u0275text(19, "Status");
    \u0275\u0275elementEnd();
    \u0275\u0275element(20, "th");
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "tbody");
    \u0275\u0275repeaterCreate(22, ItemsComponent_Conditional_14_For_23_Template, 27, 9, "tr", null, _forTrack0);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(24, "app-pager", 66);
    \u0275\u0275listener("pageChange", function ItemsComponent_Conditional_14_Template_app_pager_pageChange_24_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.page.set($event));
    })("pageSizeChange", function ItemsComponent_Conditional_14_Template_app_pager_pageSizeChange_24_listener($event) {
      \u0275\u0275restoreView(_r2);
      const ctx_r4 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r4.onPageSize($event));
    });
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275advance(22);
    \u0275\u0275repeater(ctx_r4.paged());
    \u0275\u0275advance(2);
    \u0275\u0275property("page", ctx_r4.page())("pageSize", ctx_r4.pageSize())("total", ctx_r4.filtered().length);
  }
}
function ItemsComponent_Conditional_25_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1, "Item name is required.");
    \u0275\u0275elementEnd();
  }
}
function ItemsComponent_For_60_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 29);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const u_r6 = ctx.$implicit;
    \u0275\u0275property("value", u_r6);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(u_r6);
  }
}
function ItemsComponent_For_66_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 31);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const r_r7 = ctx.$implicit;
    \u0275\u0275property("ngValue", r_r7);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1("", r_r7, "%");
  }
}
function ItemsComponent_Conditional_79_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "span", 19);
    \u0275\u0275text(1, "Enter a selling price greater than 0.");
    \u0275\u0275elementEnd();
  }
}
function ItemsComponent_Conditional_144_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 57);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const ctx_r4 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(ctx_r4.uploadError());
  }
}
function ItemsComponent_Conditional_145_Conditional_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275text(0);
  }
  if (rf & 2) {
    const result_r9 = \u0275\u0275nextContext();
    \u0275\u0275textInterpolate1(" ", result_r9.failed.length, " row(s) had errors \u2014 see below. ");
  }
}
function ItemsComponent_Conditional_145_Conditional_5_For_12_For_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "li");
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const e_r10 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(e_r10);
  }
}
function ItemsComponent_Conditional_145_Conditional_5_For_12_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 85);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td", 67);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td", 86)(6, "ul", 87);
    \u0275\u0275repeaterCreate(7, ItemsComponent_Conditional_145_Conditional_5_For_12_For_8_Template, 2, 1, "li", null, \u0275\u0275repeaterTrackByIdentity);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const f_r11 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(f_r11.row);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(f_r11.name || f_r11.itemCode || "\u2014");
    \u0275\u0275advance(3);
    \u0275\u0275repeater(f_r11.errors);
  }
}
function ItemsComponent_Conditional_145_Conditional_5_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 84)(1, "table", 64)(2, "thead")(3, "tr")(4, "th");
    \u0275\u0275text(5, "Row");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "th");
    \u0275\u0275text(7, "Item");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "th");
    \u0275\u0275text(9, "Errors");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(10, "tbody");
    \u0275\u0275repeaterCreate(11, ItemsComponent_Conditional_145_Conditional_5_For_12_Template, 9, 2, "tr", null, _forTrack1);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const result_r9 = \u0275\u0275nextContext();
    \u0275\u0275advance(11);
    \u0275\u0275repeater(result_r9.failed);
  }
}
function ItemsComponent_Conditional_145_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 83)(1, "strong");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275text(3);
    \u0275\u0275template(4, ItemsComponent_Conditional_145_Conditional_4_Template, 1, 1);
    \u0275\u0275elementEnd();
    \u0275\u0275template(5, ItemsComponent_Conditional_145_Conditional_5_Template, 13, 0, "div", 84);
  }
  if (rf & 2) {
    const result_r9 = ctx;
    \u0275\u0275classProp("ok", result_r9.failed.length === 0)("warn", result_r9.failed.length > 0 && result_r9.created > 0)("danger", result_r9.created === 0 && result_r9.failed.length > 0);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(result_r9.created);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" of ", result_r9.totalRows, " item(s) added to your catalog. ");
    \u0275\u0275advance();
    \u0275\u0275conditional(result_r9.failed.length > 0 ? 4 : -1);
    \u0275\u0275advance();
    \u0275\u0275conditional(result_r9.failed.length > 0 ? 5 : -1);
  }
}
var ItemsComponent = class _ItemsComponent {
  api;
  toast;
  loading = signal(true);
  items = signal([]);
  search = signal("");
  modalOpen = signal(false);
  editing = signal(null);
  saving = signal(false);
  submitted = signal(false);
  deleteTarget = signal(null);
  deleting = signal(false);
  bulkModalOpen = signal(false);
  downloadingTemplate = signal(false);
  selectedFile = signal(null);
  uploading = signal(false);
  uploadError = signal("");
  uploadResult = signal(null);
  form = this.blankForm();
  units = UNITS;
  gstRates = [0, 5, 12, 18, 28];
  fmtINR = fmtINR;
  page = signal(1);
  pageSize = signal(10);
  filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q)
      return this.items();
    return this.items().filter((it) => (it.name || "").toLowerCase().includes(q) || (it.itemCode || "").toLowerCase().includes(q) || (it.hsn || "").toLowerCase().includes(q) || (it.category || "").toLowerCase().includes(q));
  });
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  constructor(api, toast) {
    this.api = api;
    this.toast = toast;
  }
  ngOnInit() {
    this.load();
  }
  onSearch(v) {
    this.search.set(v);
    this.page.set(1);
  }
  onPageSize(v) {
    this.pageSize.set(v);
    this.page.set(1);
  }
  load() {
    this.loading.set(true);
    this.api.items().subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err);
      }
    });
  }
  blankForm() {
    return {
      itemCode: "",
      name: "",
      description: "",
      type: "goods",
      hsn: "",
      category: "",
      unit: "Nos",
      gstRate: 18,
      cessRate: 0,
      sellingPrice: 0,
      mrp: null,
      purchasePrice: null,
      taxInclusive: false,
      stockQty: 0,
      reorderLevel: null,
      barcode: "",
      status: "active"
    };
  }
  openAdd() {
    this.editing.set(null);
    this.form = this.blankForm();
    this.submitted.set(false);
    this.modalOpen.set(true);
  }
  openEdit(it) {
    this.editing.set(it);
    this.form = {
      itemCode: it.itemCode || "",
      name: it.name || "",
      description: it.description || "",
      type: it.type || "goods",
      hsn: it.hsn || "",
      category: it.category || "",
      unit: it.unit || "Nos",
      gstRate: it.gstRate ?? 18,
      cessRate: it.cessRate ?? 0,
      sellingPrice: it.sellingPrice ?? 0,
      mrp: it.mrp ?? null,
      purchasePrice: it.purchasePrice ?? null,
      taxInclusive: !!it.taxInclusive,
      stockQty: it.stockQty ?? 0,
      reorderLevel: it.reorderLevel ?? null,
      barcode: it.barcode || "",
      status: it.status || "active"
    };
    this.submitted.set(false);
    this.modalOpen.set(true);
  }
  save() {
    this.submitted.set(true);
    if (!this.form.name.trim() || !(this.form.sellingPrice > 0))
      return;
    const payload = {
      itemCode: this.form.itemCode.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim(),
      type: this.form.type,
      hsn: this.form.hsn.trim(),
      category: this.form.category.trim(),
      unit: this.form.unit,
      gstRate: Number(this.form.gstRate),
      cessRate: Number(this.form.cessRate) || 0,
      sellingPrice: Number(this.form.sellingPrice),
      mrp: this.form.mrp != null ? Number(this.form.mrp) : void 0,
      purchasePrice: this.form.purchasePrice != null ? Number(this.form.purchasePrice) : void 0,
      taxInclusive: this.form.taxInclusive,
      stockQty: Number(this.form.stockQty) || 0,
      reorderLevel: this.form.reorderLevel != null ? Number(this.form.reorderLevel) : void 0,
      barcode: this.form.barcode.trim(),
      status: this.form.status
    };
    const editing = this.editing();
    this.saving.set(true);
    const req = editing ? this.api.updateItem(editing._id, payload) : this.api.createItem(payload);
    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(editing ? "Item updated" : "Item added");
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
    this.api.deleteItem(target._id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteTarget.set(null);
        this.toast.success("Item deleted");
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.httpError(err);
      }
    });
  }
  openBulkUpload() {
    this.selectedFile.set(null);
    this.uploadError.set("");
    this.uploadResult.set(null);
    this.bulkModalOpen.set(true);
  }
  closeBulkModal() {
    this.bulkModalOpen.set(false);
  }
  downloadTemplate() {
    this.downloadingTemplate.set(true);
    this.api.downloadItemsTemplate().subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        downloadBlob(blob, "klogubizz-items-template.xlsx");
      },
      error: (err) => {
        this.downloadingTemplate.set(false);
        this.toast.httpError(err, "Could not download the template.");
      }
    });
  }
  onFileSelected(event) {
    const input = event.target;
    const file = input.files?.[0] || null;
    this.uploadError.set("");
    this.uploadResult.set(null);
    if (file && !file.name.toLowerCase().endsWith(".xlsx")) {
      this.uploadError.set("Please choose a .xlsx file \u2014 the format used by the template.");
      this.selectedFile.set(null);
      input.value = "";
      return;
    }
    this.selectedFile.set(file);
  }
  uploadFile() {
    const file = this.selectedFile();
    if (!file)
      return;
    this.uploading.set(true);
    this.uploadError.set("");
    this.uploadResult.set(null);
    this.api.bulkUploadItems(file).subscribe({
      next: (result) => {
        this.uploading.set(false);
        this.uploadResult.set(result);
        this.selectedFile.set(null);
        if (result.created > 0) {
          const suffix = result.failed.length ? `, ${result.failed.length} row(s) skipped` : "";
          this.toast.success(`${result.created} item(s) added${suffix}.`);
          this.load();
        } else if (result.failed.length > 0) {
          this.toast.error("No items were added \u2014 fix the errors below and re-upload.");
        }
      },
      error: (err) => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.message || "Upload failed. Please try again.");
      }
    });
  }
  static \u0275fac = function ItemsComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _ItemsComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(ToastService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ItemsComponent, selectors: [["app-items"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 164, vars: 46, consts: [["fileInput", ""], ["title", "Inventory", 3, "subtitle"], ["actions", "", "type", "button", 1, "btn", "secondary", 3, "click"], ["actions", "", "type", "button", 1, "btn", "primary", 3, "click"], [1, "toolbar"], [1, "search-box"], [1, "search-icon"], ["type", "text", "placeholder", "Search name, code, HSN/SAC or category", 1, "input", 3, "ngModelChange", "ngModel"], [1, "card", "flush"], [3, "count"], ["icon", "\u25EB", "title", "No items yet", "message", "Add your first item so it can be searched onto invoices."], ["icon", "\u2315", "title", "No matching items", "message", "Try a different search term."], [3, "close", "open", "title", "width"], [1, "form", 3, "ngSubmit"], [1, "form-section"], [1, "form-section-title"], [1, "grid", "grid-2"], [1, "field"], ["name", "name", "placeholder", "A4 Copier Paper (500 sheets)", 3, "ngModelChange", "ngModel"], [1, "error"], ["name", "itemCode", "placeholder", "PAP-A4-500", 1, "mono", 3, "ngModelChange", "ngModel"], ["name", "description", "placeholder", "Optional longer description", 3, "ngModelChange", "ngModel"], [1, "grid", "grid-3"], ["name", "type", 3, "ngModelChange", "ngModel"], ["value", "goods"], ["value", "service"], ["name", "hsn", "placeholder", "998314", 1, "mono", 3, "ngModelChange", "ngModel"], ["name", "category", "placeholder", "Stationery", 3, "ngModelChange", "ngModel"], ["name", "unit", 3, "ngModelChange", "ngModel"], [3, "value"], ["name", "gstRate", 3, "ngModelChange", "ngModel"], [3, "ngValue"], ["name", "cessRate", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "sellingPrice", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "mrp", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], ["name", "purchasePrice", "type", "number", "min", "0", "step", "0.01", 3, "ngModelChange", "ngModel"], [1, "checkbox"], ["type", "checkbox", "name", "taxInclusive", 3, "ngModelChange", "ngModel"], ["name", "stockQty", "type", "number", "min", "0", "step", "1", 3, "ngModelChange", "ngModel"], ["name", "reorderLevel", "type", "number", "min", "0", "step", "1", 3, "ngModelChange", "ngModel"], ["name", "barcode", "placeholder", "Optional", 1, "mono", 3, "ngModelChange", "ngModel"], [1, "field", 2, "max-width", "200px"], ["name", "status", 3, "ngModelChange", "ngModel"], ["value", "active"], ["value", "inactive"], [1, "modal-foot"], ["type", "button", 1, "btn", "ghost", 3, "click"], ["type", "submit", 1, "btn", "primary", 3, "disabled"], ["title", "Bulk Upload Items", 3, "close", "open", "width"], [1, "bulk-upload"], [1, "bulk-steps"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click", "disabled"], [1, "mono"], [1, "file-picker"], ["type", "file", "accept", ".xlsx", 2, "display", "none", 3, "change"], ["type", "button", 1, "btn", "secondary", "sm", 3, "click"], [1, "muted", 2, "font-size", "12.5px"], [1, "info-box", "danger"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], ["title", "Delete Item", 3, "close", "open", "width"], [2, "margin", "0 0 8px", "font-size", "13.5px"], [2, "margin", "0", "font-size", "12.5px", "color", "var(--muted)"], ["type", "button", 1, "btn", "danger", "solid", 3, "click", "disabled"], [1, "table-wrap"], [1, "table", "stack-mobile"], [2, "text-align", "right"], [3, "pageChange", "pageSizeChange", "page", "pageSize", "total"], ["data-label", "Item"], [1, "strong"], [1, "muted", 2, "font-size", "11.5px"], ["data-label", "Type"], ["data-label", "HSN/SAC"], [1, "muted"], ["data-label", "Unit"], ["data-label", "Rate", 2, "text-align", "right"], ["data-label", "GST%"], ["data-label", "Stock", 2, "text-align", "right"], ["data-label", "Status"], [3, "status"], ["data-label", ""], [1, "actions"], ["type", "button", 1, "btn", "ghost", "sm", 3, "click"], ["type", "button", 1, "btn", "danger", "sm", 3, "click"], [1, "info-box"], [1, "table-wrap", "upload-errors"], ["data-label", "Row"], ["data-label", "Errors"], [1, "err-list"]], template: function ItemsComponent_Template(rf, ctx) {
    if (rf & 1) {
      const _r1 = \u0275\u0275getCurrentView();
      \u0275\u0275elementStart(0, "app-shell", 1)(1, "button", 2);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_1_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.openBulkUpload());
      });
      \u0275\u0275text(2, "\u21EA Bulk Upload");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(3, "button", 3);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_3_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.openAdd());
      });
      \u0275\u0275text(4, "+ Add Item");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(5, "div", 4)(6, "div", 5)(7, "span", 6);
      \u0275\u0275text(8, "\u2315");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(9, "input", 7);
      \u0275\u0275listener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_9_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onSearch($event));
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(10, "div", 8);
      \u0275\u0275template(11, ItemsComponent_Conditional_11_Template, 1, 1, "app-skeleton-rows", 9)(12, ItemsComponent_Conditional_12_Template, 1, 0, "app-empty-state", 10)(13, ItemsComponent_Conditional_13_Template, 1, 0, "app-empty-state", 11)(14, ItemsComponent_Conditional_14_Template, 25, 3);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(15, "app-modal", 12);
      \u0275\u0275listener("close", function ItemsComponent_Template_app_modal_close_15_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.modalOpen.set(false));
      });
      \u0275\u0275elementStart(16, "form", 13);
      \u0275\u0275listener("ngSubmit", function ItemsComponent_Template_form_ngSubmit_16_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.save());
      });
      \u0275\u0275elementStart(17, "div", 14)(18, "div", 15);
      \u0275\u0275text(19, "Basic Info");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(20, "div", 16)(21, "div", 17)(22, "label");
      \u0275\u0275text(23, "Item Name *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(24, "input", 18);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_24_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.name, $event) || (ctx.form.name = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(25, ItemsComponent_Conditional_25_Template, 2, 0, "span", 19);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(26, "div", 17)(27, "label");
      \u0275\u0275text(28, "Item Code / SKU");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(29, "input", 20);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_29_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.itemCode, $event) || (ctx.form.itemCode = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(30, "div", 17)(31, "label");
      \u0275\u0275text(32, "Description");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(33, "input", 21);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_33_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.description, $event) || (ctx.form.description = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(34, "div", 14)(35, "div", 15);
      \u0275\u0275text(36, "Classification & Tax");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(37, "div", 22)(38, "div", 17)(39, "label");
      \u0275\u0275text(40, "Type");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(41, "select", 23);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_select_ngModelChange_41_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.type, $event) || (ctx.form.type = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementStart(42, "option", 24);
      \u0275\u0275text(43, "Goods");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(44, "option", 25);
      \u0275\u0275text(45, "Service");
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(46, "div", 17)(47, "label");
      \u0275\u0275text(48);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(49, "input", 26);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_49_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.hsn, $event) || (ctx.form.hsn = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(50, "div", 17)(51, "label");
      \u0275\u0275text(52, "Category");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(53, "input", 27);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_53_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.category, $event) || (ctx.form.category = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(54, "div", 22)(55, "div", 17)(56, "label");
      \u0275\u0275text(57, "Unit");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(58, "select", 28);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_select_ngModelChange_58_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.unit, $event) || (ctx.form.unit = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275repeaterCreate(59, ItemsComponent_For_60_Template, 2, 2, "option", 29, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(61, "div", 17)(62, "label");
      \u0275\u0275text(63, "GST Rate");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(64, "select", 30);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_select_ngModelChange_64_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.gstRate, $event) || (ctx.form.gstRate = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275repeaterCreate(65, ItemsComponent_For_66_Template, 2, 2, "option", 31, \u0275\u0275repeaterTrackByIdentity);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(67, "div", 17)(68, "label");
      \u0275\u0275text(69, "Cess %");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(70, "input", 32);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_70_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.cessRate, $event) || (ctx.form.cessRate = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(71, "div", 14)(72, "div", 15);
      \u0275\u0275text(73, "Pricing");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(74, "div", 22)(75, "div", 17)(76, "label");
      \u0275\u0275text(77, "Selling Price *");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(78, "input", 33);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_78_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.sellingPrice, $event) || (ctx.form.sellingPrice = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275template(79, ItemsComponent_Conditional_79_Template, 2, 0, "span", 19);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(80, "div", 17)(81, "label");
      \u0275\u0275text(82, "MRP");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(83, "input", 34);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_83_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.mrp, $event) || (ctx.form.mrp = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(84, "div", 17)(85, "label");
      \u0275\u0275text(86, "Purchase Price");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(87, "input", 35);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_87_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.purchasePrice, $event) || (ctx.form.purchasePrice = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(88, "label", 36)(89, "input", 37);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_89_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.taxInclusive, $event) || (ctx.form.taxInclusive = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd();
      \u0275\u0275text(90, " Selling price is inclusive of GST ");
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(91, "div", 14)(92, "div", 15);
      \u0275\u0275text(93, "Inventory & Status");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(94, "div", 22)(95, "div", 17)(96, "label");
      \u0275\u0275text(97, "Stock Quantity");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(98, "input", 38);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_98_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.stockQty, $event) || (ctx.form.stockQty = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(99, "div", 17)(100, "label");
      \u0275\u0275text(101, "Reorder Level");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(102, "input", 39);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_102_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.reorderLevel, $event) || (ctx.form.reorderLevel = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(103, "div", 17)(104, "label");
      \u0275\u0275text(105, "Barcode");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(106, "input", 40);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_input_ngModelChange_106_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.barcode, $event) || (ctx.form.barcode = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementEnd()()();
      \u0275\u0275elementStart(107, "div", 41)(108, "label");
      \u0275\u0275text(109, "Status");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(110, "select", 42);
      \u0275\u0275twoWayListener("ngModelChange", function ItemsComponent_Template_select_ngModelChange_110_listener($event) {
        \u0275\u0275restoreView(_r1);
        \u0275\u0275twoWayBindingSet(ctx.form.status, $event) || (ctx.form.status = $event);
        return \u0275\u0275resetView($event);
      });
      \u0275\u0275elementStart(111, "option", 43);
      \u0275\u0275text(112, "Active");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(113, "option", 44);
      \u0275\u0275text(114, "Inactive");
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(115, "div", 45)(116, "button", 46);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_116_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.modalOpen.set(false));
      });
      \u0275\u0275text(117, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(118, "button", 47);
      \u0275\u0275text(119);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(120, "app-modal", 48);
      \u0275\u0275listener("close", function ItemsComponent_Template_app_modal_close_120_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.closeBulkModal());
      });
      \u0275\u0275elementStart(121, "div", 49)(122, "ol", 50)(123, "li")(124, "div");
      \u0275\u0275text(125, "Download the template and fill in one row per item. Keep the header row as provided \u2014 required fields are marked with ");
      \u0275\u0275elementStart(126, "strong");
      \u0275\u0275text(127, "*");
      \u0275\u0275elementEnd();
      \u0275\u0275text(128, ".");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(129, "button", 51);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_129_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.downloadTemplate());
      });
      \u0275\u0275text(130);
      \u0275\u0275elementEnd()();
      \u0275\u0275elementStart(131, "li")(132, "div");
      \u0275\u0275text(133, "Choose the filled-in ");
      \u0275\u0275elementStart(134, "span", 52);
      \u0275\u0275text(135, ".xlsx");
      \u0275\u0275elementEnd();
      \u0275\u0275text(136, " file and upload it. Each row is validated on its own \u2014 valid rows are added to your catalog, and any row with an error is listed below so you can fix and re-upload just that one.");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(137, "div", 53)(138, "input", 54, 0);
      \u0275\u0275listener("change", function ItemsComponent_Template_input_change_138_listener($event) {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.onFileSelected($event));
      });
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(140, "button", 55);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_140_listener() {
        \u0275\u0275restoreView(_r1);
        const fileInput_r8 = \u0275\u0275reference(139);
        return \u0275\u0275resetView(fileInput_r8.click());
      });
      \u0275\u0275text(141, "Choose File");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(142, "span", 56);
      \u0275\u0275text(143);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275template(144, ItemsComponent_Conditional_144_Template, 2, 1, "div", 57)(145, ItemsComponent_Conditional_145_Template, 6, 10);
      \u0275\u0275elementStart(146, "div", 45)(147, "button", 46);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_147_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.closeBulkModal());
      });
      \u0275\u0275text(148, "Close");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(149, "button", 58);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_149_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.uploadFile());
      });
      \u0275\u0275text(150);
      \u0275\u0275elementEnd()()()();
      \u0275\u0275elementStart(151, "app-modal", 59);
      \u0275\u0275listener("close", function ItemsComponent_Template_app_modal_close_151_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.deleteTarget.set(null));
      });
      \u0275\u0275elementStart(152, "p", 60);
      \u0275\u0275text(153, " Delete ");
      \u0275\u0275elementStart(154, "strong");
      \u0275\u0275text(155);
      \u0275\u0275elementEnd();
      \u0275\u0275text(156, "? ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(157, "p", 61);
      \u0275\u0275text(158, " Invoices already raised using this item keep their own copy of the description, rate and tax \u2014 only this catalog entry is removed. ");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(159, "div", 45)(160, "button", 46);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_160_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.deleteTarget.set(null));
      });
      \u0275\u0275text(161, "Cancel");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(162, "button", 62);
      \u0275\u0275listener("click", function ItemsComponent_Template_button_click_162_listener() {
        \u0275\u0275restoreView(_r1);
        return \u0275\u0275resetView(ctx.confirmDelete());
      });
      \u0275\u0275text(163);
      \u0275\u0275elementEnd()()()();
    }
    if (rf & 2) {
      let tmp_37_0;
      let tmp_39_0;
      let tmp_44_0;
      \u0275\u0275property("subtitle", ctx.items().length + " items in your catalog");
      \u0275\u0275advance(9);
      \u0275\u0275property("ngModel", ctx.search());
      \u0275\u0275advance(2);
      \u0275\u0275conditional(ctx.loading() ? 11 : ctx.items().length === 0 ? 12 : ctx.filtered().length === 0 ? 13 : 14);
      \u0275\u0275advance(4);
      \u0275\u0275property("open", ctx.modalOpen())("title", ctx.editing() ? "Edit Item" : "Add Item")("width", 620);
      \u0275\u0275advance(9);
      \u0275\u0275classProp("invalid", ctx.submitted() && !ctx.form.name.trim());
      \u0275\u0275twoWayProperty("ngModel", ctx.form.name);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.submitted() && !ctx.form.name.trim() ? 25 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.itemCode);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.description);
      \u0275\u0275advance(8);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.type);
      \u0275\u0275advance(7);
      \u0275\u0275textInterpolate(ctx.form.type === "service" ? "SAC Code" : "HSN Code");
      \u0275\u0275advance();
      \u0275\u0275twoWayProperty("ngModel", ctx.form.hsn);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.category);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.unit);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.units);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.gstRate);
      \u0275\u0275advance();
      \u0275\u0275repeater(ctx.gstRates);
      \u0275\u0275advance(5);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.cessRate);
      \u0275\u0275advance(8);
      \u0275\u0275classProp("invalid", ctx.submitted() && !(ctx.form.sellingPrice > 0));
      \u0275\u0275twoWayProperty("ngModel", ctx.form.sellingPrice);
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.submitted() && !(ctx.form.sellingPrice > 0) ? 79 : -1);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.mrp);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.purchasePrice);
      \u0275\u0275advance(2);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.taxInclusive);
      \u0275\u0275advance(9);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.stockQty);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.reorderLevel);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.barcode);
      \u0275\u0275advance(4);
      \u0275\u0275twoWayProperty("ngModel", ctx.form.status);
      \u0275\u0275advance(8);
      \u0275\u0275property("disabled", ctx.saving());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.saving() ? "Saving\u2026" : ctx.editing() ? "Save Changes" : "Add Item", " ");
      \u0275\u0275advance();
      \u0275\u0275property("open", ctx.bulkModalOpen())("width", 640);
      \u0275\u0275advance(9);
      \u0275\u0275property("disabled", ctx.downloadingTemplate());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.downloadingTemplate() ? "Preparing\u2026" : "\u2B07 Download Excel Template", " ");
      \u0275\u0275advance(13);
      \u0275\u0275textInterpolate(((tmp_37_0 = ctx.selectedFile()) == null ? null : tmp_37_0.name) || "No file chosen");
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.uploadError() ? 144 : -1);
      \u0275\u0275advance();
      \u0275\u0275conditional((tmp_39_0 = ctx.uploadResult()) ? 145 : -1, tmp_39_0);
      \u0275\u0275advance(4);
      \u0275\u0275property("disabled", !ctx.selectedFile() || ctx.uploading());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.uploading() ? "Uploading\u2026" : "Upload & Add Items", " ");
      \u0275\u0275advance();
      \u0275\u0275property("open", !!ctx.deleteTarget())("width", 420);
      \u0275\u0275advance(4);
      \u0275\u0275textInterpolate((tmp_44_0 = ctx.deleteTarget()) == null ? null : tmp_44_0.name);
      \u0275\u0275advance(7);
      \u0275\u0275property("disabled", ctx.deleting());
      \u0275\u0275advance();
      \u0275\u0275textInterpolate1(" ", ctx.deleting() ? "Deleting\u2026" : "Delete Item", " ");
    }
  }, dependencies: [CommonModule, FormsModule, \u0275NgNoValidate, NgSelectOption, \u0275NgSelectMultipleOption, DefaultValueAccessor, NumberValueAccessor, CheckboxControlValueAccessor, SelectControlValueAccessor, NgControlStatus, NgControlStatusGroup, MinValidator, NgModel, NgForm, AppShellComponent, ModalComponent, EmptyStateComponent, SkeletonRowsComponent, PillComponent, PagerComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ItemsComponent, { className: "ItemsComponent", filePath: "src\\app\\features\\items\\items.component.ts", lineNumber: 304 });
})();
export {
  ItemsComponent
};
//# sourceMappingURL=chunk-4H3HK5UZ.js.map
