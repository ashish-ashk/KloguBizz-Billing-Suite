import {
  ThemeService
} from "./chunk-FOTQGH3M.js";
import {
  AuthService,
  Router,
  RouterOutlet,
  provideRouter,
  withComponentInputBinding
} from "./chunk-6FSA7WVR.js";
import {
  bootstrapApplication
} from "./chunk-FVB5LDTQ.js";
import "./chunk-36HDS2M4.js";
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
} from "./chunk-6VNHH65J.js";

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
  { path: "login", loadComponent: () => import("./chunk-2CLBE56K.js").then((m) => m.LoginComponent) },
  { path: "register", loadComponent: () => import("./chunk-3WO7UXMP.js").then((m) => m.RegisterComponent) },
  {
    path: "",
    canActivate: [authGuard],
    children: [
      { path: "dashboard", loadComponent: () => import("./chunk-IUVMYUAY.js").then((m) => m.DashboardComponent) },
      { path: "invoices", loadComponent: () => import("./chunk-J2MDB2Y2.js").then((m) => m.InvoicesComponent) },
      { path: "invoices/new", loadComponent: () => import("./chunk-7R3VFJFV.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/edit", loadComponent: () => import("./chunk-7R3VFJFV.js").then((m) => m.InvoiceEditorComponent) },
      { path: "invoices/:id/print", loadComponent: () => import("./chunk-IMQDHU2F.js").then((m) => m.InvoicePrintComponent) },
      { path: "bill-generator", loadComponent: () => import("./chunk-STOOC3W5.js").then((m) => m.BillGeneratorComponent) },
      { path: "bill-generator/:id/edit", loadComponent: () => import("./chunk-STOOC3W5.js").then((m) => m.BillGeneratorComponent) },
      { path: "clients", loadComponent: () => import("./chunk-MVND2BII.js").then((m) => m.ClientsComponent) },
      { path: "items", loadComponent: () => import("./chunk-4H3HK5UZ.js").then((m) => m.ItemsComponent) },
      { path: "payments", loadComponent: () => import("./chunk-WN54YA6J.js").then((m) => m.PaymentsComponent) },
      { path: "reports", loadComponent: () => import("./chunk-XWJ2IYY3.js").then((m) => m.ReportsComponent) },
      { path: "users", loadComponent: () => import("./chunk-I6FOVN43.js").then((m) => m.UsersComponent) },
      { path: "subscription", loadComponent: () => import("./chunk-ASUBGTME.js").then((m) => m.SubscriptionComponent) },
      { path: "appearance", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-SIQ5IYBG.js").then((m) => m.AppearanceComponent) },
      { path: "invoice-templates", canActivate: [tenantAdminGuard], loadComponent: () => import("./chunk-6IIBGG72.js").then((m) => m.InvoiceTemplatesComponent) },
      { path: "", pathMatch: "full", redirectTo: "dashboard" }
    ]
  },
  {
    path: "super-admin",
    canActivate: [superAdminGuard],
    loadComponent: () => import("./chunk-NXM3CRSC.js").then((m) => m.SuperAdminLayoutComponent),
    children: [
      { path: "", pathMatch: "full", redirectTo: "organisations" },
      { path: "organisations", loadComponent: () => import("./chunk-SQ572ROU.js").then((m) => m.SuperOrganisationsComponent) },
      { path: "masters", loadComponent: () => import("./chunk-SLOR3IG5.js").then((m) => m.SuperMastersComponent) },
      { path: "templates", loadComponent: () => import("./chunk-K2D4OD4S.js").then((m) => m.SuperTemplatesComponent) },
      { path: "reminders", loadComponent: () => import("./chunk-4RGPCPZ5.js").then((m) => m.SuperRemindersComponent) },
      { path: "plans", loadComponent: () => import("./chunk-3KN4E4VA.js").then((m) => m.SuperPlansComponent) },
      { path: "branding", loadComponent: () => import("./chunk-CTAWFZ5Q.js").then((m) => m.SuperBrandingComponent) },
      { path: "profile", loadComponent: () => import("./chunk-536W3QXD.js").then((m) => m.SuperProfileComponent) }
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
