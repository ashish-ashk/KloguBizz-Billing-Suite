import {
  ThemeService
} from "./chunk-D76BFOPY.js";
import "./chunk-RP5ZW4FD.js";
import {
  AuthService,
  Router,
  RouterOutlet,
  bootstrapApplication,
  provideRouter,
  withComponentInputBinding
} from "./chunk-AGABJEXX.js";
import {
  catchError,
  inject,
  provideHttpClient,
  throwError,
  withInterceptors,
  ɵsetClassDebugInfo,
  ɵɵStandaloneFeature,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement
} from "./chunk-KLA3EWNB.js";

// src/app/app.component.ts
var AppComponent = class _AppComponent {
  theme;
  // Injecting eagerly instantiates the singleton so it starts applying the
  // organisation's saved theme (or the default) as soon as the app boots.
  constructor(theme) {
    this.theme = theme;
  }
  static \u0275fac = function AppComponent_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _AppComponent)(\u0275\u0275directiveInject(ThemeService));
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppComponent, selectors: [["app-root"]], standalone: true, features: [\u0275\u0275StandaloneFeature], decls: 1, vars: 0, template: function AppComponent_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "router-outlet");
    }
  }, dependencies: [RouterOutlet], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "src\\app\\app.component.ts", lineNumber: 11 });
})();

// src/app/core/auth.guard.ts
var authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token)
    return true;
  return router.createUrlTree(["/login"]);
};
var superAdminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.isSuperAdmin())
    return true;
  return router.createUrlTree(["/dashboard"]);
};
var tenantAdminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token && auth.user()?.role === "admin")
    return true;
  return router.createUrlTree(["/dashboard"]);
};

// src/app/app.routes.ts
var routes = [
  { path: "login", loadComponent: () => import("./chunk-SLGLNADT.js").then((m) => m.LoginComponent) },
  { path: "register", loadComponent: () => import("./chunk-RIMFIUH4.js").then((m) => m.RegisterComponent) },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      { path: "dashboard", loadComponent: () => import("./chunk-FC74XMCV.js").then((m) => m.DashboardComponent) },
      { path: "invoices", loadComponent: () => import("./chunk-HMTFAOOE.js").then((m) => m.InvoicesComponent) },
      { path: "invoices/new", loadComponent: () => import("./chunk-LFD7K4WW.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/edit", loadComponent: () => import("./chunk-LFD7K4WW.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/print", loadComponent: () => import("./chunk-QCRT3K4J.js").then((m) => m.InvoicePrintComponent) },
      { path: "bill-generator", loadComponent: () => import("./chunk-VSCQSI5S.js").then((m) => m.BillGeneratorComponent) },
      { path: "bill-generator/:id/edit", loadComponent: () => import("./chunk-VSCQSI5S.js").then((m) => m.BillGeneratorComponent) },
      { path: "clients", loadComponent: () => import("./chunk-QJCIMEMO.js").then((m) => m.ClientsComponent) },
      { path: "payments", loadComponent: () => import("./chunk-4XA2SYNA.js").then((m) => m.PaymentsComponent) },
      { path: "reports", loadComponent: () => import("./chunk-J7YLOTX3.js").then((m) => m.ReportsComponent) },
      { path: "users", loadComponent: () => import("./chunk-H7MYCKPW.js").then((m) => m.UsersComponent) },
      { path: "subscription", loadComponent: () => import("./chunk-MP34E6RZ.js").then((m) => m.SubscriptionComponent) },
      { path: "appearance", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-2DDGEVU4.js").then((m) => m.AppearanceComponent) },
      { path: "invoice-templates", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-I2YMBTJX.js").then((m) => m.InvoiceTemplatesComponent) },
      { path: "", pathMatch: "full", redirectTo: "dashboard" }
    ]
  },
  {
    path: "super-admin",
    canActivate: [superAdminGuard],
    loadComponent: () => import("./chunk-RQKUFZRQ.js").then((m) => m.SuperAdminLayoutComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "organisations" },
      { path: "organisations", loadComponent: () => import("./chunk-BK6WOUC3.js").then((m) => m.SuperOrganisationsComponent) },
      { path: "masters", loadComponent: () => import("./chunk-JXLIUE6H.js").then((m) => m.SuperMastersComponent) },
      { path: "templates", loadComponent: () => import("./chunk-BB3M2ANS.js").then((m) => m.SuperTemplatesComponent) },
      { path: "reminders", loadComponent: () => import("./chunk-P6W3TCVB.js").then((m) => m.SuperRemindersComponent) },
      { path: "plans", loadComponent: () => import("./chunk-JCZPA5LU.js").then((m) => m.SuperPlansComponent) },
      { path: "branding", loadComponent: () => import("./chunk-7EKGLPTX.js").then((m) => m.SuperBrandingComponent) },
      { path: "profile", loadComponent: () => import("./chunk-35KKGCQ4.js").then((m) => m.SuperProfileComponent) }
    ]
  },
  { path: "**", redirectTo: "dashboard" }
];

// src/app/core/auth.interceptor.ts
var authInterceptor = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem("klogubizz_token");
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(authedReq).pipe(catchError((err) => {
    if (err.status === 401 && !req.url.includes("/auth/login") && !req.url.includes("/auth/register")) {
      localStorage.removeItem("klogubizz_token");
      localStorage.removeItem("klogubizz_user");
      localStorage.removeItem("klogubizz_org");
      router.navigateByUrl("/login");
    }
    return throwError(() => err);
  }));
};

// src/main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
}).catch((err) => console.error(err));
//# sourceMappingURL=main.js.map
