import {
  InvoiceDocumentComponent
} from "./chunk-M35RZKI5.js";
import {
  ToastService,
  ToastsComponent
} from "./chunk-JIDZ6YQM.js";
import {
  downloadBlob
} from "./chunk-ECR3SCST.js";
import {
  ApiService
} from "./chunk-RP5ZW4FD.js";
import {
  ActivatedRoute,
  AuthService,
  RouterLink
} from "./chunk-AGABJEXX.js";
import {
  CommonModule,
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
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵpureFunction1,
  ɵɵtemplate,
  ɵɵtext
} from "./chunk-KLA3EWNB.js";

// src/app/features/invoices/invoice-print.component.ts
var _c0 = (a0) => ["/invoices", a0, "edit"];
function InvoicePrintComponent_Conditional_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275element(0, "span", 6);
  }
}
function InvoicePrintComponent_Conditional_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 7);
    \u0275\u0275element(1, "app-invoice-document", 9);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    let tmp_4_0;
    let tmp_5_0;
    let tmp_6_0;
    let tmp_7_0;
    let tmp_8_0;
    let tmp_9_0;
    let tmp_10_0;
    let tmp_11_0;
    let tmp_12_0;
    let tmp_13_0;
    let tmp_14_0;
    let tmp_15_0;
    const ctx_r0 = \u0275\u0275nextContext();
    \u0275\u0275advance();
    \u0275\u0275property("invoice", ctx)("client", ctx_r0.client())("orgName", ((tmp_4_0 = ctx_r0.org()) == null ? null : tmp_4_0.name) || "Your Business")("orgAddress", ((tmp_5_0 = ctx_r0.org()) == null ? null : tmp_5_0.address) || "")("orgGstin", ((tmp_6_0 = ctx_r0.org()) == null ? null : tmp_6_0.gstin) || "")("orgPan", ((tmp_7_0 = ctx_r0.org()) == null ? null : tmp_7_0.pan) || "")("templateId", ((tmp_8_0 = ctx_r0.org()) == null ? null : tmp_8_0.brandingConfig == null ? null : tmp_8_0.brandingConfig.invoiceTemplateId) || "classic-corporate")("customTemplate", ((tmp_9_0 = ctx_r0.org()) == null ? null : tmp_9_0.brandingConfig == null ? null : tmp_9_0.brandingConfig.customInvoiceTemplate) || null)("accentColor", ((tmp_10_0 = ctx_r0.org()) == null ? null : tmp_10_0.brandingConfig == null ? null : tmp_10_0.brandingConfig.primaryColor) || "#4f46e5")("logoUrl", ((tmp_11_0 = ctx_r0.org()) == null ? null : tmp_11_0.brandingConfig == null ? null : tmp_11_0.brandingConfig.logoUrl) || "")("showLogo", ((tmp_12_0 = ctx_r0.org()) == null ? null : tmp_12_0.brandingConfig == null ? null : tmp_12_0.brandingConfig.invoiceContent == null ? null : tmp_12_0.brandingConfig.invoiceContent.showLogo) !== false)("showSignature", ((tmp_13_0 = ctx_r0.org()) == null ? null : tmp_13_0.brandingConfig == null ? null : tmp_13_0.brandingConfig.invoiceContent == null ? null : tmp_13_0.brandingConfig.invoiceContent.showSignature) !== false)("showBankDetails", ((tmp_14_0 = ctx_r0.org()) == null ? null : tmp_14_0.brandingConfig == null ? null : tmp_14_0.brandingConfig.invoiceContent == null ? null : tmp_14_0.brandingConfig.invoiceContent.showBankDetails) !== false)("showAmountInWords", ((tmp_15_0 = ctx_r0.org()) == null ? null : tmp_15_0.brandingConfig == null ? null : tmp_15_0.brandingConfig.invoiceContent == null ? null : tmp_15_0.brandingConfig.invoiceContent.showAmountInWords) !== false);
  }
}
function InvoicePrintComponent_Conditional_11_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 8)(1, "p", 10);
    \u0275\u0275text(2, "Invoice not found.");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "a", 11);
    \u0275\u0275text(4, "Back to invoices");
    \u0275\u0275elementEnd()();
  }
}
var InvoicePrintComponent = class _InvoicePrintComponent {
  api;
  auth;
  toast;
  route;
  invoiceId = "";
  invoice = signal(null);
  loading = signal(true);
  downloading = signal(false);
  constructor(api, auth, toast, route) {
    this.api = api;
    this.auth = auth;
    this.toast = toast;
    this.route = route;
  }
  org() {
    return this.auth.organisation();
  }
  client() {
    const inv = this.invoice();
    if (!inv || typeof inv.clientId === "string")
      return null;
    return inv.clientId;
  }
  ngOnInit() {
    this.invoiceId = this.route.snapshot.paramMap.get("id") || "";
    this.api.invoice(this.invoiceId).subscribe({
      next: (inv) => {
        this.invoice.set(inv);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toast.httpError(err, "Invoice not found.");
      }
    });
  }
  print() {
    window.print();
  }
  downloadPdf() {
    this.downloading.set(true);
    this.api.downloadInvoicePdf(this.invoiceId).subscribe({
      next: (blob) => {
        this.downloading.set(false);
        downloadBlob(blob, `${this.invoice()?.invoiceNumber || "invoice"}.pdf`);
      },
      error: (err) => {
        this.downloading.set(false);
        this.toast.httpError(err, "Could not generate the PDF.");
      }
    });
  }
  static \u0275fac = function InvoicePrintComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _InvoicePrintComponent)(\u0275\u0275directiveInject(ApiService), \u0275\u0275directiveInject(AuthService), \u0275\u0275directiveInject(ToastService), \u0275\u0275directiveInject(ActivatedRoute));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _InvoicePrintComponent, selectors: [["app-invoice-print"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 13, vars: 6, consts: [[2, "min-height", "100vh", "background", "var(--bg)", "padding", "28px 20px"], [1, "no-print", 2, "max-width", "860px", "margin", "0 auto 18px", "display", "flex", "justify-content", "space-between", "gap", "10px", "flex-wrap", "wrap"], [1, "btn", "secondary", 3, "routerLink"], [2, "display", "flex", "gap", "10px"], ["type", "button", 1, "btn", "secondary", 3, "click"], ["type", "button", 1, "btn", "primary", 3, "click", "disabled"], [1, "spinner"], ["id", "print-area"], [1, "card", 2, "max-width", "520px", "margin", "60px auto", "text-align", "center"], [3, "invoice", "client", "orgName", "orgAddress", "orgGstin", "orgPan", "templateId", "customTemplate", "accentColor", "logoUrl", "showLogo", "showSignature", "showBankDetails", "showAmountInWords"], [2, "color", "var(--muted)"], ["routerLink", "/invoices", 1, "btn", "primary"]], template: function InvoicePrintComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "a", 2);
      \u0275\u0275text(3, "\u2190 Back to editor");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(4, "div", 3)(5, "button", 4);
      \u0275\u0275listener("click", function InvoicePrintComponent_Template_button_click_5_listener() {
        return ctx.print();
      });
      \u0275\u0275text(6, "\u{1F5A8} Print");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(7, "button", 5);
      \u0275\u0275listener("click", function InvoicePrintComponent_Template_button_click_7_listener() {
        return ctx.downloadPdf();
      });
      \u0275\u0275template(8, InvoicePrintComponent_Conditional_8_Template, 1, 0, "span", 6);
      \u0275\u0275text(9, " \u2B07 Download PDF ");
      \u0275\u0275elementEnd()()();
      \u0275\u0275template(10, InvoicePrintComponent_Conditional_10_Template, 2, 14, "div", 7)(11, InvoicePrintComponent_Conditional_11_Template, 5, 0, "div", 8);
      \u0275\u0275elementEnd();
      \u0275\u0275element(12, "app-toasts");
    }
    if (rf & 2) {
      let tmp_3_0;
      \u0275\u0275advance(2);
      \u0275\u0275property("routerLink", \u0275\u0275pureFunction1(4, _c0, ctx.invoiceId));
      \u0275\u0275advance(5);
      \u0275\u0275property("disabled", ctx.downloading());
      \u0275\u0275advance();
      \u0275\u0275conditional(ctx.downloading() ? 8 : -1);
      \u0275\u0275advance(2);
      \u0275\u0275conditional((tmp_3_0 = ctx.invoice()) ? 10 : !ctx.loading() ? 11 : -1, tmp_3_0);
    }
  }, dependencies: [CommonModule, RouterLink, ToastsComponent, InvoiceDocumentComponent], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(InvoicePrintComponent, { className: "InvoicePrintComponent", filePath: "src\\app\\features\\invoices\\invoice-print.component.ts", lineNumber: 56 });
})();
export {
  InvoicePrintComponent
};
//# sourceMappingURL=chunk-QCRT3K4J.js.map
